pragma solidity ^0.8.13;

import "./IDSToken.sol";

//SPDX-License-Identifier: UNLICENSED
contract IDSTokenPartitioned is IDSToken {
    constructor() internal {}
    function initialize() public {}
    function balanceOfByPartition(address _who, bytes32 _partition) public view returns (uint256);
    function balanceOfInvestorByPartition(string memory _id, bytes32 _partition) public view returns (uint256);
    function partitionCountOf(address _who) public view returns (uint256);
    function partitionOf(address _who, uint256 _index) public view returns (bytes32);
    function transferByPartitions(address _to, uint256 _value, bytes32[] memory _partitions, uint256[] memory _values) public returns (bool);
    function transferFromByPartitions(address _from, address _to, uint256 _value, bytes32[] memory _partitions, uint256[] memory _values) public returns (bool);
    function burnByPartition(
        address _who,
        uint256 _value,
        string memory _reason,
        bytes32 _partition /*onlyIssuerOrAbove*/
    ) public;
    function seizeByPartition(
        address _from,
        address _to,
        uint256 _value,
        string memory _reason,
        bytes32 _partition /*onlyIssuerOrAbove*/
    ) public;

    event TransferByPartition(address indexed from, address indexed to, uint256 value, bytes32 indexed partition);
    event IssueByPartition(address indexed to, uint256 value, bytes32 indexed partition);
    event BurnByPartition(address indexed burner, uint256 value, string reason, bytes32 indexed partition);
    event SeizeByPartition(address indexed from, address indexed to, uint256 value, string reason, bytes32 indexed partition);
}
