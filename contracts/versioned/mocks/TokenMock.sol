pragma solidity ^0.4.23;

import "../token/DSTokenInterfaceVersioned.sol";

contract TokenMock is DSTokenInterfaceVersioned {
  mapping(string => uint256) _investorsBalances;
  
  function totalSupply() public view returns (uint256) {}
  function balanceOf(address) public view returns (uint256) {}
  function transfer(address, uint256) public returns (bool) {}
  function allowance(address, address)
    public view returns (uint256){}

  function transferFrom(address, address, uint256)
    public returns (bool){}

  function approve(address, uint256) public returns (bool) {}

  function setCap(uint256) public {}

  function issueTokens(address, uint256)  public returns (bool){
    return true;
  }

  function issueTokensCustom(address, uint256, uint256, uint256, string, uint64)  public returns (bool){
    return true;
  }

  function totalIssued() public view returns (uint){return 0;}

  function burn(address, uint256, string)  public{}

  function seize(address, address, uint256, string)  public{}

  function getWalletAt(uint256) public view returns (address){return address(0);}

  function walletCount() public view returns (uint256){return 0;}

  function isPaused() view public returns (bool){return true;}

  function balanceOfInvestor(string _id) public view  returns (uint256){
      return _investorsBalances[_id];
  }

  function setInvestorBalance(string _id,uint256 _balance) public {
    _investorsBalances[_id] = _balance;
  }

  function updateInvestorBalance(address, uint, bool) internal returns (bool){return true;}

  function preTransferCheck(address, address, uint) view public returns (uint code, string reason){return (0,"");}
}