pragma solidity ^0.4.23;

import '../DSServiceConsumerInterface.sol';

contract DSRegistryServiceInterface is DSServiceConsumerInterface {
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

  function registerInvestor(string _id) public /*onlyExchangeOrAbove*/ returns (bool);
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