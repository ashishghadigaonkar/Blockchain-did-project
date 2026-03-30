# DIDChain — Decentralized Identity System
> Built on Ethereum (Sepolia) · IPFS · Web3.js · MetaMask

---

## 📁 Project Structure

```
did-identity/
├── contracts/
│   └── DIDRegistry.sol        ← Solidity smart contract
└── frontend/
    ├── index.html             ← Single-page dashboard
    ├── css/
    │   └── style.css
    └── js/
        ├── contract.js        ← ABI + contract address config
        └── app.js             ← MetaMask + Web3 logic
```

---

## 🚀 Step-by-Step Deployment Guide

### Phase 1 — Deploy the Smart Contract (Remix IDE)

1. **Open Remix** → https://remix.ethereum.org
2. Create a new file: `DIDRegistry.sol`
3. Paste the contents of `contracts/DIDRegistry.sol`
4. Go to **Solidity Compiler** tab → select `0.8.19` → click **Compile**
5. Go to **Deploy & Run Transactions** tab:
   - Environment: **Injected Provider - MetaMask**
   - MetaMask must be on **Sepolia Testnet**
6. Click **Deploy** → confirm in MetaMask
7. **Copy the deployed contract address** from the Remix terminal

> 💡 Get free Sepolia ETH from: https://sepoliafaucet.com

---

### Phase 2 — Configure the Frontend

Open `frontend/js/contract.js` and replace:

```js
const CONTRACT_ADDRESS = "0xYOUR_DEPLOYED_CONTRACT_ADDRESS_HERE";
```

with your actual deployed address, e.g.:

```js
const CONTRACT_ADDRESS = "0x1a2b3c4d5e6f...";
```

---

### Phase 3 — Run the Frontend

Simply open `frontend/index.html` in any modern browser.

> No build step required — it's plain HTML + JS.

For a local server (optional, avoids CORS):
```bash
npx serve frontend/
# or
python3 -m http.server 8080 --directory frontend/
```

Then visit http://localhost:8080

---

## 🔧 How to Use

1. **Connect Wallet** — Click "Connect Wallet" button; MetaMask will prompt you
2. **Auto-switch** — The app will automatically switch MetaMask to Sepolia
3. **Register** — Fill in Name, College, ID → click "Register on Blockchain"
4. **Lookup** — Enter any Ethereum address to fetch their on-chain DID
5. **Update** — If you already have an identity, the button changes to "Update Identity"

---

## 🌐 IPFS Integration (Production)

In the current version, profile data is hashed locally for demo purposes.
To store real data on IPFS via Pinata:

1. Sign up at https://pinata.cloud
2. Get your API key
3. In `app.js`, replace `mockIpfsUpload()` with a Pinata upload:

```js
async function pinataUpload(profileData) {
  const res = await fetch("https://api.pinata.cloud/pinning/pinJSONToIPFS", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "pinata_api_key": "YOUR_PINATA_API_KEY",
      "pinata_secret_api_key": "YOUR_PINATA_SECRET"
    },
    body: JSON.stringify(profileData)
  });
  const data = await res.json();
  return data.IpfsHash; // real CID
}
```

---

## 🔑 Key Concepts

| Concept | Description |
|---|---|
| **DID** | Decentralized Identifier — `did:ethr:sepolia:0x...` |
| **IPFS Hash** | Only this pointer is stored on-chain, never PII |
| **Immutability** | Once registered, history is permanent on Ethereum |
| **ZKP** | Prove claims without revealing underlying data |

---

## 📜 Smart Contract Functions

| Function | Access | Description |
|---|---|---|
| `registerIdentity(ipfsHash)` | Public | Register a new DID |
| `updateIdentity(newHash)` | Owner only | Update your identity document |
| `revokeIdentity()` | Owner only | Deactivate your DID |
| `getIdentity(address)` | Public view | Retrieve any identity |
| `hasIdentity(address)` | Public view | Check if address has DID |

---

## 🛡️ Privacy by Design

- ✅ No name, date of birth, or any PII is stored on-chain
- ✅ Only a cryptographic hash (IPFS CID) lives on the public ledger
- ✅ The identity document on IPFS can be encrypted
- ✅ Follows W3C Decentralized Identifier (DID) specification

---

## 📚 Tech Stack

| Component | Technology |
|---|---|
| Blockchain | Sepolia Testnet (Ethereum) |
| Smart Contract | Solidity ^0.8.19 |
| IDE | Remix IDE |
| Wallet | MetaMask |
| Library | Web3.js v4 |
| Storage | IPFS (via Pinata) |
| Frontend | Vanilla HTML/CSS/JS |
