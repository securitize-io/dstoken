pragma solidity ^0.8.13;

//SPDX-License-Identifier: UNLICENSED
interface IBulkOperation {

    /**
     * @dev Function to be invoked by the proxy contract when the BulkOperations is deployed.
     * @param _dsToken dsToken to issue
    **/
    function initialize(address _dsToken) external;

    /**
     * @dev Get the contract version
     * @return Contract version
    **/
    function getVersion() external pure returns (uint8);

    /**
     * @dev Bulk Issuance to existing investors
     * @param addresses - Array of addresses to be issued to
     * @param values - Array of values to be issue
     * @param issuanceTime - Issuance time for all issuances
    **/
    function bulkIssuance(address[] memory addresses, uint256[] memory values, uint256 issuanceTime) external;

    /**
     * @dev Bulk Burn
     * @param addresses - Array of addresses to be burn to
     * @param values - Array of values to be burned
    **/
    function bulkBurn(address[] memory addresses, uint256[] memory values) external;    
}
