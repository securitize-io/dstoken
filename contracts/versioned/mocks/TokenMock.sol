pragma solidity ^0.4.23;

import "../token/DSTokenInterfaceVersioned.sol";

contract TokenMock is DSTokenInterfaceVersioned {
  mapping(string => uint256) _investorsBalances;
  
  function totalSupply() public view returns (uint256) {}
  function balanceOf(address who) public view returns (uint256) {}
  function transfer(address to, uint256 value) public returns (bool) {}
  function allowance(address owner, address spender)
    public view returns (uint256){}

  function transferFrom(address from, address to, uint256 value)
    public returns (bool){}

  function approve(address spender, uint256 value) public returns (bool) {}

  function setCap(uint256 _cap) public {}

  function issueTokens(address _to, uint256 _value)  public returns (bool){
    return true;
  }

  function issueTokensCustom(address _to, uint256 _value, uint256 _issuanceTime, uint256 _valueLocked, string _reason, uint64 _releaseTime)  public returns (bool){
    return true;
  }

  function totalIssued() public view returns (uint){return 0;}

  function burn(address _who, uint256 _value, string _reason)  public{}

  function seize(address _from, address _to, uint256 _value, string _reason)  public{}

  function getWalletAt(uint256 _index) public view returns (address){return address(0);}

  function walletCount() public view returns (uint256){return 0;}

  function isPaused() view public returns (bool){return true;}

  function balanceOfInvestor(string _id) public view  returns (uint256){
      return _investorsBalances[_id];
  }

  function setInvestorBalance(string _id,uint256 _balance) public {
    _investorsBalances[_id] = _balance;
  }

  function updateInvestorBalance(address _wallet, uint _value, bool _increase) internal returns (bool){return true;}

  function preTransferCheck(address _from, address _to, uint _value) view public returns (uint code, string reason){return (0,"");}
}