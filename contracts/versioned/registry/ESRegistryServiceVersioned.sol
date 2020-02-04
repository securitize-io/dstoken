pragma solidity ^0.4.23;

import '../../zeppelin/math/SafeMath.sol';
import './DSRegistryServiceInterfaceVersioned.sol';
import '../service/ESServiceConsumerVersioned.sol';

library ESRegistryServiceLibrary {
  using SafeMath for uint256;

  string internal constant INVESTORS = "investors";
  string internal constant WALLETS = "wallets";
  string internal constant ID = "id";
  string internal constant COLLISION_HASH = "collision_hash";
  string internal constant CREATOR = "creator";
  string internal constant COUNTRY = "country";
  string internal constant VALUE = "value";
  string internal constant EXPIRY = "expiry";
  string internal constant PROOF_HASH = "proof_hash";
  string internal constant OWNER = "owner";
  string internal constant LAST_UPDATED_BY = "last_updated_by";
  string internal constant WALLET_COUNT = "wallet_count";

  function getInvestorDetails(ESRegistryServiceVersioned _registry, address _address) public view returns (string, string) {
    return (getInvestor(_registry, _address), getCountry(_registry, getInvestor(_registry, _address)));
  }

  function isWallet(ESRegistryServiceVersioned _registry, address _address) public view returns (bool) {
    return keccak256(abi.encodePacked(getInvestor(_registry, _address))) != keccak256("");
  }

  function isSpecialWallet(ESRegistryServiceVersioned _registry, address _address) public view returns (bool) {
    return getWalletManager(_registry).getWalletType(_address) != getWalletManager(_registry).NONE();
  }

  function registerInvestor(ESRegistryServiceVersioned _registry, string _id, string _collision_hash) public returns (bool) {
    EternalStorageClientStringLibrary.setString(_registry, INVESTORS, _id, ID, _id);
    EternalStorageClientStringLibrary.setString(_registry, INVESTORS, _id, COLLISION_HASH, _collision_hash);
    EternalStorageClientAddressLibrary.setAddress(_registry, INVESTORS, _id, CREATOR, msg.sender);
    EternalStorageClientAddressLibrary.setAddress(_registry, INVESTORS, _id, LAST_UPDATED_BY, msg.sender);
  }

  function removeInvestor(ESRegistryServiceVersioned _registry, string _id) public returns (bool) {
    DSTrustServiceInterfaceVersioned trustManager = getTrustService(_registry);
    require(trustManager.getRole(msg.sender) != trustManager.EXCHANGE() ||
            EternalStorageClientAddressLibrary.getAddress(_registry, INVESTORS, _id, CREATOR) == msg.sender);
    require(EternalStorageClientUintLibrary.getUint(_registry, INVESTORS, _id, WALLET_COUNT) == 0);

    EternalStorageClientStringLibrary.deleteString(_registry, INVESTORS, _id, ID);
    EternalStorageClientStringLibrary.deleteString(_registry, INVESTORS, _id, COLLISION_HASH);
    EternalStorageClientAddressLibrary.deleteAddress(_registry, INVESTORS, _id, CREATOR);
    EternalStorageClientAddressLibrary.deleteAddress(_registry, INVESTORS, _id, LAST_UPDATED_BY);
    EternalStorageClientStringLibrary.deleteString(_registry, INVESTORS, _id, COUNTRY);

    for (uint index = 0; index < 16; ++index) {
      EternalStorageClientUintLibrary.deleteUint(_registry, INVESTORS, _id, index, VALUE);
      EternalStorageClientUintLibrary.deleteUint(_registry, INVESTORS, _id, index, EXPIRY);
      EternalStorageClientStringLibrary.deleteString(_registry, INVESTORS, _id, index, PROOF_HASH);
    }
  }

  function setAttribute(ESRegistryServiceVersioned _registry, string _id, uint8 _attributeId, uint256 _value, uint256 _expiry, string _proofHash) public returns (bool) {
    require(_attributeId < 16);

    EternalStorageClientUintLibrary.setUint8(_registry, INVESTORS, _id, _attributeId, VALUE, _value);
    EternalStorageClientUintLibrary.setUint8(_registry, INVESTORS, _id, _attributeId, EXPIRY, _expiry);
    EternalStorageClientStringLibrary.setString8(_registry, INVESTORS, _id, _attributeId, PROOF_HASH, _proofHash);
    EternalStorageClientAddressLibrary.setAddress(_registry, INVESTORS, _id, LAST_UPDATED_BY, msg.sender);
  }

  function addWallet(ESRegistryServiceVersioned _registry, address _address, string _id) public {
    require(!isSpecialWallet(_registry, _address));

    EternalStorageClientStringLibrary.setString(_registry, WALLETS, _address, OWNER, _id);
    EternalStorageClientAddressLibrary.setAddress(_registry, WALLETS, _address, CREATOR, msg.sender);
    EternalStorageClientAddressLibrary.setAddress(_registry, WALLETS, _address, LAST_UPDATED_BY, msg.sender);
    EternalStorageClientUintLibrary.setUint(_registry, INVESTORS, _id, WALLET_COUNT, EternalStorageClientUintLibrary.getUint(_registry, INVESTORS, _id, WALLET_COUNT).add(1));
  }

  function removeWallet(ESRegistryServiceVersioned _registry, address _address, string _id) public returns (bool) {
    DSTrustServiceInterfaceVersioned trustManager = getTrustService(_registry);
    require(trustManager.getRole(msg.sender) != trustManager.EXCHANGE() ||
            EternalStorageClientAddressLibrary.getAddress(_registry, WALLETS, _address, CREATOR) == msg.sender);

    EternalStorageClientStringLibrary.deleteString(_registry, WALLETS, _address, OWNER);
    EternalStorageClientAddressLibrary.deleteAddress(_registry, WALLETS, _address, CREATOR);
    EternalStorageClientAddressLibrary.deleteAddress(_registry, WALLETS, _address, LAST_UPDATED_BY);
    EternalStorageClientUintLibrary.setUint(_registry, INVESTORS, _id, WALLET_COUNT, EternalStorageClientUintLibrary.getUint(_registry, INVESTORS, _id, WALLET_COUNT).sub(1));
  }

  function setCountry(ESRegistryServiceVersioned _registry, string _id, string _country) public returns (bool) {
    EternalStorageClientStringLibrary.setString(_registry, INVESTORS, _id, COUNTRY, _country);
    EternalStorageClientAddressLibrary.setAddress(_registry, INVESTORS, _id, LAST_UPDATED_BY, msg.sender);
  }

  function getInvestor(ESRegistryServiceVersioned _registry, address _address) public view returns (string) {
    return EternalStorageClientStringLibrary.getString(_registry, WALLETS, _address, OWNER);
  }

  function isInvestor(ESRegistryServiceVersioned _registry, string _id) public view returns (bool) {
    return keccak256(abi.encodePacked(EternalStorageClientStringLibrary.getString(_registry, INVESTORS, _id, ID))) != keccak256("");
  }

  function getAttributeValue(ESRegistryServiceVersioned _registry, string _id, uint8 _attributeId) public view returns (uint256) {
    return EternalStorageClientUintLibrary.getUint8(_registry, INVESTORS, _id, _attributeId, VALUE);
  }

  function getAttributeExpiry(ESRegistryServiceVersioned _registry, string _id, uint8 _attributeId) public view returns (uint256) {
    return EternalStorageClientUintLibrary.getUint8(_registry, INVESTORS, _id, _attributeId, EXPIRY);
  }

  function getAttributeProofHash(ESRegistryServiceVersioned _registry, string _id, uint8 _attributeId) public view returns (string) {
    return EternalStorageClientStringLibrary.getString8(_registry, INVESTORS, _id, _attributeId, PROOF_HASH);
  }

  function getCountry(ESRegistryServiceVersioned _registry, string _id) public view returns (string) {
    return EternalStorageClientStringLibrary.getString(_registry, INVESTORS, _id, COUNTRY);
  }

  function getCollisionHash(ESRegistryServiceVersioned _registry, string _id) public view returns (string) {
    return EternalStorageClientStringLibrary.getString(_registry, INVESTORS, _id, COLLISION_HASH);
  }

  function getWalletManager(DSServiceConsumerInterfaceVersioned _service) public view returns (DSWalletManagerInterfaceVersioned) {
    return DSWalletManagerInterfaceVersioned(_service.getDSService(_service.WALLET_MANAGER()));
  }

  function getTrustService(DSServiceConsumerInterfaceVersioned _service) public view returns (DSTrustServiceInterfaceVersioned) {
    return DSTrustServiceInterfaceVersioned(_service.getDSService(_service.TRUST_SERVICE()));
  }

  function getToken(DSServiceConsumerInterfaceVersioned _service) public view returns (DSTokenInterfaceVersioned){
    return DSTokenInterfaceVersioned(_service.getDSService(_service.DS_TOKEN()));
  }
}

contract ESRegistryServiceVersioned is ESServiceConsumerVersioned, DSRegistryServiceInterfaceVersioned {
  constructor(address _address, string _namespace) public ESServiceConsumerVersioned(_address, _namespace) {
    VERSIONS.push(2);
  }

  function registerInvestor(string _id, string _collision_hash) public onlyExchangeOrAbove newInvestor(_id) returns (bool) {
    ESRegistryServiceLibrary.registerInvestor(this, _id, _collision_hash);

    emit DSRegistryServiceInvestorAdded(_id, msg.sender);

    return true;
  }

  function removeInvestor(string _id) public onlyExchangeOrAbove investorExists(_id) returns (bool) {
    ESRegistryServiceLibrary.removeInvestor(this, _id);

    emit DSRegistryServiceInvestorRemoved(_id, msg.sender);

    return true;
  }

  function updateInvestor(string _id, string _collisionHash, string _country, address [] _wallets, uint8[] _attributeIds, uint[] _attributeValues, uint[] _attributeExpirations) public onlyIssuerOrAbove returns (bool) {
    require(_attributeValues.length == _attributeIds.length);
    require(_attributeIds.length == _attributeExpirations.length);

    if (!isInvestor(_id)) {
      registerInvestor(_id, _collisionHash);
    }

    if (bytes(_country).length > 0){
      setCountry(_id,_country);
    }

    for (uint i = 0; i < _wallets.length; i++) {
      if (isWallet(_wallets[i])) {
        require(keccak256(abi.encodePacked(getInvestor(_wallets[i]))) == keccak256(abi.encodePacked(_id)), "Wallet belongs to a different investor");
      } else {
        addWallet(_wallets[i], _id);
      }
    }

    for (i = 0 ; i < _attributeIds.length ; i++){
      setAttribute(_id, _attributeIds[i] ,_attributeValues[i], _attributeExpirations[i], "");
    }


    return true;
  }

  function getInvestorDetailsFull(string _id) public view returns (string,uint[],uint[], string,string,string,string) {
    string memory country = ESRegistryServiceLibrary.getCountry(this, _id);
    uint[] memory attributeValues = new uint[](4);
    uint[] memory attributeExpiries = new uint[](4);
    string [] memory attributeProofHashes = new string[](4);
    for (uint8 i = 0 ; i < 4 ; i++){
      attributeValues[i] = ESRegistryServiceLibrary.getAttributeValue(this,_id,(uint8(2) ** i));
      attributeExpiries[i] = ESRegistryServiceLibrary.getAttributeExpiry(this,_id,(uint8(2) ** i));
      attributeProofHashes[i] = ESRegistryServiceLibrary.getAttributeProofHash(this,_id,(uint8(2) ** i));
    }
    return (country,attributeValues,attributeExpiries,attributeProofHashes[0],attributeProofHashes[1],attributeProofHashes[2],attributeProofHashes[3]);
  }

  function setCountry(string _id, string _country) public onlyExchangeOrAbove investorExists(_id) returns (bool) {
    string memory prevCountry = getCountry(_id);

    getComplianceService().adjustInvestorCountsAfterCountryChange(_id,_country,prevCountry);

    ESRegistryServiceLibrary.setCountry(this, _id, _country);

    emit DSRegistryServiceInvestorCountryChanged(_id, _country, msg.sender);

    return true;
  }

  function getCountry(string _id) public view returns (string) {
    return ESRegistryServiceLibrary.getCountry(this, _id);
  }

  function getCollisionHash(string _id) public view returns (string) {
    return ESRegistryServiceLibrary.getCollisionHash(this, _id);
  }

  function setAttribute(string _id, uint8 _attributeId, uint256 _value, uint256 _expiry, string _proofHash) public onlyExchangeOrAbove investorExists(_id) returns (bool) {
    ESRegistryServiceLibrary.setAttribute(this, _id, _attributeId, _value, _expiry, _proofHash);

    emit DSRegistryServiceInvestorAttributeChanged(_id, _attributeId, _value, _expiry, _proofHash, msg.sender);

    return true;
  }

  function getAttributeValue(string _id, uint8 _attributeId) public view returns (uint256) {
    return ESRegistryServiceLibrary.getAttributeValue(this, _id, _attributeId);
  }

  function getAttributeExpiry(string _id, uint8 _attributeId) public view returns (uint256) {
    return ESRegistryServiceLibrary.getAttributeExpiry(this, _id, _attributeId);
  }

  function getAttributeProofHash(string _id, uint8 _attributeId) public view returns (string) {
    return ESRegistryServiceLibrary.getAttributeProofHash(this, _id, _attributeId);
  }

  function addWallet(address _address, string _id) public onlyExchangeOrAbove investorExists(_id) newWallet(_address) returns (bool) {
    ESRegistryServiceLibrary.addWallet(this, _address, _id);

    emit DSRegistryServiceWalletAdded(_address, _id, msg.sender);

    return true;
  }

  function removeWallet(address _address, string _id) public onlyExchangeOrAbove walletExists(_address) walletBelongsToInvestor(_address, _id) returns (bool) {
    ESRegistryServiceLibrary.removeWallet(this, _address, _id);

    emit DSRegistryServiceWalletRemoved(_address, _id, msg.sender);

    return true;
  }

  function getInvestor(address _address) public view returns (string) {
    return ESRegistryServiceLibrary.getInvestor(this, _address);
  }

  function getInvestorDetails(address _address) public view returns (string, string) {
    return ESRegistryServiceLibrary.getInvestorDetails(this, _address);
  }

  function isInvestor(string _id) public view returns (bool) {
    return ESRegistryServiceLibrary.isInvestor(this, _id);
  }

  function isWallet(address _address) public view returns (bool) {
    return ESRegistryServiceLibrary.isWallet(this, _address);
  }

  function isSpecialWallet(address _address) internal view returns (bool) {
    return ESRegistryServiceLibrary.isSpecialWallet(this, _address);
  }
}
