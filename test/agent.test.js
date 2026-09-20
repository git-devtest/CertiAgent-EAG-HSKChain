import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {createHash} from 'node:crypto';
process.env.NETWORK='hsk-testnet';
const {Agent,sha256File,deterministicMeta}=await import('../src/agent.js');

async function fixture(t,submit,options={}) {
  const root=await fs.mkdtemp(path.join(os.tmpdir(),'certiagent-test-'));
  t.after(()=>fs.rm(root,{force:true,recursive:true}));
  const inbox=path.join(root,'inbox');const storage=path.join(root,'storage');
  const agent=new Agent({inbox,storage,submit,classify:async()=>({mode:'disabled',category:'unclassified'}),...options});
  await agent.init();return {agent,inbox,storage};
}

test('hashes bytes (not filenames) with SHA-256',async t=>{
  const {inbox}=await fixture(t,async()=>{});
  const data=Buffer.from('hola hackathon\n');
  const file=path.join(inbox,'test.pdf');await fs.writeFile(file,data);
  assert.equal(await sha256File(file),createHash('sha256').update(data).digest('hex'));
});

test('ignores growing files; registers only after two matching directory polls',async t=>{
  const calls=[];
  const {agent,inbox}=await fixture(t,async(hash,meta)=>{calls.push([hash,meta]);return {status:'confirmed',txHash:'0x123',timestamp:'2026-09-20T00:00:00Z',block:4}});
  await fs.writeFile(path.join(inbox,'cert.txt'),'first');await agent.poll();
  assert.equal(calls.length,0);
  await fs.writeFile(path.join(inbox,'cert.txt'),'updated');await agent.poll();
  assert.equal(calls.length,0);
  await agent.poll();
  assert.equal(calls.length,1);
  assert.match(calls[0][0],/^[a-f0-9]{64}$/);
  assert.equal(calls[0][1],deterministicMeta({sha256:calls[0][0],category:'unclassified'}));
  assert.equal(agent.getRecords()[0].status,'confirmed');
  await agent.poll();assert.equal(calls.length,1);
});

test('recovers persisted confirmation without issuing second transaction',async t=>{
  let calls=0;const {agent,inbox,storage}=await fixture(t,async()=>{calls++;return {status:'confirmed',txHash:'0x456'}});
  await fs.writeFile(path.join(inbox,'a.txt'),'test content');
  await agent.poll();await agent.poll();assert.equal(calls,1);
  const recovered=new Agent({inbox,storage,submit:async()=>{calls++;throw Error('duplicate')},classify:async()=>({mode:'disabled',category:'unclassified'})});
  await recovered.init();await recovered.poll();await recovered.poll();
  assert.equal(calls,1);assert.equal(recovered.getRecords()[0].status,'confirmed');
});

test('retries chain errors after backoff rather than presenting false success',async t=>{
  let calls=0;
  const {agent,inbox}=await fixture(t,async()=>{calls++;if(calls===1)throw Error('RPC unavailable');return {status:'confirmed',txHash:'0x789'}});
  await fs.writeFile(path.join(inbox,'a.txt'),'data');await agent.poll();await agent.poll();
  assert.equal(agent.getRecords()[0].status,'retry');assert.equal(calls,1);
  await agent.poll();assert.equal(calls,1);
  const sha=agent.getRecords()[0].sha256;agent.records.get(sha).lastAttempt='2020-01-01T00:00:00Z';
  await agent.poll();assert.equal(calls,2);assert.equal(agent.getRecords()[0].status,'confirmed');
});

test('rejects symlinks, empty, oversized files',async t=>{
  const {agent,inbox}=await fixture(t,async()=>{throw Error('Should not submit')},{maxFileBytes:4});
  const outside=path.join(path.dirname(inbox),'outside');await fs.writeFile(outside,'doc');
  await fs.symlink(outside,path.join(inbox,'link.txt'));
  await fs.writeFile(path.join(inbox,'zero.txt'),'');await fs.writeFile(path.join(inbox,'large.txt'),'12345');
  await agent.poll();await agent.poll();assert.deepEqual(agent.getRecords(),[]);
});
