pragma solidity ^0.4.23;

import "../compliance/DSWalletManagerInterfaceVersioned.sol";

contract WalletManagerMock is DSWalletManagerInterfaceVersioned {

  function setSpecialWallet(address, uint8) internal returns (bool) {

  }

  function getWalletType(address) public view returns (uint8) {
      return ISSUER;
  }

  function addIssuerWallet(address) public returns (bool) {

  }

  function addPlatformWallet(address) public  returns (bool) {

  }

  function addExchangeWallet(address, address) public  returns (bool) {

  }

  function removeSpecialWallet(address) public  returns (bool) {}

  function setReservedSlots(address, string, uint8, uint) public  returns (bool) {

  }

  function getReservedSlots(address, string, uint8) public view returns (uint) {

  }

  function getDSService(uint) public view returns (address) {}
  function setDSService(uint, address) public returns (bool) {}
}