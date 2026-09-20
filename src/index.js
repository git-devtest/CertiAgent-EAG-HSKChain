import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {Agent} from './agent.js';
import {config,network} from './config.js';
import {getChain,verifyHash} from './chain.js';

const agent=new Agent();
await agent.init();
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../public');
const assets={'/':'index.html','/app.js':'app.js','/style.css':'style.css','/ethers.js':'../node_modules/ethers/dist/ethers.umd.min.js','/artifact.json':'../build/CertiAgentRegistry.json'};
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8'};
function json(res,code,payload) {res.writeHead(code,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(payload));}
const server=http.createServer(async(req,res)=>{
  if(req.method!=='GET') return json(res,405,{error:'Method not allowed'});
  const route=new URL(req.url,'http://localhost');
  try {
    if(route.pathname==='/api/status') {
      let agentAddress=null,ready=false,error=null, owner=null,authorized=false;
      try {
        if (config.agentKey) {
          const {ethers}=await import('ethers');
          agentAddress=new ethers.Wallet(config.agentKey).address;
        }
        if(network.contract) {
          const chain=await getChain();
          owner=await chain.contract.owner();
          ready=true;
          if(agentAddress) authorized=await chain.contract.agents(agentAddress);
        }
      }catch(err){error=String(err.message).slice(0,180);}
      return json(res,200,{network:config.networkName,chainId:network.chainId,currency:network.currency,explorer:network.explorer,rpc:network.rpc,contract:network.contract||null,agentAddress,authorized,owner,ready,error,aiEnabled:config.aiEnabled,warning:'Hash attestation proves registration of bytes, not truth of document content or identity.'});
    }
    if(route.pathname==='/api/records')return json(res,200,agent.getRecords());
    if(route.pathname==='/api/verify') {
      const hash=(route.searchParams.get('sha256')||'').toLowerCase();
      if(!/^[\da-f]{64}$/.test(hash))return json(res,400,{error:'Invalid SHA-256 hex'});
      const info=await verifyHash(hash);
      return json(res,200,{sha256:hash,network:config.networkName,contract:network.contract,...info});
    }
    if(!Object.hasOwn(assets,route.pathname)) return json(res,404,{error:'Not found'});
    const file=path.resolve(ROOT,assets[route.pathname]);
    const data=await fs.readFile(file);
    res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'text/javascript; charset=utf-8','X-Content-Type-Options':'nosniff','Cache-Control':'no-store','Content-Security-Policy':"default-src 'self'; script-src 'self'; connect-src 'self' https://testnet.hsk.xyz https://mainnet.hsk.xyz https://ethereum-sepolia-rpc.publicnode.com; style-src 'self'; img-src 'self' data:; object-src 'none'; base-uri 'none'; frame-ancestors 'none'"});
    return res.end(data);
  }catch(error){console.error('HTTP:',error.message);return json(res,503,{error:String(error.message).slice(0,200)});}
});
server.listen(config.port,'127.0.0.1',()=>{
  console.log(`CertiAgent on http://127.0.0.1:${config.port} | ${config.networkName} (${network.chainId})`);
  console.log(`Watch directory: ${config.inbox}`);
  agent.start();
});
for(const event of ['SIGINT','SIGTERM'])process.on(event,()=>{agent.stop();server.close(()=>process.exit(0));});
