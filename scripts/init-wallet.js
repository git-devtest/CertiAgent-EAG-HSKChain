import fs from 'node:fs';
import path from 'node:path';
import { Wallet } from 'ethers';
const target=path.resolve('.env');
const example=fs.readFileSync(new URL('../.env.example',import.meta.url),'utf8');
if(fs.existsSync(target)) {
  const prev=fs.readFileSync(target,'utf8');
  if(/^AGENT_PRIVATE_KEY=\s*0x[0-9a-f]{64}/im.test(prev))throw Error('Agent wallet exists in .env. Refusing to overwrite.');
}
const wallet=Wallet.createRandom();
const old=fs.existsSync(target)?fs.readFileSync(target,'utf8'):example;
if(!/^AGENT_PRIVATE_KEY=/m.test(old))throw Error('Cannot find AGENT_PRIVATE_KEY in .env');
fs.writeFileSync(target,old.replace(/^AGENT_PRIVATE_KEY=.*$/m,`AGENT_PRIVATE_KEY=${wallet.privateKey}`),{mode:0o600});
fs.chmodSync(target,0o600);
console.log(`Created a NEW dedicated agent wallet: ${wallet.address}`);
console.log('Secret written only to local .env (not printed). Back up .env securely; never commit it.');
console.log('Fund this agent wallet with TESTNET HSK, then authorize it from the contract owner wallet in MetaMask.');
