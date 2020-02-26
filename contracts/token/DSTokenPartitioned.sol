pragma solidity ^0.5.0;

import './DSToken.sol';
import './IDSTokenPartitioned.sol';
import '../data-stores/TokenPartitionedDataStore.sol';
import "../zeppelin/math/Math.sol";

contract DSTokenPartitioned is DSToken, IDSTokenPartitioned, TokenPartitionedDataStore {
  function initialize() public {
    IDSToken.initialize();
    IDSTokenPartitioned.initialize();
    VERSIONS.push(1);
  }

  function issueTokensCustom(address _to, uint256 _value, uint256 _issuanceTime, uint256 _valueLocked, string memory _reason, uint64 _releaseTime) onlyIssuerOrAbove public returns (bool) {
    super.issueTokensCustom(_to, _value, _issuanceTime, _valueLocked, _reason, _releaseTime);
    string memory country = getRegistryService().getCountry(getRegistryService().getInvestor(_to));
    bytes32 partition = getPartitionsManager().ensurePartition(_issuanceTime, getComplianceConfigurationService().getCountryCompliance(country));

    transferPartition(address(0), _to, _value, partition);

    emit IssueByPartition(_to, _value, partition);

    return true;
  }

  function transfer(address _to, uint256 _value) public returns (bool) {
    return super.transfer(_to, _value) && transferPartitions(msg.sender, _to, _value);
  }

  function transferFrom(address _from, address _to, uint256 _value) public returns (bool) {
    return super.transferFrom(_from, _to, _value) && transferPartitions(_from, _to, _value);
  }

  function transferByPartitions(address _to, uint256 _value, bytes32[] memory _partitions, uint256[] memory _values) public returns (bool) {
    return super.transfer(_to, _value) && transferPartitions(msg.sender, _to, _value, _partitions, _values);
  }

  function transferFromByPartitions(address _from, address _to, uint256 _value, bytes32[] memory _partitions, uint256[] memory _values) public returns (bool) {
    return super.transferFrom(_from, _to, _value) && transferPartitions(_from, _to, _value, _partitions, _values);
  }

  function burnByPartition(address _who, uint256 _value, string memory _reason, bytes32 _partition) onlyIssuerOrAbove public {
    DSToken.burn(_who, _value, _reason);
    transferPartition(_who, address(0), _value, _partition);
    emit BurnByPartition(_who, _value, _reason, _partition);
  }

  function seizeByPartition(address _from, address _to, uint256 _value, string memory _reason, bytes32 _partition) onlyIssuerOrAbove public {
    DSToken.seize(_from, _to, _value, _reason);
    transferPartition(_from, _to, _value, _partition);
    emit SeizeByPartition(_from, _to, _value, _reason, _partition);
  }

  function transferPartitions(address _from, address _to, uint256 _value) internal returns (bool) {
    uint partitionCount = partitionCountOf(_from);

    for (uint index = 0; _value > 0 && index < partitionCount; ++index) {
      bytes32 partition = partitionOf(_from, index);

      uint transferable = Math.min(_value, getComplianceServicePartitioned().getComplianceTransferableTokens(_from, now, _to, partition));
      if (transferable > 0) {
        transferPartition(_from, _to, transferable, partition);
        _value -= transferable;
      }
    }

    require(_value == 0);

    return true;
  }

  function transferPartitions(address _from, address _to, uint256 _value, bytes32[] memory _partitions, uint256[] memory _values) internal returns (bool) {
    require(_partitions.length == _values.length);

    for (uint index = 0; index < _partitions.length; ++index) {
      require(_values[index] <= getComplianceServicePartitioned().getComplianceTransferableTokens(_from, now, _to, _partitions[index]));
      transferPartition(_from, _to, _values[index], _partitions[index]);
      _value -= _values[index];
    }

    require(_value == 0);
    return true;
  }

  function balanceOfByPartition(address _who, bytes32 _partition) public view returns (uint256) {
    return walletPartitions[_who].balances[_partition];
  }

  function balanceOfInvestorByPartition(string memory _id, bytes32 _partition) public view returns (uint256) {
    return investorPartitionsBalances[_id][_partition];
  }

  function partitionCountOf(address _who) public view returns (uint) {
    return walletPartitions[_who].count;
  }

  function partitionOf(address _who, uint _index) public view returns (bytes32) {
    return walletPartitions[_who].partitions[_index];
  }

  function updateInvestorPartitionBalance(address _wallet, uint _value, bool _increase, bytes32 _partition) internal returns (bool) {
    string memory investor = getRegistryService().getInvestor(_wallet);
    if (keccak256(abi.encodePacked(investor)) != keccak256("")) {
      uint balance = investorPartitionsBalances[investor][_partition]; //_token.balanceOfInvestorByPartition(investor, _partition);
      if (_increase) {
        balance = SafeMath.add(balance, _value);
      } else {
        balance = SafeMath.sub(balance, _value);
      }

      investorPartitionsBalances[investor][_partition] = balance;
    }

    return true;
  }

  function transferPartition(address _from, address _to, uint256 _value, bytes32 _partition) internal {
    if (_from != address(0)) {
      walletPartitions[_from].balances[_partition] = _value;
      // EternalStorageClientUintLibrary.setUint(_token, PARTITIONED_BALANCES, _from, _partition, SafeMath.sub(_token.balanceOfByPartition(_from, _partition), _value));
      updateInvestorPartitionBalance(_from, _value, false, _partition);
      if (walletPartitions[_from].balances[_partition] == 0) {
        removePartitionFromAddress(_from, _partition);
      }
    }

    if (_to != address(0)) {
      if (walletPartitions[_to].balances[_partition] == 0 && _value > 0) {
        addPartitionToAddress(_to, _partition);
      }
      walletPartitions[_to].balances[_partition] = _value;
      // EternalStorageClientUintLibrary.setUint(_token, PARTITIONED_BALANCES, _to, _partition, SafeMath.add(_token.balanceOfByPartition(_to, _partition), _value));
      updateInvestorPartitionBalance(_to, _value, true, _partition);
    }
    emit TransferByPartition(_from, _to, _value, _partition);
  }

  function addPartitionToAddress(address _who, bytes32 _partition) internal {
    uint partitionCount = walletPartitions[_who].count; //EternalStorageClientUintLibrary.getUint(_token, PARTITION_COUNT, _who);
    setPartitionToAddressImpl(_who, walletPartitions[_who].count, _partition);
    walletPartitions[_who].count = SafeMath.add(partitionCount, 1);
  }

  function removePartitionFromAddress(address _who, bytes32 _partition) internal {
    uint partitionCount = walletPartitions[_who].count;
    uint oldIndex = walletPartitions[_who].toIndex[_partition];
    bytes32 lastPartition = walletPartitions[_who].partitions[partitionCount];

    setPartitionToAddressImpl(_who, oldIndex, lastPartition);

    // EternalStorageClientBytes32Library.deleteBytes32(_token, ADDRESS_PARTITIONS, _who, partitionCount);
    // EternalStorageClientUintLibrary.deleteUint(_token, ADDRESS_PARTITIONS_INDEX, _who, _partition);
    delete walletPartitions[_who].partitions[partitionCount];
    delete walletPartitions[_who].toIndex[_partition];
    delete walletPartitions[_who].balances[_partition];
    walletPartitions[_who].count = SafeMath.sub(partitionCount, 1);
    // EternalStorageClientUintLibrary.setUint(_token, PARTITION_COUNT, _who, SafeMath.sub(partitionCount, 1));
  }

  function setPartitionToAddressImpl(address _who, uint _index, bytes32 _partition) internal {
    walletPartitions[_who].partitions[_index] = _partition;
    walletPartitions[_who].toIndex[_partition] = _index;
    // EternalStorageClientBytes32Library.setBytes32(_token, ADDRESS_PARTITIONS, _who, _index, _partition);
    // EternalStorageClientUintLibrary.setUint(_token, ADDRESS_PARTITIONS_INDEX, _who, _partition, _index);
  }
}