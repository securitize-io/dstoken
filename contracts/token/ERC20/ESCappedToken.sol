pragma solidity ^0.4.23;

import "./ESMintableToken.sol";

contract ESCappedToken is ESMintableToken {
  constructor(address _address, string _namespace, uint256 _cap) public EternalStorageClient(_address, _namespace) {
    require(_cap > 0);
    setUint(keccak256("cap"), _cap);
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
    require(getUint(keccak256("totalSupply")).add(_amount) <= getUint(keccak256("cap")));

    return super.mint(_to, _amount);
  }
}
