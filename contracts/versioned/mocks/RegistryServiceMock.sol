pragma solidity ^0.4.23;

import "../registry/DSRegistryServiceInterfaceVersioned.sol";

contract RegistryServiceMock is DSRegistryServiceInterfaceVersioned {
    string _investorId;
    string _investorCountry;
    string _investorCollisionHash;

    function registerInvestor(string _id, string _collision_hash) public  returns (bool){
        _investorId = _id;
        _investorCollisionHash = _collision_hash;
    }
    function removeInvestor(string _id) public  returns (bool){}
    function setCountry(string _id, string _country) public  returns (bool){
        _investorCountry = _country;
    }
    function getCountry(string _id) public view returns (string){
        return _investorCountry;
    }
    function getCollisionHash(string _id) public view returns (string){}
    function setAttribute(string _id, uint8 _attributeId, uint256 _value, uint256 _expiry, string _proofHash) public  returns (bool){}
    function getAttributeValue(string _id, uint8 _attributeId) public view returns (uint256){}
    function getAttributeExpiry(string _id, uint8 _attributeId) public view returns (uint256){}
    function getAttributeProofHash(string _id, uint8 _attributeId) public view returns (string){}
    function addWallet(address _address, string _id) public  returns (bool){}
    function removeWallet(address _address, string _id) public  returns (bool){}
    function getInvestor(address _address) public view returns (string){
        return _investorId;
    }
    function getInvestorDetails(address _address) public view returns (string, string){}
    function isInvestor(string _id) public view returns (bool){}
    function isWallet(address _address) public view returns (bool){}

    function getDSService(uint _serviceId) public view returns (address) {}
    function setDSService(uint _serviceId, address _address) public /*onlyMaster*/ returns (bool) {}
}