// ═══════════════════════════════════════════════════════════════
//  contract.js — ABI + deployed address configuration
//  ▸ Steps to go live:
//    1. Deploy DIDRegistry.sol on Sepolia via Remix IDE
//    2. Paste the deployed address into CONTRACT_ADDRESS below
//    3. Set IS_DEPLOYED = true
// ═══════════════════════════════════════════════════════════════

// ── Set to true ONLY after you have deployed DIDRegistry.sol ──
const IS_DEPLOYED = true;

const CONTRACT_ADDRESS = "0x196Bd2dFc770D0D484F4A5EF57a04E64678ba838";
//  ↑ Replace with your actual Sepolia deployment address from Remix

const CONTRACT_ABI = [
  // registerIdentity(string ipfsHash)
  {
    "inputs": [{ "internalType": "string", "name": "ipfsHash", "type": "string" }],
    "name": "registerIdentity",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  // updateIdentity(string newIpfsHash)
  {
    "inputs": [{ "internalType": "string", "name": "newIpfsHash", "type": "string" }],
    "name": "updateIdentity",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  // revokeIdentity()
  {
    "inputs": [],
    "name": "revokeIdentity",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  // getIdentity(address)
  {
    "inputs": [{ "internalType": "address", "name": "userAddress", "type": "address" }],
    "name": "getIdentity",
    "outputs": [
      { "internalType": "string",  "name": "ipfsHash",  "type": "string"  },
      { "internalType": "uint256", "name": "createdAt", "type": "uint256" },
      { "internalType": "uint256", "name": "updatedAt", "type": "uint256" },
      { "internalType": "bool",    "name": "isActive",  "type": "bool"    },
      { "internalType": "uint256", "name": "version",   "type": "uint256" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  // hasIdentity(address)
  {
    "inputs": [{ "internalType": "address", "name": "userAddress", "type": "address" }],
    "name": "hasIdentity",
    "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }],
    "stateMutability": "view",
    "type": "function"
  },
  // totalIdentities()
  {
    "inputs": [],
    "name": "totalIdentities",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  // Events
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true,  "internalType": "address", "name": "owner",     "type": "address" },
      { "indexed": false, "internalType": "string",  "name": "ipfsHash",  "type": "string"  },
      { "indexed": false, "internalType": "uint256", "name": "timestamp", "type": "uint256" }
    ],
    "name": "IdentityRegistered",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true,  "internalType": "address", "name": "owner",       "type": "address" },
      { "indexed": false, "internalType": "string",  "name": "newIpfsHash", "type": "string"  },
      { "indexed": false, "internalType": "uint256", "name": "timestamp",   "type": "uint256" }
    ],
    "name": "IdentityUpdated",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true,  "internalType": "address", "name": "owner",     "type": "address" },
      { "indexed": false, "internalType": "uint256", "name": "timestamp", "type": "uint256" }
    ],
    "name": "IdentityRevoked",
    "type": "event"
  }
];

// Sepolia Chain ID
const SEPOLIA_CHAIN_ID = "0xaa36a7"; // 11155111 decimal
