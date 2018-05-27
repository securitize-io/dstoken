pragma solidity ^0.4.23;

import "./ESMintableToken.sol";

contract ESCappedToken is ESMintableToken {
  constructor(uint256 _cap) public {
    require(_cap > 0);
    _storage.setUint(keccak256("cap"), _cap);
  }

  /**
   * @dev Function to mint tokens
   * @param _to The address that will receive the minted tokens.
   * @param _amount The amount of tokens to mint.
   * @return A boolean that indicates if the operation was successful.
   */
  function mint(
    address _to,
    uint256 _amount
  )
    onlyOwner
    canMint
    public
    returns (bool)
  {
    require(_storage.getUint(keccak256("totalSupply")).add(_amount) <= _storage.getUint(keccak256("cap")));

    return super.mint(_to, _amount);
  }
}
