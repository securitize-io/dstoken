pragma solidity ^0.4.23;

import '../DSServiceConsumerInterface.sol';

contract DSRegistryServiceInterface is DSServiceConsumerInterface {
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

  event DSRegistryServiceInvestorAdded(string _investorId, address _sender);
  event DSRegistryServiceInvestorRemoved(string _investorId, address _sender);
  event DSRegistryServiceInvestorCountryChanged(string _investorId, string _country, address _sender);
  event DSRegistryServiceInvestorAttributeChanged(string _investorId, uint256 _attributeId, uint256 _value, uint256 _expiry, string _proofHash, address _sender);
  event DSRegistryServiceWalletAdded(address _wallet, string _investorId, address _sender);
  event DSRegistryServiceWalletRemoved(address _wallet, string _investorId, address _sender);

  uint8 public constant NONE = 0;
  uint8 public constant KYC_APPROVED = 1;
  uint8 public constant ACCREDITED = 2;
  uint8 public constant QUALIFIED = 4;
  uint8 public constant PROFESSIONAL = 8;

  uint8 public constant PENDING = 0;
  uint8 public constant APPROVED = 1;
  uint8 public constant REJECTED = 2;

  modifier investorExists(string _id) {
    require(isInvestor(_id));
    _;
  }

  modifier newInvestor(string _id) {
    require(!isInvestor(_id));
    _;
  }

  modifier walletExists(address _address) {
    require(isWallet(_address));
    _;
  }

  modifier newWallet(address _address) {
    require(!isWallet(_address));
    _;
  }

  modifier walletBelongsToInvestor(address _address, string _id) {
    require(keccak256(abi.encodePacked(getInvestor(_address))) == keccak256(abi.encodePacked(_id)));
    _;
  }

  function registerInvestor(string _id, string _collision_hash) public /*onlyExchangeOrAbove newInvestor(_id)*/ returns (bool);
  function removeInvestor(string _id) public /*onlyExchangeOrAbove investorExists(_id)*/ returns (bool);
  function setCountry(string _id, string _country) public /*onlyExchangeOrAbove investorExists(_id)*/ returns (bool);
  function getCountry(string _id) public view returns (string);
  function getCollisionHash(string _id) public view returns (string);
  function setAttribute(string _id, uint8 _attributeId, uint256 _value, uint256 _expiry, string _proofHash) public /*onlyExchangeOrAbove investorExists(_id)*/ returns (bool);
  function getAttributeValue(string _id, uint8 _attributeId) public view returns (uint256);
  function getAttributeExpiry(string _id, uint8 _attributeId) public view returns (uint256);
  function getAttributeProofHash(string _id, uint8 _attributeId) public view returns (string);
  function addWallet(address _address, string _id) public /*onlyExchangeOrAbove newWallet(_address)*/ returns (bool);
  function removeWallet(address _address, string _id) public /*onlyExchangeOrAbove walletExists walletBelongsToInvestor(_address, _id)*/ returns (bool);
  function getInvestor(address _address) public view returns (string);
  function getInvestorDetails(address _address) public view returns (string, string);
  function isInvestor(string _id) public view returns (bool);
  function isWallet(address _address) public view returns (bool);
}