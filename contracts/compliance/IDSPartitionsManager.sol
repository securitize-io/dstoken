pragma solidity ^0.5.0;

import "../service/IDSServiceConsumer.sol";
import "../utils/Initializable.sol";


contract IDSPartitionsManager is Initializable, IDSServiceConsumer {
    constructor() internal {}

    function initialize() public {
        VERSIONS.push(1);
    }

    function ensurePartition(
        uint256 _issuanceDate,
        uint256 _region /*onlyIssuerOrAboveOrToken*/
    ) public returns (bytes32 partition);

    function getPartition(bytes32 _partition) public view returns (uint256 date, uint256 region);

    function getPartitionIssuanceDate(bytes32 _partition) public view returns (uint256);

    function getPartitionRegion(bytes32 _partition) public view returns (uint256);

    event PartitionCreated(uint256 _date, uint256 _region, bytes32 _partition);
}
