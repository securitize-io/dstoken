pragma solidity ^0.4.23;

import './DSRegistryServiceInterface.sol';
import '../ESServiceConsumer.sol';

contract ESRegistryService is ESServiceConsumer, DSRegistryServiceInterface {
  constructor(address _address, string _namespace) public ESServiceConsumer(_address, _namespace) {}

  function registerInvestor(string _id, string _collision_hash) public onlyExchangeOrAbove returns (bool) {
    require(keccak256(abi.encodePacked(getString("investors", _id, "id"))) == keccak256(""));

    setString("investors", _id, "id", _id);
    setString("investors", _id, "collision_hash", _collision_hash);
    setAddress("investors", _id, "creator", msg.sender);
    setAddress("investors", _id, "last_updated_by", msg.sender);

    emit DSRegistryServiceInvestorAdded(_id, msg.sender);

    return true;
  }

  function removeInvestor(string _id) public onlyExchangeOrAbove returns (bool) {
    require(keccak256(abi.encodePacked(getString("investors", _id, "id"))) != keccak256(""));
    DSTrustServiceInterface trustManager = DSTrustServiceInterface(services[TRUST_SERVICE]);
    require(trustManager.getRole(msg.sender) != trustManager.EXCHANGE() ||
            getAddress("investors", _id, "creator") == msg.sender);
    require(getUint("investors", _id, "wallet_count") == 0);

    deleteString("investors", _id, "id");
    deleteString("investors", _id, "collision_hash");
    deleteAddress("investors", _id, "creator");
    deleteAddress("investors", _id, "last_updated_by");
    deleteString("investors", _id, "country");
    deleteString("investors", _id, "collision_hash");

    for (uint index = 0; index < 8; ++index) {
      deleteUint("investors", _id, index, "value");
      deleteUint("investors", _id, index, "expiry");
      deleteString("investors", _id, index, "proof_hash");
    }

    emit DSRegistryServiceInvestorRemoved(_id, msg.sender);

    return true;
  }

  function setCountry(string _id, string _country) public onlyExchangeOrAbove returns (bool) {
    setString("investors", _id, "country", _country);
    setString("investors", _id, "last_updated_by", msg.sender);

    emit DSRegistryServiceInvestorChanged(_id, msg.sender);

    return true;
  }

  function getCountry(string _id) public view returns (string) {
    return getString("investors", _id, "country");
  }

  function getCollisionHash(string _id) public view returns (string) {
    return getString("investors", _id, "collision_hash");
  }

  function setAttribute(string _id, uint8 _attributeId, uint256 _value, uint256 _expiry, string _proofHash) public onlyExchangeOrAbove returns (bool) {
    setUint("investors", _id, _attributeId, "value", _value);
    setUint("investors", _id, _attributeId, "expiry", _expiry);
    setString("investors", _id, _attributeId, "proof_hash", _proofHash);
    setAddress("investors", _id, "last_updated_by", msg.sender);

    emit DSRegistryServiceInvestorChanged(_id, msg.sender);

    return true;
  }

  function getAttributeValue(string _id, uint8 _attributeId) public view returns (uint256) {
    return getUint("investors", _id, _attributeId, "value");
  }

  function getAttributeExpiry(string _id, uint8 _attributeId) public view returns (uint256) {
    return getUint("investors", _id, _attributeId, "expiry");
  }

  function getAttributeProofHash(string _id, uint8 _attributeId) public view returns (string) {
    return getUint("investors", _id, _attributeId, "proof_hash");
  }

  function addWallet(address _address, string _id) public onlyExchangeOrAbove returns (bool) {
    require(keccak256(abi.encodePacked(getString("wallets", _address, "owner"))) == keccak256(""));

    setString("wallets", _address, "owner", _id);
    setAddress("wallets", _address, "creator", msg.sender);
    setAddress("wallets", _address, "last_updated_by", msg.sender);
    setUint("investors", _id, "wallet_count", getUint("investors", _id, "wallet_count").add(1));

    emit DSRegistryServiceWalletAdded(_address, _id, msg.sender);

    return true;
  }

  function removeWallet(address _address, string _id) public onlyExchangeOrAbove returns (bool) {
    DSTrustServiceInterface trustManager = DSTrustServiceInterface(services[TRUST_SERVICE]);
    require(trustManager.getRole(msg.sender) != trustManager.EXCHANGE() ||
            getAddress("wallets", _address, "creator") == msg.sender);
    require(keccak256(abi.encodePacked(getString("wallets", _address, "owner"))) != keccak256(""));

    deleteString("wallets", _address, "owner");
    deleteAddress("wallets", _address, "creator");
    deleteAddress("wallets", _address, "last_updated_by");
    setUint("investors", _id, "wallet_count", getUint("investors", _id, "wallet_count").sub(1));

    emit DSRegistryServiceWalletRemoved(_address, _id, msg.sender);

    return true;
  }

  function getInvestor(address _address) public view returns (string) {
    return getString("wallets", _address, "owner");
  }

  function getInvestorDetails(address _address) public view returns (string, address) {
    string id = getString("wallets", _address, "owner");
    return (id, getCountry(id));
  }
}
