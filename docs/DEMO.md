# 3-minute showcase + 2-minute Q&A

**Preflight (do this BEFORE presentation):** the app is open at `http://127.0.0.1:8787`, network badge is HSK 133 or 177, `/api/status` reports `ready:true`, `authorized:true` and a genuine contract, the dedicated agent has HSK gas, and you have the explorer link for a real confirmed attestation. Make a backup recording of the entire genuine flow. Only choose the AI track if `AI_ENABLED=true` and the actual status shows the local model ran.

0:00–0:25 — State the specific problem: manual document integrity registration can be missed; uploading confidential originals is undesirable. This tool anchors **hashes**, not validity of content.

0:25–1:05 — Show the existing HSK contract in the explorer, chain ID, dedicated agent wallet and MetaMask-derived authorization. Explain that onchain roles limit who can write.

1:05–1:50 — Drop a *demo document without private data* into `inbox/`. Refresh the UI until status is `confirmed`, click the live transaction and show `DocumentAttested` / chain status in the explorer. If a receipt is slow, show a previously verified tx explicitly identified as such and the current record as pending.

1:50–2:35 — Upload the same source document via the browser and press Verify; the bytes remain on the device and the onchain view shows the matching hash. Change a byte in a copy and verify again to show no match. If AI classification is enabled, show the label and that the AI input stays local.

2:35–3:00 — Show the GitHub repository README, tests and separate Polygon original; explain practical use for education/employment document integrity and the roadmap for issuer credential verification.

**Q&A preparation:**
- Does this prove a university signed the document? No. It attests hash registration by an authorized wallet; issuer identification is future work.
- Where is the PDF kept? Only in the operator's watched folder and wherever the operator stores it; no PDF onchain. Local records include filename, status and hash, not file bytes.
- Is this really on HSK? Prove with a **confirmed HSK testnet/mainnet explorer transaction** and deployed contract address. If only testnet is used, say so.
- Can anyone spam the contract? Only owner-approved agent addresses can attest; anyone can verify. Owner can revoke agents.
- What if the agent crashes or registration fails? The service retries, checks onchain state and does not label unconfirmed events as success.
- Can this win the 500 USDT? Prize award and eligibility are exclusively decided by the hackathon organizers. Do not claim they are guaranteed.
