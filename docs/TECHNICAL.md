# Technical documentation — CertiAgent

## Problem / user

Employers, universities and independent creators need a way to show that a particular byte-for-byte document version was registered at a public timestamp without disclosing the document itself to a third-party file-hosting service. Manually remembering to submit hashes produces gaps. An authorized, continuously running local agent reduces these gaps; verification does not require access to the original operator's device.

## Architecture

```text
Operator drops document into LOCAL inbox/
                |
         Poller + stable-size/mtime gate
                |
       SHA-256 (streaming, local only)
                |
   Optional Ollama local AI category tag
                |
  local metadata SHA-256 = sha256("certiagent:v1:" + fileHash + ":" + category)
                |
            Agent wallet (new, separate, authorize via MetaMask)
                |
    EVM Registry: HSK 133 / HSK 177 / Sepolia 11155111
                |
      Confirmed tx hash / owner / timestamp stored in local storage/
                |
  Browser: original file -> local SHA-256 -> /api/verify -> EVM verify()
```

**Trust model:** the authorized agent represents the operator; the registry anchors a hash and the block timestamp, not real-world issuer identity, document legality, semantic validity or trustworthy content. Users must authenticate issuers outside this MVP. File bytes are never transmitted to the chain or the local web API. Optional Ollama sees only a bounded local snippet of `.txt`/`.md` (or only names for other formats); sensitive local filenames still appear in local operator logs and UI. All responses can be independently checked against explorer contract state.

## Security and failure recovery

- `AGENT_PRIVATE_KEY` resides in local `.env`, excluded from git and generated afresh; MetaMask's owner private key is never read by the Node service. Agent must be authorized on-chain via `setAgent` by the actual owner. Both agents and the owner can attest only because of explicit allowlist; owner can revoke an agent.
- Validate `eth_chainId` from RPC, `getCode(contract) != 0x`, owner ABI call before using a configured address. Use chain-specific contract addresses, explorer links and local records.
- Poll directory rather than relying solely on unreliable cross-platform filesystem event notification. Skip symlinks, directories, zero-byte and oversized files. Hash via stream. Wait for two stable `(size,mtime)` observations before writing. Retry errors with a bounded delay; do not report failed transactions as success. Only show `confirmed` after tx receipt with `status=1` and a subsequent `verify()` call.
- Persistence: JSON state is written via a temporary file and renamed. After a crash between sending a tx and persisting its result, the next poll reads chain state before submitting again. Duplicate contract writes revert.
- The contract is intended for hash anchoring. An attacker with an authorized agent wallet can submit malicious hashes or exhaust its gas. Owner must revoke compromised agents and use a dedicated low-balance agent wallet. Filenames may reveal sensitive information locally. Do not expose the local UI or `.env` publicly.
- The owner must have native gas to deploy / authorize; the agent must have native gas for each attestation. Sepolia ETH and HSK testnet tokens are not interchangeable and cannot fund HSK mainnet transactions.

## Selected tracks

EAG `Real-World Ethereum Applications` (practical record-integrity workflow) and HSK `Blockchain Infrastructure` (reusable autonomous folder-to-EVM registry). Optional local-model demo enables the additional **technical theme** of `AI × Web3`; it is not a claim of AI-driven validation. HSK mainnet is preferred by the event guideline; it explicitly permits HSK testnet if time is limited. Do not claim a mainnet deployment until it actually exists.

## Original repo audit

Original `git-devtest/blockchain-cert` default branch is `develop`; it includes Angular 21 frontend, Express/TypeScript and PostgreSQL backend, Solidity `CertificadorDocumentos.sol`, a deployed Polygon Amoy V2 address and legacy V1 support. Browser code calculates SHA-256 on original bytes; backend sends a string hash and description via a wallet to `certificar`. Original code already has issuer authorization, idempotency and public lookup. Its API/frontend and chain links are Polygon-specific; setting only an RPC variable would NOT deliver an autonomous bot or new HSK Chain deployment. The original contract accepts arbitrary nonempty string hashes and stores plaintext descriptions, creating avoidable metadata exposure and storage expense. This derivative uses `bytes32` and a minimal per-document record without plaintext descriptions. It deliberately does not copy the original DB credentials, default dev user, Polygon V1/V2 addresses, or deployment history into HSK.

## Test and deployment status (fill before Devfolio)

- Local Node tests: run `npm test`, record pass/fail.
- Solidity compile: run `npm run compile`, record compiler output.
- HSK Testnet contract: **PENDING OPERATOR DEPLOYMENT** (`0x...` after verification).
- Agent authorization transaction: **PENDING OPERATOR METAMASK CONFIRMATION**.
- First document attestation transaction: **PENDING OPERATOR EXECUTION**.
- Ethereum Sepolia contract: **OPTIONAL SECOND DEPLOYMENT**.
- HSK Mainnet contract: **NOT DEPLOYED; REQUIRES MAINNET HSK**.

Do not submit this file with placeholders as if the transactions had been completed.
