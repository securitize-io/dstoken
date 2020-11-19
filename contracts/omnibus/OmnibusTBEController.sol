pragma solidity 0.5.17;

import "../service/ServiceConsumer.sol";
import "../utils/ProxyTarget.sol";
import "../data-stores/OmnibusTBEControllerDataStore.sol";

contract OmnibusTBEController is IDSOmnibusTBEController, ProxyTarget, ServiceConsumer, OmnibusTBEControllerDataStore {
    using SafeMath for uint256;

    function initialize(address _omnibusWallet) public initializer forceInitializeFromProxy {
        VERSIONS.push(3);
        ServiceConsumer.initialize();

        omnibusWallet = _omnibusWallet;
    }

    function bulkIssuance(uint256 value, uint256 issuanceTime, uint256 totalInvestors, uint256 accreditedInvestors,
        uint256 usAccreditedInvestors, uint256 usTotalInvestors, uint256 jpTotalInvestors, bytes32[] memory euRetailCountries,
        uint256[] memory euRetailCountryCounts) public onlyIssuerOrAbove returns (bool) {
        require(euRetailCountries.length == euRetailCountryCounts.length, 'EU Retail countries arrays do not match');
        // TODO: Check we can increase counters
//        require(IDSComplianceService(getDSService(COMPLIANCE_SERVICE)).getTotalInvestorsCount().add(totalInvestors) <=
//            IDSComplianceConfigurationService(getDSService(COMPLIANCE_CONFIGURATION_SERVICE)).getTotalInvestorsLimit(), 'Total investors exceeded');
        // Handle counters here
        IDSComplianceService(getDSService(COMPLIANCE_SERVICE)).addToCounters(totalInvestors, accreditedInvestors,
            usAccreditedInvestors, usTotalInvestors, jpTotalInvestors, euRetailCountries, euRetailCountryCounts, true);
        // Issue tokens
        getToken().issueTokensCustom(omnibusWallet, value, issuanceTime, 0, '', 0);
        return true;
    }

    function bulkBurn(uint256 value, uint256 issuanceTime, uint256 totalInvestors, uint256 accreditedInvestors,
        uint256 usAccreditedInvestors, uint256 usTotalInvestors, uint256 jpTotalInvestors, bytes32[] memory euRetailCountries,
        uint256[] memory euRetailCountryCounts) public onlyIssuerOrAbove {
        require(euRetailCountries.length == euRetailCountryCounts.length, 'EU Retail countries arrays do not match');
        // Handle counters here
        IDSComplianceService(getDSService(COMPLIANCE_SERVICE)).addToCounters(totalInvestors, accreditedInvestors,
            usAccreditedInvestors, usTotalInvestors, jpTotalInvestors, euRetailCountries, euRetailCountryCounts, false);
        // Burn tokens
        getToken().burn(omnibusWallet, value, 'Omnibus');
    }

    function bulkTransfer(address[] memory wallets, uint256[] memory values) public onlyIssuerOrAbove {
        require(wallets.length == values.length, 'Wallets and values lengths do not match');
        // Handle counters here
        //
        // Transfer tokens having the corresponding approval from Omnibus Wallet owner
        for (uint i = 0; i < wallets.length; i++) {
            // TODO: Maybe we can use Seize??
            getToken().transferFrom(omnibusWallet, wallets[i], values[i]);
        }
    }

    function adjustCounters(int256 totalDelta, int256 accreditedDelta,
        int256 usAccreditedDelta, int256 usTotalDelta, int256 jpTotalDelta, bytes32[] memory euRetailCountries,
        int256[] memory euRetailCountryDeltas) public onlyIssuerOrAbove {
        require(euRetailCountries.length == euRetailCountryDeltas.length, 'Array lengths do not match');

        IDSComplianceService(getDSService(COMPLIANCE_SERVICE)).addToCounters(
            totalDelta > 0 ? uint256(totalDelta) : 0,
            accreditedDelta > 0 ? uint256(accreditedDelta) : 0,
            usAccreditedDelta > 0 ? uint256(usAccreditedDelta) : 0,
            usTotalDelta > 0 ? uint256(usTotalDelta) : 0,
            jpTotalDelta > 0 ? uint256(jpTotalDelta) : 0,
            euRetailCountries,
            getEuCountriesDeltasTranslated(euRetailCountryDeltas, true),
            true
        );
        IDSComplianceService(getDSService(COMPLIANCE_SERVICE)).addToCounters(
            totalDelta < 0 ? uint256(totalDelta * -1) : 0,
            accreditedDelta < 0 ? uint256(accreditedDelta * -1) : 0,
            usAccreditedDelta < 0 ? uint256(usAccreditedDelta * -1) : 0,
            usTotalDelta < 0 ? uint256(usTotalDelta * -1) : 0,
            jpTotalDelta < 0 ? uint256(jpTotalDelta * -1) : 0,
            euRetailCountries,
            getEuCountriesDeltasTranslated(euRetailCountryDeltas, false),
            false
        );
    }

    function getEuCountriesDeltasTranslated(int256[] memory euCountryDeltas,  bool increase) internal view returns (uint256[] memory) {
        uint256[] memory result = new uint256[](euCountryDeltas.length);

        for (uint i = 0; i < euCountryDeltas.length; i++) {
            if (increase) {
                result[i] = euCountryDeltas[i] > 0 ? uint256(euCountryDeltas[i]) : 0;
            } else {
                result[i] = euCountryDeltas[i] < 0 ? uint256(euCountryDeltas[i] * -1) : 0;
            }
        }
        return result;
    }

    function getOmnibusWallet() public view returns (address) {
        return omnibusWallet;
    }
}
