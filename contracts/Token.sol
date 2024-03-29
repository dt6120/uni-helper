// SPDX-License-Identifier: MIT
pragma solidity ^0.7.0;

import "hardhat/console.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract Token is ERC20 {
    constructor(string memory _name, string memory _symbol, uint256 _totalSupply) ERC20(_name, _symbol) {
        _mint(msg.sender, _totalSupply * 1e18);
    }
}
