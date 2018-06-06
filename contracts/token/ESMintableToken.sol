pragma solidity ^0.4.23;

import "./ESStandardToken.sol";


contract ESMintableToken is ESStandardToken {

  event Mint(address indexed to, uint256 amount);
  event MintFinished();

  modifier canMint() {
    require(!getBoolean("mintingFinished"));
    _;
  }

  modifier hasMintPermission() {
    require(msg.sender == owner);
    _;
  }

  function mint(
    address _to,
    uint256 _amount
  )
    hasMintPermission
    canMint
    public
    returns (bool)
  {
    setUint("totalSupply", getUint("totalSupply").add(_amount));
    setUint("balances", _to, getUint("balances",_to).add(_amount));
    emit Mint(_to, _amount);
    emit Transfer(address(0), _to, _amount);
    return true;
  }

  function finishMinting() onlyOwner canMint public returns (bool) {
    setBoolean("mintingFinished", true);
    emit MintFinished();
    return true;
  }
}
