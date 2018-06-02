pragma solidity ^0.4.23;

import "./ESBasicToken.sol";

contract ESBurnableToken is ESBasicToken {

  event Burn(address indexed burner, uint256 value);

  function burn(uint256 _value) public {
    _burn(msg.sender, _value);
  }

  function _burn(address _who, uint256 _value) internal {
    require(_value <= getUint(keccak256("balances", _who)));
    // no need to require value <= totalSupply, since that would imply the
    // sender's balance is greater than the totalSupply, which *should* be an assertion failure

    setUint(keccak256("balances", _who), getUint(keccak256("balances", _who)).sub(_value));
    setUint(keccak256("totalSupply"), getUint(keccak256("totalSupply")).sub(_value));
    emit Burn(_who, _value);
    emit Transfer(_who, address(0), _value);
  }
}
