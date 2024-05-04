//SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.13;

import "../utils/Ownable.sol";
import "../service/ServiceConsumer.sol";

error MulticallFailed(uint256 index, string reason);

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
            if (returndata.length > 0) {
            // Assumes revert reason is encoded as string
            revert MulticallFailed(i, _getRevertReason(returndata));
        } else {
            revert MulticallFailed(i, "Call failed without revert reason");
        }
        }
        return returndata;
    }

    /// @dev Parses revert reason
    /// @param data ABI encoded function signature and parameters
    function _getRevertReason(bytes memory data) internal pure returns (string memory) {
        require(data.length > 4, "Data too short");
        bytes memory slicedData = _slice(data, 4, data.length);
        return abi.decode(slicedData, (string));
    }

    /// @dev Slices data
    /// @param data bytes data
    /// @param start data start to slice
    /// @param end   data end to slice
    function _slice(bytes memory data, uint256 start, uint256 end) internal pure returns (bytes memory) {
        bytes memory result = new bytes(end - start);
        for(uint256 i = start; i < end; ++i) {
            result[i - start] = data[i];
        }
        return result;
    }
}
