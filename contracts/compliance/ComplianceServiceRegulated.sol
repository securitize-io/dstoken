pragma solidity ^0.5.0;

import "./ComplianceServiceWhitelisted.sol";
import "../zeppelin/math/Math.sol";

library ComplianceServiceLibrary {
    uint256 internal constant DS_TOKEN = 0;
    uint256 internal constant REGISTRY_SERVICE = 1;
    uint256 internal constant WALLET_MANAGER = 2;
    uint256 internal constant COMPLIANCE_CONFIGURATION_SERVICE = 3;
    uint256 internal constant LOCK_MANAGER = 4;
    uint256 internal constant COMPLIANCE_SERVICE = 5;
    uint256 internal constant NONE = 0;
    uint256 internal constant US = 1;
    uint256 internal constant EU = 2;
    uint256 internal constant FORBIDDEN = 4;
    string internal constant TOKEN_PAUSED = "Token Paused";
    string internal constant NOT_ENOUGH_TOKENS = "Not Enough Tokens";
    string internal constant VALID = "Valid";
    string internal constant TOKENS_LOCKED = "Tokens Locked";
    string internal constant ONLY_FULL_TRANSFER = "Only Full Transfer";
    string internal constant FLOWBACK = "Flowback";
    string internal constant WALLET_NOT_IN_REGISTRY_SERVICE = "Wallet not in registry Service";
    string internal constant AMOUNT_OF_TOKENS_UNDER_MIN = "Amount of tokens under min";
    string internal constant AMOUNT_OF_TOKENS_ABOVE_MAX = "Amount of tokens above max";
    string internal constant HOLD_UP = "Hold-up";
    string internal constant HOLD_UP_1Y = "Hold-up 1y";
    string internal constant DESTINATION_RESTRICTED = "Destination restricted";
    string internal constant MAX_INVESTORS_IN_CATEGORY = "Max Investors in category";
    string internal constant ONLY_ACCREDITED = "Only accredited";
    string internal constant ONLY_US_ACCREDITED = "Only us accredited";
    string internal constant NOT_ENOUGH_INVESTORS = "Not enough investors";
    string internal constant OMNIBUS_TO_OMNIBUS_TRANSFER = "Omnibus to omnibus transfer";

    using SafeMath for uint256;

    function isRetail(address[] memory services, address _wallet) internal view returns (bool) {
        IDSRegistryService registry = IDSRegistryService(services[REGISTRY_SERVICE]);

        return registry.getAttributeValue(registry.getInvestor(_wallet), registry.QUALIFIED()) != registry.APPROVED();
    }

    function isAccredited(address[] memory services, address _wallet) internal view returns (bool) {
        IDSRegistryService registry = IDSRegistryService(services[REGISTRY_SERVICE]);

        return registry.getAttributeValue(registry.getInvestor(_wallet), registry.ACCREDITED()) == registry.APPROVED();
    }

    function balanceOfInvestor(address[] memory services, address _wallet) internal view returns (uint256) {
        IDSRegistryService registry = IDSRegistryService(services[REGISTRY_SERVICE]);
        IDSToken token = IDSToken(services[DS_TOKEN]);

        return token.balanceOfInvestor(registry.getInvestor(_wallet));
    }

    function isNewInvestor(address[] memory services, address _wallet) internal view returns (bool) {
        return balanceOfInvestor(services, _wallet) == 0;
    }

    function getCountry(address[] memory services, address _wallet) internal view returns (string memory) {
        IDSRegistryService registry = IDSRegistryService(services[REGISTRY_SERVICE]);

        return registry.getCountry(registry.getInvestor(_wallet));
    }

    function getCountryCompliance(address[] memory services, address _wallet) internal view returns (uint256) {
        return IDSComplianceConfigurationService(services[COMPLIANCE_CONFIGURATION_SERVICE]).getCountryCompliance(getCountry(services, _wallet));
    }

    function getUsInvestorsLimit(address[] memory services) public view returns (uint256) {
        ComplianceServiceRegulated complianceService = ComplianceServiceRegulated(services[COMPLIANCE_SERVICE]);
        IDSComplianceConfigurationService compConfService = IDSComplianceConfigurationService(services[COMPLIANCE_CONFIGURATION_SERVICE]);

        if (compConfService.getMaxUsInvestorsPercentage() == 0) {
            return compConfService.getUsInvestorsLimit();
        }

        if (compConfService.getUsInvestorsLimit() == 0) {
            return compConfService.getMaxUsInvestorsPercentage().mul(complianceService.getTotalInvestorsCount()).div(100);
        }

        return Math.min(compConfService.getUsInvestorsLimit(), compConfService.getMaxUsInvestorsPercentage().mul(complianceService.getTotalInvestorsCount()).div(100));
    }

    function preTransferCheck(address[] memory _services, address _from, address _to, uint256 _value) public view returns (uint256 code, string memory reason) {
        ComplianceServiceRegulated complianceService = ComplianceServiceRegulated(_services[COMPLIANCE_SERVICE]);

        if (IDSToken(_services[DS_TOKEN]).isPaused()) {
            return (10, TOKEN_PAUSED);
        }

        if (IDSToken(_services[DS_TOKEN]).balanceOf(_from) < _value) {
            return (15, NOT_ENOUGH_TOKENS);
        }

        if (
            keccak256(abi.encodePacked(IDSRegistryService(_services[REGISTRY_SERVICE]).getInvestor(_from))) != keccak256("") &&
            keccak256(abi.encodePacked(IDSRegistryService(_services[REGISTRY_SERVICE]).getInvestor(_from))) ==
            keccak256(abi.encodePacked(IDSRegistryService(_services[REGISTRY_SERVICE]).getInvestor(_to)))
        ) {
            return (0, VALID);
        }

        if (IDSWalletManager(_services[WALLET_MANAGER]).getWalletType(_from) == IDSWalletManager(_services[WALLET_MANAGER]).OMNIBUS()) {
            if (IDSWalletManager(_services[WALLET_MANAGER]).getWalletType(_to) == IDSWalletManager(_services[WALLET_MANAGER]).OMNIBUS()) {
                return (81, OMNIBUS_TO_OMNIBUS_TRANSFER);
            }

            return omnibusWalletAdditionalTrasferChecks(_services, _from, _to, _value, false);

        } else if (IDSWalletManager(_services[WALLET_MANAGER]).getWalletType(_to) == IDSWalletManager(_services[WALLET_MANAGER]).OMNIBUS()) {
            return omnibusWalletAdditionalTrasferChecks(_services, _from, _to, _value, true);
        }

        uint256 fromInvestorBalance = balanceOfInvestor(_services, _from);

        if (IDSWalletManager(_services[WALLET_MANAGER]).getWalletType(_to) == IDSWalletManager(_services[WALLET_MANAGER]).PLATFORM()) {
            if (IDSComplianceConfigurationService(_services[COMPLIANCE_CONFIGURATION_SERVICE]).getForceFullTransfer() && fromInvestorBalance > _value) {
                return (50, ONLY_FULL_TRANSFER);
            }

            return (0, VALID);
        }

        if (
            IDSWalletManager(_services[WALLET_MANAGER]).getWalletType(_from) != IDSWalletManager(_services[WALLET_MANAGER]).PLATFORM() &&
            IDSLockManager(_services[LOCK_MANAGER]).getTransferableTokens(_from, uint64(now)) < _value
        ) {
            return (16, TOKENS_LOCKED);
        }

        if (!complianceService.checkWhitelisted(_to)) {
            return (20, WALLET_NOT_IN_REGISTRY_SERVICE);
        }

        uint256 fromRegion = getCountryCompliance(_services, _from);
        uint256 toRegion = getCountryCompliance(_services, _to);

        if (fromRegion == US) {
            if (
                complianceService.getComplianceTransferableTokens(
                    _from,
                    uint64(now),
                    uint64(IDSComplianceConfigurationService(_services[COMPLIANCE_CONFIGURATION_SERVICE]).getUsLockPeriod())
                ) <
                _value
            ) {
                return (32, HOLD_UP_1Y);
            }

            if (fromInvestorBalance > _value && fromInvestorBalance.sub(_value) < IDSComplianceConfigurationService(_services[COMPLIANCE_CONFIGURATION_SERVICE]).getMinUsTokens()) {
                return (51, AMOUNT_OF_TOKENS_UNDER_MIN);
            }

            if (IDSComplianceConfigurationService(_services[COMPLIANCE_CONFIGURATION_SERVICE]).getForceFullTransfer() && fromInvestorBalance > _value) {
                return (50, ONLY_FULL_TRANSFER);
            }
        } else {
            if (
                IDSWalletManager(_services[WALLET_MANAGER]).getWalletType(_from) != IDSWalletManager(_services[WALLET_MANAGER]).PLATFORM() &&
                complianceService.getComplianceTransferableTokens(
                    _from,
                    uint64(now),
                    uint64(IDSComplianceConfigurationService(_services[COMPLIANCE_CONFIGURATION_SERVICE]).getNonUsLockPeriod())
                ) <
                _value
            ) {
                return (33, HOLD_UP);
            }

            if (
                toRegion == US &&
                !(IDSWalletManager(_services[WALLET_MANAGER]).getWalletType(_from) == IDSWalletManager(_services[WALLET_MANAGER]).PLATFORM()) &&
                (IDSComplianceConfigurationService(_services[COMPLIANCE_CONFIGURATION_SERVICE]).getBlockFlowbackEndTime() == 0 ||
                    IDSComplianceConfigurationService(_services[COMPLIANCE_CONFIGURATION_SERVICE]).getBlockFlowbackEndTime() > now)
            ) {
                return (25, FLOWBACK);
            }
        }

        if (toRegion == FORBIDDEN) {
            return (26, DESTINATION_RESTRICTED);
        }

        if (toRegion == EU) {
            if (
                isRetail(_services, _to) &&
                complianceService.getEURetailInvestorsCount(getCountry(_services, _to)) >=
                IDSComplianceConfigurationService(_services[COMPLIANCE_CONFIGURATION_SERVICE]).getEuRetailLimit() &&
                isNewInvestor(_services, _to) &&
                (keccak256(abi.encodePacked(getCountry(_services, _from))) != keccak256(abi.encodePacked(getCountry(_services, _to))) ||
                    (fromInvestorBalance > _value && isRetail(_services, _from)))
            ) {
                return (40, MAX_INVESTORS_IN_CATEGORY);
            }

            if (balanceOfInvestor(_services, _to).add(_value) < IDSComplianceConfigurationService(_services[COMPLIANCE_CONFIGURATION_SERVICE]).getMinEuTokens()) {
                return (51, AMOUNT_OF_TOKENS_UNDER_MIN);
            }
        }

        if (fromRegion == EU) {
            if (fromInvestorBalance.sub(_value) < IDSComplianceConfigurationService(_services[COMPLIANCE_CONFIGURATION_SERVICE]).getMinEuTokens() && fromInvestorBalance > _value) {
                return (51, AMOUNT_OF_TOKENS_UNDER_MIN);
            }
        }

        if (IDSComplianceConfigurationService(_services[COMPLIANCE_CONFIGURATION_SERVICE]).getForceAccredited() && !isAccredited(_services, _to)) {
            return (61, ONLY_ACCREDITED);
        }

        if (toRegion == US) {
            if (IDSComplianceConfigurationService(_services[COMPLIANCE_CONFIGURATION_SERVICE]).getForceAccreditedUS() && !isAccredited(_services, _to)) {
                return (61, ONLY_US_ACCREDITED);
            }

            uint256 usInvestorsLimit = getUsInvestorsLimit(_services);
            if (usInvestorsLimit != 0 && fromInvestorBalance > _value && complianceService.getUSInvestorsCount() >= usInvestorsLimit && isNewInvestor(_services, _to)) {
                return (41, ONLY_FULL_TRANSFER);
            }

            if (
                IDSComplianceConfigurationService(_services[COMPLIANCE_CONFIGURATION_SERVICE]).getUsAccreditedInvestorsLimit() != 0 &&
                isAccredited(_services, _to) &&
                complianceService.getUSAccreditedInvestorsCount() >=
                IDSComplianceConfigurationService(_services[COMPLIANCE_CONFIGURATION_SERVICE]).getUsAccreditedInvestorsLimit() &&
                isNewInvestor(_services, _to) &&
                (fromRegion != US || (fromInvestorBalance > _value && isAccredited(_services, _from)))
            ) {
                return (40, MAX_INVESTORS_IN_CATEGORY);
            }

            if (balanceOfInvestor(_services, _to).add(_value) < IDSComplianceConfigurationService(_services[COMPLIANCE_CONFIGURATION_SERVICE]).getMinUsTokens()) {
                return (51, AMOUNT_OF_TOKENS_UNDER_MIN);
            }
        }

        if (!isAccredited(_services, _to)) {
            if (
                IDSComplianceConfigurationService(_services[COMPLIANCE_CONFIGURATION_SERVICE]).getNonAccreditedInvestorsLimit() != 0 &&
                complianceService.getTotalInvestorsCount().sub(complianceService.getAccreditedInvestorsCount()) >=
                IDSComplianceConfigurationService(_services[COMPLIANCE_CONFIGURATION_SERVICE]).getNonAccreditedInvestorsLimit() &&
                isNewInvestor(_services, _to) &&
                (isAccredited(_services, _from) || fromInvestorBalance > _value)
            ) {
                return (40, MAX_INVESTORS_IN_CATEGORY);
            }
        }

        if (
            IDSComplianceConfigurationService(_services[COMPLIANCE_CONFIGURATION_SERVICE]).getTotalInvestorsLimit() != 0 &&
            fromInvestorBalance > _value &&
            complianceService.getTotalInvestorsCount() >= IDSComplianceConfigurationService(_services[COMPLIANCE_CONFIGURATION_SERVICE]).getTotalInvestorsLimit() &&
            balanceOfInvestor(_services, _to) == 0
        ) {
            return (41, ONLY_FULL_TRANSFER);
        }

        if (
            balanceOfInvestor(_services, _from) == _value &&
            !isNewInvestor(_services, _to) &&
            complianceService.getTotalInvestorsCount() <= IDSComplianceConfigurationService(_services[COMPLIANCE_CONFIGURATION_SERVICE]).getMinimumTotalInvestors()
        ) {
            return (71, NOT_ENOUGH_INVESTORS);
        }

        if (
            IDSWalletManager(_services[WALLET_MANAGER]).getWalletType(_from) != IDSWalletManager(_services[WALLET_MANAGER]).PLATFORM() &&
            fromInvestorBalance.sub(_value) < IDSComplianceConfigurationService(_services[COMPLIANCE_CONFIGURATION_SERVICE]).getMinimumHoldingsPerInvestor()
        ) {
            return (51, AMOUNT_OF_TOKENS_UNDER_MIN);
        }

        if (
            IDSWalletManager(_services[WALLET_MANAGER]).getWalletType(_to) != IDSWalletManager(_services[WALLET_MANAGER]).PLATFORM() &&
            balanceOfInvestor(_services, _to).add(_value) < IDSComplianceConfigurationService(_services[COMPLIANCE_CONFIGURATION_SERVICE]).getMinimumHoldingsPerInvestor()
        ) {
            return (51, AMOUNT_OF_TOKENS_UNDER_MIN);
        }

        if (
            IDSComplianceConfigurationService(_services[COMPLIANCE_CONFIGURATION_SERVICE]).getMaximumHoldingsPerInvestor() != 0 &&
            balanceOfInvestor(_services, _to).add(_value) > IDSComplianceConfigurationService(_services[COMPLIANCE_CONFIGURATION_SERVICE]).getMaximumHoldingsPerInvestor()
        ) {
            return (52, AMOUNT_OF_TOKENS_ABOVE_MAX);
        }

        return (0, VALID);
    }

    function preIssuanceCheck(address[] memory _services, address _to, uint256 _value) public view returns (uint256 code, string memory reason) {
        ComplianceServiceRegulated complianceService = ComplianceServiceRegulated(_services[COMPLIANCE_SERVICE]);
        IDSComplianceConfigurationService complianceConfigurationService = IDSComplianceConfigurationService(_services[COMPLIANCE_CONFIGURATION_SERVICE]);
        IDSWalletManager walletManager = IDSWalletManager(_services[WALLET_MANAGER]);
        string memory toInvestor = IDSRegistryService(_services[REGISTRY_SERVICE]).getInvestor(_to);
        string memory toCountry = IDSRegistryService(_services[REGISTRY_SERVICE]).getCountry(toInvestor);
        uint256 toRegion = complianceConfigurationService.getCountryCompliance(toCountry);

        if (toRegion == FORBIDDEN) {
            return (26, DESTINATION_RESTRICTED);
        }

        if (isNewInvestor(_services, _to)) {
            // verify global non accredited limit
            if (!isAccredited(_services, _to)) {
                if (
                    complianceConfigurationService.getNonAccreditedInvestorsLimit() != 0 &&
                    complianceService.getTotalInvestorsCount().sub(complianceService.getAccreditedInvestorsCount()) >=
                    complianceConfigurationService.getNonAccreditedInvestorsLimit()
                ) {
                    return (40, MAX_INVESTORS_IN_CATEGORY);
                }
            }
            // verify global investors limit
            if (
                complianceConfigurationService.getTotalInvestorsLimit() != 0 &&
                complianceService.getTotalInvestorsCount() >= complianceConfigurationService.getTotalInvestorsLimit()
            ) {
                return (40, MAX_INVESTORS_IN_CATEGORY);
            }

            if (toRegion == US) {
                // verify US investors limit is not exceeded
                if (complianceConfigurationService.getUsInvestorsLimit() != 0 && complianceService.getUSInvestorsCount() >= complianceConfigurationService.getUsInvestorsLimit()) {
                    return (40, MAX_INVESTORS_IN_CATEGORY);
                }
                // verify accredited US limit is not exceeded
                if (
                    complianceConfigurationService.getUsAccreditedInvestorsLimit() != 0 &&
                    isAccredited(_services, _to) &&
                    complianceService.getUSAccreditedInvestorsCount() >= complianceConfigurationService.getUsAccreditedInvestorsLimit()
                ) {
                    return (40, MAX_INVESTORS_IN_CATEGORY);
                }

            } else if (toRegion == EU) {
                if (isRetail(_services, _to) && complianceService.getEURetailInvestorsCount(getCountry(_services, _to)) >= complianceConfigurationService.getEuRetailLimit()) {
                    return (40, MAX_INVESTORS_IN_CATEGORY);
                }
            }
        }

        if (
            walletManager.getWalletType(_to) != walletManager.PLATFORM() &&
            balanceOfInvestor(_services, _to).add(_value) < complianceConfigurationService.getMinimumHoldingsPerInvestor()
        ) {
            return (51, AMOUNT_OF_TOKENS_UNDER_MIN);
        }
        if (
            complianceConfigurationService.getMaximumHoldingsPerInvestor() != 0 &&
            balanceOfInvestor(_services, _to).add(_value) > complianceConfigurationService.getMaximumHoldingsPerInvestor()
        ) {
            return (52, AMOUNT_OF_TOKENS_ABOVE_MAX);
        }

        return (0, VALID);
    }

    function omnibusWalletAdditionalTrasferChecks(address[] memory _services, address _from, address _to, uint256 _value, bool _isDeposit)
        public
        view
        returns (uint256 code, string memory reason)
    {
        ComplianceServiceRegulated complianceService = ComplianceServiceRegulated(_services[COMPLIANCE_SERVICE]);

        if (!complianceService.checkWhitelisted(_to)) {
            return (20, WALLET_NOT_IN_REGISTRY_SERVICE);
        }

        // No need to further check conditions when withdrawing funds
        if (!_isDeposit) {
            return (0, VALID);
        }

        if (
            IDSWalletManager(_services[WALLET_MANAGER]).getWalletType(_from) != IDSWalletManager(_services[WALLET_MANAGER]).PLATFORM() &&
            IDSLockManager(_services[LOCK_MANAGER]).getTransferableTokens(_from, uint64(now)) < _value
        ) {
            return (16, TOKENS_LOCKED);
        }

        if (getCountryCompliance(_services, _from) == US) {
            if (
                complianceService.getComplianceTransferableTokens(
                    _from,
                    uint64(now),
                    uint64(IDSComplianceConfigurationService(_services[COMPLIANCE_CONFIGURATION_SERVICE]).getUsLockPeriod())
                ) <
                _value
            ) {
                return (32, HOLD_UP_1Y);
            }
        } else {
            if (
                IDSWalletManager(_services[WALLET_MANAGER]).getWalletType(_from) != IDSWalletManager(_services[WALLET_MANAGER]).PLATFORM() &&
                complianceService.getComplianceTransferableTokens(
                    _from,
                    uint64(now),
                    uint64(IDSComplianceConfigurationService(_services[COMPLIANCE_CONFIGURATION_SERVICE]).getNonUsLockPeriod())
                ) <
                _value
            ) {
                return (33, HOLD_UP);
            }
        }

        return (0, VALID);
    }

    function getToken(IDSServiceConsumer _service) public view returns (IDSToken) {
        return IDSToken(_service.getDSService(_service.DS_TOKEN()));
    }

    function getTrustService(IDSServiceConsumer _service) public view returns (IDSTrustService) {
        return IDSTrustService(_service.getDSService(_service.TRUST_SERVICE()));
    }

    function getWalletManager(IDSServiceConsumer _service) public view returns (IDSWalletManager) {
        return IDSWalletManager(_service.getDSService(_service.WALLET_MANAGER()));
    }

    function getLockManager(IDSServiceConsumer _service) public view returns (IDSLockManager) {
        return IDSLockManager(_service.getDSService(_service.LOCK_MANAGER()));
    }

    function getComplianceService(IDSServiceConsumer _service) public view returns (IDSComplianceService) {
        return IDSComplianceService(_service.getDSService(_service.COMPLIANCE_SERVICE()));
    }

    function getRegistryService(IDSServiceConsumer _service) public view returns (IDSRegistryService) {
        return IDSRegistryService(_service.getDSService(_service.REGISTRY_SERVICE()));
    }

    function getComplianceConfigurationService(IDSServiceConsumer _service) public view returns (IDSComplianceConfigurationService) {
        return IDSComplianceConfigurationService(_service.getDSService(_service.COMPLIANCE_CONFIGURATION_SERVICE()));
    }
}

/**
*   @title Concrete compliance service for tokens with regulation
*
*/

contract ComplianceServiceRegulated is ComplianceServiceWhitelisted {
    function initialize() public initializer onlyFromProxy {
        super.initialize();
        VERSIONS.push(5);
    }

    function recordBurn(address _who, uint256 _value) internal returns (bool) {
        if (_value != 0 && getToken().balanceOfInvestor(getRegistryService().getInvestor(_who)) == _value) {
            adjustTotalInvestorsCounts(_who, false);
        }

        return true;
    }

    function recordSeize(
        address _from,
        address, /*_to*/
        uint256 _value
    ) internal returns (bool) {
        if (_value != 0 && getToken().balanceOfInvestor(getRegistryService().getInvestor(_from)) == _value) {
            adjustTotalInvestorsCounts(_from, false);
        }

        return true;
    }

    function adjustInvestorCountsAfterCountryChange(string memory _id, string memory _country, string memory _prevCountry) public onlyRegistry returns (bool) {
        if (getToken().balanceOfInvestor(_id) == 0) {
            return false;
        }

        adjustInvestorsCountsByCountry(_prevCountry, _id, false);
        adjustInvestorsCountsByCountry(_country, _id, true);

        return true;
    }

    function adjustTotalInvestorsCounts(address _wallet, bool _increase) internal {
        if (getWalletManager().getWalletType(_wallet) == getWalletManager().NONE()) {
            totalInvestors = _increase ? totalInvestors.add(1) : totalInvestors.sub(1);

            string memory id = getRegistryService().getInvestor(_wallet);
            string memory country = getRegistryService().getCountry(id);

            adjustInvestorsCountsByCountry(country, id, _increase);
        }
    }

    function adjustInvestorsCountsByCountry(string memory _country, string memory _id, bool _increase) internal {
        uint256 countryCompliance = getComplianceConfigurationService().getCountryCompliance(_country);

        if (getRegistryService().getAttributeValue(_id, getRegistryService().ACCREDITED()) == getRegistryService().APPROVED()) {
            accreditedInvestorsCount = _increase ? accreditedInvestorsCount.add(1) : accreditedInvestorsCount.sub(1);

            if (countryCompliance == US) {
                usAccreditedInvestorsCount = _increase ? usAccreditedInvestorsCount.add(1) : usAccreditedInvestorsCount.sub(1);
            }
        }

        if (countryCompliance == US) {
            usInvestorsCount = _increase ? usInvestorsCount.add(1) : usInvestorsCount.sub(1);
        } else if (countryCompliance == EU && getRegistryService().getAttributeValue(_id, getRegistryService().QUALIFIED()) != getRegistryService().APPROVED()) {
            euRetailInvestorsCount[_country] = _increase ? euRetailInvestorsCount[_country].add(1) : euRetailInvestorsCount[_country].sub(1);
        }
    }

    function adjustOmnibusCounts(bool _increase) internal {
        totalInvestors = _increase ? totalInvestors.add(1) : totalInvestors.sub(1);
        accreditedInvestorsCount = _increase ? accreditedInvestorsCount.add(1) : accreditedInvestorsCount.sub(1);
    }

    function createIssuanceInformation(string memory _investor, uint256 _value, uint256 _issuanceTime) internal returns (bool) {
        uint256 issuancesCount = issuancesCounters[_investor];

        issuancesValues[_investor][issuancesCount] = _value;
        issuancesTimestamps[_investor][issuancesCount] = _issuanceTime;
        issuancesCounters[_investor] = issuancesCount.add(1);

        return true;
    }

    function recordIssuance(address _to, uint256 _value, uint256 _issuanceTime) internal returns (bool) {
        if (_value != 0 && getToken().balanceOfInvestor(getRegistryService().getInvestor(_to)) == 0) {
            adjustTotalInvestorsCounts(_to, true);
        }

        require(createIssuanceInformation(getRegistryService().getInvestor(_to), _value, _issuanceTime));

        return true;
    }

    function preTransferCheck(address _from, address _to, uint256 _value) public view returns (uint256 code, string memory reason) {
        address[] memory services = new address[](6);

        services[0] = getDSService(DS_TOKEN);
        services[1] = getDSService(REGISTRY_SERVICE);
        services[2] = getDSService(WALLET_MANAGER);
        services[3] = getDSService(COMPLIANCE_CONFIGURATION_SERVICE);
        services[4] = getDSService(LOCK_MANAGER);
        services[5] = address(this);

        (code, reason) = ComplianceServiceLibrary.preTransferCheck(services, _from, _to, _value);

        if (code != 0) {
            return (code, reason);
        } else {
            return checkTransfer(_from, _to, _value);
        }
    }

    function getComplianceTransferableTokens(address _who, uint64 _time, uint64 _lockTime) public view returns (uint256) {
        require(_time != 0, "time must be greater than zero");

        string memory investor = getRegistryService().getInvestor(_who);

        uint256 balanceOfHolder = getLockManager().getTransferableTokens(_who, _time);

        uint256 holderIssuancesCount = issuancesCounters[investor];

        //No locks, go to base class implementation
        if (holderIssuancesCount == 0) {
            return balanceOfHolder;
        }

        uint256 totalLockedTokens = 0;
        for (uint256 i = 0; i < holderIssuancesCount; i++) {
            uint256 issuanceTimestamp = issuancesTimestamps[investor][i];

            if (_lockTime > _time || issuanceTimestamp > SafeMath.sub(_time, _lockTime)) {
                totalLockedTokens = totalLockedTokens.add(issuancesValues[investor][i]);
            }
        }

        //there may be more locked tokens than actual tokens, so the minimum between the two
        uint256 transferable = SafeMath.sub(balanceOfHolder, Math.min(totalLockedTokens, balanceOfHolder));

        return transferable;
    }

    function preIssuanceCheck(address _to, uint256 _value) public view returns (uint256 code, string memory reason) {
        address[] memory services = new address[](6);
        services[0] = getDSService(DS_TOKEN);
        services[1] = getDSService(REGISTRY_SERVICE);
        services[2] = getDSService(WALLET_MANAGER);
        services[3] = getDSService(COMPLIANCE_CONFIGURATION_SERVICE);
        services[4] = getDSService(LOCK_MANAGER);
        services[5] = address(this);

        if (!checkWhitelisted(_to)) {
            return (20, WALLET_NOT_IN_REGISTRY_SERVICE);
        }

        return ComplianceServiceLibrary.preIssuanceCheck(services, _to, _value);
    }

    function recordTransfer(address _from, address _to, uint256 _value) internal returns (bool) {
        if (_value != 0 && getToken().balanceOfInvestor(getRegistryService().getInvestor(_from)) == _value) {
            if (getWalletManager().getWalletType(_to) == getWalletManager().OMNIBUS()) {
                if (getOmnibusWalletService().getWalletAssetTrackingMode(_to) == getOmnibusWalletService().HOLDER_OF_RECORD()) {
                    adjustTotalInvestorsCounts(_from, false);
                }
            } else if (getWalletManager().getWalletType(_from) == getWalletManager().OMNIBUS()) {
                if (getOmnibusWalletService().getWalletAssetTrackingMode(_from) == getOmnibusWalletService().HOLDER_OF_RECORD()) {
                    adjustOmnibusCounts(false);
                }
            } else {
                adjustTotalInvestorsCounts(_from, false);
            }
        }

        if (_value != 0 && getToken().balanceOfInvestor(getRegistryService().getInvestor(_to)) == 0) {
            if (getWalletManager().getWalletType(_to) == getWalletManager().OMNIBUS()) {
                if (getOmnibusWalletService().getWalletAssetTrackingMode(_to) == getOmnibusWalletService().HOLDER_OF_RECORD()) {
                    adjustOmnibusCounts(true);
                }
            } else {
                adjustTotalInvestorsCounts(_to, true);
            }
        }

        return true;
    }

    function checkTransfer(address, address, uint256) internal view returns (uint256, string memory) {
        return (0, VALID);
    }

    function getTotalInvestorsCount() public view returns (uint256) {
        return totalInvestors;
    }

    function getUSInvestorsCount() public view returns (uint256) {
        return usInvestorsCount;
    }

    function getUSAccreditedInvestorsCount() public view returns (uint256) {
        return usAccreditedInvestorsCount;
    }

    function getAccreditedInvestorsCount() public view returns (uint256) {
        return accreditedInvestorsCount;
    }

    function getEURetailInvestorsCount(string memory _country) public view returns (uint256) {
        return euRetailInvestorsCount[_country];
    }

    function setTotalInvestorsCount(uint256 _value) public onlyMaster returns (bool) {
        totalInvestors = _value;

        return true;
    }

    function setUSInvestorsCount(uint256 _value) public onlyMaster returns (bool) {
        usInvestorsCount = _value;

        return true;
    }

    function setUSAccreditedInvestorsCount(uint256 _value) public onlyMaster returns (bool) {
        usAccreditedInvestorsCount = _value;

        return true;
    }

    function setAccreditedInvestorsCount(uint256 _value) public onlyMaster returns (bool) {
        accreditedInvestorsCount = _value;

        return true;
    }

    function setEuRetailInvestorsCount(string memory _country, uint256 _value) public onlyMaster returns (bool) {
        euRetailInvestorsCount[_country] = _value;

        return true;
    }
}
