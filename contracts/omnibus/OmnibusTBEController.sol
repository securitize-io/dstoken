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
        uint256[] memory euRetailCountryCounts) public onlyIssuerOrAbove {
        require(euRetailCountries.length == euRetailCountryCounts.length, 'EU Retail countries arrays do not match');
        // Handle counters here
        IDSOmnibusTBEController(getDSService(OMNIBUS_TBE_CONTROLLER)).addToCounters(totalInvestors, accreditedInvestors,
            usAccreditedInvestors, usTotalInvestors, jpTotalInvestors, euRetailCountries, euRetailCountryCounts, true);
        // Issue tokens
        getToken().issueTokensCustom(omnibusWallet, value, issuanceTime, 0, '', 0);
    }

    function bulkBurn(uint256 value, uint256 issuanceTime, uint256 totalInvestors, uint256 accreditedInvestors,
        uint256 usAccreditedInvestors, uint256 usTotalInvestors, uint256 jpTotalInvestors, bytes32[] memory euRetailCountries,
        uint256[] memory euRetailCountryCounts) public onlyIssuerOrAbove {
        require(euRetailCountries.length == euRetailCountryCounts.length, 'EU Retail countries arrays do not match');
        // Handle counters here
        IDSOmnibusTBEController(getDSService(OMNIBUS_TBE_CONTROLLER)).addToCounters(totalInvestors, accreditedInvestors,
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
    }

    function getOmnibusWallet() public view returns (address) {
        return omnibusWallet;
    }
}
