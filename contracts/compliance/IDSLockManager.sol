pragma solidity ^0.5.0;

import "../utils/VersionedContract.sol";
import "../utils/Initializable.sol";

contract IDSLockManager is Initializable, VersionedContract {
    constructor() internal {}

    function initialize() public isNotInitialized {
        VERSIONS.push(2);
    }

    event Locked(address indexed who, uint256 value, uint256 indexed reason, string reasonString, uint256 releaseTime);
    event Unlocked(address indexed who, uint256 value, uint256 indexed reason, string reasonString, uint256 releaseTime);

    event HolderLocked(string holderId, uint256 value, uint256 indexed reason, string reasonString, uint256 releaseTime);
    event HolderUnlocked(string holderId, uint256 value, uint256 indexed reason, string reasonString, uint256 releaseTime);

    /**
  * @dev creates a lock record for wallet address
  * @param _to address to lock the tokens at
  * @param _valueLocked value of tokens to lock
  * @param _reason reason for lock
  * @param _releaseTime timestamp to release the lock (or 0 for locks which can only released by an unlockTokens call)
  * @return A unique id for the newly created lock.
  * Note: The user MAY have at a certain time more locked tokens than actual tokens
  */

    function addManualLockRecord(
        address _to,
        uint256 _valueLocked,
        string memory _reason,
        uint256 _releaseTime /*issuerOrAboveOrToken*/
    ) public;

    /**
  * @dev creates a lock record for investor Id
  * @param _investor investor id to lock the tokens at
  * @param _valueLocked value of tokens to lock
  * @param _reasonCode reason code for lock
  * @param _reasonString reason for lock
  * @param _releaseTime timestamp to release the lock (or 0 for locks which can only released by an unlockTokens call)
  * @return A unique id for the newly created lock.
  * Note: The user MAY have at a certain time more locked tokens than actual tokens
  */

    function createLockForInvestor(
        string memory _investor,
        uint256 _valueLocked,
        uint256 _reasonCode,
        string memory _reasonString,
        uint256 _releaseTime /*onlyIssuerOrAboveOrToken*/
    ) public;

    /**
   * @dev Releases a specific lock record for a wallet
   * @param _to address to release the tokens for
   * @param _lockIndex the index of the lock to remove
   *
   * note - this may change the order of the locks on an address, so if iterating the iteration should be restarted.
   * @return true on success
   */
    function removeLockRecord(
        address _to,
        uint256 _lockIndex /*issuerOrAbove*/
    ) public returns (bool);

    /**
     * @dev Releases a specific lock record for a investor
     * @param _investorId investor id to release the tokens for
     * @param _lockIndex the index of the lock to remove
     *
     * note - this may change the order of the locks on an address, so if iterating the iteration should be restarted.
     * @return true on success
     */
    function removeLockRecordForInvestor(
        string memory _investorId,
        uint256 _lockIndex /*onlyIssuerOrAbove*/
    ) public returns (bool);

    /**
     * @dev Get number of locks currently associated with an address
     * @param _who address to get count for
     *
     * @return number of locks
     *
     * Note - a lock can be inactive (due to its time expired) but still exists for a specific address
     */
    function lockCount(address _who) public view returns (uint256);

    /**
       * @dev Get number of locks currently associated with a investor
       * @param _investorId investor id to get count for
       *
       * @return number of locks
       *
       * Note - a lock can be inactive (due to its time expired) but still exists for a specific address
       */

    function lockCountForInvestor(string memory _investorId) public view returns (uint256);

    /**
     * @dev Get details of a specific lock associated with an address
     * can be used to iterate through the locks of a user
     * @param _who address to get token lock for
     * @param _lockIndex the 0 based index of the lock.
     * @return id the unique lock id
     * @return type the lock type (manual or other)
     * @return reason the reason for the lock
     * @return value the value of tokens locked
     * @return autoReleaseTime the timestamp in which the lock will be inactive (or 0 if it's always active until removed)
     *
     * Note - a lock can be inactive (due to its time expired) but still exists for a specific address
     */
    function lockInfo(address _who, uint256 _lockIndex) public view returns (uint256 reasonCode, string memory reasonString, uint256 value, uint256 autoReleaseTime);

    /**
   * @dev Get details of a specific lock associated with a investor
   * can be used to iterate through the locks of a user
   * @param _investorId investorId to get token lock for
   * @param _lockIndex the 0 based index of the lock.
   * @return id the unique lock id
   * @return type the lock type (manual or other)
   * @return reason the reason for the lock
   * @return value the value of tokens locked
   * @return autoReleaseTime the timestamp in which the lock will be inactive (or 0 if it's always active until removed)
   *
   * Note - a lock can be inactive (due to its time expired) but still exists for a specific address
   */

    function lockInfoForInvestor(string memory _investorId, uint256 _lockIndex)
        public
        view
        returns (uint256 reasonCode, string memory reasonString, uint256 value, uint256 autoReleaseTime);

    /**
     * @dev get total number of transferable tokens for a wallet, at a certain time
     * @param _who address to get number of transferable tokens for
     * @param _time time to calculate for
     */
    function getTransferableTokens(address _who, uint64 _time) public view returns (uint256);

    /**
       * @dev get total number of transferable tokens for a investor, at a certain time
       * @param _investorId investor id
       * @param _time time to calculate for
       */
    function getTransferableTokensForInvestor(string memory _investorId, uint64 _time) public view returns (uint256);

}
