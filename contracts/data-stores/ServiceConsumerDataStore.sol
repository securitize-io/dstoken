pragma solidity ^0.8.13;

import "@openzeppelin/contracts/utils/math/SafeMath.sol";

//SPDX-License-Identifier: UNLICENSED
contract ServiceConsumerDataStore {
    using SafeMath for uint256;

    mapping(uint256 => address) internal services;
}
