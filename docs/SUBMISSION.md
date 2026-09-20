# Devfolio submission — fill verified addresses/links, then paste

**Name:** CertiAgent — Autonomous privacy-first document anchoring on HSK Chain

**Tagline:** A local agent detects new documents and anchors their SHA-256 hashes on HSK Chain; owners authorize a dedicated agent wallet from MetaMask, and anyone with the file can independently check its integrity record without uploading it.

**Location:** Cali, Colombia. **Mandatory selection:** `Colombia Hackathon`. **EAG:** `Real-World Ethereum Applications`. **HSK:** `HSK Chain` and technical theme `Blockchain Infrastructure`. If the actual local AI demonstration is working, you may instead choose the `AI × Web3` HSK theme or `AI x Ethereum & Agent Economy` EAG theme in line with your demonstrated features. Avoid claiming an AI result when Ollama was not enabled.

**Problem:** Organizations create and revise records continuously; manual certification may be skipped, while uploading confidential documents to a public application creates privacy risks. This project registers only byte-level commitments to a blockchain, with an automatic local agent, owner-authorized onchain access and a public verification path.

**Demonstration:** [INSERT LIVE / VIDEO URL] — folder -> hash -> agent tx -> onchain contract/explorer -> verify same file -> modified file yields a different, absent hash.

**Source code:** [INSERT URL OF A NEW, PUBLIC REPOSITORY CONTAINING THIS ENTIRE PROJECT]. Do not insert the original Polygon-only GitHub link as if it contains these newly developed agent files.

**Deployment:** Network [HSK Testnet 133 / HSK Mainnet 177]; contract [INSERT CHECKED 0x ADDRESS]; deployment tx [INSERT CHECKED EXPLORER LINK]; agent authorization tx [INSERT CHECKED LINK]; document attestation tx [INSERT CHECKED LINK]. For a second Ethereum Sepolia deployment, include that verified address separately. Do not invent transaction hashes or falsely claim mainnet.

**Technical integration:** EVM Solidity `CertiAgentRegistry` grants owner-controlled agent authorization, stores `bytes32` SHA-256 file hashes with timestamps and hashes of local classification metadata; Node.js agent polls a local folder, hashes files using streaming SHA-256 and submits EVM transactions with ethers v6. Operator-controlled MetaMask signs deployment and role authorization; verifier calculates the file SHA-256 on-device and reads the selected EVM chain. Optional Ollama provides local, bounded workflow classification, not a verdict about authenticity.

**Running:** Node 22+, `npm install && npm run compile && npm run wallet:new && npm test && npm start`. Deploy from browser/MetaMask, save verified `*_CONTRACT` in `.env`, authorize and fund agent, drop document into `inbox/` and verify from the UI. Technical/security detail and roadmap in README and TECHNICAL.md.

**Roadmap:** verifiable issuer identities and provenance attestations; granular short-lived agent permissions/spending limits; robust content parsing & redaction for PDF/DOCX (currently NOT present); indexed document state and encrypted local records; mainnet roll-out after independent contract audit; multi-chain aggregated verification.

**Acknowledgements:** standalone hackathon derivative inspired by `git-devtest/blockchain-cert` (Polygon Amoy); the original project remains unchanged.
