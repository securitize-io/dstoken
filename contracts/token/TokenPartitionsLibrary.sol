pragma solidity ^0.5.0;

import "../zeppelin/math/SafeMath.sol";
import "../zeppelin/math/Math.sol";
import "../compliance/IDSComplianceServicePartitioned.sol";
import "../compliance/IDSLockManagerPartitioned.sol";
import "../registry/IDSRegistryService.sol";
import "../compliance/IDSComplianceConfigurationService.sol";
import "../compliance/IDSPartitionsManager.sol";


library TokenPartitionsLibrary {
    uint256 internal constant COMPLIANCE_SERVICE = 0;
    uint256 internal constant REGISTRY_SERVICE = 1;

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
        uint256 _valueLocked,
        string memory _reason,
        uint256 _releaseTime
    ) public returns (bool) {
        string memory investor = _registry.getInvestor(_to);
        string memory country = _registry.getCountry(investor);
        bytes32 partition = _partitionsManager.ensurePartition(_issuanceTime, _compConf.getCountryCompliance(country));
        emit IssueByPartition(_to, _value, partition);
        transferPartition(self, _registry, address(0), _to, _value, partition);
        if (_valueLocked > 0) {
            _lockManager.createLockForInvestor(investor, _valueLocked, 0, _reason, _releaseTime, partition);
        }
    }

    function setPartitionToAddressImpl(TokenPartitions storage self, address _who, uint256 _index, bytes32 _partition) internal returns (bool) {
        self.walletPartitions[_who].partitions[_index] = _partition;
        self.walletPartitions[_who].toIndex[_partition] = _index;
        return true;
    }

    function addPartitionToAddress(TokenPartitions storage self, address _who, bytes32 _partition) internal {
        uint256 partitionCount = self.walletPartitions[_who].count;
        setPartitionToAddressImpl(self, _who, self.walletPartitions[_who].count, _partition);
        self.walletPartitions[_who].count = SafeMath.add(partitionCount, 1);
    }

    function removePartitionFromAddress(TokenPartitions storage self, address _from, bytes32 _partition) internal {
        uint256 oldIndex = self.walletPartitions[_from].toIndex[_partition];
        uint256 lastPartitionIndex = SafeMath.sub(self.walletPartitions[_from].count, 1);
        bytes32 lastPartition = self.walletPartitions[_from].partitions[lastPartitionIndex];

        setPartitionToAddressImpl(self, _from, oldIndex, lastPartition);

        delete self.walletPartitions[_from].partitions[lastPartitionIndex];
        delete self.walletPartitions[_from].toIndex[_partition];
        delete self.walletPartitions[_from].balances[_partition];
        self.walletPartitions[_from].count = SafeMath.sub(self.walletPartitions[_from].count, 1);
    }

    function transferPartition(TokenPartitions storage self, IDSRegistryService _registry, address _from, address _to, uint256 _value, bytes32 _partition) public {
        if (_from != address(0)) {
            self.walletPartitions[_from].balances[_partition] = SafeMath.sub(self.walletPartitions[_from].balances[_partition], _value);
            updateInvestorPartitionBalance(self, _registry, _from, _value, false, _partition);
            if (self.walletPartitions[_from].balances[_partition] == 0) {
                removePartitionFromAddress(self, _from, _partition);
            }
        }

        if (_to != address(0)) {
            if (self.walletPartitions[_to].balances[_partition] == 0 && _value > 0) {
                addPartitionToAddress(self, _to, _partition);
            }
            self.walletPartitions[_to].balances[_partition] = SafeMath.add(self.walletPartitions[_to].balances[_partition], _value);
            updateInvestorPartitionBalance(self, _registry, _to, _value, true, _partition);
        }
        emit TransferByPartition(_from, _to, _value, _partition);
    }

    function transferPartitions(TokenPartitions storage self, address[] memory _services, address _from, address _to, uint256 _value) public returns (bool) {
        uint256 partitionCount = partitionCountOf(self, _from);
        uint256 index = 0;
        bool skipComplianceCheck = shouldSkipComplianceCheck(IDSRegistryService(_services[REGISTRY_SERVICE]), _from, _to);
        while (_value > 0 && index < partitionCount) {
            bytes32 partition = partitionOf(self, _from, index);
            uint256 transferableInPartition = skipComplianceCheck
                ? self.walletPartitions[_from].balances[partition]
                : IDSComplianceServicePartitioned(_services[COMPLIANCE_SERVICE]).getComplianceTransferableTokens(_from, now, _to, partition);
            uint256 transferable = Math.min(_value, transferableInPartition);
            if (transferable > 0) {
                if (self.walletPartitions[_from].balances[partition] == transferable) {
                    --index;
                    --partitionCount;
                }
                transferPartition(self, IDSRegistryService(_services[REGISTRY_SERVICE]), _from, _to, transferable, partition);
                _value -= transferable;
            }
            ++index;
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
                require(_values[index] <= IDSComplianceServicePartitioned(_services[COMPLIANCE_SERVICE]).getComplianceTransferableTokens(_from, now, _to, _partitions[index]));
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

    function updateInvestorPartitionBalance(TokenPartitions storage self, IDSRegistryService _registry, address _wallet, uint256 _value, bool _increase, bytes32 _partition)
        internal
        returns (bool)
    {
        string memory investor = _registry.getInvestor(_wallet);
        if (keccak256(abi.encodePacked(investor)) != keccak256("")) {
            uint256 balance = self.investorPartitionsBalances[investor][_partition];
            if (_increase) {
                balance = SafeMath.add(balance, _value);
            } else {
                balance = SafeMath.sub(balance, _value);
            }
            self.investorPartitionsBalances[investor][_partition] = balance;
        }
        return true;
    }

    function shouldSkipComplianceCheck(IDSRegistryService _registry, address _from, address _to) internal view returns (bool) {
        return keccak256(abi.encodePacked(_registry.getInvestor(_from))) == keccak256(abi.encodePacked(_registry.getInvestor(_to)));
    }
}
