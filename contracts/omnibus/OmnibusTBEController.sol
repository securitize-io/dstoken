pragma solidity 0.5.17;

import "../service/ServiceConsumer.sol";
import "../utils/ProxyTarget.sol";
import "../data-stores/OmnibusTBEControllerDataStore.sol";
import "../compliance/ComplianceServiceRegulated.sol";
import "../compliance/ComplianceConfigurationService.sol";

contract OmnibusTBEController is ProxyTarget, Initializable, IDSOmnibusTBEController, ServiceConsumer, OmnibusTBEControllerDataStore {

    using SafeMath for uint256;
    string internal constant MAX_INVESTORS_IN_CATEGORY = "Max investors in category";

    function initialize(address _omnibusWallet, bool _isPartitionedToken) public initializer forceInitializeFromProxy {
        VERSIONS.push(3);
        ServiceConsumer.initialize();

        omnibusWallet = _omnibusWallet;
        isPartitionedToken = _isPartitionedToken;
    }

    function bulkIssuance(uint256 value, uint256 issuanceTime, uint256 totalInvestors, uint256 accreditedInvestors,
        uint256 usAccreditedInvestors, uint256 usTotalInvestors, uint256 jpTotalInvestors, bytes32[] memory euRetailCountries,
        uint256[] memory euRetailCountryCounts) public onlyIssuerOrAbove {
        require(euRetailCountries.length == euRetailCountryCounts.length, 'EU Retail countries arrays do not match');
        // Issue tokens
        getToken().issueTokensCustom(omnibusWallet, value, issuanceTime, 0, '', 0);
        addToCounters(totalInvestors, accreditedInvestors,
            usAccreditedInvestors, usTotalInvestors, jpTotalInvestors, euRetailCountries, euRetailCountryCounts, true);
        emitTBEOperationEvent(totalInvestors, accreditedInvestors, usAccreditedInvestors, usTotalInvestors, jpTotalInvestors, true);
    }

    function bulkBurn(uint256 value, uint256 totalInvestors, uint256 accreditedInvestors,
        uint256 usAccreditedInvestors, uint256 usTotalInvestors, uint256 jpTotalInvestors, bytes32[] memory euRetailCountries,
        uint256[] memory euRetailCountryCounts) public onlyIssuerOrAbove {
        require(euRetailCountries.length == euRetailCountryCounts.length, 'EU Retail countries arrays do not match');
        addToCounters(totalInvestors, accreditedInvestors,
            usAccreditedInvestors, usTotalInvestors, jpTotalInvestors, euRetailCountries, euRetailCountryCounts, false);
        if(isPartitionedToken) {
            IDSTokenPartitioned token = getTokenPartitioned();
            bool done;
            for (uint i = 0; i < token.partitionCountOf(omnibusWallet); i++) {
                bytes32 partition = token.partitionOf(omnibusWallet, i);
                if(token.balanceOfByPartition(omnibusWallet, partition) >= value) {
                    token.burnByPartition(omnibusWallet, value, 'Omnibus burn by partition', partition);
                    done = true;
                }
            }
            require(done, "Could not find partition to burn tokens from");
            return;
        }
        // Burn tokens
        getToken().burn(omnibusWallet, value, 'Omnibus');
        emitTBEOperationEvent(totalInvestors, accreditedInvestors, usAccreditedInvestors, usTotalInvestors, jpTotalInvestors, false);
    }

    function bulkTransfer(address[] memory wallets, uint256[] memory values) public onlyIssuerOrAbove {
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
        int256[] memory euRetailCountryDeltas) public onlyIssuerOrAbove {
        require(euRetailCountries.length == euRetailCountryDeltas.length, 'Array lengths do not match');

        addToCounters(
            totalDelta > 0 ? uint256(totalDelta) : 0,
            accreditedDelta > 0 ? uint256(accreditedDelta) : 0,
            usAccreditedDelta > 0 ? uint256(usAccreditedDelta) : 0,
            usTotalDelta > 0 ? uint256(usTotalDelta) : 0,
            jpTotalDelta > 0 ? uint256(jpTotalDelta) : 0,
            euRetailCountries,
            getUintEuCountriesDeltas(euRetailCountryDeltas, true),
            true
        );
        addToCounters(
            totalDelta < 0 ? uint256(totalDelta * -1) : 0,
            accreditedDelta < 0 ? uint256(accreditedDelta * -1) : 0,
            usAccreditedDelta < 0 ? uint256(usAccreditedDelta * -1) : 0,
            usTotalDelta < 0 ? uint256(usTotalDelta * -1) : 0,
            jpTotalDelta < 0 ? uint256(jpTotalDelta * -1) : 0,
            euRetailCountries,
                getUintEuCountriesDeltas(euRetailCountryDeltas, false),
            false
        );
        getToken().emitOmnibusTBEEvent(
            omnibusWallet,
            totalDelta,
            accreditedDelta,
            usAccreditedDelta,
            usTotalDelta,
            jpTotalDelta);
    }

    function getOmnibusWallet() public view returns (address) {
        return omnibusWallet;
    }

    function addToCounters(uint256 _totalInvestors, uint256 _accreditedInvestors,
        uint256 _usAccreditedInvestors, uint256 _usTotalInvestors, uint256 _jpTotalInvestors, bytes32[] memory _euRetailCountries,
        uint256[] memory _euRetailCountryCounts,  bool _increase) internal returns (bool) {
        ComplianceServiceRegulated cs = ComplianceServiceRegulated(getDSService(COMPLIANCE_SERVICE));
        IDSComplianceConfigurationService ccs = IDSComplianceConfigurationService(getDSService(COMPLIANCE_CONFIGURATION_SERVICE));

        require(ccs.getNonAccreditedInvestorsLimit() == 0 || ((cs.getTotalInvestorsCount().sub(cs.getAccreditedInvestorsCount())).
        add(_totalInvestors.sub(_accreditedInvestors)) <= ccs.getNonAccreditedInvestorsLimit()), MAX_INVESTORS_IN_CATEGORY);

        cs.setTotalInvestorsCount(_increase ? increaseCounter(cs.getTotalInvestorsCount(), ccs.getTotalInvestorsLimit(),
            _totalInvestors) : cs.getTotalInvestorsCount().sub(_totalInvestors));
        cs.setAccreditedInvestorsCount(_increase ? increaseCounter(cs.getAccreditedInvestorsCount(), ccs.getTotalInvestorsLimit(),
            _accreditedInvestors) : cs.getAccreditedInvestorsCount().sub(_accreditedInvestors));
        cs.setUSAccreditedInvestorsCount(_increase ? increaseCounter(cs.getUSAccreditedInvestorsCount(),
            ccs.getUSAccreditedInvestorsLimit(), _usAccreditedInvestors) : cs.getUSAccreditedInvestorsCount().sub(_usAccreditedInvestors));
        cs.setUSInvestorsCount(_increase ? increaseCounter(cs.getUSInvestorsCount(), ccs.getUSInvestorsLimit(), _usTotalInvestors) :
            cs.getUSInvestorsCount().sub(_usTotalInvestors));
        cs.setJPInvestorsCount(_increase ? increaseCounter(cs.getJPInvestorsCount(), ccs.getJPInvestorsLimit(), _jpTotalInvestors) :
            cs.getJPInvestorsCount().sub(_jpTotalInvestors));
        for (uint i = 0; i < _euRetailCountries.length; i++) {
            string memory countryCode = bytes32ToString(_euRetailCountries[i]);
            cs.setEURetailInvestorsCount(countryCode, _increase ? increaseCounter(cs.getEURetailInvestorsCount(countryCode),
                ccs.getEURetailInvestorsLimit(), _euRetailCountryCounts[i]) :
                cs.getEURetailInvestorsCount(countryCode).sub(_euRetailCountryCounts[i]));
        }

        return true;
    }

    function emitTBEOperationEvent(uint256 _totalInvestors, uint256 _accreditedInvestors,
        uint256 _usAccreditedInvestors, uint256 _usTotalInvestors, uint256 _jpTotalInvestors, bool _increase) internal {
        getToken().emitOmnibusTBEEvent(
            omnibusWallet,
            _increase ? int256(_totalInvestors) : int256(_totalInvestors) * -1,
            _increase ? int256(_accreditedInvestors) : int256(_accreditedInvestors) * -1,
            _increase ? int256(_usAccreditedInvestors) : int256(_usAccreditedInvestors) * -1,
            _increase ? int256(_usTotalInvestors) : int256(_usTotalInvestors) * -1,
            _increase ? int256(_jpTotalInvestors) : int256(_jpTotalInvestors) * -1);
    }

    function getUintEuCountriesDeltas(int256[] memory euCountryDeltas,  bool increase) internal pure returns (uint256[] memory) {
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

    function increaseCounter(uint256 currentValue, uint256 currentLimit, uint256 delta) internal pure returns (uint256) {
        uint256 result = currentValue.add(delta);
        require(currentLimit == 0 || result <= currentLimit, MAX_INVESTORS_IN_CATEGORY);
        return result;
    }

    function bytes32ToString(bytes32 _bytes32) internal pure returns (string memory) {
        uint8 i = 0;
        while(i < 32 && _bytes32[i] != 0) {
            i++;
        }
        bytes memory bytesArray = new bytes(i);
        for (i = 0; i < 32 && _bytes32[i] != 0; i++) {
            bytesArray[i] = _bytes32[i];
        }
        return string(bytesArray);
    }
}
