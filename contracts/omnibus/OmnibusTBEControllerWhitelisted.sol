pragma solidity ^0.8.20;

import "../data-stores/OmnibusTBEControllerDataStore.sol";
import "../utils/BaseDSContract.sol";
import "@openzeppelin/contracts/utils/math/SafeCast.sol";

//SPDX-License-Identifier: GPL-3.0
contract OmnibusTBEControllerWhitelisted is IDSOmnibusTBEController, OmnibusTBEControllerDataStore, BaseDSContract {

    function initialize(address _omnibusWallet, bool _isPartitionedToken) public override onlyProxy initializer {
        require(_omnibusWallet != address(0), "Omnibus wallet can not be zero address");
        __BaseDSContract_init();

        omnibusWallet = _omnibusWallet;
        isPartitionedToken = _isPartitionedToken;
    }

    function bulkIssuance(uint256 value, uint256 issuanceTime, uint256 totalInvestors, uint256 accreditedInvestors,
        uint256 usAccreditedInvestors, uint256 usTotalInvestors, uint256 jpTotalInvestors, bytes32[] memory euRetailCountries,
        uint256[] memory euRetailCountryCounts) public override onlyIssuerOrAbove {
        require(euRetailCountries.length == euRetailCountryCounts.length, 'EU Retail countries arrays do not match');
        // Issue tokens
        getToken().issueTokensCustom(omnibusWallet, value, issuanceTime, 0, '', 0);
        emitTBEOperationEvent(totalInvestors, accreditedInvestors, usAccreditedInvestors, usTotalInvestors, jpTotalInvestors, true);
    }

    function bulkBurn(uint256 value, uint256 totalInvestors, uint256 accreditedInvestors,
        uint256 usAccreditedInvestors, uint256 usTotalInvestors, uint256 jpTotalInvestors, bytes32[] memory euRetailCountries,
        uint256[] memory euRetailCountryCounts) public override onlyTransferAgentOrAbove {
        require(euRetailCountries.length == euRetailCountryCounts.length, 'EU Retail countries arrays do not match');
        // Burn tokens
        getToken().burn(omnibusWallet, value, 'Omnibus');
        emitTBEOperationEvent(totalInvestors, accreditedInvestors, usAccreditedInvestors, usTotalInvestors, jpTotalInvestors, false);
    }

    function bulkTransfer(address[] memory wallets, uint256[] memory values) public override onlyIssuerOrAbove {
        require(wallets.length == values.length, 'Wallets and values lengths do not match');
        for (uint i = 0; i < wallets.length; i++) {
            getToken().transferFrom(omnibusWallet, wallets[i], values[i]);
        }
    }

    function internalTBETransfer(string memory externalId, int256 totalDelta, int256 accreditedDelta,
        int256 usAccreditedDelta, int256 usTotalDelta, int256 jpTotalDelta, bytes32[] memory euRetailCountries,
        int256[] memory euRetailCountryDeltas) public onlyIssuerOrAbove {
        adjustCounters(totalDelta, accreditedDelta, usAccreditedDelta, usTotalDelta, jpTotalDelta,
            euRetailCountries, euRetailCountryDeltas);
        getToken().emitOmnibusTBETransferEvent(omnibusWallet, externalId);
    }

    function adjustCounters(int256 totalDelta, int256 accreditedDelta,
        int256 usAccreditedDelta, int256 usTotalDelta, int256 jpTotalDelta, bytes32[] memory euRetailCountries,
        int256[] memory euRetailCountryDeltas) public override onlyIssuerOrAbove {
        require(euRetailCountries.length == euRetailCountryDeltas.length, 'Array lengths do not match');
        getToken().emitOmnibusTBEEvent(
            omnibusWallet,
            totalDelta,
            accreditedDelta,
            usAccreditedDelta,
            usTotalDelta,
            jpTotalDelta);
    }

    function getOmnibusWallet() public view override returns (address) {
        return omnibusWallet;
    }

    function emitTBEOperationEvent(uint256 _totalInvestors, uint256 _accreditedInvestors,
        uint256 _usAccreditedInvestors, uint256 _usTotalInvestors, uint256 _jpTotalInvestors, bool /*_increase*/) internal {
        getToken().emitOmnibusTBEEvent(
            omnibusWallet,
            SafeCast.toInt256(_totalInvestors),
            SafeCast.toInt256(_accreditedInvestors),
            SafeCast.toInt256(_usAccreditedInvestors),
            SafeCast.toInt256(_usTotalInvestors),
            SafeCast.toInt256(_jpTotalInvestors)
        );
    }
}
