import { network, config } from './config.js';

export const ABI = [
  'function owner() view returns (address)',
  'function agents(address) view returns (bool)',
  'function setAgent(address agent,bool allowed)',
  'function attest(bytes32 fileHash,bytes32 metadataHash)',
  'function verify(bytes32 fileHash) view returns (bool exists,address agent,uint64 timestamp,bytes32 metadataHash)',
  'event DocumentAttested(bytes32 indexed fileHash,address indexed agent,uint64 timestamp,bytes32 metadataHash)'
];

let cached;
export async function getChain() {
  if (cached) return cached;
  if (!/^0x[\da-fA-F]{40}$/.test(network.contract)) {
    throw Error(`Contract not configured for ${config.networkName}; deploy first and set its *_CONTRACT env variable`);
  }
  const { ethers } = await import('ethers');
  const provider = new ethers.JsonRpcProvider(network.rpc, network.chainId, {staticNetwork: true});
  const reportedId = await provider.send('eth_chainId', []);
  if (Number(BigInt(reportedId)) !== network.chainId) throw Error('Incorrect RPC chain ID');
  const code = await provider.getCode(network.contract);
  if (code === '0x') throw Error('No contract code at configured address');
  const contract = new ethers.Contract(network.contract, ABI, provider);
  const existingOwner = await contract.owner();
  if (!ethers.isAddress(existingOwner)) throw Error('Configured contract does not match ABI');
  let signer, writer;
  if (config.agentKey) {
    signer = new ethers.Wallet(config.agentKey, provider);
    writer = contract.connect(signer);
  }
  cached = { ethers, provider, contract, signer, writer };
  return cached;
}

export async function verifyHash(hex) {
  if (!/^[0-9a-f]{64}$/i.test(hex)) throw Error('Expected 64-character SHA-256 hex hash');
  const {contract} = await getChain();
  const [exists, agent, timestamp, metadataHash] = await contract.verify(`0x${hex.toLowerCase()}`);
  return {exists, agent: exists ? agent : null, timestamp: exists ? new Date(Number(timestamp)*1000).toISOString() : null, metadataHash: exists ? metadataHash : null};
}

export async function attestHash(hash, metaHash) {
  const {contract, signer, writer} = await getChain();
  if (!writer || !signer) throw Error('AGENT_PRIVATE_KEY not configured');
  if (!(await contract.agents(signer.address))) throw Error(`Agent ${signer.address} not authorized. Owner must setAgent(agent,true) in MetaMask.`);
  const existing = await verifyHash(hash);
  if (existing.exists) return {status:'already_registered', txHash:null, ...existing};
  const tx = await writer.attest(`0x${hash}`, `0x${metaHash}`);
  const receipt = await tx.wait(1);
  if (!receipt || receipt.status !== 1) throw Error(`Transaction failed: ${tx.hash}`);
  return {status:'confirmed', txHash:tx.hash, block:receipt.blockNumber, ...await verifyHash(hash)};
}
