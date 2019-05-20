pragma solidity ^0.4.23;

import "../token/DSTokenInterfaceVersioned.sol";

contract TokenMock is DSTokenInterfaceVersioned {

  function setCap(uint256 _cap) public {}

  function issueTokens(address _to, uint256 _value)  public returns (bool){}

  function issueTokensCustom(address _to, uint256 _value, uint256 _issuanceTime, uint256 _valueLocked, string _reason, uint64 _releaseTime)  public returns (bool){}

  function totalIssued() public view returns (uint){}

  function burn(address _who, uint256 _value, string _reason)  public{}

  function seize(address _from, address _to, uint256 _value, string _reason)  public{}

  function getWalletAt(uint256 _index) public view returns (address){}

  function walletCount() public view returns (uint256){}

  function isPaused() view public returns (bool){}

  function balanceOfInvestor(string _id) view public returns (uint256){
      return 0;
  }

  function updateInvestorBalance(address _wallet, uint _value, bool _increase) internal returns (bool){}

  function preTransferCheck(address _from, address _to, uint _value) view public returns (uint code, string reason){}
}