pragma solidity ^0.5.0;

import "../zeppelin/math/SafeMath.sol";

contract ServiceConsumerDataStore {
    using SafeMath for uint256;

    mapping(uint256 => address) internal services;
}
