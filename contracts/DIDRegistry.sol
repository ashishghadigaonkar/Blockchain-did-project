// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title DIDRegistry
 * @dev Decentralized Identity Registry - stores IPFS hashes mapped to Ethereum addresses
 * @notice No personal data is stored on-chain — only cryptographic hashes (privacy-preserving)
 */
contract DIDRegistry {

    // ─── Events ────────────────────────────────────────────────────────────────
    event IdentityRegistered(address indexed owner, string ipfsHash, uint256 timestamp);
    event IdentityUpdated(address indexed owner, string newIpfsHash, uint256 timestamp);
    event IdentityRevoked(address indexed owner, uint256 timestamp);

    // ─── Structs ───────────────────────────────────────────────────────────────
    struct Identity {
        string  ipfsHash;       // IPFS CID pointing to the identity document
        uint256 createdAt;      // Block timestamp of registration
        uint256 updatedAt;      // Block timestamp of last update
        bool    isActive;       // Soft-delete / revocation flag
        uint256 version;        // Incremented on each update
    }

    // ─── State ─────────────────────────────────────────────────────────────────
    mapping(address => Identity) private identities;
    uint256 public totalIdentities;

    // ─── Modifiers ─────────────────────────────────────────────────────────────
    modifier onlyIdentityOwner() {
        require(identities[msg.sender].isActive, "DID: no active identity found");
        _;
    }

    modifier validHash(string calldata ipfsHash) {
        require(bytes(ipfsHash).length > 0, "DID: IPFS hash cannot be empty");
        _;
    }

    // ─── Functions ─────────────────────────────────────────────────────────────

    /**
     * @notice Register a new decentralized identity
     * @param ipfsHash The IPFS CID of your encrypted identity document
     */
    function registerIdentity(string calldata ipfsHash)
        external
        validHash(ipfsHash)
    {
        require(!identities[msg.sender].isActive, "DID: identity already exists, use updateIdentity");

        identities[msg.sender] = Identity({
            ipfsHash:  ipfsHash,
            createdAt: block.timestamp,
            updatedAt: block.timestamp,
            isActive:  true,
            version:   1
        });

        totalIdentities++;
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

        emit IdentityUpdated(msg.sender, newIpfsHash, block.timestamp);
    }

    /**
     * @notice Revoke / deactivate your identity
     */
    function revokeIdentity() external onlyIdentityOwner {
        identities[msg.sender].isActive  = false;
        identities[msg.sender].updatedAt = block.timestamp;
        totalIdentities--;

        emit IdentityRevoked(msg.sender, block.timestamp);
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
            uint256 version
        )
    {
        Identity storage id = identities[userAddress];
        return (id.ipfsHash, id.createdAt, id.updatedAt, id.isActive, id.version);
    }

    /**
     * @notice Check if an address has an active DID
     */
    function hasIdentity(address userAddress) external view returns (bool) {
        return identities[userAddress].isActive;
    }
}
