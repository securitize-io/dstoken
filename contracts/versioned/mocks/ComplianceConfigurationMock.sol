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
    function setTotalInvestorsLimit(uint) public {}
    function getMinUsTokens() public view returns (uint){}
    function setMinUsTokens(uint) public {}
    function getMinEuTokens() public view returns (uint){}
    function setMinEuTokens(uint) public {}
    function getUsInvestorsLimit() public view returns (uint){}
    function setUsInvestorsLimit(uint) public {}
    function getUsAccreditedInvestorsLimit() public view returns (uint){}
    function setUsAccreditedInvestorsLimit(uint) public {}
    function getNonAccreditedInvestorsLimit() public view returns (uint){}
    function setNonAccreditedInvestorsLimit(uint) public {}
    function getMaxUsInvestorsPercentage() public view returns (uint){}
    function setMaxUsInvestorsPercentage(uint) public {}
    function getBlockFlowbackEndTime() public view returns (uint){}
    function setBlockFlowbackEndTime(uint) public {}
    function getNonUsLockPeriod() public view returns (uint){}
    function setNonUsLockPeriod(uint) public {}
    function getMinimumTotalInvestors() public view returns (uint){}
    function setMinimumTotalInvestors(uint) public {}
    function getMinimumHoldingsPerInvestor() public view returns (uint){}
    function setMinimumHoldingsPerInvestor(uint) public {}
    function getMaximumHoldingsPerInvestor() public view returns (uint){}
    function setMaximumHoldingsPerInvestor(uint) public {}
    function getEuRetailLimit() public view returns (uint){}
    function setEuRetailLimit(uint) public {}
    function getUsLockPeriod() public view returns (uint) {}
    function setUsLockPeriod(uint) public {}
    function getForceFullTransfer() public view returns (bool){}
    function setForceFullTransfer(bool) public {}
    function getForceAccredited() public view returns (bool){}
    function setForceAccredited(bool) public {}
    function setForceAccreditedUS(bool) public {}
    function getForceAccreditedUS() public view returns (bool) {}
    function setAll(uint[], bool[]) public {}

    function getDSService(uint) public view returns (address) {}
    function setDSService(uint, address) public returns (bool) {}
}