pragma solidity ^0.4.23;

import "../DSServiceConsumerInterface.sol";
import "../zeppelin/token/ERC20/ERC20.sol";

contract DSComplianceServiceInterface is DSServiceConsumerInterface {

    modifier onlyToken() {
        assert(false);
        _;
    }


    //*****************************************
    // ISSUANCE AND TRANSFER VALIDATION
    //*****************************************

    function validateIssuance(address to, uint amount) /*onlyToken*/ public;
    function validate(address from, address to, uint amount) /*onlyToken*/ public;
    function preTransferCheck(address from, address to, uint amount) view /*onlyExchangeOrAbove*/ public returns (bool);

    //****************************************
    // LOCK RECORDS
    //****************************************

    /**
    * @dev creates a lock record
    * @param to address to lock the tokens at
    * @param valueLocked value of tokens to lock
    * @param reason reason for lock
    * @param releaseTime timestamp to release the lock (or 0 for locks which can only released by an unlockTokens call)
    * @return A unique id for the newly created lock.
    * Note: The user MAY have at a certain time more locked tokens than actual tokens
    */

    function addManualLockRecord(address to, uint valueLocked, string reason, uint64 releaseTime) /*issuerOrAbove*/ public returns (uint64);

    /**
    * @dev Releases a specific lock record
    * @param to address to release the tokens for
    * @param lockId the unique lock-id to release
    *
    * note - this may change the order of the locks on an address, so if iterating the iteration should be restarted.
    * @return true on success
    */
    function removeLockRecord(address to, uint64 lockId) /*issuerOrAbove*/ public returns (bool);

    /**
   * @dev Get number of locks currently associated with an address
   * @param who address to get token lock for
   *
   * @return number of locks
   *
   * Note - a lock can be inactive (due to its time expired) but still exists for a specific address
   */
    function lockCount(address who) public view returns (uint64);

    /**
    * @dev Get details of a specific lock associated with an address
    * can be used to iterate through the locks of a user
    * @param who address to get token lock for
    * @param index the 0 based index of the lock.
    * @return id the unique lock id
    * @return type the lock type (manual or other)
    * @return reason the reason for the lock
    * @return value the value of tokens locked
    * @return autoReleaseTime the timestamp in which the lock will be inactive (or 0 if it's always active until removed)
    *
    * Note - a lock can be inactive (due to its time expired) but still exists for a specific address
    */
    function lockInfo(address who, uint64 index) public constant returns (uint64 id, uint8 lockType, string reason, uint value, uint64 autoReleaseTime);
}