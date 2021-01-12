pragma solidity 0.5.17;

import "./IDSToken.sol";
import "../utils/ProxyTarget.sol";
import "./StandardToken.sol";

contract DSToken is ProxyTarget, Initializable, IDSToken, StandardToken {
    // using FeaturesLibrary for SupportedFeatures;
    uint256 internal constant OMNIBUS_NO_ACTION = 0;

    function initialize(string memory _name, string memory _symbol, uint8 _decimals) public initializer forceInitializeFromProxy {
        IDSToken.initialize();
        StandardToken.initialize();

        VERSIONS.push(4);
        name = _name;
        symbol = _symbol;
        decimals = _decimals;
    }

    /******************************
       TOKEN CONFIGURATION
   *******************************/

    function setFeature(uint8 featureIndex, bool enable) public onlyMaster {
        supportedFeatures.setFeature(featureIndex, enable);
    }

    function setFeatures(uint256 features) public onlyMaster {
        supportedFeatures.value = features;
    }

    function setCap(uint256 _cap) public onlyMaster {
        require(cap == 0, "Token cap already set");
        require(_cap > 0);
        cap = _cap;
    }

    function totalIssued() public view returns (uint256) {
        return tokenData.totalIssued;
    }

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
    ) public returns (bool) {
        issueTokensCustom(_to, _value, now, 0, "", 0);
    }

    /**
     * @dev Issuing tokens from the fund
     * @param _to address The address which is going to receive the newly issued tokens
     * @param _value uint256 the value of tokens to issue
     * @param _valueLocked uint256 value of tokens, from those issued, to lock immediately.
     * @param _reason reason for token locking
     * @param _releaseTime timestamp to release the lock (or 0 for locks which can only released by an unlockTokens call)
     * @return true if successful
     */
    function issueTokensCustom(address _to, uint256 _value, uint256 _issuanceTime, uint256 _valueLocked, string memory _reason, uint64 _releaseTime)
        public
        returns (
            /*onlyIssuerOrAbove*/
            bool
        )
    {
        uint256[] memory valuesLocked;
        uint64[] memory releaseTimes;
        if (_valueLocked > 0) {
            valuesLocked = new uint256[](1);
            releaseTimes = new uint64[](1);
            valuesLocked[0] = _valueLocked;
            releaseTimes[0] = _releaseTime;
        }

        issueTokensWithMultipleLocks(_to, _value, _issuanceTime, valuesLocked, _reason, releaseTimes);
        return true;
    }

    function issueTokensWithMultipleLocks(address _to, uint256 _value, uint256 _issuanceTime, uint256[] memory _valuesLocked, string memory _reason, uint64[] memory _releaseTimes)
        public
        onlyIssuerOrAbove
        returns (bool)
    {
        TokenLibrary.issueTokensCustom(tokenData, getCommonServices(), getLockManager(), _to, _value, _issuanceTime, _valuesLocked, _releaseTimes, _reason, cap);
        emit Transfer(address(0), _to, _value);

        checkWalletsForList(address(0), _to);
        return true;
    }

    //*********************
    // TOKEN BURNING
    //*********************

    function burn(address _who, uint256 _value, string memory _reason) public onlyIssuerOrAbove {
        TokenLibrary.burn(tokenData, getCommonServices(), _who, _value);
        emit Burn(_who, _value, _reason);
        emit Transfer(_who, address(0), _value);
        checkWalletsForList(_who, address(0));
    }

    function omnibusBurn(address _omnibusWallet, address _who, uint256 _value, string memory _reason) public onlyIssuerOrAbove {
        require(_value <= tokenData.walletsBalances[_omnibusWallet]);
        TokenLibrary.omnibusBurn(tokenData, getCommonServices(), _omnibusWallet, _who, _value);
        emit OmnibusBurn(_omnibusWallet, _who, _value, _reason, getAssetTrackingMode(_omnibusWallet));
        emit Burn(_omnibusWallet, _value, _reason);
        emit Transfer(_omnibusWallet, address(0), _value);
        checkWalletsForList(_omnibusWallet, address(0));
    }

    //*********************
    // TOKEN SEIZING
    //*********************

    function seize(address _from, address _to, uint256 _value, string memory _reason) public onlyIssuerOrAbove {
        TokenLibrary.seize(tokenData, getCommonServices(), _from, _to, _value);
        emit Seize(_from, _to, _value, _reason);
        emit Transfer(_from, _to, _value);
        checkWalletsForList(_from, _to);
    }

    function omnibusSeize(address _omnibusWallet, address _from, address _to, uint256 _value, string memory _reason) public onlyIssuerOrAbove {
        TokenLibrary.omnibusSeize(tokenData, getCommonServices(), _omnibusWallet, _from, _to, _value);
        emit OmnibusSeize(_omnibusWallet, _from, _value, _reason, getAssetTrackingMode(_omnibusWallet));
        emit Seize(_omnibusWallet, _to, _value, _reason);
        emit Transfer(_omnibusWallet, _to, _value);
        checkWalletsForList(_omnibusWallet, _to);
    }

    //*********************
    // TRANSFER RESTRICTIONS
    //*********************

    /**
     * @dev Checks whether it can transfer with the compliance manager, if not -throws.
     */
    modifier canTransfer(address _sender, address _receiver, uint256 _value) {
        getComplianceService().validateTransfer(_sender, _receiver, _value);
        _;
    }

    /**
     * @dev override for transfer with modifiers:
     * whether the token is not paused (checked in super class)
     * and that the sender is allowed to transfer tokens
     * @param _to The address that will receive the tokens.
     * @param _value The amount of tokens to be transferred.
     */
    function transfer(address _to, uint256 _value) public canTransfer(msg.sender, _to, _value) returns (bool) {
        return postTransferImpl(super.transfer(_to, _value), msg.sender, _to, _value);
    }

    /**
     * @dev override for transfer with modifiers:
     * whether the token is not paused (checked in super class)
     * and that the sender is allowed to transfer tokens
     * @param _from The address that will send the tokens.
     * @param _to The address that will receive the tokens.
     * @param _value The amount of tokens to be transferred.
     */

    function transferFrom(address _from, address _to, uint256 _value) public canTransfer(_from, _to, _value) returns (bool) {
        return postTransferImpl(super.transferFrom(_from, _to, _value), _from, _to, _value);
    }

    function postTransferImpl(bool _superResult, address _from, address _to, uint256 _value) internal returns (bool) {
        if (_superResult) {
            updateInvestorsBalancesOnTransfer(_from, _to, _value);
        }

        checkWalletsForList(_from, _to);

        return _superResult;
    }

    //*********************
    // WALLET ENUMERATION
    //****

    function getWalletAt(uint256 _index) public view returns (address) {
        require(_index > 0 && _index <= walletsCount);
        return walletsList[_index];
    }

    function walletCount() public view returns (uint256) {
        return walletsCount;
    }

    function checkWalletsForList(address _from, address _to) private {
        if (super.balanceOf(_from) == 0) {
            removeWalletFromList(_from);
        }
        if (super.balanceOf(_to) > 0) {
            addWalletToList(_to);
        }
    }

    function addWalletToList(address _address) private {
        //Check if it's already there
        uint256 existingIndex = walletsToIndexes[_address];
        if (existingIndex == 0) {
            //If not - add it
            uint256 index = walletsCount.add(1);
            walletsList[index] = _address;
            walletsToIndexes[_address] = index;
            walletsCount = index;
        }
    }

    function removeWalletFromList(address _address) private {
        //Make sure it's there
        uint256 existingIndex = walletsToIndexes[_address];
        if (existingIndex != 0) {
            //Put the last wallet instead of it (this will work even with 1 wallet in the list)
            uint256 lastIndex = walletsCount;
            address lastWalletAddress = walletsList[lastIndex];
            walletsList[existingIndex] = lastWalletAddress;
            //Decrease the total count
            walletsCount = lastIndex.sub(1);
            //Remove from reverse index
            delete walletsToIndexes[_address];
        }
    }

    //**************************************
    // MISCELLANEOUS FUNCTIONS
    //**************************************

    function balanceOfInvestor(string memory _id) public view returns (uint256) {
        return tokenData.investorsBalances[_id];
    }

    function getAssetTrackingMode(address _omnibusWallet) internal view returns (uint8) {
        return getRegistryService().getOmnibusWalletController(_omnibusWallet).getAssetTrackingMode();
    }

    function updateOmnibusInvestorBalance(address _omnibusWallet, address _wallet, uint256 _value, CommonUtils.IncDec _increase)
        public
        onlyOmnibusWalletController(_omnibusWallet, IDSOmnibusWalletController(msg.sender))
        returns (bool)
    {
        return updateInvestorBalance(_wallet, _value, _increase);
    }

    function emitOmnibusTransferEvent(address _omnibusWallet, address _from, address _to, uint256 _value)
        public
        onlyOmnibusWalletController(_omnibusWallet, IDSOmnibusWalletController(msg.sender))
    {
        emit OmnibusTransfer(_omnibusWallet, _from, _to, _value, getAssetTrackingMode(_omnibusWallet));
    }

    function emitOmnibusTBEEvent(address omnibusWallet, int256 totalDelta, int256 accreditedDelta,
        int256 usAccreditedDelta, int256 usTotalDelta, int256 jpTotalDelta) public onlyTBEOmnibus {
        emit OmnibusTBEOperation(omnibusWallet, totalDelta, accreditedDelta, usAccreditedDelta, usTotalDelta, jpTotalDelta);
    }

    function updateInvestorsBalancesOnTransfer(address _from, address _to, uint256 _value) internal {
        uint256 omnibusEvent = TokenLibrary.applyOmnibusBalanceUpdatesOnTransfer(tokenData, getRegistryService(), _from, _to, _value);
        if (omnibusEvent == OMNIBUS_NO_ACTION) {
            updateInvestorBalance(_from, _value, CommonUtils.IncDec.Decrease);
            updateInvestorBalance(_to, _value, CommonUtils.IncDec.Increase);
        }
    }

    function updateInvestorBalance(address _wallet, uint256 _value, CommonUtils.IncDec _increase) internal returns (bool) {
        string memory investor = getRegistryService().getInvestor(_wallet);
        if (!CommonUtils.isEmptyString(investor)) {
            uint256 balance = balanceOfInvestor(investor);
            if (_increase == CommonUtils.IncDec.Increase) {
                balance = balance.add(_value);
            } else {
                balance = balance.sub(_value);
            }
            tokenData.investorsBalances[investor] = balance;
        }

        return true;
    }

    function preTransferCheck(address _from, address _to, uint256 _value) public view returns (uint256 code, string memory reason) {
        return getComplianceService().preTransferCheck(_from, _to, _value);
    }

    function getCommonServices() internal view returns (address[] memory) {
        address[] memory services = new address[](3);
        services[0] = getDSService(COMPLIANCE_SERVICE);
        services[1] = getDSService(REGISTRY_SERVICE);
        services[2] = getDSService(OMNIBUS_TBE_CONTROLLER);
        return services;
    }
}
