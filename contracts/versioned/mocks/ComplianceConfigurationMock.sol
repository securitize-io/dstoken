pragma solidity ^0.4.23;

import "../compliance/DSComplianceConfigurationServiceInterfaceVersioned.sol";

contract ComplianceConfigurationMock is DSComplianceConfigurationServiceInterfaceVersioned{
    mapping(string => uint) _countriesCompliance;
    
    function getCountryCompliance(string _country) view public returns (uint){
        return _countriesCompliance[_country];
    }
    function setCountryCompliance(string _country, uint _value)  public{
        _countriesCompliance[_country] = _value;
    }
    function getTotalInvestorsLimit() public view returns (uint){}
    function setTotalInvestorsLimit(uint _value) public {}
    function getMinUsTokens() public view returns (uint){}
    function setMinUsTokens(uint _value) public {}
    function getMinEuTokens() public view returns (uint){}
    function setMinEuTokens(uint _value) public {}
    function getUsInvestorsLimit() public view returns (uint){}
    function setUsInvestorsLimit(uint _value) public {}
    function getUsAccreditedInvestorsLimit() public view returns (uint){}
    function setUsAccreditedInvestorsLimit(uint _value) public {}
    function getNonUsNonAccreditedInvestorsLimit() public view returns (uint){}
    function setNonUsNonAccreditedInvestorsLimit(uint _value) public {}
    function getMaxUsInvestorsPercentage() public view returns (uint){}
    function setMaxUsInvestorsPercentage(uint _value) public {}
    function getBlockFlowbackEndTime() public view returns (uint){}
    function setBlockFlowbackEndTime(uint _value) public {}
    function getNonUsLockPeriod() public view returns (uint){}
    function setNonUsLockPeriod(uint _value) public {}
    function getMinimumTotalInvestors() public view returns (uint){}
    function setMinimumTotalInvestors(uint _value) public {}
    function getMinimumHoldingsPerInvestor() public view returns (uint){}
    function setMinimumHoldingsPerInvestor(uint _value) public {}
    function getMaximumHoldingsPerInvestor() public view returns (uint){}
    function setMaximumHoldingsPerInvestor(uint _value) public {}
    function getEuRetailLimit() public view returns (uint){}
    function setEuRetailLimit(uint _value) public {}
    function getForceFullTransfer() public view returns (bool){}
    function setForceFullTransfer(bool _value) public {}
    function getForceAccredited() public view returns (bool){}
    function setForceAccredited(bool _value) public {}
    function setAll(uint[] _uint_values, bool[] _bool_values) public {}

    function getDSService(uint _serviceId) public view returns (address) {}
    function setDSService(uint _serviceId, address _address) public returns (bool) {}
}