pragma solidity ^0.4.23;

import "./DSComplianceServiceInterface.sol";
import "../ESServiceConsumer.sol";
import "./ESLockManager.sol";


contract ESComplianceService is DSComplianceServiceInterface,ESLockManager,ESServiceConsumer {

    constructor(address _address, string _namespace) public ESServiceConsumer(_address, _namespace) {}


    modifier onlyToken() {
        require(msg.sender == getAddress8("services", DS_TOKEN));
        _;
    }

    function validateIssuance(address to, uint amount) onlyToken public{
        require (recordIssuance(to,amount));
    }

    function validate(address from, address to, uint amount) onlyToken public{

        //TODO: Check lock
        require (checkTransfer(from,to,amount));
        require (recordTransfer(from,to,amount));

    }

    function preTransferCheck(address from, address to, uint amount) view onlyExchangeOrAbove public returns (bool){
        return(checkTransfer(from,to,amount));
    }

    function addManualLockRecord(/*address to, uint valueLocked, string reason, uint64 releaseTime*/) onlyIssuerOrAbove
    public returns (uint64){

        //TODO: complete this
        //TODO: issuer or exchange?

    }

    function removeLockRecord(/*address to, uint64 lockId*/) onlyIssuerOrAbove public returns (bool){
        //TODO: complete this
    }

    /*
    function lockInfo(address who, uint64 index) public constant returns (uint64 id, uint8 lockType, string reason, uint value, uint64 autoReleaseTime){
        //TODO: Complete this
    }*/


    function recordIssuance(address to, uint amount) internal returns (bool);
    function checkTransfer(address from, address to, uint amount) view internal returns (bool);
    function recordTransfer(address from, address to, uint amount) internal returns (bool);

}