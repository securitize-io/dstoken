pragma solidity ^0.4.23;

import "./ESMintableToken.sol";

contract ESCappedToken is ESMintableToken {

  bool public initialized = false;

  function initialize(uint256 _cap) public onlyOwner {
    require(!initialized);
    require(_cap > 0);
    setUint(keccak256("cap"), _cap);
    initialized = true;
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
    require(getUint(keccak256(abi.encodePacked("totalSupply"))).add(_amount) <= getUint(keccak256(abi.encodePacked("cap"))));

    return super.mint(_to, _amount);
  }
}
