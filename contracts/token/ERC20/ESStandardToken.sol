pragma solidity ^0.4.23;

import "./ESBasicToken.sol";
import "./ERC20.sol";

contract ESStandardToken is ERC20, ESBasicToken {
  constructor(address _address, string _namespace) public ESBasicToken(_address, _namespace) {}

  function transferFrom(
    address _from,
    address _to,
    uint256 _value
  )
    public
    returns (bool)
  {
    require(_to != address(0));
    require(_value <= getUint(keccak256("balances", _from)));
    require(_value <= getUint(keccak256("allowed", _from, msg.sender)));

    setUint(keccak256("balances", _from), getUint(keccak256("balances", _from)).sub(_value));
    setUint(keccak256("balances", _to), getUint(keccak256("balances", _to)).add(_value));
    setUint(keccak256("allowed", _from, msg.sender), getUint(keccak256("allowed", _from, msg.sender)).sub(_value));
    emit Transfer(_from, _to, _value);
    return true;
  }

  function approve(address _spender, uint256 _value) public returns (bool) {
    setUint(keccak256("allowed", msg.sender, _spender), _value);
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
    return getUint(keccak256("allowed", _owner, _spender));
  }

  function increaseApproval(
    address _spender,
    uint _addedValue
  )
    public
    returns (bool)
  {
    setUint(keccak256("allowed", msg.sender, _spender), getUint(keccak256("allowed", msg.sender, _spender)).add(_addedValue));
    emit Approval(msg.sender, _spender, getUint(keccak256("allowed", msg.sender, _spender)));
    return true;
  }

  function decreaseApproval(
    address _spender,
    uint _subtractedValue
  )
    public
    returns (bool)
  {
    uint oldValue = getUint(keccak256("allowed", msg.sender, _spender));
    if (_subtractedValue > oldValue) {
      setUint(keccak256("allowed", msg.sender, _spender), 0);
    } else {
      setUint(keccak256("allowed", msg.sender, _spender), oldValue.sub(_subtractedValue));
    }
    emit Approval(msg.sender, _spender, getUint(keccak256("allowed", msg.sender, _spender)));
    return true;
  }
}
