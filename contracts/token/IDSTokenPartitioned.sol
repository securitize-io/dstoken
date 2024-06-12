pragma solidity ^0.8.20;

import "./IDSToken.sol";

//SPDX-License-Identifier: GPL-3.0
abstract contract IDSTokenPartitioned {

    function balanceOfByPartition(address _who, bytes32 _partition) public view virtual returns (uint256);

    function balanceOfInvestorByPartition(string memory _id, bytes32 _partition) public view virtual returns (uint256);

    function partitionCountOf(address _who) public view virtual returns (uint256);

    function partitionOf(address _who, uint256 _index) public view virtual returns (bytes32);

    function transferByPartitions(address _to, uint256 _value, bytes32[] memory _partitions, uint256[] memory _values) public virtual returns (bool);

    function transferFromByPartitions(address _from, address _to, uint256 _value, bytes32[] memory _partitions, uint256[] memory _values) public virtual returns (bool);

    function burnByPartition(
        address _who,
        uint256 _value,
        string calldata _reason,
        bytes32 _partition /*onlyIssuerOrAbove*/
    ) public virtual;

    function seizeByPartition(
        address _from,
        address _to,
        uint256 _value,
        string calldata _reason,
        bytes32 _partition /*onlyIssuerOrAbove*/
    ) public virtual;

    event TransferByPartition(address indexed from, address indexed to, uint256 value, bytes32 indexed partition);
    event IssueByPartition(address indexed to, uint256 value, bytes32 indexed partition);
    event BurnByPartition(address indexed burner, uint256 value, string reason, bytes32 indexed partition);
    event SeizeByPartition(address indexed from, address indexed to, uint256 value, string reason, bytes32 indexed partition);
}
