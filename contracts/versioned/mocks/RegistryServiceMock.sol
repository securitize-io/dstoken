pragma solidity ^0.4.23;

import "../registry/DSRegistryServiceInterfaceVersioned.sol";
import "../compliance/DSComplianceServiceInterfaceVersioned.sol";

contract RegistryServiceMock is DSRegistryServiceInterfaceVersioned {
    string _investorId;
    mapping(string => string) _investorsCountries;
    mapping(string => mapping(uint8 => uint256)) _investorsAttributes;
    DSComplianceServiceInterfaceVersioned _complianceService;

    function registerInvestor(string _id, string) public  returns (bool){
        _investorId = _id;
    }
    function removeInvestor(string) public  returns (bool){}
    function setCountry(string _id, string _country) public  returns (bool){
        _complianceService.adjustInvestorCountsAfterCountryChange(_id,_country,getCountry(_id));
        _investorsCountries[_id] = _country;

        return true;
    }
    function getCountry(string _id) public view returns (string){
        return _investorsCountries[_id];
    }
    function getCollisionHash(string) public view returns (string){}
    function setAttribute(string _id, uint8 _attributeId, uint256 _value, uint256, string) public  returns (bool){
        _investorsAttributes[_id][_attributeId] = _value;
    }
    function getAttributeValue(string _id, uint8 _attributeId) public view returns (uint256){
        return _investorsAttributes[_id][_attributeId];
    }
    function getAttributeExpiry(string, uint8) public view returns (uint256){}
    function getAttributeProofHash(string, uint8) public view returns (string){}
    function addWallet(address, string) public  returns (bool){}
    function removeWallet(address, string) public  returns (bool){}
    function getInvestor(address) public view returns (string){
        return _investorId;
    }
    function getInvestorDetails(address) public view returns (string, string){}
    function isInvestor(string) public view returns (bool){}
    function isWallet(address) public view returns (bool){}

    function getDSService(uint) public view returns (address) {}
    function setDSService(uint, address _address) public returns (bool) {
        _complianceService = DSComplianceServiceInterfaceVersioned(_address);
    }
}