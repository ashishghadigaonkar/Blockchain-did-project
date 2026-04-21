# DIDChain: Step-by-Step Working Guide

This document provides a detailed, technical walkthrough of how the **DIDChain** Decentralized Identity system operates, from the user interface to the blockchain layer.

---

## 🏗️ 1. High-Level Architecture

DIDChain operates on a **Hybrid Web3 Architecture** that combines the speed of traditional web apps with the security of decentralized networks.

1.  **Frontend (Vanilla JS)**: The command center. It manages the user state, interacts with MetaMask, and coordinates data flow between the backend and the blockchain.
2.  **Backend (Node.js/Express)**: A security proxy. It handles sensitive communication with **Pinata (IPFS)** so that API keys are never exposed in the browser.
3.  **Storage (IPFS/Pinata)**: Distributed storage layer. It holds the actual identity JSON files (name, email, etc.).
4.  **Blockchain (Ethereum Sepolia)**: The "Source of Truth." It stores the mapping of wallet addresses to IPFS hashes (CIDs) and manages the reputation logic.

---

## 🔒 2. Step 1: Wallet Connection & Network Guard

Before any action can be taken, the system ensures a secure connection.

1.  **Connect Wallet**: The user clicks "Connect Wallet," triggering `window.ethereum.request({ method: 'eth_requestAccounts' })`.
2.  **Network Check**: The `checkNetwork()` function in `app.js` verifies if the user is on the **Ethereum Sepolia Testnet** (`0xaa36a7`).
3.  **Auto-Switch**: If the user is on the wrong network, the app prompts a switch. If Sepolia isn't in their MetaMask, the app adds it automatically using `wallet_addEthereumChain`.
4.  **State Sync**: Once connected, the app fetches the user's current identity status (Active, Revoked, or Not Registered) from the `DIDRegistry` contract.

---

## 📝 3. Step 2: Identity Registration Flow

This is the most complex part of the system, involving four distinct layers of technology.

### A. Data Packaging (Frontend)
- The user fills out the registration form (Name, College, ID, Email).
- The frontend packages this into a standardized JSON object following the **W3C Decentralized Identifier (DID)** context.

### B. Secure Upload (Backend Proxy)
- Instead of uploading directly to IPFS (which would expose API keys), the frontend sends the JSON to the **Node.js Backend** via `POST /upload`.
- The backend appends the **Pinata API Keys** and forwards the file to Pinata’s pinning service.
- Pinata returns a **Content Identifier (CID)** (e.g., `QmXoyp...`).

### C. Blockchain Anchoring (Smart Contract)
- The frontend receives the CID and triggers a MetaMask transaction: `contract.methods.registerIdentity(cid).send()`.
- The `DIDRegistry.sol` contract saves this CID in a mapping: `address => IdentityStruct`.
- The contract records the current block timestamp as `createdAt`.

### D. Reward & Reputation (Soulbound Token)
- Upon successful registration, the `DIDRegistry` automatically calls the `DIDToken` contract.
- It **mints 50 DID Tokens** (the `REGISTRATION_REWARD`) to the user’s address.
- **Soulbound Logic**: These tokens are non-transferable. The `_update` function in `DIDToken.sol` is overridden to ensure tokens can only be minted or burned, never traded between users.
  ```solidity
  require(from == address(0) || to == address(0), "Soulbound");
  ```

---

## 🔄 4. Step 3: Profile Updates

1.  The user modifies their details in the dashboard.
2.  A **new JSON file** is uploaded to IPFS, generating a **new CID**.
3.  The user signs an `updateIdentity(newCid)` transaction.
4.  The contract updates the `ipfsHash` pointer and the `updatedAt` timestamp.
5.  The user is rewarded with an additional **10 DID Tokens**.

---

## 🔍 5. Step 4: Global Identity Lookup

Anyone can verify anyone else's identity without a central login.

1.  A verifier enters an Ethereum address in the lookup bar.
2.  The app calls `hasIdentity(address)` to check if the user is active.
3.  If active, it calls `getIdentity(address)` to retrieve the on-chain CID.
4.  The app then fetches the JSON data from IPFS via the backend `GET /identity/:cid` route.
5.  **Privacy Note**: Only the hash is on the blockchain. If the user revokes their identity, the hash is "deleted" from the active mapping, making the data unfindable via the registry.

---

## 📈 6. Step 5: Reputation & Trust Score

The **Trust Score** is a dynamic value between **0 and 100** calculated in real-time on the blockchain. It represents the "reliability" of a decentralized identity based on historical behavior.

### The Algorithm
The score is calculated directly in the smart contract using the following weighted formula:

$$Score = (Registrations \times 10) + (Updates \times 5) - (Revocations \times 15)$$

- **Registrations (+10)**: Counted as 1 as soon as the identity is created. Rewards the initial step of joining the network.
- **Updates (+5 per update)**: Each time you update your profile, your identity `version` increases. Frequent updates prove the data is current and active.
- **Revocations (-15 penalty)**: If an identity is revoked (e.g., due to key compromise), the user is penalized. This discourages "identity cycling" and rewards long-term account stability.

### Technical Implementation
The `DIDRegistry.sol` contract implements this via the `getTrustScore` function:
- **Clamping**: The score is automatically capped at **100** and floored at **0** using logic to ensure it never underflows or exceeds the reputation limit.
- **Real-time**: Because it's a `view` function, the frontend and backend can fetch the latest score instantly without paying gas fees.

---

## 💰 7. Step 6: Tokenomics & Soulbound Integrity

The **DIDToken (DID)** is the project's native utility token, but unlike typical cryptocurrencies, it functions as a **"Proof of Participation."**

### Financial vs. Social Value
- **Non-Financial**: Since tokens are Soulbound (non-transferable), they have no "market price." You cannot buy a high reputation; you must earn it through activity.
- **Visual Status**: In the dashboard, a user's token balance acts as their "XP" or "Level." 100 DID tokens represent a user who has registered and performed at least 5 updates.

### Reward Schedule
| Event | Token Reward | Reasoning |
| :--- | :--- | :--- |
| **New Registration** | 50 DID | Onboarding incentive. |
| **Profile Update** | 10 DID | Reward for data maintenance. |

---

## ⚠️ 8. Step 7: Revocation (The "Kill-Switch")

If a user wants to remove their digital presence:
1.  They trigger `revokeIdentity()`.
2.  The contract sets `isActive = false` for that address.
3.  The identity no longer appears in lookups.
4.  The user's Trust Score is penalized by **-15 points**.

---

## 📡 9. Real-Time Activity Monitoring

The system uses **Web3 Event Listeners** to keep the dashboard alive:
- **IdentityRegistered**: Fired when a new user joins.
- **IdentityUpdated**: Fired when someone changes their data.
- **IdentityRevoked**: Fired when an account is deactivated.

The "Live Activity Feed" in the UI listens for these events across the entire Sepolia network, displaying a scrolling log of global identity actions.
