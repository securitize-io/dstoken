pragma solidity ^0.4.21;

import "../zeppelin/ownership/Ownable.sol";

contract Proxy is Ownable {
  address public target;

  function setTarget(address _target) public onlyOwner {
    target = _target;
  }

  function () payable public {
    address _impl = target;
    require(_impl != address(0));

    assembly {
      let ptr := mload(0x40)
      calldatacopy(ptr, 0, calldatasize)
      let result := call(gas, _impl, 0, ptr, calldatasize, 0, 0)
      let size := returndatasize
      returndatacopy(ptr, 0, size)

      switch result
      case 0 { revert(ptr, size) }
      default { return(ptr, size) }
    }
  }
}