# ⬡ DIDChain: Decentralized Identity System

DIDChain is a self-sovereign digital identity platform built on the **Ethereum Sepolia Testnet**. It enables users to register, manage, and verify their digital identities without storing any Personally Identifiable Information (PII) on the blockchain. Instead, it uses **IPFS** for storage and only records cryptographic hashes on-chain.

---

## 🚀 Core Features

### 1. Smart Wallet Integration
- **MetaMask Connection**: Securely connect using the industry-standard wallet.
- **Auto-Network Management**: Automatically detects if you are on the wrong network and prompts to switch to **Sepolia**. It can even add the Sepolia network to your MetaMask if it's missing.
- **Account Heartbeat**: UI updates in real-time when you switch accounts or disconnect.

### 2. Identity Dashboard (View Identity)
- **Live Status**: Instantly see if your account is `Active`, `Revoked`, or `Not Registered`.
- **Identity Card**: A unified view showing your registered Name, Email, Institution, and Student ID.
- **On-Chain Metadata**: Displays your unique IPFS CID (Content Identifier) and timestamps for when your identity was created and last updated.

### 3. Identity Lifecycle Management
- **Registration**: Pack your profile (Name, Email, etc.) into a JSON document, upload it to **Pinata (IPFS)**, and anchor the hash on the blockchain.
- **Secure Updates**: Change your profile data at any time. The contract tracks versions and update timestamps.
- **Revocation**: "Soft-delete" your identity. This marks it as inactive on-chain, preventing further lookups or updates while maintaining a history of the revocation.
- **Re-registration**: After revocation, the system allows you to start fresh and register a completely new identity for the same wallet address.

### 4. Global Lookup System
- **Public Registry**: Query any Ethereum address to see their public DID data.
- **Privacy First**: If an address has no identity or was revoked, the system returns a clean "No identity found" state to prevent contract errors.

### 5. Live Activity Feed
- **Real-Time events**: Uses Web3.js event listeners to pulse with live blockchain activity.
- **Activity Log**: See a scrolling feed of every `Registration`, `Update`, and `Revocation` happening across the entire network.

### 6. Identity Provider (OIDC-Bridge)
- **Authorize Endpoint**: External apps can link to `/authorize` to prompt users for a secure wallet signature.
- **JWT Issuance**: The system issues a cryptographically signed JSON Web Token (JWT) containing the user's DID and Trust Score.
- **Token Verification**: Developers can use the `/verify-token` API to ensure the authenticity of the user's identity.

---

## 🛠️ Technical Architecture

### **Layer 1: Blockchain (Solidity)**
The `DIDRegistry.sol` smart contract acts as the "Source of Truth." It stores:
- **Mapping**: `address => Identity` struct.
- **Security**: `onlyIdentityOwner` modifiers to ensure only you can modify your data.
- **Efficiency**: Minimal gas usage by only storing CIDs and timestamps.

### **Layer 2: Storage (IPFS via Pinata)**
Actual profile data is stored off-chain to save costs and protect privacy:
- Data is formatted as standard **JSON**.
- Uploaded via **Pinata API** for persistence.
- Cryptographic CID (`Qm...`) is produced to link the blockchain to the data.

### **Layer 3: Frontend (Web3.js + HTML/CSS)**
- **Web3.js (v1.10.4)**: Handles the heavy lifting of blockchain communication.
- **Custom UI**: A dark-mode, "Industrial Cyber" aesthetic with CSS-only animations and responsive layouts.
- **Error Handling**: Custom "Toast" notifications and logic to parse complex Solidity revert reasons into human-readable text.

---

## 💻 How to Run & Test

### **Prerequisites**
1. **MetaMask Extension** installed in your browser.
2. Some **Sepolia ETH** (get it from a faucet like [sepoliafaucet.com](https://sepoliafaucet.com)).

### **Local Deployment**
1. Navigate to the `frontend` directory in your terminal.
2. Start a local server:
   ```bash
   python -m http.server 8080
   ```
3. Open **[http://localhost:8080](http://localhost:8080)** in your browser.

### **Testing Flow**
1. **Connect**: Click "Connect Wallet" and approve Sepolia.
2. **Register**: Fill the form in the "Register" section.
3. **Verify**: Check your new stats in the **Dashboard**.
4. **Lookup**: Paste your own address into the "Lookup" bar.
5. **View**: Click "View My Identity" to see the data fetch from IPFS.
6. **Revoke**: Test the kill-switch via the dashboard "Revoke" button.

---

## 📁 Project Structure
- `/contracts`: Contains the `DIDRegistry.sol` smart contract.
- `/frontend/js/app.js`: Core frontend logic, event listeners, and Pinata integration.
- `/frontend/js/contract.js`: Contract ABI and address configuration.
- `/frontend/index.html`: Main UI structure and dashboard panels.
- `/frontend/css/style.css`: The "Cyber" theme and responsive styles.
