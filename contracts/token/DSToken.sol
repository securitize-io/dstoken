pragma solidity ^0.4.23;

import "./ESStandardToken.sol";
import "./ESPausableToken.sol";
import "../zeppelin/token/ERC20/DetailedERC20.sol";
import "../ESServiceConsumer.sol";
import "../compliance/DSComplianceServiceInterface.sol";

contract DSToken is ESServiceConsumer,ESStandardToken,ESPausableToken,DetailedERC20 {

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




    /**
    * @dev Checks whether it can transfer or otherwise throws.
    */
    modifier canTransfer(address _sender, address _receiver, uint256 _value) {
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
        return super.transfer(_to, _value);
    }

    /**
    * @dev override for transferFrom with modifier
    * @param _from The address that will send the tokens.
    * @param _to The address that will receive the tokens.
    * @param _value The amount of tokens to be transferred.
    */
    function transferFrom(address _from, address _to, uint256 _value) canTransfer(_from, _to, _value) public returns (bool) {
        return super.transferFrom(_from, _to, _value);
    }



}