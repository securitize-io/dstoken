pragma solidity ^0.4.23;

import "./ESStandardToken.sol";
import "./ESPausableToken.sol";
import "../zeppelin/token/ERC20/DetailedERC20.sol";
import "../ESServiceConsumer.sol";
import "../compliance/DSComplianceServiceInterface.sol";
import "./DSTokenInterface.sol";

contract DSToken is DSTokenInterface,ESServiceConsumer,ESStandardToken,ESPausableToken,DetailedERC20 {


    constructor(
        string _name,
        string _symbol,
        uint8 _decimals,
        address _storageAddress,
        string _namespace
    )
    DetailedERC20(_name, _symbol, _decimals)
    ESServiceConsumer(_storageAddress, _namespace)
    public
    {}

    /******************************
         TOKEN CONFIGURATION
     *******************************/


    function setCap(uint256 _cap) public onlyMaster {
        uint cap = getUint("cap");
        require(cap == 0,"Token cap already set");
        require(_cap > 0);
        setUint("cap", _cap);
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
        issueTokensWithLocking(_to, _value, 0,"", 0);
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
    function issueTokensWithLocking(address _to, uint256 _value, uint256 _valueLocked, string _reason, uint64 _releaseTime) onlyIssuerOrAbove public returns (bool){

        DSComplianceServiceInterface complianceManager = DSComplianceServiceInterface(getDSService(COMPLIANCE_SERVICE));

        //Check input values
        require(_to != address(0));
        require(_value > 0);
        require(_valueLocked >= 0 && _valueLocked <= _value,"valuLocked must be smaller than value");
        uint cap = getUint("cap");

        //Make sure we are not hitting the cap
        require(cap == 0 || ( getUint("totalIssued").add(_value)) <= cap,"Token Cap Hit");

        //Check issuance is allowed (and inform the compliance manager, possibly adding locks)
        complianceManager.validateIssuance(_to,_value);

        //Adding and subtracting is done through safemath
        setUint("totalSupply", getUint("totalSupply").add(_value));
        setUint("totalIssued", getUint("totalIssued").add(_value));
        setUint("balances", _to, getUint("balances",_to).add(_value));

        emit Issue(_to, _value, _valueLocked);
        emit Transfer(address(0), _to, _value);

        if (_valueLocked > 0) {
            complianceManager.addManualLockRecord(_to, _valueLocked, _reason, _releaseTime);
        }
    }

    function totalIssued() public view returns (uint){
        return getUint("totalIssued");
    }

    //*********************
    // TOKEN BURNING
    //*********************

    function burn(address _who, uint256 _value,string _reason) onlyIssuerOrAbove public {
        require(_value <= getUint("balances", _who));
        // no need to require value <= totalSupply, since that would imply the
        // sender's balance is greater than the totalSupply, which *should* be an assertion failure

        setUint("balances", _who, getUint("balances", _who).sub(_value));
        setUint("totalSupply", getUint("totalSupply").sub(_value));
        emit Burn(_who, _value,_reason);
        emit Transfer(_who, address(0), _value);
    }

    //*********************
    // TOKEN SEIZING
    //*********************

    function seize(address _from, address _to, uint256 _value,string _reason) onlyIssuerOrAbove public{
        require(_from != address(0));
        require(_to != address(0));
        require(_value <= getUint("balances", _from));
        setUint("balances", _from, getUint("balances", _from).sub(_value));
        setUint("balances", _to, getUint("balances", _to).add(_value));
        emit Seize(_from, _to, _value,_reason);
        emit Transfer(_from, _to, _value);
    }

    //*********************
    // TRANSFER RESTRICTIONS
    //*********************

    /**
    * @dev Checks whether it can transfer with the compliance manager, if not -throws.
    */
    modifier canTransfer(address _sender, address _receiver, uint256 _value)  {
        DSComplianceServiceInterface complianceManager = DSComplianceServiceInterface(getDSService(COMPLIANCE_SERVICE));
        complianceManager.validate(_sender,_receiver,_value);
        _;
    }

    /**
     * @dev override for transfer with modifier
     * @param _to The address that will receive the tokens.
     * @param _value The amount of tokens to be transferred.
     */
    function transfer(address _to, uint256 _value) canTransfer(msg.sender, _to, _value) public returns (bool) {
        bool result = super.transfer(_to, _value);
        checkWalletsForList(msg.sender,_to);
        return result;
    }

    /**
    * @dev override for transferFrom with modifier
    * @param _from The address that will send the tokens.
    * @param _to The address that will receive the tokens.
    * @param _value The amount of tokens to be transferred.
    */
    function transferFrom(address _from, address _to, uint256 _value) canTransfer(_from, _to, _value) public returns (bool) {
        bool result = super.transferFrom(_from, _to, _value);
        checkWalletsForList(_from,_to);
        return result;
    }

    //*********************
    // WALLET ENUMERATION
    //*********************

    //TODO: make everything one based instead of zero based

    function getWalletAt(uint256 _index) public view returns (address){
        require(_index > 0 && _index <= getUint("walletCount"));
        return getAddress("walletList",_index);
    }

    function walletCount() public view returns (uint256){
        return getUint("walletCount");
    }

    function checkWalletsForList(address _from, address _to) private{
        if (super.balanceOf(_from) == 0){
            removeWalletFromList(_from);
        }
        if (super.balanceOf(_to) > 0){
            addWalletToList(_to);
        }
    }
    function addWalletToList(address _address) private{

        //Check if it's already there
        uint existingIndex = getUint("walletToIndex",_address);
        if (existingIndex == 0){
            //If not - add it
            uint256 index = getUint("walletCount").add(1);
            setAddress("walletList",index,_address);
            setUint("walletToIndex",_address,index);
            setUint("walletCount",index);
        }
    }

    function removeWalletFromList(address _address) private{

        //Make sure it's there
        uint existingIndex = getUint("walletToIndex",_address);
        if (existingIndex != 0){

            //Put the last wallet instead of it (this will work even with 1 wallet in the list)
            uint lastIndex = getUint("walletCount");
            address lastWalletAddress = getAddress("walletList",lastIndex);
            setAddress("walletList",existingIndex,lastWalletAddress);
            //Decrease the total count
            setUint("walletCount",lastIndex.sub(1));
            //Remove from reverse index
            deleteAddress("walletToIndex",_address);

        }

    }

}