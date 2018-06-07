pragma solidity ^0.4.23;

import "./DSComplianceServiceInterface.sol";
import "../util/EternalStorageClient.sol";


contract ESComplianceService is DSComplianceServiceInterface,EternalStorageClient {

    constructor(address _address, string _namespace) public EternalStorageClient(_address, _namespace) {}


    modifier onlyToken() {
        require(msg.sender == getAddress8("services", DS_TOKEN));
        _;
    }

    function validateIssuance(address to, uint amount) onlyToken public{
        require (recordIssuance(to,amount));
    }

    function validate(address from, address to, uint amount) onlyToken public{
        require (checkTransfer(from,to,amount));
        require (recordTransfer(from,to,amount));
    }

    function preTransferCheck(address from, address to, uint amount) view onlyExchange public returns (bool){
        return(checkTransfer(from,to,amount));
    }


    function recordIssuance(address to, uint amount) internal returns (bool);
    function checkTransfer(address from, address to, uint amount) view internal returns (bool);
    function recordTransfer(address from, address to, uint amount) internal returns (bool);

}