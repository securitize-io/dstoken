pragma solidity ^0.4.23;

import "./ESBasicToken.sol";
import "../../zeppelin/token/ERC20/ERC20.sol";

contract ESStandardToken is ERC20, ESBasicToken {

  string internal constant BALANCES = "balances";
  string internal constant ALLOWED = "allowed";

  function transferFrom(
    address _from,
    address _to,
    uint256 _value
  )
    public
    returns (bool)
  {
    require(_to != address(0));
    require(_value <= getUint(BALANCES, _from));
    require(_value <= getUint(ALLOWED, _from, msg.sender));

    setUint(BALANCES, _from, getUint(BALANCES, _from).sub(_value));
    setUint(BALANCES, _to, getUint(BALANCES, _to).add(_value));
    setUint(ALLOWED, _from, msg.sender, getUint(ALLOWED, _from, msg.sender).sub(_value));
    emit Transfer(_from, _to, _value);
    return true;
  }

  function approve(address _spender, uint256 _value) public returns (bool) {
    setUint(ALLOWED, msg.sender, _spender, _value);
    emit Approval(msg.sender, _spender, _value);
    return true;
  }

  function allowance(
    address _owner,
    address _spender
   )
    public
    view
    returns (uint256)
  {
    return getUint(ALLOWED, _owner, _spender);
  }

  function increaseApproval(
    address _spender,
    uint _addedValue
  )
    public
    returns (bool)
  {
    setUint(ALLOWED, msg.sender, _spender, getUint(ALLOWED, msg.sender, _spender).add(_addedValue));
    emit Approval(msg.sender, _spender, getUint(ALLOWED, msg.sender, _spender));
    return true;
  }

  function decreaseApproval(
    address _spender,
    uint _subtractedValue
  )
    public
    returns (bool)
  {
    uint oldValue = getUint(ALLOWED, msg.sender, _spender);
    if (_subtractedValue > oldValue) {
      setUint(ALLOWED, msg.sender, _spender, 0);
    } else {
      setUint(ALLOWED, msg.sender, _spender, oldValue.sub(_subtractedValue));
    }
    emit Approval(msg.sender, _spender, getUint(ALLOWED, msg.sender, _spender));
    return true;
  }
}
