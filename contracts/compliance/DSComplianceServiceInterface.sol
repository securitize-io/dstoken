pragma solidity ^0.4.23;

import "../DSServiceConsumerInterface.sol";
import "../zeppelin/token/ERC20/ERC20.sol";

contract DSComplianceServiceInterface is DSServiceConsumerInterface {

  modifier onlyToken() {
    assert(false);
    _;
  }




  //*****************************************
  // TOKEN ACTION VALIDATIONS
  //*****************************************

  function validateIssuance(address _to, uint _value) /*onlyToken*/ public;

  function validateBurn(address _who, uint _value) /*onlyToken*/ public returns (bool);

  function validateSeize(address _from, address _to, uint _value) /*onlyToken*/ public returns (bool);

  function validate(address _from, address _to, uint _value) /*onlyToken*/ public;

  function preTransferCheck(address _from, address _to, uint _value) view public returns (bool);






  //*****************************************
  // LOCKING
  //*****************************************


  event Locked(address indexed who, uint256 value, uint indexed reason, string reasonString, uint releaseTime);
  event Unlocked(address indexed who, uint256 value, uint indexed reason, string reasonString, uint releaseTime);


  /**
  * @dev creates a lock record
  * @param _to address to lock the tokens at
  * @param _valueLocked value of tokens to lock
  * @param _reason reason for lock
  * @param _releaseTime timestamp to release the lock (or 0 for locks which can only released by an unlockTokens call)
  * @return A unique id for the newly created lock.
  * Note: The user MAY have at a certain time more locked tokens than actual tokens
  */

  function addManualLockRecord(address _to, uint _valueLocked, string _reason, uint _releaseTime) /*issuerOrAbove*/ public;

  /**
  * @dev Releases a specific lock record
  * @param _to address to release the tokens for
  * @param _index the index of the lock to remove
  *
  * note - this may change the order of the locks on an address, so if iterating the iteration should be restarted.
  * @return true on success
  */
  function removeLockRecord(address _to, uint _index) /*issuerOrAbove*/ public returns (bool);

  /**
 * @dev Get number of locks currently associated with an address
 * @param _who address to get token lock for
 *
 * @return number of locks
 *
 * Note - a lock can be inactive (due to its time expired) but still exists for a specific address
 */
  function lockCount(address _who) public view returns (uint);

  /**
  * @dev Get details of a specific lock associated with an address
  * can be used to iterate through the locks of a user
  * @param _who address to get token lock for
  * @param _index the 0 based index of the lock.
  * @return id the unique lock id
  * @return type the lock type (manual or other)
  * @return reason the reason for the lock
  * @return value the value of tokens locked
  * @return autoReleaseTime the timestamp in which the lock will be inactive (or 0 if it's always active until removed)
  *
  * Note - a lock can be inactive (due to its time expired) but still exists for a specific address
  */
  function lockInfo(address _who, uint _index) public constant returns (uint reasonCode, string reasonString, uint value, uint autoReleaseTime);

  /**
  * @dev get total number of transferable tokens for a user, at a certain time
  * @param _who address to get number of transferable tokens for
  * @param _time time to calculate for
  */
  function getTransferableTokens(address _who, uint64 _time) public view returns (uint);





  //************************************************************************************
  // SPECIAL WALLET MANAGEMENT
  //************************************************************************************

  // Special wallets constants
  uint8 public constant NONE = 0;
  uint8 public constant ISSUER = 1;
  uint8 public constant PLATFORM = 2;
  uint8 public constant EXCHANGE = 4;

  /**
   * @dev should be emitted when a special wallet is added.
   */
  event DSWalletManagerSpecialWalletAdded(address _wallet, uint8 _type, address _sender);
  /**
   * @dev should be emitted when a special wallet is removed.
   */
  event DSWalletManagerSpecialWalletRemoved(address _wallet, uint8 _type, address _sender);
  /**
   * @dev should be emitted when the number of reserved slots is set for a wallet.
   */
  event DSWalletManagerReservedSlotsSet(address _wallet, string _country, uint8 _accreditationStatus, uint _slots, address _sender);

  /**
   * @dev Sets a wallet to be an special wallet. (internal)
   * @param _wallet The address of the wallet.
   * @param _type The type of the wallet.
   * @return A boolean that indicates if the operation was successful.
   */
  function setSpecialWallet(address _wallet, uint8 _type) internal returns (bool);
  /**
   * @dev Sets a wallet to be an issuer wallet.
   * @param _wallet The address of the wallet.
   * @return A boolean that indicates if the operation was successful.
   */


  /**
  * @dev gets a wallet type
  * @param _wallet the address of the wallet to check.
  */

  function getWalletType(address _wallet) public view returns (uint8);

  function addIssuerWallet(address _wallet) public /*onlyIssuerOrAbove*/ returns (bool);
  /**
   * @dev Sets a wallet to be an platform wallet.
   * @param _wallet The address of the wallet.
   * @return A boolean that indicates if the operation was successful.
   */
  function addPlatformWallet(address _wallet) public /*onlyIssuerOrAbove*/ returns (bool);
  /**
   * @dev Sets a wallet to be an exchange wallet.
   * @param _wallet The address of the wallet.
   * @param _owner The address of the owner.
   * @return A boolean that indicates if the operation was successful.
   */
  function addExchangeWallet(address _wallet, address _owner) public /*onlyIssuerOrAbove*/ returns (bool);
  /**
   * @dev Removes a special wallet.
   * @param _wallet The address of the wallet.
   * @return A boolean that indicates if the operation was successful.
   */
  function removeSpecialWallet(address _wallet) public /*onlyIssuerOrAbove*/ returns (bool);
  /**
   * @dev Sets the amount of reserved slots for a wallet based on country and accreditation status.
   * @param _wallet The address of the wallet.
   * @param _country The investors' country.
   * @param _accreditationStatus the investors' accrediation status.
   * @param _slots number of reserved slots.
   * @return A boolean that indicates if the operation was successful.
   */
  function setReservedSlots(address _wallet, string _country, uint8 _accreditationStatus, uint _slots) public /*onlyIssuerOrAbove*/ returns (bool);
  /**
   * @dev Gets the amount of reserved slots for a wallet based on country and accreditation status.
   * @param _wallet The address of the wallet.
   * @param _country The investors' country.
   * @param _accreditationStatus the investors' accrediation status.
   * @return The number of reserved slots.
   */
  function getReservedSlots(address _wallet, string _country, uint8 _accreditationStatus) public returns (uint);



  //************************************************************************************
  // ISSUER INFORMATION MANAGEMENT
  //************************************************************************************


  /**
  * @dev should be emitted when investor information is set.
  */
  event DSIssuanceInformationManagerInvestorInformationSet(string _id, uint8 _informationId, string _hash, address _sender);
  /**
   * @dev should be emitted when compliance information is set.
   */
  event DSIssuanceInformationManagerComplianceInformationSet(uint8 _informationId, string _value, address _sender);

  /**
   * @dev Sets information about an investor.
   * @param _id The investor identifier.
   * @param _informationId The type of information needed to be set.
   * @param _hash The value to be set.
   * @return A boolean that indicates if the operation was successful.
   */
  function setInvestorInformation(string _id, uint8 _informationId, string _hash) public /*onlyExchangeOrAbove*/ returns (bool);
  /**
   * @dev Gets information about an investor.
   * @param _id The investor identifier.
   * @param _informationId The type of information needed to be fetched.
   * @return The value.
   */
  function getInvestorInformation(string _id, uint8 _informationId) public returns (string);
  /**
   * @dev Sets compliance information.
   * @param _informationId The type of information needed to be fetched.
   * @param _value The value to be set.
   * @return A boolean that indicates if the operation was successful.
   */
  function setComplianceInformation(uint8 _informationId, string _value) public /*onlyIssuerOrAbove*/ returns (bool);
  /**
   * @dev Gets compliance information.
   * @param _informationId The type of information needed to be fetched.
   * @return The value.
   */
  function getComplianceInformation(uint8 _informationId) public returns (string);

}