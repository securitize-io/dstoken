pragma solidity ^0.4.23;

import '../ESServiceConsumer.sol';
import './DSWalletManagerInterface.sol';

/**
 * @title ESWalletManager
 * @dev A wallet manager which allows marking special wallets in the system.
 * @dev Implements DSTrustServiceInterface and ESServiceConsumer.
 */
contract ESWalletManager is DSWalletManagerInterface, ESServiceConsumer {
  /**
   * @dev The constructor delegates the paramters to EternalStorageClient.
   */
  constructor(address _address, string _namespace) public ESServiceConsumer(_address, _namespace) {}

  /**
   * @dev Sets a wallet to be an special wallet. (internal)
   * @param _address The address of the wallet.
   * @param _type The type of the wallet.
   * @return A boolean that indicates if the operation was successful.
   */
  function setSpecialWallet(address _wallet, uint8 _type) internal returns (bool) {
    uint8 oldType = uint8(getUint("wallets", _wallet, "type"));
    require(oldType == NONE || _type == NONE);

    setUint("wallets", _wallet, "type", _type);

    if (oldType == NONE) {
      emit DSWalletManagerSpecialWalletAdded(_wallet, _type, msg.sender);
    } else {
      emit DSWalletManagerSpecialWalletRemoved(_wallet, oldType, msg.sender);
    }

    return true;
  }

  /**
   * @dev Sets a wallet to be an issuer wallet.
   * @param _address The address of the wallet.
   * @return A boolean that indicates if the operation was successful.
   */
  function addIssuerWallet(address _wallet) public onlyIssuerOrAbove returns (bool) {
    return setSpecialWallet(_wallet, ISSUER);
  }

  /**
   * @dev Sets a wallet to be an platform wallet.
   * @param _address The address of the wallet.
   * @return A boolean that indicates if the operation was successful.
   */
  function addPlatformWallet(address _wallet) public onlyIssuerOrAbove returns (bool) {
    return setSpecialWallet(_wallet, PLATFORM);
  }

  /**
   * @dev Sets a wallet to be an exchange wallet.
   * @param _address The address of the wallet.
   * @return A boolean that indicates if the operation was successful.
   */
  function addExchangeWallet(address _wallet) public onlyIssuerOrAbove returns (bool) {
    return setSpecialWallet(_wallet, EXCHANGE);
  }

  /**
   * @dev Removes a special wallet.
   * @param _address The address of the wallet.
   * @return A boolean that indicates if the operation was successful.
   */
  function removeSpecialWallet(address _wallet) public onlyIssuerOrAbove returns (bool) {
    // TODO: check that wallet is empty
    return setSpecialWallet(_wallet, NONE);
  }

  /**
   * @dev Sets the amount of reserved slots for a wallet based on country and accreditation status.
   * @param _address The address of the wallet.
   * @param _country The investors' country.
   * @param _accreditationStatus the investors' accrediation status.
   * @param _slots number of reserved slots.
   * @return A boolean that indicates if the operation was successful.
   */
  function setReservedSlots(address _wallet, string _country, uint8 _accreditationStatus, uint _slots) public onlyIssuerOrAbove returns (bool) {
    // TODO: validate added slots
    setUint8("wallets", _wallet, "slots", _country, _accreditationStatus, _slots);

    emit DSWalletManagerReservedSlotsSet(_wallet, _country, _accreditationStatus, _slots, msg.sender);

    return true;
  }

  /**
   * @dev Gets the amount of reserved slots for a wallet based on country and accreditation status.
   * @param _address The address of the wallet.
   * @param _country The investors' country.
   * @param _accreditationStatus the investors' accrediation status.
   * @return The number of reserved slots.
   */
  function getReservedSlots(address _wallet, string _country, uint8 _accreditationStatus) public returns (uint) {
    return getUint8("wallets", _wallet, "slots", _country, _accreditationStatus);
  }
}