pragma solidity ^0.5.0;

import "./IDSLockManager.sol";


contract IDSLockManagerPartitioned is IDSLockManager {
    constructor() internal {}

contract IDSLockManagerPartitioned is IDSLockManager {
    function initialize() public {
        VERSIONS.push(1);
    }

    event LockedPartition(address indexed who, uint256 value, uint256 indexed reason, string reasonString, uint256 releaseTime, bytes32 indexed partition);
    event UnlockedPartition(address indexed who, uint256 value, uint256 indexed reason, string reasonString, uint256 releaseTime, bytes32 indexed partition);
    event HolderLockedPartition(string investorId, uint256 value, uint256 indexed reason, string reasonString, uint256 releaseTime, bytes32 indexed partition);
    event HolderUnlockedPartition(string investorId, uint256 value, uint256 indexed reason, string reasonString, uint256 releaseTime, bytes32 indexed partition);

    function createLockForInvestor(string memory _investorId, uint256 _valueLocked, uint256 _reasonCode, string memory _reasonString, uint256 _releaseTime, bytes32 _partition)
        public;

    function addManualLockRecord(
        address _to,
        uint256 _valueLocked,
        string memory _reason,
        uint256 _releaseTime,
        bytes32 _partition /*issuerOrAboveOrToken*/
    ) public;

    function removeLockRecord(
        address _to,
        uint256 _lockIndex,
        bytes32 _partition /*issuerOrAbove*/
    ) public returns (bool);

    function removeLockRecordForInvestor(
        string memory _investorId,
        uint256 _lockIndex,
        bytes32 _partition /*issuerOrAbove*/
    ) public returns (bool);

    function lockCount(address _who, bytes32 _partition) public view returns (uint256);

    function lockInfo(address _who, uint256 _lockIndex, bytes32 _partition)
        public
        view
        returns (uint256 reasonCode, string memory reasonString, uint256 value, uint256 autoReleaseTime);

    function lockCountForInvestor(string memory _investorId, bytes32 _partition) public view returns (uint256);

    function lockInfoForInvestor(string memory _investorId, uint256 _lockIndex, bytes32 _partition)
        public
        view
        returns (uint256 reasonCode, string memory reasonString, uint256 value, uint256 autoReleaseTime);

    function getTransferableTokens(address _who, uint64 _time, bytes32 _partition) public view returns (uint256);

    function getTransferableTokensForInvestor(string memory _investorId, uint64 _time, bytes32 _partition) public view returns (uint256);

    /*************** Legacy functions ***************/
    function createLockForHolder(string memory _investorId, uint256 _valueLocked, uint256 _reasonCode, string memory _reasonString, uint256 _releaseTime, bytes32 _partition)
        public;

    function removeLockRecordForHolder(string memory _investorId, uint256 _lockIndex, bytes32 _partition) public returns (bool);

    function lockCountForHolder(string memory _holderId, bytes32 _partition) public view returns (uint256);

    function lockInfoForHolder(string memory _holderId, uint256 _lockIndex, bytes32 _partition)
        public
        view
        returns (uint256 reasonCode, string memory reasonString, uint256 value, uint256 autoReleaseTime);

    function getTransferableTokensForHolder(string memory _holderId, uint64 _time, bytes32 _partition) public view returns (uint256);

    /******************************/
}
