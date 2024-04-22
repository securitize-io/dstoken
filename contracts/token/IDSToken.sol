pragma solidity ^0.8.20;

import "@openzeppelin/contracts/interfaces/IERC20.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "../utils/CommonUtils.sol";
import "../omnibus/IDSOmnibusWalletController.sol";

//SPDX-License-Identifier: UNLICENSED
abstract contract IDSToken is IERC20, Initializable {
    event Issue(address indexed to, uint256 value, uint256 valueLocked);
    event Burn(address indexed burner, uint256 value, string reason);
    event Seize(address indexed from, address indexed to, uint256 value, string reason);
    event OmnibusDeposit(address indexed omnibusWallet, address to, uint256 value, uint8 assetTrackingMode);
    event OmnibusWithdraw(address indexed omnibusWallet, address from, uint256 value, uint8 assetTrackingMode);
    event OmnibusSeize(address indexed omnibusWallet, address from, uint256 value, string reason, uint8 assetTrackingMode);
    event OmnibusBurn(address indexed omnibusWallet, address who, uint256 value, string reason, uint8 assetTrackingMode);
    event OmnibusTransfer(address indexed omnibusWallet, address from, address to, uint256 value, uint8 assetTrackingMode);
    event OmnibusTBEOperation(address indexed omnibusWallet, int256 totalDelta, int256 accreditedDelta,
        int256 usAccreditedDelta, int256 usTotalDelta, int256 jpTotalDelta);
    event OmnibusTBETransfer(address omnibusWallet, string externalId);

    event WalletAdded(address wallet);
    event WalletRemoved(address wallet);

    function initialize() public virtual {}

    /******************************
       CONFIGURATION
   *******************************/

    /**
     * @dev Sets the total issuance cap
     * Note: The cap is compared to the total number of issued token, not the total number of tokens available,
     * So if a token is burned, it is not removed from the "total number of issued".
     * This call cannot be called again after it was called once.
     * @param _cap address The address which is going to receive the newly issued tokens
     */
    function setCap(
        uint256 _cap /*onlyMaster*/
    ) public virtual;

    /******************************
       TOKEN ISSUANCE (MINTING)
   *******************************/

    /**
     * @dev Issues unlocked tokens
     * @param _to address The address which is going to receive the newly issued tokens
     * @param _value uint256 the value of tokens to issue
     * @return true if successful
     */
    function issueTokens(
        address _to,
        uint256 _value /*onlyIssuerOrAbove*/
    ) public virtual returns (bool);

    /**
     * @dev Issuing tokens from the fund
     * @param _to address The address which is going to receive the newly issued tokens
     * @param _value uint256 the value of tokens to issue
     * @param _valueLocked uint256 value of tokens, from those issued, to lock immediately.
     * @param _reason reason for token locking
     * @param _releaseTime timestamp to release the lock (or 0 for locks which can only released by an unlockTokens call)
     * @return true if successful
     */
    function issueTokensCustom(
        address _to,
        uint256 _value,
        uint256 _issuanceTime,
        uint256 _valueLocked,
        string memory _reason,
        uint64 _releaseTime /*onlyIssuerOrAbove*/
    ) public virtual returns (bool);

    function issueTokensWithMultipleLocks(
        address _to,
        uint256 _value,
        uint256 _issuanceTime,
        uint256[] memory _valuesLocked,
        string memory _reason,
        uint64[] memory _releaseTimes /*onlyIssuerOrAbove*/
    ) public virtual returns (bool);

    function issueTokensWithNoCompliance(address _to, uint256 _value) public virtual /*onlyIssuerOrAbove*/;

    //*********************
    // TOKEN BURNING
    //*********************

    function burn(
        address _who,
        uint256 _value,
        string memory _reason /*onlyIssuerOrAbove*/
    ) public virtual;

    function omnibusBurn(
        address _omnibusWallet,
        address _who,
        uint256 _value,
        string memory _reason /*onlyIssuerOrAbove*/
    ) public virtual;

    //*********************
    // TOKEN SIEZING
    //*********************

    function seize(
        address _from,
        address _to,
        uint256 _value,
        string memory _reason /*onlyIssuerOrAbove*/
    ) public virtual;

    function omnibusSeize(
        address _omnibusWallet,
        address _from,
        address _to,
        uint256 _value,
        string memory _reason
        /*onlyIssuerOrAbove*/
    ) public virtual;

    //*********************
    // WALLET ENUMERATION
    //*********************

    function getWalletAt(uint256 _index) public view virtual returns (address);

    function walletCount() public view virtual returns (uint256);

    //**************************************
    // MISCELLANEOUS FUNCTIONS
    //**************************************
    function isPaused() public view virtual returns (bool);

    function balanceOfInvestor(string memory _id) public view virtual returns (uint256);

    function updateOmnibusInvestorBalance(
        address _omnibusWallet,
        address _wallet,
        uint256 _value,
        CommonUtils.IncDec _increase /*onlyOmnibusWalletController*/
    ) public virtual returns (bool);

    function emitOmnibusTransferEvent(
        address _omnibusWallet,
        address _from,
        address _to,
        uint256 _value /*onlyOmnibusWalletController*/
    ) public virtual;

    function emitOmnibusTBEEvent(address omnibusWallet, int256 totalDelta, int256 accreditedDelta,
        int256 usAccreditedDelta, int256 usTotalDelta, int256 jpTotalDelta /*onlyTBEOmnibus*/
    ) public virtual;

    function emitOmnibusTBETransferEvent(address omnibusWallet, string memory externalId) public virtual;

    function updateInvestorBalance(address _wallet, uint256 _value, CommonUtils.IncDec _increase) internal virtual returns (bool);

    function preTransferCheck(address _from, address _to, uint256 _value) public view virtual returns (uint256 code, string memory reason);
}
