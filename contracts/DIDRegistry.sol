// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";

interface IDIDToken {
    function rewardUser(address user, uint256 amount) external;
}

/**
 * @title DIDRegistry
 * @dev Decentralized Identity Registry - stores IPFS hashes mapped to Ethereum addresses
 * @notice No personal data is stored on-chain — only cryptographic hashes (privacy-preserving)
 */
contract DIDRegistry is Ownable {

    // ─── Constants ─────────────────────────────────────────────────────────────
    uint256 public constant REGISTRATION_REWARD = 50 * 10**18;
    uint256 public constant UPDATE_REWARD = 10 * 10**18;

    // ─── Events ────────────────────────────────────────────────────────────────
    event IdentityRegistered(address indexed owner, string ipfsHash, uint256 timestamp);
    event IdentityUpdated(address indexed owner, string newIpfsHash, uint256 timestamp);
    event IdentityRevoked(address indexed owner, uint256 timestamp);
    event TokenAddressUpdated(address indexed newToken);

    // ─── Structs ───────────────────────────────────────────────────────────────
    struct Identity {
        string  ipfsHash;       // IPFS CID pointing to the identity document
        uint256 createdAt;      // Block timestamp of registration
        uint256 updatedAt;      // Block timestamp of last update
        bool    isActive;       // Soft-delete / revocation flag
        uint256 version;        // Incremented on each update
        uint256 revocationCount; // Total revocations tracked for reputation
    }

    // ─── State ─────────────────────────────────────────────────────────────────
    mapping(address => Identity) private identities;
    uint256 public totalIdentities;
    IDIDToken public token;

    // ─── Modifiers ─────────────────────────────────────────────────────────────
    modifier onlyIdentityOwner() {
        require(identities[msg.sender].isActive, "DID: no active identity found");
        _;
    }

    modifier validHash(string calldata ipfsHash) {
        require(bytes(ipfsHash).length > 0, "DID: IPFS hash cannot be empty");
        _;
    }

    constructor() Ownable(msg.sender) {}

    // ─── Administrative ───────────────────────────────────────────────────────

    /**
     * @notice Set the DIDToken contract address.
     * @param _token The address of the reward token contract.
     */
    function setTokenAddress(address _token) external onlyOwner {
        require(_token != address(0), "DID: token address zero");
        token = IDIDToken(_token);
        emit TokenAddressUpdated(_token);
    }

    // ─── Logic ─────────────────────────────────────────────────────────────────

    /**
     * @notice Register a new decentralized identity
     * @param ipfsHash The IPFS CID of your encrypted identity document
     */
    function registerIdentity(string calldata ipfsHash)
        external
        validHash(ipfsHash)
    {
        require(!identities[msg.sender].isActive, "DID: identity already exists, use updateIdentity");

        Identity storage id = identities[msg.sender];
        
        // If it's a re-registration, preserve history but update active status
        if (id.createdAt == 0) {
            id.createdAt = block.timestamp;
            id.version = 1;
        } else {
            id.version++;
        }

        id.ipfsHash = ipfsHash;
        id.updatedAt = block.timestamp;
        id.isActive = true;

        totalIdentities++;

        // Optional Token Reward
        if (address(token) != address(0)) {
            token.rewardUser(msg.sender, REGISTRATION_REWARD);
        }

        emit IdentityRegistered(msg.sender, ipfsHash, block.timestamp);
    }

    /**
     * @notice Update your existing identity document
     * @param newIpfsHash The new IPFS CID replacing the old one
     */
    function updateIdentity(string calldata newIpfsHash)
        external
        onlyIdentityOwner
        validHash(newIpfsHash)
    {
        Identity storage id = identities[msg.sender];
        id.ipfsHash  = newIpfsHash;
        id.updatedAt = block.timestamp;
        id.version++;

        // Optional Token Reward for updates
        if (address(token) != address(0)) {
            token.rewardUser(msg.sender, UPDATE_REWARD);
        }

        emit IdentityUpdated(msg.sender, newIpfsHash, block.timestamp);
    }

    /**
     * @notice Revoke / deactivate your identity
     */
    function revokeIdentity() external onlyIdentityOwner {
        Identity storage id = identities[msg.sender];
        id.isActive  = false;
        id.updatedAt = block.timestamp;
        id.revocationCount++;
        totalIdentities--;

        emit IdentityRevoked(msg.sender, block.timestamp);
    }

    // ─── View Functions ────────────────────────────────────────────────────────

    /**
     * @notice Calculate the trust score (0-100) for a given user
     * @dev score = (registrations * 10) + (updates * 5) - (revocations * 15)
     */
    function getTrustScore(address user) public view returns (uint256) {
        Identity storage id = identities[user];
        if (id.createdAt == 0) return 0;

        uint256 registrations = 1; // Basic registration
        uint256 updates = id.version > 1 ? id.version - 1 : 0;
        uint256 revocations = id.revocationCount;

        int256 score = int256(registrations * 10) + int256(updates * 5) - int256(revocations * 15);
        
        if (score < 0) return 0;
        if (score > 100) return 100;
        return uint256(score);
    }

    /**
     * @notice Retrieve the identity for any address
     * @param userAddress The Ethereum address to look up
     */
    function getIdentity(address userAddress)
        external
        view
        returns (
            string memory ipfsHash,
            uint256 createdAt,
            uint256 updatedAt,
            bool    isActive,
            uint256 version,
            uint256 revocationCount
        )
    {
        Identity storage id = identities[userAddress];
        return (id.ipfsHash, id.createdAt, id.updatedAt, id.isActive, id.version, id.revocationCount);
    }

    /**
     * @notice Check if an address has an active DID
     */
    function hasIdentity(address userAddress) external view returns (bool) {
        return identities[userAddress].isActive;
    }
}

