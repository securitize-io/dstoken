/**
 * Copyright 2024 Securitize Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

pragma solidity 0.8.22;

import "./IDSToken.sol";

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
