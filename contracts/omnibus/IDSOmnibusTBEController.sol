pragma solidity ^0.8.20;

import "../service/ServiceConsumer.sol";
import "../data-stores/OmnibusTBEControllerDataStore.sol";

//SPDX-License-Identifier: GPL-3.0
abstract contract IDSOmnibusTBEController {

    function initialize(address _omnibusWallet, bool _isPartitionedToken) public virtual;

    function bulkIssuance(uint256 value, uint256 issuanceTime, uint256 totalInvestors, uint256 accreditedInvestors,
        uint256 usAccreditedInvestors, uint256 usTotalInvestors, uint256 jpTotalInvestors, bytes32[] memory euRetailCountries,
        uint256[] memory euRetailCountryCounts) public virtual;

    function bulkBurn(uint256 value, uint256 totalInvestors, uint256 accreditedInvestors,
        uint256 usAccreditedInvestors, uint256 usTotalInvestors, uint256 jpTotalInvestors, bytes32[] memory euRetailCountries,
        uint256[] memory euRetailCountryCounts) public virtual;

    function bulkTransfer(address[] memory wallets, uint256[] memory values) public virtual;

    function adjustCounters(int256 totalDelta, int256 accreditedDelta,
        int256 usAccreditedDelta, int256 usTotalDelta, int256 jpTotalDelta, bytes32[] memory euRetailCountries,
        int256[] memory euRetailCountryDeltas) public virtual;

    function getOmnibusWallet() public view virtual returns (address);
}
