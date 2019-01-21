pragma solidity ^0.4.23;

import "../../zeppelin/ownership/Ownable.sol";
import "../util/ProxyTargetVersioned.sol";

// Simple mock class to text proxy functionality
contract SimpleContractMock2Versioned is ProxyTargetVersioned {

  uint private x;

  event SenderLogged(address sender);

  function setX(uint newValue) public{
    x = newValue;
  }

  function getX() public view returns (uint){
    return x + 1;
  }

  function logSender() public {
    emit SenderLogged(msg.sender);
  }

}
