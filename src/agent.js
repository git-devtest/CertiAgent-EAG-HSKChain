import fs from 'node:fs/promises';
import {createReadStream} from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {config,network} from './config.js';
import {attestHash} from './chain.js';
import {categorize} from './ai.js';

const WAIT_RETRY_MS = 15000;
export async function sha256File(file) {
  const digest = createHash('sha256');
  for await (const chunk of createReadStream(file)) digest.update(chunk);
  return digest.digest('hex');
}
export const deterministicMeta = ({sha256, category}) => createHash('sha256').update(`certiagent:v1:${sha256}:${category}`).digest('hex');

export class Agent {
  constructor({inbox=config.inbox,storage=config.storage,maxFileBytes=config.maxFileBytes,submit=attestHash,classify=categorize}={}) {
    Object.assign(this,{inbox,storage,maxFileBytes,submit,classify});
    this.seen = new Map(); this.running = false; this.processing = false; this.records = new Map();
  }
  async init() {
    await fs.mkdir(this.inbox,{recursive:true}); await fs.mkdir(this.storage,{recursive:true});
    this.stateFile = path.join(this.storage,`records-${network.chainId}.json`);
    try {
      const old = JSON.parse(await fs.readFile(this.stateFile,'utf8'));
      if (old.chainId === network.chainId && old.contract === network.contract.toLowerCase()) {
        for(const rec of old.records || []) this.records.set(rec.sha256,rec);
      }
    } catch (error) { if (error.code !== 'ENOENT') throw error; }
  }
  async persist() {
    const data={chainId:network.chainId,contract:network.contract.toLowerCase(),records:[...this.records.values()]};
    const temp=this.stateFile+'.tmp';
    await fs.writeFile(temp,JSON.stringify(data,null,2),{mode:0o600});
    await fs.rename(temp,this.stateFile);
  }
  async poll() {
    if(this.processing) return;
    this.processing=true;
    try {
      const entries=await fs.readdir(this.inbox,{withFileTypes:true});
      for(const entry of entries.sort((a,b)=>a.name.localeCompare(b.name))) {
        if(!entry.isFile() || entry.name.startsWith('.')) continue;
        const file=path.join(this.inbox,entry.name);
        const stat=await fs.lstat(file).catch(()=>null);
        if(!stat || !stat.isFile() || stat.isSymbolicLink()) continue;
        if(stat.size===0 || stat.size>this.maxFileBytes) continue;
        const signature=`${stat.size}:${stat.mtimeMs}`;
        if(this.seen.get(file)!==signature) {this.seen.set(file,signature);continue;}
        const sha256=await sha256File(file);
        const after=await fs.lstat(file).catch(()=>null);
        // A file can change while being hashed; never attest a partial/mixed read.
        if(!after || !after.isFile() || after.isSymbolicLink() || `${after.size}:${after.mtimeMs}`!==signature) {
          this.seen.delete(file);
          continue;
        }
        const previous=this.records.get(sha256);
        if(previous?.status==='confirmed'||previous?.status==='already_registered') continue;
        if(previous && Date.now()-Date.parse(previous.lastAttempt)<WAIT_RETRY_MS) continue;
        const classification=await this.classify(file);
        const metadataHash=deterministicMeta({sha256,category:classification.category});
        const record={sha256,filename:entry.name,bytes:stat.size,category:classification.category,aiMode:classification.mode,metadataHash,network:network.chainId,status:'pending',lastAttempt:new Date().toISOString(),txHash:previous?.txHash||null};
        this.records.set(sha256,record); await this.persist();
        try {
          const result=await this.submit(sha256, metadataHash);
          Object.assign(record,{status:result.status,txHash:result.txHash||record.txHash,block:result.block||null,attestedAt:result.timestamp||null,error:null});
          console.log(`[attestation] ${entry.name}: ${record.status} ${record.txHash||''}`);
        } catch(error) {
          record.status='retry'; record.error=String(error?.shortMessage||error?.message||error).slice(0,240);
          console.error(`[attestation] ${entry.name}: ${record.error}`);
        }
        await this.persist();
      }
    } finally {this.processing=false;}
  }
  getRecords() {return [...this.records.values()].map(rec=>({...rec})).reverse();}
  start(interval=config.pollMs) {
    if(this.running) return;
    this.running=true;
    this.timer=setInterval(()=>this.poll().catch(error=>console.error('poll:',error.message)),interval);
    this.poll().catch(error=>console.error('poll:',error.message));
  }
  stop() {clearInterval(this.timer); this.running=false;}
}
