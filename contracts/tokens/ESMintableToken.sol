pragma solidity ^0.4.23;

import "./ESStandardToken.sol";


contract ESMintableToken is ESStandardToken {

  event Mint(address indexed to, uint256 amount);
  event MintFinished();

  modifier canMint() {
    require(!getBoolean(keccak256(abi.encodePacked("mintingFinished"))));
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
    setUint(keccak256("totalSupply"), getUint(keccak256(abi.encodePacked("totalSupply"))).add(_amount));
    setUint(keccak256("balances", _to), getUint(keccak256(abi.encodePacked("balances",_to))).add(_amount));
    emit Mint(_to, _amount);
    emit Transfer(address(0), _to, _amount);
    return true;
  }

  function finishMinting() onlyOwner canMint public returns (bool) {
    setBoolean(keccak256(abi.encodePacked("mintingFinished")), true);
    emit MintFinished();
    return true;
  }
}
