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

import "./DSToken.sol";
import "./IDSTokenPartitioned.sol";
import "../compliance/IDSPartitionsManager.sol";
import "./TokenPartitionsLibrary.sol";

contract DSTokenPartitioned is DSToken, IDSTokenPartitioned {

    using TokenPartitionsLibrary for TokenPartitionsLibrary.TokenPartitions;

    function initialize(string calldata _name, string calldata _symbol, uint8 _decimals) public override onlyProxy initializer {
        DSToken.initialize(_name, _symbol, _decimals);
    }

    function issueTokensWithMultipleLocks(
        address _to,
        uint256 _value,
        uint256 _issuanceTime,
        uint256[] memory _valuesLocked,
        string memory _reason,
        uint64[] memory _releaseTimes /*onlyIssuerOrAbove*/
    ) public override returns (bool) {
        uint256 issuanceTime = getComplianceService().validateIssuanceTime(_issuanceTime);
        super.issueTokensWithMultipleLocks(_to, _value, issuanceTime, new uint256[](0), "", new uint64[](0));
        partitionsManagement.issueTokensCustom(
            getRegistryService(),
            getComplianceConfigurationService(),
            getPartitionsManager(),
            getLockManagerPartitioned(),
            _to,
            _value,
            issuanceTime,
            _valuesLocked,
            _reason,
            _releaseTimes
        );
        return true;
    }

    function issueTokensCustom(
        address _to,
        uint256 _value,
        uint256 _issuanceTime,
        uint256 _valueLocked,
        string memory _reason,
        uint64 _releaseTime /*onlyIssuerOrAbove*/
    ) public override returns (bool) {
        uint256[] memory valuesLocked;
        uint64[] memory releaseTimes;
        if (_valueLocked > 0) {
            valuesLocked = new uint256[](1);
            releaseTimes = new uint64[](1);
            valuesLocked[0] = _valueLocked;
            releaseTimes[0] = _releaseTime;
        }
        issueTokensWithMultipleLocks(_to, _value, _issuanceTime, valuesLocked, _reason, releaseTimes);
        return true;
    }

    function issueTokensWithNoCompliance(address _to, uint256 _value) public override {
        super.issueTokensWithNoCompliance(_to, _value);
        partitionsManagement.issueTokensWithNoCompliance(
            getRegistryService(),
            getComplianceConfigurationService(),
            getPartitionsManager(),
            _to,
            _value,
            block.timestamp
        );
    }

    function transfer(address _to, uint256 _value) public override returns (bool) {
        return DSToken.transfer(_to, _value) && partitionsManagement.transferPartitions(getCommonServices(), msg.sender, _to, _value);
    }

    function transferFrom(address _from, address _to, uint256 _value) public override returns (bool) {
        return DSToken.transferFrom(_from, _to, _value) && partitionsManagement.transferPartitions(getCommonServices(), _from, _to, _value);
    }

    function transferByPartitions(address _to, uint256 _value, bytes32[] memory _partitions, uint256[] memory _values) public override returns (bool) {
        return DSToken.transfer(_to, _value) && partitionsManagement.transferPartitions(getCommonServices(), msg.sender, _to, _value, _partitions, _values);
    }

    function transferFromByPartitions(address _from, address _to, uint256 _value, bytes32[] memory _partitions, uint256[] memory _values) public override returns (bool) {
        return DSToken.transferFrom(_from, _to, _value) && partitionsManagement.transferPartitions(getCommonServices(), _from, _to, _value, _partitions, _values);
    }

    function burn(address, uint256, string calldata) public pure override {
        require(false, "Partitioned Token");
    }

    function burnByPartition(address _who, uint256 _value, string calldata _reason, bytes32 _partition) public override onlyIssuerOrTransferAgentOrAbove {
        DSToken.burn(_who, _value, _reason);
        emit BurnByPartition(_who, _value, _reason, _partition);
        partitionsManagement.transferPartition(getRegistryService(), _who, address(0), _value, _partition);
    }

    function seize(address, address, uint256, string calldata) public pure override {
        require(false, "Partitioned Token");
    }

    function seizeByPartition(address _from, address _to, uint256 _value, string calldata _reason, bytes32 _partition) public override onlyTransferAgentOrAbove {
        DSToken.seize(_from, _to, _value, _reason);
        emit SeizeByPartition(_from, _to, _value, _reason, _partition);
        partitionsManagement.transferPartition(getRegistryService(), _from, _to, _value, _partition);
    }

    function balanceOfByPartition(address _who, bytes32 _partition) public view override returns (uint256) {
        return partitionsManagement.balanceOfByPartition(_who, _partition);
    }

    function balanceOfInvestorByPartition(string memory _id, bytes32 _partition) public view override returns (uint256) {
        return partitionsManagement.balanceOfInvestorByPartition(_id, _partition);
    }

    function partitionCountOf(address _who) public view override returns (uint256) {
        return partitionsManagement.partitionCountOf(_who);
    }

    function partitionOf(address _who, uint256 _index) public view override returns (bytes32) {
        return partitionsManagement.partitionOf(_who, _index);
    }
}
