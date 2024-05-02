//SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.13;

import "../utils/Ownable.sol";
import "../service/ServiceConsumer.sol";

error MulticallFailed(uint256 i);

/// @title MulticallProxy
/// @dev Proxy contract to call multiple functions in a single transaction
/// @dev This contract is used to call multiple functions in a single transaction, requires an implementation contract that overrides the multicall function setting the necessary permissions with a modifier
abstract contract MulticallProxy is ServiceConsumer {

    constructor() {
        initialize();
    }

    function initialize() public virtual override(ServiceConsumer) {
        IDSServiceConsumer.initialize();
        Ownable.initialize();
    }

    /// @dev Calls multiple functions in destination contracts
    /// @dev Must override
    /// @param _targets destination contract addresses array
    /// @param data ABI encoded function signature and parameters array
    function multicall(address[] memory _targets, bytes[] calldata data) external payable virtual returns (bytes[] memory results);

    /// @dev Calls a function in destination contract
    /// @param target Destination contract address
    /// @param data  Function signature and parameters
    function _callTarget(address target, bytes memory data, uint256 i) internal returns (bytes memory) {
        (bool success, bytes memory returndata) = target.call(data);
        if (!success) {
            revert MulticallFailed(i);
        }
        return returndata;
    }
}
