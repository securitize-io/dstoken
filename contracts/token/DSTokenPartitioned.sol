pragma solidity ^0.8.13;

import "./DSToken.sol";
import "./IDSTokenPartitioned.sol";
import "../compliance/IDSPartitionsManager.sol";
import "./TokenPartitionsLibrary.sol";

//SPDX-License-Identifier: UNLICENSED
contract DSTokenPartitioned is DSToken, IDSTokenPartitioned {

    using TokenPartitionsLibrary for TokenPartitionsLibrary.TokenPartitions;

    function initialize(string memory _name, string memory _symbol, uint8 _decimals) public override initializer forceInitializeFromProxy {
        DSToken.initialize(_name, _symbol, _decimals);
        VERSIONS.push(3);
    }

    function issueTokensWithMultipleLocks(
        address _to,
        uint256 _value,
        uint256 _issuanceTime,
        uint256[] memory _valuesLocked,
        string memory _reason,
        uint64[] memory _releaseTimes /*onlyIssuerOrAbove*/
    ) public override returns (bool) {
        super.issueTokensWithMultipleLocks(_to, _value, _issuanceTime, new uint256[](0), "", new uint64[](0));
        partitionsManagement.issueTokensCustom(
            getRegistryService(),
            getComplianceConfigurationService(),
            getPartitionsManager(),
            getLockManagerPartitioned(),
            _to,
            _value,
            _issuanceTime,
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

    function burn(address, uint256, string memory) public pure override {
        require(false, "Partitioned Token");
    }

    function burnByPartition(address _who, uint256 _value, string memory _reason, bytes32 _partition) public override onlyIssuerOrTransferAgentOrAbove {
        DSToken.burn(_who, _value, _reason);
        emit BurnByPartition(_who, _value, _reason, _partition);
        partitionsManagement.transferPartition(getRegistryService(), _who, address(0), _value, _partition);
    }

    function seize(address, address, uint256, string memory) public pure override {
        require(false, "Partitioned Token");
    }

    function seizeByPartition(address _from, address _to, uint256 _value, string memory _reason, bytes32 _partition) public override onlyTransferAgentOrAbove {
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
