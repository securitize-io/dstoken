pragma solidity ^0.8.20;

import "../service/ServiceConsumer.sol";
import "../data-stores/OmnibusTBEControllerDataStore.sol";

//SPDX-License-Identifier: GPL-3.0
abstract contract IDSOmnibusTBEController {

    function initialize(address _omnibusWallet, bool _isPartitionedToken) public virtual;

    function bulkIssuance(
        uint256 value,
        uint256 issuanceTime,
        uint256 totalInvestors,
        uint256 accreditedInvestors,
        uint256 usAccreditedInvestors,
        uint256 usTotalInvestors,
        uint256 jpTotalInvestors,
        bytes32[] calldata euRetailCountries,
        uint256[] calldata euRetailCountryCounts
    ) public virtual;

    function bulkBurn(
        uint256 value,
        uint256 totalInvestors,
        uint256 accreditedInvestors,
        uint256 usAccreditedInvestors,
        uint256 usTotalInvestors,
        uint256 jpTotalInvestors,
        bytes32[] calldata euRetailCountries,
        uint256[] calldata euRetailCountryCounts
    ) public virtual;

    function bulkTransfer(address[] calldata wallets, uint256[] calldata values) public virtual;

    function adjustCounters(
        int256 totalDelta,
        int256 accreditedDelta,
        int256 usAccreditedDelta,
        int256 usTotalDelta,
        int256 jpTotalDelta,
        bytes32[] calldata euRetailCountries,
        int256[] calldata euRetailCountryDeltas
    ) public virtual;

    function getOmnibusWallet() public view virtual returns (address);
}
