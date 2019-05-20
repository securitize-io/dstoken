pragma solidity ^0.4.23;

import "../compliance/DSWalletManagerInterfaceVersioned.sol";

contract WalletManagerMock is DSWalletManagerInterfaceVersioned {

  function setSpecialWallet(address _wallet, uint8 _type) internal returns (bool) {

  }

  function getWalletType(address _wallet) public view returns (uint8) {
      return ISSUER;
  }

  function addIssuerWallet(address _wallet) public returns (bool) {

  }

  function addPlatformWallet(address _wallet) public  returns (bool) {

  }

  function addExchangeWallet(address _wallet, address _owner) public  returns (bool) {

  }

  function removeSpecialWallet(address _wallet) public  returns (bool) {}

  function setReservedSlots(address _wallet, string _country, uint8 _accreditationStatus, uint _slots) public  returns (bool) {

  }

  function getReservedSlots(address _wallet, string _country, uint8 _accreditationStatus) public view returns (uint) {

  }
}