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

pragma solidity ^0.8.20;

import "../utils/CommonUtils.sol";
import "../compliance/IDSComplianceServicePartitioned.sol";
import "../compliance/IDSLockManagerPartitioned.sol";
import "../registry/IDSRegistryService.sol";
import "../compliance/IDSComplianceConfigurationService.sol";
import "../compliance/IDSPartitionsManager.sol";
import "../omnibus/IDSOmnibusTBEController.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";

library TokenPartitionsLibrary {

    uint256 internal constant COMPLIANCE_SERVICE = 0;
    uint256 internal constant REGISTRY_SERVICE = 1;
    uint256 internal constant OMNIBUS_TBE_CONTROLLER = 2;

    event IssueByPartition(address indexed to, uint256 value, bytes32 indexed partition);
    event TransferByPartition(address indexed from, address indexed to, uint256 value, bytes32 indexed partition);
    struct AddressPartitions {
        uint256 count;
        mapping(bytes32 => uint256) toIndex;
        mapping(uint256 => bytes32) partitions;
        mapping(bytes32 => uint256) balances;
    }

    struct TokenPartitions {
        mapping(address => AddressPartitions) walletPartitions;
        mapping(string => mapping(bytes32 => uint256)) investorPartitionsBalances;
    }

    function issueTokensCustom(
        TokenPartitions storage self,
        IDSRegistryService _registry,
        IDSComplianceConfigurationService _compConf,
        IDSPartitionsManager _partitionsManager,
        IDSLockManagerPartitioned _lockManager,
        address _to,
        uint256 _value,
        uint256 _issuanceTime,
        uint256[] memory _valuesLocked,
        string memory _reason,
        uint64[] memory _releaseTimes
    ) public returns (bool) {
        string memory investor = _registry.getInvestor(_to);
        string memory country = _registry.getCountry(investor);
        bytes32 partition = _partitionsManager.ensurePartition(_issuanceTime, _compConf.getCountryCompliance(country));
        emit IssueByPartition(_to, _value, partition);
        transferPartition(self, _registry, address(0), _to, _value, partition);
        uint256 totalLocked = 0;
        for (uint256 i = 0; i < _valuesLocked.length; i++) {
            totalLocked += _valuesLocked[i];
            _lockManager.createLockForInvestor(investor, _valuesLocked[i], 0, _reason, _releaseTimes[i], partition);
        }
        require(totalLocked <= _value, "valueLocked must be smaller than value");

        return true;
    }

    function issueTokensWithNoCompliance(
        TokenPartitions storage self,
        IDSRegistryService _registry,
        IDSComplianceConfigurationService _compConf,
        IDSPartitionsManager _partitionsManager,
        address _to,
        uint256 _value,
        uint256 _issuanceTime
    ) public returns (bool) {
        string memory investor = _registry.getInvestor(_to);
        string memory country = _registry.getCountry(investor);
        bytes32 partition = _partitionsManager.ensurePartition(_issuanceTime, _compConf.getCountryCompliance(country));
        emit IssueByPartition(_to, _value, partition);
        transferPartition(self, _registry, address(0), _to, _value, partition);
        return true;
    }

    function setPartitionToAddressImpl(TokenPartitions storage self, address _who, uint256 _index, bytes32 _partition) internal returns (bool) {
        self.walletPartitions[_who].partitions[_index] = _partition;
        self.walletPartitions[_who].toIndex[_partition] = _index;
        return true;
    }

    function addPartitionToAddress(TokenPartitions storage self, address _who, bytes32 _partition) internal {
        uint256 partitionCount = self.walletPartitions[_who].count;
        setPartitionToAddressImpl(self, _who, self.walletPartitions[_who].count, _partition);
        self.walletPartitions[_who].count = partitionCount + 1;
    }

    function removePartitionFromAddress(TokenPartitions storage self, address _from, bytes32 _partition) internal {
        uint256 oldIndex = self.walletPartitions[_from].toIndex[_partition];
        uint256 lastPartitionIndex = self.walletPartitions[_from].count - 1;
        bytes32 lastPartition = self.walletPartitions[_from].partitions[lastPartitionIndex];

        setPartitionToAddressImpl(self, _from, oldIndex, lastPartition);

        delete self.walletPartitions[_from].partitions[lastPartitionIndex];
        delete self.walletPartitions[_from].toIndex[_partition];
        delete self.walletPartitions[_from].balances[_partition];
        self.walletPartitions[_from].count = self.walletPartitions[_from].count - 1;
    }

    function transferPartition(TokenPartitions storage self, IDSRegistryService _registry, address _from, address _to, uint256 _value, bytes32 _partition) public {
        if (_from != address(0)) {
            self.walletPartitions[_from].balances[_partition] = self.walletPartitions[_from].balances[_partition] - _value;
            updateInvestorPartitionBalance(self, _registry, _from, _value, CommonUtils.IncDec.Decrease, _partition);
            if (self.walletPartitions[_from].balances[_partition] == 0) {
                removePartitionFromAddress(self, _from, _partition);
            }
        }

        if (_to != address(0)) {
            if (self.walletPartitions[_to].balances[_partition] == 0 && _value > 0) {
                addPartitionToAddress(self, _to, _partition);
            }
            self.walletPartitions[_to].balances[_partition] += _value;
            updateInvestorPartitionBalance(self, _registry, _to, _value, CommonUtils.IncDec.Increase, _partition);
        }
        emit TransferByPartition(_from, _to, _value, _partition);
    }

    function transferPartitions(TokenPartitions storage self, address[] memory _services, address _from, address _to, uint256 _value) public returns (bool) {
        uint256 partitionCount = partitionCountOf(self, _from);
        uint256 index = 0;
        bool skipComplianceCheck = shouldSkipComplianceCheck(IDSRegistryService(_services[REGISTRY_SERVICE]),
            IDSOmnibusTBEController(_services[OMNIBUS_TBE_CONTROLLER]), _from, _to);
        while (_value > 0 && index < partitionCount) {
            bytes32 partition = partitionOf(self, _from, index);
            uint256 transferableInPartition = skipComplianceCheck
                ? self.walletPartitions[_from].balances[partition]
                : IDSComplianceServicePartitioned(_services[COMPLIANCE_SERVICE]).getComplianceTransferableTokens(_from, block.timestamp, _to, partition);
            uint256 transferable = Math.min(_value, transferableInPartition);
            if (transferable > 0) {
                if (self.walletPartitions[_from].balances[partition] == transferable) {
                    unchecked {
                        --index;
                        --partitionCount;
                    }
                }
                transferPartition(self, IDSRegistryService(_services[REGISTRY_SERVICE]), _from, _to, transferable, partition);
                _value -= transferable;
            }
            unchecked {
                ++index;
            }
        }

        require(_value == 0);

        return true;
    }

    function transferPartitions(
        TokenPartitions storage self,
        address[] memory _services,
        address _from,
        address _to,
        uint256 _value,
        bytes32[] memory _partitions,
        uint256[] memory _values
    ) public returns (bool) {
        require(_partitions.length == _values.length);
        bool skipComplianceCheck = shouldSkipComplianceCheck(IDSRegistryService(_services[REGISTRY_SERVICE]),
            IDSOmnibusTBEController(_services[OMNIBUS_TBE_CONTROLLER]), _from, _to);
        for (uint256 index = 0; index < _partitions.length; ++index) {
            if (!skipComplianceCheck) {
                require(_values[index] <= IDSComplianceServicePartitioned(_services[COMPLIANCE_SERVICE]).getComplianceTransferableTokens(_from, block.timestamp, _to, _partitions[index]));
            }
            transferPartition(self, IDSRegistryService(_services[REGISTRY_SERVICE]), _from, _to, _values[index], _partitions[index]);
            _value -= _values[index];
        }

        require(_value == 0);
        return true;
    }

    function balanceOfByPartition(TokenPartitions storage self, address _who, bytes32 _partition) internal view returns (uint256) {
        return self.walletPartitions[_who].balances[_partition];
    }

    function balanceOfInvestorByPartition(TokenPartitions storage self, string memory _id, bytes32 _partition) internal view returns (uint256) {
        return self.investorPartitionsBalances[_id][_partition];
    }

    function partitionCountOf(TokenPartitions storage self, address _who) internal view returns (uint256) {
        return self.walletPartitions[_who].count;
    }

    function partitionOf(TokenPartitions storage self, address _who, uint256 _index) internal view returns (bytes32) {
        return self.walletPartitions[_who].partitions[_index];
    }

    function updateInvestorPartitionBalance(TokenPartitions storage self, IDSRegistryService _registry, address _wallet, uint256 _value, CommonUtils.IncDec _increase, bytes32 _partition)
        internal
        returns (bool)
    {
        string memory investor = _registry.getInvestor(_wallet);
        if (!CommonUtils.isEmptyString(investor)) {
            uint256 balance = self.investorPartitionsBalances[investor][_partition];
            if (_increase == CommonUtils.IncDec.Increase) {
                balance = balance + _value;
            } else {
                balance = balance - _value;
            }
            self.investorPartitionsBalances[investor][_partition] = balance;
        }
        return true;
    }

    function shouldSkipComplianceCheck(IDSRegistryService _registry, IDSOmnibusTBEController _omnibusTBEController, address _from, address _to) internal view returns (bool) {
        return CommonUtils.isEqualString(_registry.getInvestor(_from), _registry.getInvestor(_to)) ||
            (address(_omnibusTBEController) != address(0) && (_omnibusTBEController.getOmnibusWallet() == _from ||
                _omnibusTBEController.getOmnibusWallet() == _to));
    }
}