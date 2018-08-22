pragma solidity ^0.4.23;

import '../zeppelin/math/SafeMath.sol';
import './DSRegistryServiceInterface.sol';
import '../ESServiceConsumer.sol';

contract ESRegistryService is ESServiceConsumer, DSRegistryServiceInterface {
  using SafeMath for uint256;

  constructor(address _address, string _namespace) public ESServiceConsumer(_address, _namespace) {}

  function registerInvestor(string _id, string _collision_hash) public onlyExchangeOrAbove returns (bool) {
    require(keccak256(abi.encodePacked(getString(INVESTORS, _id, ID))) == keccak256(""));

    setString(INVESTORS, _id, ID, _id);
    setString(INVESTORS, _id, COLLISION_HASH, _collision_hash);
    setAddress(INVESTORS, _id, CREATOR, msg.sender);
    setAddress(INVESTORS, _id, LAST_UPDATED_BY, msg.sender);

    emit DSRegistryServiceInvestorAdded(_id, msg.sender);

    return true;
  }

  function removeInvestor(string _id) public onlyExchangeOrAbove returns (bool) {
    require(keccak256(abi.encodePacked(getString(INVESTORS, _id, ID))) != keccak256(""));
    DSTrustServiceInterface trustManager = DSTrustServiceInterface(getDSService(TRUST_SERVICE));
    require(trustManager.getRole(msg.sender) != trustManager.EXCHANGE() ||
            getAddress(INVESTORS, _id, CREATOR) == msg.sender);
    require(getUint(INVESTORS, _id, WALLET_COUNT) == 0);

    deleteString(INVESTORS, _id, ID);
    deleteString(INVESTORS, _id, COLLISION_HASH);
    deleteAddress(INVESTORS, _id, CREATOR);
    deleteAddress(INVESTORS, _id, LAST_UPDATED_BY);
    deleteString(INVESTORS, _id, COUNTRY);
    deleteString(INVESTORS, _id, COLLISION_HASH);

    for (uint index = 0; index < 8; ++index) {
      deleteUint(INVESTORS, _id, index, VALUE);
      deleteUint(INVESTORS, _id, index, EXPIRY);
      deleteString(INVESTORS, _id, index, PROOF_HASH);
    }

    emit DSRegistryServiceInvestorRemoved(_id, msg.sender);

    return true;
  }

  function setCountry(string _id, string _country) public onlyExchangeOrAbove returns (bool) {
    setString(INVESTORS, _id, COUNTRY, _country);
    setAddress(INVESTORS, _id, LAST_UPDATED_BY, msg.sender);

    emit DSRegistryServiceInvestorChanged(_id, msg.sender);

    return true;
  }

  function getCountry(string _id) public view returns (string) {
    return getString(INVESTORS, _id, COUNTRY);
  }

  function getCollisionHash(string _id) public view returns (string) {
    return getString(INVESTORS, _id, COLLISION_HASH);
  }

  function setAttribute(string _id, uint8 _attributeId, uint256 _value, uint256 _expiry, string _proofHash) public onlyExchangeOrAbove returns (bool) {
    setUint8(INVESTORS, _id, _attributeId, VALUE, _value);
    setUint8(INVESTORS, _id, _attributeId, EXPIRY, _expiry);
    setString8(INVESTORS, _id, _attributeId, PROOF_HASH, _proofHash);
    setAddress(INVESTORS, _id, LAST_UPDATED_BY, msg.sender);

    emit DSRegistryServiceInvestorChanged(_id, msg.sender);

    return true;
  }

  function getAttributeValue(string _id, uint8 _attributeId) public view returns (uint256) {
    return getUint8(INVESTORS, _id, _attributeId, VALUE);
  }

  function getAttributeExpiry(string _id, uint8 _attributeId) public view returns (uint256) {
    return getUint8(INVESTORS, _id, _attributeId, EXPIRY);
  }

  function getAttributeProofHash(string _id, uint8 _attributeId) public view returns (string) {
    return getString8(INVESTORS, _id, _attributeId, PROOF_HASH);
  }

  function addWallet(address _address, string _id) public onlyExchangeOrAbove returns (bool) {
    require(keccak256(abi.encodePacked(getString(WALLETS, _address, OWNER))) == keccak256(""));

    setString(WALLETS, _address, OWNER, _id);
    setAddress(WALLETS, _address, CREATOR, msg.sender);
    setAddress(WALLETS, _address, LAST_UPDATED_BY, msg.sender);
    setUint(INVESTORS, _id, WALLET_COUNT, getUint(INVESTORS, _id, WALLET_COUNT).add(1));

    emit DSRegistryServiceWalletAdded(_address, _id, msg.sender);

    return true;
  }

  function removeWallet(address _address, string _id) public onlyExchangeOrAbove returns (bool) {
    DSTrustServiceInterface trustManager = DSTrustServiceInterface(getDSService(TRUST_SERVICE));
    require(trustManager.getRole(msg.sender) != trustManager.EXCHANGE() ||
            getAddress(WALLETS, _address, CREATOR) == msg.sender);
    require(keccak256(abi.encodePacked(getString(WALLETS, _address, OWNER))) != keccak256(""));

    deleteString(WALLETS, _address, OWNER);
    deleteAddress(WALLETS, _address, CREATOR);
    deleteAddress(WALLETS, _address, LAST_UPDATED_BY);
    setUint(INVESTORS, _id, WALLET_COUNT, getUint(INVESTORS, _id, WALLET_COUNT).sub(1));

    emit DSRegistryServiceWalletRemoved(_address, _id, msg.sender);

    return true;
  }

  function getInvestor(address _address) public view returns (string) {
    return getString(WALLETS, _address, OWNER);
  }

  function getInvestorDetails(address _address) public view returns (string, string) {
    // TODO: make code cleaner
    return (getString(WALLETS, _address, OWNER), getCountry(getString(WALLETS, _address, OWNER)));
  }
}
