// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title DIDToken
 * @dev ERC-20 Token for rewarding DID users and reputation tracking.
 */
contract DIDToken is ERC20, Ownable {
    
    // Tracking the DIDRegistry contract address
    address public didRegistry;

    /**
     * @dev Initialize with name and symbol.
     */
    constructor() ERC20("DIDToken", "DID") Ownable(msg.sender) {
        // Initial supply could be minted to owner if needed
    }

    /**
     * @notice Set the DIDRegistry contract address.
     * @param _didRegistry The address of the DIDRegistry contract.
     */
    function setDIDRegistry(address _didRegistry) external onlyOwner {
        require(_didRegistry != address(0), "DIDToken: address zero");
        didRegistry = _didRegistry;
    }

    /**
     * @notice Mint rewards for users.
     * @dev Only the DIDRegistry contract or the owner can call this.
     * @param user The address of the user to reward.
     * @param amount The amount of tokens to reward (in wei).
     */
    function rewardUser(address user, uint256 amount) external {
        require(
            msg.sender == didRegistry || msg.sender == owner(),
            "DIDToken: caller not authorized"
        );
        _mint(user, amount);
    }

    /**
     * @dev Soulbound logic: only allow minting (from address(0)) or burning (to address(0)).
     * This overrides the internal _update function (standard in OZ 5.x).
     */
    function _update(address from, address to, uint256 value) internal virtual override {
        require(from == address(0) || to == address(0), "DIDToken: Soulbound, non-transferable");
        super._update(from, to, value);
    }
}


