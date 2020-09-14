pragma solidity 0.5.17;

contract VersionedContract {
    uint256[] internal VERSIONS = [1];

    function getVersion() public view returns (uint256[] memory) {
        return VERSIONS;
    }
}
