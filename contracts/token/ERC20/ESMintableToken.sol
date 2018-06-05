pragma solidity ^0.4.23;

import "./ESStandardToken.sol";
import "../../ownership/Ownable.sol";


contract ESMintableToken is ESStandardToken {
  constructor(address _address, string _namespace) public ESStandardToken(_address, _namespace) {}

  event Mint(address indexed to, uint256 amount);
  event MintFinished();

  modifier canMint() {
    require(!getBoolean(keccak256("mintingFinished")));
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
    setUint(keccak256("totalSupply"), getUint(keccak256("totalSupply")).add(_amount));
    setUint(keccak256("balances", _to), getUint(keccak256("balances",_to)).add(_amount));
    emit Mint(_to, _amount);
    emit Transfer(address(0), _to, _amount);
    return true;
  }

  function finishMinting() onlyOwner canMint public returns (bool) {
    setBoolean(keccak256("mintingFinished"), true);
    emit MintFinished();
    return true;
  }
}
