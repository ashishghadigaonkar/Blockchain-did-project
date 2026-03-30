# 🌐 IPFS Implementation Guide

This document explains how **IPFS (InterPlanetary File System)** is used in the DIDChain project to store identity data securely and efficiently.

---

## 💡 What is IPFS?
IPFS is a decentralized, peer-to-peer storage network. Unlike traditional web links (URLs) that point to a *location* (like a server's IP), IPFS uses **Content Addressing**. 

- When you upload a file to IPFS, it generates a unique **CID (Content Identifier)** based on the file's data.
- If even one character in the file changes, the CID changes completely.
- This creates an immutable link between the blockchain and the storage.

---

## 🛠️ How it Works in This Project

The project integrates IPFS using the **Pinata API** to ensure your identity documents are "pinned" (persistently stored) on the network.

### 1. Data Structuring
The frontend takes your input (Name, Email, etc.) and formats it into a standard **JSON** object:
```json
{
  "@context": "https://www.w3.org/ns/did/v1",
  "id": "did:ethr:sepolia:0x123...",
  "name": "Arjun Sharma",
  "email": "arjun@example.com",
  "timestamp": 1711123456789
}
```

### 2. The Upload Flow (`uploadToPinata`)
- The JSON is sent to the **Pinata API** via an authenticated `POST` request using your API keys.
- Pinata stores the JSON across its IPFS nodes.
- Pinata returns a **CID** (e.g., `QmXoyp...` or `bafyrei...`).

### 3. On-Chain Anchoring
- The **CID** is sent to the `DIDRegistry.sol` smart contract on Ethereum Sepolia.
- The contract stores this short string (the CID) next to your wallet address.
- **Result:** You've linked a large identity file to the blockchain for a fraction of the cost of storing the full text on-chain.

### 4. Retrieval & Verification (`fetchFromPinata`)
- When someone looks up your identity, the frontend calls the contract to get your CID.
- It then uses a **Public Gateway** (provided by Pinata) to fetch the JSON:
  `https://gateway.pinata.cloud/ipfs/[YOUR_CID]`
- The data is parsed and displayed in the **Dashboard**.

---

## 🔒 Privacy & Security
- **No PII on Blockchain**: Your name and email never touch the public ledger. Only the CID is public.
- **Tamper Evidence**: If someone tries to change your data on IPFS, the CID on-chain will no longer match the new data, making the fraud immediately detectable.
- **Decentralization**: Even if the DIDChain website goes down, your identity document still exists on the IPFS network and can be retrieved using any IPFS gateway.

---

## 🔑 Your API Configuration
In `frontend/js/app.js`, the `uploadToPinata` function uses your specific credentials:
- **API Key**: `5200b2b731a77dc1ff52`
- **Secret Key**: `222cd6...`

These keys allow the frontend to interact with your Pinata account directly from the browser.
