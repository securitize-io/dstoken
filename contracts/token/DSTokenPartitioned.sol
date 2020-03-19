pragma solidity ^0.5.0;

import "./DSToken.sol";
import "./IDSTokenPartitioned.sol";
import "../compliance/IDSPartitionsManager.sol";
import "../utils/TokenPartitionsLibrary.sol";

contract DSTokenPartitioned is DSToken, IDSTokenPartitioned {

  function initialize(string memory _name, string memory _symbol, uint8 _decimals) public initializer onlyFromProxy {
    DSToken.initialize(_name, _symbol, _decimals);
    IDSTokenPartitioned.initialize();
    VERSIONS.push(1);
  }

  function issueTokensCustom(address _to, uint256 _value, uint256 _issuanceTime, uint256 _valueLocked, string memory _reason, uint64 _releaseTime) /*onlyIssuerOrAbove*/ public returns (bool) {
    super.issueTokensCustom(_to, _value, _issuanceTime, _valueLocked, _reason, _releaseTime);
    IDSRegistryService registryService = getRegistryService();
    string memory country = registryService.getCountry(registryService.getInvestor(_to));
    bytes32 partition = getPartitionsManager().ensurePartition(_issuanceTime, getComplianceConfigurationService().getCountryCompliance(country));
    partitionsManagement.transferPartition(registryService, address(0), _to, _value, partition);

    emit IssueByPartition(_to, _value, partition);

    return true;
  }

  function transfer(address _to, uint256 _value) public returns (bool) {
    return DSToken.transfer(_to, _value) && partitionsManagement.transferPartitions(getServices(), msg.sender, _to, _value);
  }

  function transferFrom(address _from, address _to, uint256 _value) public returns (bool) {
    return DSToken.transferFrom(_from, _to, _value) && partitionsManagement.transferPartitions(getServices(), _from, _to, _value);
  }

  function transferByPartitions(address _to, uint256 _value, bytes32[] memory _partitions, uint256[] memory _values) public returns (bool) {
    return DSToken.transfer(_to, _value) && partitionsManagement.transferPartitions(getServices(), msg.sender, _to, _value, _partitions, _values);
  }

  function transferFromByPartitions(address _from, address _to, uint256 _value, bytes32[] memory _partitions, uint256[] memory _values) public returns (bool) {
    return DSToken.transferFrom(_from, _to, _value) && partitionsManagement.transferPartitions(getServices(), _from, _to, _value, _partitions, _values);
  }

  function burn(address, uint256, string memory) public {
    require(false, 'Partitioned Token');
  }

  function burnByPartition(address _who, uint256 _value, string memory _reason, bytes32 _partition) onlyIssuerOrAbove public {
    DSToken.burn(_who, _value, _reason);
    partitionsManagement.transferPartition(getRegistryService(), _who, address(0), _value, _partition);
    emit BurnByPartition(_who, _value, _reason, _partition);
  }

  function seize(address, address, uint256, string memory) public {
    require(false, 'Partitioned Token');
  }

  function seizeByPartition(address _from, address _to, uint256 _value, string memory _reason, bytes32 _partition) onlyIssuerOrAbove public {
    DSToken.seize(_from, _to, _value, _reason);
    partitionsManagement.transferPartition(getRegistryService(), _from, _to, _value, _partition);
    emit SeizeByPartition(_from, _to, _value, _reason, _partition);
  }

  function balanceOfByPartition(address _who, bytes32 _partition) public view returns (uint256) {
    return partitionsManagement.balanceOfByPartition(_who, _partition); //walletPartitions[_who].balances[_partition];
  }

  function balanceOfInvestorByPartition(string memory _id, bytes32 _partition) public view returns (uint256) {
    return partitionsManagement.balanceOfInvestorByPartition(_id, _partition); // investorPartitionsBalances[_id][_partition];
  }

  function partitionCountOf(address _who) public view returns (uint) {
    return partitionsManagement.partitionCountOf(_who); // walletPartitions[_who].count;
  }

  function partitionOf(address _who, uint _index) public view returns (bytes32) {
    return partitionsManagement.partitionOf(_who, _index); // walletPartitions[_who].partitions[_index];
  }

  function getServices() internal view returns(address[] memory) {
    address[] memory services = new address[](2);
    services[0] = getDSService(COMPLIANCE_SERVICE);
    services[1] = getDSService(REGISTRY_SERVICE);
    return services;
  }
}