# CertiAgent | EAG Global Hackathon × HSK Chain

**Standalone derivative** of [`git-devtest/blockchain-cert`](https://github.com/git-devtest/blockchain-cert/tree/develop), built for the Cali 2026 hackathon. The original Polygon Amoy application and its deployment are **not modified**. This repository is a self-contained, independently deployable Node.js + Solidity MVP.

CertiAgent watches a local `inbox/` folder, detects stable files, computes their **SHA-256 over original bytes**, optionally classifies them using a **local Ollama model**, and submits a hash plus a privacy-preserving metadata digest to a smart contract on **HSK Chain Testnet (133)**, **HSK Chain Mainnet (177)**, or **Ethereum Sepolia (11155111)**. The operator can verify a local file against a chain contract using a web interface. A dedicated, limited-purpose agent wallet must be explicitly authorized by the contract owner from MetaMask.

**Precisely what the on-chain record proves:** an authorized account registered a particular 32-byte hash by a block timestamp. It does **not** prove that the source document is truthful, valid, issued by a claimed institution, or actually existed before the on-chain timestamp. Source files and filenames are never sent on-chain. AI classification is a local workflow label, not a validity verdict.

## Hackathon tracks and status

- **EAG:** `Real-World Ethereum Applications` — document integrity workflows for employers, universities and local organizations. Alternatively `Application Middleware & Open-Source Tooling` if you present the reusable registry + watcher rather than the user-facing app.
- **HSK:** `Blockchain Infrastructure` — onchain document hash registry and autonomous folder-to-chain integration, using HSK-native gas. **Only select `AI × Web3` if you actually enable, run and show the local Ollama classifier in the demo.** If showing an AI agent, `AI x Ethereum & Agent Economy` is an optional EAG selection, not an automatically fulfilled claim.
- **Cali participation:** also select `Colombia Hackathon` and `HSK Chain` in the official submission form. HSK mainnet is the preferred deployment; the event's provided guideline explicitly permits **testnet when time is limited**. The judges, not this README, decide eligibility.
- **Implementation:** source code, local UI, watcher, tests and deployment workflow are supplied. **No on-chain deployment, real-transaction success or prize is asserted by this package.** Set contract addresses only after checking explorer receipts.

## 0. Security — before touching any wallet

An uploaded project reference contains a **private key** in plain text. Consider that wallet compromised; never reuse that key, do not copy it into this project, and move any mainnet assets to a **new, independently generated wallet** using a trusted device. Create a **new, disposable agent wallet** with `npm run wallet:new` below. The `.env` file is gitignored; never upload it, your seed phrase or any key in a public submission. For the hackathon, the original MetaMask owner wallet should sign contract deployment and agent authorization directly inside MetaMask; it need not disclose its key to this application.

## 1. Start from a separate repository

Create a new GitHub repository named `certiagent-hsk` and upload **the contents of this folder**; do not push to the original `blockchain-cert` project's `develop` branch. If you cloned the original, keep its Polygon configuration untouched and work in a separate directory.

Requires Node.js 22+, npm and the MetaMask browser extension. For actual blockchain writes, your chosen network must have real connectivity and both deployer and agent wallets must hold sufficient **native gas token on that network**. `0 HSK` on mainnet is not enough to deploy or write there. Testnet HSK cannot pay mainnet gas.

```bash
npm install
npm run compile
npm run wallet:new
npm test
npm start
```

Open `http://127.0.0.1:8787`. `npm run wallet:new` writes a new agent key **only to local `.env`**, and prints **only the agent public address**. Back it up securely. If a key is already present, the command refuses to replace it.

## 2. Deploy the contract from MetaMask

1. Choose a network by editing `.env`: `NETWORK=hsk-testnet` (default), `NETWORK=sepolia`, or `NETWORK=hsk-mainnet`, then restart `npm start` if needed. The app checks the configured chain ID.
2. Obtain the native gas token for the owner MetaMask wallet **on that network**. For HSK testnet, use the hackathon faucet; the private-key-compromised wallet must not be funded or used.
3. Click **Conectar MetaMask** in the local UI; select the owner wallet. Click **Desplegar contrato**. MetaMask asks you to confirm the **new contract creation transaction**; the app shows the address once confirmed. If the app cannot fetch `/artifact.json`, run `npm run compile` and restart the server. As an alternative, compile `contracts/CertiAgentRegistry.sol` in Remix (Solidity 0.8.24+) and deploy through its Injected Provider / MetaMask; do not paste private keys into Remix.
4. Copy the deployed contract address **from the confirmed receipt / explorer** to the matching line in `.env` (see below), save and restart `npm start`:

| `.env` network | Contract setting | Chain ID | RPC | Explorer |
|---|---|---:|---|---|
| `hsk-testnet` | `HSK_TESTNET_CONTRACT=0x...` | 133 | `https://testnet.hsk.xyz` | `https://testnet-explorer.hskchain.net` |
| `hsk-mainnet` | `HSK_MAINNET_CONTRACT=0x...` | 177 | `https://mainnet.hsk.xyz` | `https://hashkey.blockscout.com` |
| `sepolia` | `SEPOLIA_CONTRACT=0x...` | 11155111 | `https://ethereum-sepolia-rpc.publicnode.com` | `https://sepolia.etherscan.io` |

**Note:** the reference DOCX mistakenly lists the *testnet* RPC for HSK mainnet. This project uses HSK's officially documented mainnet RPC. Do not use testnet RPC under chain ID 177.

## 3. Authorize and fund the agent

1. Copy the agent **public address** shown under `01 · Estado de la red`.
2. Send a small amount of **native testnet HSK** from your new owner wallet or a faucet **to the agent address**. An agent can be authorized but cannot execute without gas. For mainnet, only real mainnet HSK works.
3. In the UI, connect the **contract-owning MetaMask account** and click **Autorizar agente**; confirm `setAgent(agentAddress, true)` in MetaMask. Once the transaction confirms, authorization reads `true` from the contract. Do **not** confuse authorization with a token allowance; only hash registration is granted.
4. The local agent daemon will detect any stable regular file placed in `inbox/`, compute its SHA-256, and call `attest(bytes32,bytes32)` with its own wallet. After one on-chain confirmation, the UI shows the transaction link. `storage/` holds only local status/filename data and is excluded from git.
5. Upload the *same original file* to the UI verification box. The browser computes its hash locally, the API calls the selected chain's `verify(hash)`, and displays the result. Modify one byte and verify again: the new hash should not be present in this contract.

**If you need Ethereum Sepolia as well:** redeploy separately after `NETWORK=sepolia`, set `SEPOLIA_CONTRACT`, fund & authorize the agent on Sepolia and restart. Records are scoped to chain ID and contract; testnet attestations do not magically migrate across networks.

## 4. Local AI classifier (optional, demonstrable)

The watcher works **without AI**. To demonstrate `AI × Web3`, install Ollama independently, pull a local model such as `llama3.2:3b`, confirm its API responds at `127.0.0.1:11434`, set `AI_ENABLED=true` in `.env`, and restart. It asks the model for one of five workflow categories (`certificate`, `contract`, `invoice`, `letter`, `other`). It reads at most 4,096 bytes of `.txt` or `.md` **locally**; for PDFs and DOCX it classifies **the filename and extension only**; it never claims to parse/validate PDF contents. An unavailable model does not fabricate an AI verdict (`aiMode=unavailable`). The category influences the local metadata hash; **the raw model prompt, excerpt and category are not put on-chain**.

## 5. Public API / core smart contract

```text
GET /api/status               Selected chain, contract, owner, public agent wallet, authorization
GET /api/records              Local agent progress and confirmed tx hashes
GET /api/verify?sha256=<hex>  On-chain verification (64 hex characters)
GET /artifact.json            Contract ABI + bytecode generated by `npm run compile`
```

`contracts/CertiAgentRegistry.sol`: owner / agent allowlist; `attest(bytes32 fileHash, bytes32 metadataHash)`; `verify(bytes32 fileHash)`; `setAgent(agent,bool)`; immutable historical attestation (no deletion). A second attempt to certify the same hash on the same contract reverts; the daemon checks first and marks it as `already_registered` without writing again.

The HTTP service binds to `127.0.0.1` only and does not provide a public credentialed deployment endpoint. The actual local-folder watcher **must keep running**; a serverless deployment of only the webpage is not enough to execute local-file monitoring. The selected network's RPC is used to read contract state; the agent signs its own transactions locally with its dedicated wallet.

## 6. Validation and scope

```bash
npm run check   # JavaScript syntax checks
npm test        # 5 automated local tests; mock blockchain submitter, NO real gas or chain calls
npm run compile # Compile Solidity; requires npm install and solc package
```

Review the deployment receipt, both transactions (authorization + document registration), `chainId`, explorer pages, your demo video and the live `verify()` result **before submitting**. The Node tests do not establish successful contract compilation, network deployment or prize eligibility. See [`docs/TECHNICAL.md`](docs/TECHNICAL.md), [`docs/SUBMISSION.md`](docs/SUBMISSION.md) and [`docs/DEMO.md`](docs/DEMO.md).

## Reused concepts vs original Polygon app

Reused the **SHA-256-on-file** model, role-limited contract writing, onchain verification, event logging, and user-facing transaction links. Replaced the Polygon-specific chain settings, coupled Angular/Express/PostgreSQL authentication stack, human-initiated registration and legacy contract addresses with a smaller standalone multichain registry, automatically polling local agent, MetaMask-mediated deployment/authorization, and privacy-first optional local AI. **No Polygon migration, legacy hash backfill or authority transfer occurs.**

## License

MIT. Based conceptually on the original project; the new smart contract and agent are self-contained.
