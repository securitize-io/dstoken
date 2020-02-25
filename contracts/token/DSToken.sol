pragma solidity ^0.5.0;

import "./IDSToken.sol";
import "../utils/ProxyTarget.sol";
import "./PausableToken.sol";

contract DSToken is ProxyTarget, Initializable, IDSToken, PausableToken {
    function initialize(string memory _name, string memory _symbol, uint8 _decimals) public initializer onlyFromProxy {
        IDSToken.initialize();
        PausableToken.initialize();

        VERSIONS.push(3);
        name = _name;
        symbol = _symbol;
        decimals = _decimals;
    }

    /******************************
       TOKEN CONFIGURATION
   *******************************/

    function setFeature(uint8 featureIndex, bool enable) public onlyMaster {
        uint256 base = 2;
        uint256 mask = base**featureIndex;

        // Enable only if the feature is turned off and disable only if the feature is turned on
        if (enable && (supportedFeatures & mask == 0)) {
            supportedFeatures = supportedFeatures ^ mask;
        } else if (!enable && (supportedFeatures & mask >= 1)) {
            supportedFeatures = supportedFeatures ^ mask;
        }
    }

    function setFeatures(uint256 features) public onlyMaster {
        supportedFeatures = features;
    }

    function setCap(uint256 _cap) public onlyMaster {
        require(cap == 0, "Token cap already set");
        require(_cap > 0);
        cap = _cap;
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

    function issueTokens(address _to, uint256 _value) public onlyIssuerOrAbove returns (bool) {
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
        onlyIssuerOrAbove
        returns (bool)
    {
        //Check input values
        require(_to != address(0));
        require(_value > 0);
        require(_valueLocked <= _value, "valueLocked must be smaller than value");
        require(cap == 0 || totalIssued.add(_value) <= cap, "Token Cap Hit");

        //Check issuance is allowed (and inform the compliance manager, possibly adding locks)
        getComplianceService().validateIssuance(_to, _value, _issuanceTime);

        //Adding and subtracting is done through safemath
        totalSupply = totalSupply.add(_value);
        totalIssued = totalIssued.add(_value);
        walletsBalances[_to] = walletsBalances[_to].add(_value);
        updateInvestorBalance(_to, _value, true);

        emit Issue(_to, _value, _valueLocked);
        emit Transfer(address(0), _to, _value);

        if (_valueLocked > 0) {
            getLockManager().addManualLockRecord(_to, _valueLocked, _reason, _releaseTime);
        }

        checkWalletsForList(address(0), _to);
    }

    //*********************
    // TOKEN BURNING
    //*********************

    function burn(address _who, uint256 _value, string memory _reason) public onlyIssuerOrAbove {
        require(_value <= walletsBalances[_who]);
        // no need to require value <= totalSupply, since that would imply the
        // sender's balance is greater than the totalSupply, which *should* be an assertion failure

        getComplianceService().validateBurn(_who, _value);

        walletsBalances[_who] = walletsBalances[_who].sub(_value);
        updateInvestorBalance(_who, _value, false);
        totalSupply = totalSupply.sub(_value);
        emit Burn(_who, _value, _reason);
        emit Transfer(_who, address(0), _value);
        checkWalletsForList(_who, address(0));
    }

    function omnibusBurn(address _omnibusWallet, address _who, uint256 _value, string memory _reason) public onlyIssuerOrAbove {
        require(_value <= walletsBalances[_omnibusWallet]);

        getComplianceService().validateOmnibusBurn(_omnibusWallet, _who, _value);

        walletsBalances[_omnibusWallet] = walletsBalances[_omnibusWallet].sub(_value);
        walletsBalances[_who] = walletsBalances[_who].sub(_value);
        getRegistryService().getOmnibusWalletController(_omnibusWallet).burn(_who, _value, _reason);

        decreaseInvestorBalanceOnOmnibusSeizeOrBurn(_omnibusWallet, _who, _value);

        totalSupply = totalSupply.sub(_value);
        emit Burn(_omnibusWallet, _value, _reason);
        emit Transfer(_omnibusWallet, address(0), _value);
        checkWalletsForList(_omnibusWallet, address(0));
    }

    //*********************
    // TOKEN SEIZING
    //*********************

    modifier validateSeizeParameters(address _from, address _to, uint256 _value) {
        require(_from != address(0));
        require(_to != address(0));
        require(_value <= walletsBalances[_from]);

        _;
    }

    function seize(address _from, address _to, uint256 _value, string memory _reason) public onlyIssuerOrAbove validateSeizeParameters(_from, _to, _value) {
        getComplianceService().validateSeize(_from, _to, _value);
        walletsBalances[_from] = walletsBalances[_from].sub(_value);
        walletsBalances[_to] = walletsBalances[_to].add(_value);
        updateInvestorBalance(_from, _value, false);
        updateInvestorBalance(_to, _value, true);
        emit Seize(_from, _to, _value, _reason);
        emit Transfer(_from, _to, _value);
        checkWalletsForList(_from, _to);
    }

    function omnibusSeize(address _omnibusWallet, address _from, address _to, uint256 _value, string memory _reason)
        public
        onlyIssuerOrAbove
        validateSeizeParameters(_omnibusWallet, _to, _value)
    {
        getComplianceService().validateOmnibusSeize(_omnibusWallet, _from, _to, _value);
        walletsBalances[_omnibusWallet] = walletsBalances[_omnibusWallet].sub(_value);
        walletsBalances[_to] = walletsBalances[_to].add(_value);
        getRegistryService().getOmnibusWalletController(_omnibusWallet).seize(_from, _value, _reason);
        decreaseInvestorBalanceOnOmnibusSeizeOrBurn(_omnibusWallet, _from, _value);
        updateInvestorBalance(_to, _value, true);

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
        bool result = super.transfer(_to, _value);

        if (result) {
            updateInvestorsBalances(msg.sender, _to, _value);
        }

        checkWalletsForList(msg.sender, _to);

        return result;
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
        bool result = super.transferFrom(_from, _to, _value);

        if (result) {
            updateInvestorsBalances(_from, _to, _value);
        }

        checkWalletsForList(_from, _to);

        return result;
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

    function isPaused() public view returns (bool) {
        return paused;
    }

    function balanceOfInvestor(string memory _id) public view returns (uint256) {
        return investorsBalances[_id];
    }

    function updateInvestorsBalances(address _from, address _to, uint256 _value) internal {
        if (getRegistryService().isOmnibusWallet(_to)) {
            IDSOmnibusWalletController omnibusWalletController = getRegistryService().getOmnibusWalletController(_to);
            omnibusWalletController.deposit(_from, _value);

            if (omnibusWalletController.isHolderOfRecord()) {
                updateInvestorBalance(_from, _value, false);
                updateInvestorBalance(_to, _value, true);
            }
        } else if (getRegistryService().isOmnibusWallet(_from)) {
            IDSOmnibusWalletController omnibusWalletController = getRegistryService().getOmnibusWalletController(_from);
            omnibusWalletController.withdraw(_to, _value);

            if (omnibusWalletController.isHolderOfRecord()) {
                updateInvestorBalance(_from, _value, false);
                updateInvestorBalance(_to, _value, true);
            }
        } else {
            updateInvestorBalance(_from, _value, false);
            updateInvestorBalance(_to, _value, true);
        }

    }

    function decreaseInvestorBalanceOnOmnibusSeizeOrBurn(address _omnibusWallet, address _from, uint256 _value) internal {
        if (getRegistryService().getOmnibusWalletController(_omnibusWallet).isHolderOfRecord()) {
            updateInvestorBalance(_omnibusWallet, _value, false);
        } else {
            updateInvestorBalance(_from, _value, false);
        }
    }

    function updateInvestorBalance(address _wallet, uint256 _value, bool _increase) internal returns (bool) {
        string memory investor = getRegistryService().getInvestor(_wallet);
        if (keccak256(abi.encodePacked(investor)) != keccak256("")) {
            uint256 balance = balanceOfInvestor(investor);
            if (_increase) {
                balance = balance.add(_value);
            } else {
                balance = balance.sub(_value);
            }
            investorsBalances[investor] = balance;
        }

        return true;
    }

    function preTransferCheck(address _from, address _to, uint256 _value) public view returns (uint256 code, string memory reason) {
        return getComplianceService().preTransferCheck(_from, _to, _value);
    }

}
