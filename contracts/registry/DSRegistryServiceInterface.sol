pragma solidity ^0.4.23;

import '../DSServiceConsumerInterface.sol';

contract DSRegistryServiceInterface is DSServiceConsumerInterface {
  string public constant INVESTORS = "investors";
  string public constant WALLETS = "wallets";
  string public constant ID = "id";
  string public constant COLLISION_HASH = "collision_hash";
  string public constant CREATOR = "creator";
  string public constant COUNTRY = "country";
  string public constant VALUE = "value";
  string public constant EXPIRY = "expiry";
  string public constant PROOF_HASH = "proof_hash";
  string public constant OWNER = "owner";
  string public constant LAST_UPDATED_BY = "last_updated_by";
  string public constant WALLET_COUNT = "wallet_count";

  event DSRegistryServiceInvestorAdded(string _investorId, address _sender);
  event DSRegistryServiceInvestorRemoved(string _investorId, address _sender);
  event DSRegistryServiceInvestorChanged(string _investorId, address _sender);
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

  function registerInvestor(string _id, string _collision_hash) public /*onlyExchangeOrAbove*/ returns (bool);
  function removeInvestor(string _id) public /*onlyExchangeOrAbove*/ returns (bool);
  function setCountry(string _id, string _country) public /*onlyExchangeOrAbove*/ returns (bool);
  function getCountry(string _id) public view returns (string);
  function getCollisionHash(string _id) public view returns (string);
  function setAttribute(string _id, uint8 _attributeId, uint256 _value, uint256 _expiry, string _proofHash) public /*onlyExchangeOrAbove*/ returns (bool);
  function getAttributeValue(string _id, uint8 _attributeId) public view returns (uint256);
  function getAttributeExpiry(string _id, uint8 _attributeId) public view returns (uint256);
  function getAttributeProofHash(string _id, uint8 _attributeId) public view returns (string);
  function addWallet(address _address, string _id) public /*onlyExchangeOrAbove*/ returns (bool);
  function removeWallet(address _address, string _id) public /*onlyExchangeOrAbove*/ returns (bool);
  function getInvestor(address _address) public view returns (string);
  function getInvestorDetails(address _address) public view returns (string, string);
}