pragma solidity ^0.4.23;

import "./ESStandardToken.sol";
import "./ESPausableToken.sol";
import "../service/ESServiceConsumer.sol";
import "../compliance/DSComplianceServiceInterface.sol";
import "../compliance/DSLockManagerInterface.sol";
import "./DSTokenInterface.sol";
import "../util/ProxyTarget.sol";

contract DSToken is ProxyTarget, DSTokenInterface, ESServiceConsumer, ESPausableToken {

  bool public initialized = false;
  string public name;
  string public symbol;
  uint8 public decimals;

  constructor() ESServiceConsumer(address(0x0), "") public {}

  function initialize(string _name,
    string _symbol,
    uint8 _decimals,
    address _storageAddress,
    string _namespace) public {

    require(!initialized, "already initialized");
    require (___t1 != address(0x0),"Must be initialized from proxy");
    owner = msg.sender;
    initialized = true;
    name = _name;
    symbol = _symbol;
    decimals = _decimals;
    eternalStorage = DSEternalStorage(_storageAddress);
    namespace = _namespace;
  }

  /******************************
       TOKEN CONFIGURATION
   *******************************/

  function setCap(uint256 _cap) public onlyMaster {
    uint cap = getUint(CAP);
    require(cap == 0, "Token cap already set");
    require(_cap > 0);
    setUint(CAP, _cap);
  }

  function cap() view public returns (uint256) {
    return getUint(CAP);
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

  function issueTokens(address _to, uint256 _value) onlyIssuerOrAbove public returns (bool){
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
  function issueTokensCustom(address _to, uint256 _value, uint256 _issuanceTime, uint256 _valueLocked, string _reason, uint64 _releaseTime) onlyIssuerOrAbove public returns (bool){
    //Check input values
    require(_to != address(0));
    require(_value > 0);
    require(_valueLocked <= _value, "valueLocked must be smaller than value");
    uint localCap = cap();

    //Make sure we are not hitting the cap
    require(localCap == 0 || (getUint(TOTAL_ISSUED).add(_value)) <= localCap, "Token Cap Hit");

    //Check issuance is allowed (and inform the compliance manager, possibly adding locks)
    getComplianceService().validateIssuance(_to,_value,_issuanceTime);

    //Adding and subtracting is done through safemath
    setUint(TOTAL_SUPPLY, getUint(TOTAL_SUPPLY).add(_value));
    setUint(TOTAL_ISSUED, getUint(TOTAL_ISSUED).add(_value));
    setUint(BALANCES, _to, getUint(BALANCES, _to).add(_value));
    updateInvestorBalance(_to, _value, true);

    emit Issue(_to, _value, _valueLocked);
    emit Transfer(address(0), _to, _value);

    if (_valueLocked > 0) {
      getLockManager().addManualLockRecord(_to, _valueLocked, _reason, _releaseTime);
    }

    checkWalletsForList(address(0),_to);
  }

  function totalIssued() public view returns (uint){
    return getUint(TOTAL_ISSUED);
  }

  //*********************
  // TOKEN BURNING
  //*********************

  function burn(address _who, uint256 _value, string _reason) onlyIssuerOrAbove public {
    require(_value <= getUint(BALANCES, _who));
    // no need to require value <= totalSupply, since that would imply the
    // sender's balance is greater than the totalSupply, which *should* be an assertion failure

    getComplianceService().validateBurn(_who,_value);

    setUint(BALANCES, _who, getUint(BALANCES, _who).sub(_value));
    updateInvestorBalance(_who, _value, false);
    setUint(TOTAL_SUPPLY, getUint(TOTAL_SUPPLY).sub(_value));
    emit Burn(_who, _value, _reason);
    emit Transfer(_who, address(0), _value);
    checkWalletsForList(_who,address(0));
  }

  //*********************
  // TOKEN SEIZING
  //*********************

  function seize(address _from, address _to, uint256 _value, string _reason) onlyIssuerOrAbove public {
    require(_from != address(0));
    require(_to != address(0));
    require(_value <= getUint(BALANCES, _from));

    getComplianceService().validateSeize(_from,_to,_value);
    setUint(BALANCES, _from, getUint(BALANCES, _from).sub(_value));
    setUint(BALANCES, _to, getUint(BALANCES, _to).add(_value));
    updateInvestorBalance(_from, _value, false);
    updateInvestorBalance(_to, _value, true);
    emit Seize(_from, _to, _value, _reason);
    emit Transfer(_from, _to, _value);
    checkWalletsForList(_from,_to);
  }

  //*********************
  // TRANSFER RESTRICTIONS
  //*********************

  /**
  * @dev Checks whether it can transfer with the compliance manager, if not -throws.
  */
  modifier canTransfer(address _sender, address _receiver, uint256 _value)  {
    getComplianceService().validate(_sender,_receiver,_value);
    _;
  }

  /**
   * @dev override for transfer with modifier
   * @param _to The address that will receive the tokens.
   * @param _value The amount of tokens to be transferred.
   */

  //TODO: check if "whenNotPaused" is needed here or the super implementation gets called automatically
  function transfer(address _to, uint256 _value) whenNotPaused canTransfer(msg.sender, _to, _value) public returns (bool) {
    bool result = super.transfer(_to, _value);

    if (result) {
      updateInvestorBalance(msg.sender, _value, false);
      updateInvestorBalance(_to, _value, true);
    }

    checkWalletsForList(msg.sender,_to);

    return result;
  }

  /**
  * @dev override for transferFrom with modifier
  * @param _from The address that will send the tokens.
  * @param _to The address that will receive the tokens.
  * @param _value The amount of tokens to be transferred.
  */

  //TODO: check if "whenNotPaused" is needed here or the super implementation gets called automatically
  function transferFrom(address _from, address _to, uint256 _value) whenNotPaused canTransfer(_from, _to, _value) public returns (bool) {
    bool result = super.transferFrom(_from, _to, _value);

    if (result) {
      updateInvestorBalance(_from, _value, false);
      updateInvestorBalance(_to, _value, true);
    }

    checkWalletsForList(_from,_to);

    return result;
  }

  //*********************
  // WALLET ENUMERATION
  //*********************

  //TODO: make everything one based instead of zero based

  function getWalletAt(uint256 _index) public view returns (address){
    require(_index > 0 && _index <= getUint(WALLET_COUNT));
    return getAddress(WALLET_LIST, _index);
  }

  function walletCount() public view returns (uint256){
    return getUint(WALLET_COUNT);
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
    uint existingIndex = getUint(WALLET_TO_INDEX, _address);
    if (existingIndex == 0) {
      //If not - add it
      uint256 index = getUint(WALLET_COUNT).add(1);
      setAddress(WALLET_LIST, index, _address);
      setUint(WALLET_TO_INDEX, _address, index);
      setUint(WALLET_COUNT, index);
    }
  }

  function removeWalletFromList(address _address) private {
    //Make sure it's there
    uint existingIndex = getUint(WALLET_TO_INDEX, _address);
    if (existingIndex != 0) {

      //Put the last wallet instead of it (this will work even with 1 wallet in the list)
      uint lastIndex = getUint(WALLET_COUNT);
      address lastWalletAddress = getAddress(WALLET_LIST, lastIndex);
      setAddress(WALLET_LIST, existingIndex, lastWalletAddress);
      //Decrease the total count
      setUint(WALLET_COUNT, lastIndex.sub(1));
      //Remove from reverse index
      deleteUint(WALLET_TO_INDEX, _address);
    }
  }


  //**************************************
  // MISCELLANEOUS FUNCTIONS
  //**************************************

  function isPaused() view public returns (bool){
    return (getBoolean(PAUSED));
  }

  function balanceOfInvestor(string _id) view public returns (uint256) {
    return getUint(INVESTORS, BALANCES, _id);
  }

  function updateInvestorBalance(address _wallet, uint _value, bool _increase) internal returns (bool) {
    string memory investor = getRegistryService().getInvestor(_wallet);
    if (keccak256(abi.encodePacked(investor)) != keccak256("")) {
      uint balance = balanceOfInvestor(investor);
      if (_increase) {
        balance = balance.add(_value);
      } else {
        balance = balance.sub(_value);
      }
      setUint(INVESTORS, BALANCES, investor, balance);
    }

    return true;
  }

  function preTransferCheck(address _from, address _to, uint _value) view public returns (uint code, string reason) {
    return getComplianceService().preTransferCheck(_from, _to, _value);
  }
}