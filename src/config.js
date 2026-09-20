import fs from 'node:fs';
import path from 'node:path';

function loadEnv(file = path.resolve('.env')) {
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const match = /^\s*([A-Z][A-Z_0-9]*)\s*=\s*(.*)\s*$/.exec(line);
    if (match && !Object.hasOwn(process.env, match[1])) {
      const value = match[2].trim().replace(/^(?:"(.*)"|'(.*)')$/, (_s, a, b) => a ?? b);
      process.env[match[1]] = value;
    }
  }
}
loadEnv();

export const NETWORKS = Object.freeze({
  'hsk-testnet': {chainId: 133, rpc: process.env.HSK_TESTNET_RPC || 'https://testnet.hsk.xyz', contract: process.env.HSK_TESTNET_CONTRACT || '', explorer: 'https://testnet-explorer.hskchain.net', currency: 'HSK'},
  'hsk-mainnet': {chainId: 177, rpc: process.env.HSK_MAINNET_RPC || 'https://mainnet.hsk.xyz', contract: process.env.HSK_MAINNET_CONTRACT || '', explorer: 'https://hashkey.blockscout.com', currency: 'HSK'},
  'sepolia': {chainId: 11155111, rpc: process.env.SEPOLIA_RPC || 'https://ethereum-sepolia-rpc.publicnode.com', contract: process.env.SEPOLIA_CONTRACT || '', explorer: 'https://sepolia.etherscan.io', currency: 'ETH'}
});
export const config = Object.freeze({
  networkName: process.env.NETWORK || 'hsk-testnet',
  port: Number(process.env.PORT || 8787),
  inbox: path.resolve(process.env.INBOX_DIR || './inbox'),
  storage: path.resolve(process.env.STORAGE_DIR || './storage'),
  pollMs: Math.max(1000, Number(process.env.POLL_MS || 2500)),
  maxFileBytes: Number(process.env.MAX_FILE_MB || 10) * 1024 * 1024,
  agentKey: process.env.AGENT_PRIVATE_KEY || '',
  aiEnabled: process.env.AI_ENABLED === 'true',
  ollamaUrl: process.env.OLLAMA_URL || 'http://127.0.0.1:11434',
  ollamaModel: process.env.OLLAMA_MODEL || 'llama3.2:3b'
});
if (!Object.hasOwn(NETWORKS, config.networkName)) throw Error(`Unknown NETWORK: ${config.networkName}`);
export const network = NETWORKS[config.networkName];
