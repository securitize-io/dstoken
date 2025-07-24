
    function transferPartitions(TokenPartitions storage self, address[] memory _services, address _from, address _to, uint256 _value) public returns (bool) {
        uint256 partitionCount = partitionCountOf(self, _from);
        uint256 index = 0;
        bool skipComplianceCheck = shouldSkipComplianceCheck(IDSRegistryService(_services[REGISTRY_SERVICE]), _from, _to);
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
        bool skipComplianceCheck = shouldSkipComplianceCheck(IDSRegistryService(_services[REGISTRY_SERVICE]), _from, _to);
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

    function shouldSkipComplianceCheck(IDSRegistryService _registry, address _from, address _to) internal view returns (bool) {
        return CommonUtils.isEqualString(_registry.getInvestor(_from), _registry.getInvestor(_to));
    }
}
