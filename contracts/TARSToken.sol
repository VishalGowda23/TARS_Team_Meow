// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title TARSToken
 * @notice Utility token for the TARS whistleblowing platform
 * @dev Used for validator incentives and governance
 */
contract TARSToken is ERC20, Ownable {
    uint256 public constant MAX_SUPPLY = 100_000_000 * 10**18; // 100 million tokens
    uint256 public constant VALIDATOR_REWARD = 10 * 10**18;    // 10 tokens per validation

    mapping(address => bool) public authorizedMinters;

    event MinterAdded(address indexed minter);
    event MinterRemoved(address indexed minter);
    event ValidatorRewarded(address indexed validator, uint256 amount);

    constructor() ERC20("TARS Token", "TARS") Ownable(msg.sender) {
        // Mint initial supply to deployer
        _mint(msg.sender, 10_000_000 * 10**18); // 10 million initial
    }

    modifier onlyAuthorizedMinter() {
        require(authorizedMinters[msg.sender] || msg.sender == owner(), "Not authorized to mint");
        _;
    }

    /**
     * @notice Add an authorized minter (TARS contract)
     */
    function addMinter(address _minter) external onlyOwner {
        authorizedMinters[_minter] = true;
        emit MinterAdded(_minter);
    }

    /**
     * @notice Remove an authorized minter
     */
    function removeMinter(address _minter) external onlyOwner {
        authorizedMinters[_minter] = false;
        emit MinterRemoved(_minter);
    }

    /**
     * @notice Reward a validator for their work
     */
    function rewardValidator(address _validator) external onlyAuthorizedMinter {
        require(totalSupply() + VALIDATOR_REWARD <= MAX_SUPPLY, "Max supply reached");
        _mint(_validator, VALIDATOR_REWARD);
        emit ValidatorRewarded(_validator, VALIDATOR_REWARD);
    }

    /**
     * @notice Mint tokens (capped at max supply)
     */
    function mint(address _to, uint256 _amount) external onlyAuthorizedMinter {
        require(totalSupply() + _amount <= MAX_SUPPLY, "Max supply exceeded");
        _mint(_to, _amount);
    }

    /**
     * @notice Burn tokens
     */
    function burn(uint256 _amount) external {
        _burn(msg.sender, _amount);
    }
}
