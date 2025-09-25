/**
 * Copyright 2025 Securitize Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

pragma solidity 0.8.22;

import {ServiceConsumer} from "../service/ServiceConsumer.sol";

    error MulticallFailed(uint256 index, string reason);

/**
* @title MulticallProxy
* @dev Proxy contract to call multiple functions in a single transaction
* @dev This contract is used to call multiple functions in a single transaction, requires an implementation contract that overrides the multicall function setting the necessary permissions with a modifier
*/
abstract contract MulticallProxy {

    function initialize() public virtual;

    /**
    * @dev Calls multiple functions in destination contracts
    * @dev Must override
    * @param _targets destination contract addresses array
    * @param data ABI encoded function signature and parameters array
    */
    function multicall(address[] memory _targets, bytes[] calldata data) external virtual returns (bytes[] memory results);

    /**
    * @dev Calls a function in destination contract
    * @param target Destination contract address
    * @param data  Function signature and parameters
    */
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

    /**
    * @dev Parses revert reason
    * @param data ABI encoded function signature and parameters
    */
    function _getRevertReason(bytes memory data) internal pure returns (string memory) {
        require(data.length > 4, "Data too short");
        bytes memory slicedData = _slice(data, 4, data.length);
        return abi.decode(slicedData, (string));
    }

    /**
    * @dev Slices data
    * @param data bytes data
    * @param start data start to slice
    * @param end   data end to slice
    */
    function _slice(bytes memory data, uint256 start, uint256 end) internal pure returns (bytes memory) {
        bytes memory result = new bytes(end - start);
        for (uint256 i = start; i < end; ++i) {
            result[i - start] = data[i];
        }
        return result;
    }
}
