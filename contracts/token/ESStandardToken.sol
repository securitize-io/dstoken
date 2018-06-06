pragma solidity ^0.4.23;

import "./ESBasicToken.sol";
import "../zeppelin/token/ERC20/ERC20.sol";

contract ESStandardToken is ERC20, ESBasicToken {

  function transferFrom(
    address _from,
    address _to,
    uint256 _value
  )
    public
    returns (bool)
  {
    require(_to != address(0));
    require(_value <= getUint("balances", _from));
    require(_value <= getUint("allowed", _from, msg.sender));

    setUint("balances", _from, getUint("balances", _from).sub(_value));
    setUint("balances", _to, getUint("balances", _to).add(_value));
    setUint("allowed", _from, msg.sender, getUint("allowed", _from, msg.sender).sub(_value));
    emit Transfer(_from, _to, _value);
    return true;
  }

  function approve(address _spender, uint256 _value) public returns (bool) {
    setUint("allowed", msg.sender, _spender, _value);
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
    return getUint("allowed", _owner, _spender);
  }

  function increaseApproval(
    address _spender,
    uint _addedValue
  )
    public
    returns (bool)
  {
    setUint("allowed", msg.sender, _spender, getUint("allowed", msg.sender, _spender).add(_addedValue));
    emit Approval(msg.sender, _spender, getUint("allowed", msg.sender, _spender));
    return true;
  }

  function decreaseApproval(
    address _spender,
    uint _subtractedValue
  )
    public
    returns (bool)
  {
    uint oldValue = getUint("allowed", msg.sender, _spender);
    if (_subtractedValue > oldValue) {
      setUint("allowed", msg.sender, _spender, 0);
    } else {
      setUint("allowed", msg.sender, _spender, oldValue.sub(_subtractedValue));
    }
    emit Approval(msg.sender, _spender, getUint("allowed", msg.sender, _spender));
    return true;
  }
}
