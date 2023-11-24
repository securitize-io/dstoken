pragma solidity ^0.8.13;

import "../utils/VersionedContract.sol";
import "../utils/Initializable.sol";

//SPDX-License-Identifier: UNLICENSED
abstract contract IBulkOperation {

    /**
     * @dev Function to be invoked by the proxy contract when the BulkOperations is deployed.
     * @param _dsToken dsToken to issue
    **/
    function initialize(address _dsToken) public virtual;

}
