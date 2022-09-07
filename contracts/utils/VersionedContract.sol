pragma solidity ^0.8.13;

//SPDX-License-Identifier: UNLICENSED
contract VersionedContract {
    uint256[] internal VERSIONS = [1];

    function getVersion() public view returns (uint256[] memory) {
        return VERSIONS;
    }
}
