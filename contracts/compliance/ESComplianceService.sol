pragma solidity ^0.4.23;

import "./DSComplianceServiceInterface.sol";
import "../ESServiceConsumer.sol";
import "./ESLockManager.sol";
import "../token/DSTokenInterface.sol";
import "../zeppelin/math/Math.sol";


contract ESComplianceService is DSComplianceServiceInterface,ESLockManager {

    constructor(address _address, string _namespace) public ESServiceConsumer(_address, _namespace) {}
    using SafeMath for uint256;


    modifier onlyToken() {
        require(msg.sender == getAddress8("services", DS_TOKEN),"This function can only called by the associated token");
        _;
    }

    function getToken() private view returns (DSTokenInterface){
        return DSTokenInterface(getAddress8("services", DS_TOKEN));
    }
    function validateIssuance(address _to, uint _value) onlyToken public{
        require (recordIssuance(_to,_value));
    }

    function validate(address _from, address _to, uint _value) onlyToken public{

        //TODO: Check issuer wallet rules
        // if issuer is _from - it always succeeds

        //TODO: Check platform wallet rules
        // if platform wallet is _to - it always succeeds

        //Check locks
        require(getTransferableTokens(_from,uint64(now)) >= _value,"Value cannot be transferred due to active locks");

        require (checkTransfer(_from,_to,_value));
        require (recordTransfer(_from,_to,_value));
    }

    function validateBurn(address _who, uint _value) onlyToken public returns (bool){
        require(recordBurn(_who,_value));
    }

    function validateSeize(address _from, address _to, uint _value) onlyToken public returns (bool){
        //Only allow seizing, if the target is an issuer wallet (can be overriden)

        require(validateSeize(_from,_to,_value));
    }

    function getTransferableTokens(address _who, uint64 _time) public view returns (uint) {

        require (_time > 0,"time must be greater than zero");
        uint balanceOfHolder = getToken().balanceOf(_who);

        uint holderLockCount = getUint("lockCount",_who);

        //No locks, go to base class implementation
        if (holderLockCount == 0) {
            return balanceOfHolder;
        }

        uint totalLockedTokens = 0;
        for (uint i = 0; i < holderLockCount; i ++) {

            uint autoReleaseTime = getUint("locks_releaseTime",_who,i);

            if (autoReleaseTime == 0 || autoReleaseTime > _time) {
                totalLockedTokens = totalLockedTokens.add(getUint("locks_value",_who,i));
            }
        }

        //there may be more locked tokens than actual tokens, so the minimum between the two
        uint transferable = SafeMath.sub(balanceOfHolder, Math.min256(totalLockedTokens, balanceOfHolder));

        return transferable;
    }


//    function validateSeize(address _from,address _to) onlyToken public{
//        //TODO: Make sure _to is an issuer wallet
//    }
//
//    function validateBurn(address _who,uint _amount) onlyToken public{
//
//    }

    function preTransferCheck(address _from, address _to, uint _value) view public returns (bool){
        //Check if the token is paused
        return(checkTransfer(_from,_to,_value));
    }

    function recordIssuance(address _to, uint _value) internal returns (bool);
    function checkTransfer(address _from, address _to, uint _value) view internal returns (bool);
    function recordTransfer(address _from, address _to, uint _value) internal returns (bool);
    function recordBurn(address _who, uint _value) internal returns (bool);
    function recordSeize(address _from, address _to, uint _value) internal returns (bool);

}