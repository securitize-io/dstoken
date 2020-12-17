pragma solidity 0.5.17;

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
    uint256 internal constant JP = 8;
    string internal constant TOKEN_PAUSED = "Token paused";
    string internal constant NOT_ENOUGH_TOKENS = "Not enough tokens";
    string internal constant VALID = "Valid";
    string internal constant TOKENS_LOCKED = "Tokens locked";
    string internal constant ONLY_FULL_TRANSFER = "Only full transfer";
    string internal constant FLOWBACK = "Flowback";
    string internal constant WALLET_NOT_IN_REGISTRY_SERVICE = "Wallet not in registry service";
    string internal constant AMOUNT_OF_TOKENS_UNDER_MIN = "Amount of tokens under min";
    string internal constant AMOUNT_OF_TOKENS_ABOVE_MAX = "Amount of tokens above max";
    string internal constant HOLD_UP = "Hold-up";
    string internal constant HOLD_UP_1Y = "Hold-up 1y";
    string internal constant DESTINATION_RESTRICTED = "Destination restricted";
    string internal constant MAX_INVESTORS_IN_CATEGORY = "Max investors in category";
    string internal constant ONLY_ACCREDITED = "Only accredited";
    string internal constant ONLY_US_ACCREDITED = "Only us accredited";
    string internal constant NOT_ENOUGH_INVESTORS = "Not enough investors";
    string internal constant OMNIBUS_TO_OMNIBUS_TRANSFER = "Omnibus to omnibus transfer";
    // Special wallets constants
    uint8 public constant WALLET_TYPE_NONE = 0;
    uint8 public constant WALLET_TYPE_ISSUER = 1;
    uint8 public constant WALLET_TYPE_PLATFORM = 2;
    uint8 public constant WALLET_TYPE_EXCHANGE = 4;

    using SafeMath for uint256;

    function isRetail(address[] memory _services, address _wallet) internal view returns (bool) {
        IDSRegistryService registry = IDSRegistryService(_services[REGISTRY_SERVICE]);

        return registry.getAttributeValue(registry.getInvestor(_wallet), registry.QUALIFIED()) != registry.APPROVED();
    }

    function isAccredited(address[] memory _services, address _wallet) internal view returns (bool) {
        IDSRegistryService registry = IDSRegistryService(_services[REGISTRY_SERVICE]);

        return registry.getAttributeValue(registry.getInvestor(_wallet), registry.ACCREDITED()) == registry.APPROVED();
    }

    function balanceOfInvestor(address[] memory _services, address _wallet) internal view returns (uint256) {
        IDSRegistryService registry = IDSRegistryService(_services[REGISTRY_SERVICE]);
        IDSToken token = IDSToken(_services[DS_TOKEN]);

        return token.balanceOfInvestor(registry.getInvestor(_wallet));
    }

    function isNewInvestor(address[] memory _services, address _wallet) internal view returns (bool) {
        IDSRegistryService registryService = IDSRegistryService(_services[REGISTRY_SERVICE]);

        // Return whether this investor has 0 balance and is not an omnibus wallet in BENEFICIARY mode (which is not considered an investor)
        return balanceOfInvestor(_services, _wallet) == 0 && !(registryService.isOmnibusWallet(_wallet) && !registryService.getOmnibusWalletController(_wallet).isHolderOfRecord());
    }

    function getCountry(address[] memory _services, address _wallet) internal view returns (string memory) {
        IDSRegistryService registry = IDSRegistryService(_services[REGISTRY_SERVICE]);

        return registry.getCountry(registry.getInvestor(_wallet));
    }

    function getCountryCompliance(address[] memory _services, address _wallet) internal view returns (uint256) {
        return IDSComplianceConfigurationService(_services[COMPLIANCE_CONFIGURATION_SERVICE]).getCountryCompliance(getCountry(_services, _wallet));
    }

    function getUSInvestorsLimit(address[] memory _services) internal view returns (uint256) {
        ComplianceServiceRegulated complianceService = ComplianceServiceRegulated(_services[COMPLIANCE_SERVICE]);
        IDSComplianceConfigurationService compConfService = IDSComplianceConfigurationService(_services[COMPLIANCE_CONFIGURATION_SERVICE]);

        if (compConfService.getMaxUSInvestorsPercentage() == 0) {
            return compConfService.getUSInvestorsLimit();
        }

        if (compConfService.getUSInvestorsLimit() == 0) {
            return compConfService.getMaxUSInvestorsPercentage().mul(complianceService.getTotalInvestorsCount()).div(100);
        }

        return Math.min(compConfService.getUSInvestorsLimit(), compConfService.getMaxUSInvestorsPercentage().mul(complianceService.getTotalInvestorsCount()).div(100));
    }

    function isBeneficiaryDepositOrWithdrawl(
        IDSRegistryService _registryService,
        address _from,
        address _to
    ) public view returns (bool) {
        return
            (_registryService.isOmnibusWallet(_from) && !_registryService.getOmnibusWalletController(_from).isHolderOfRecord()) ||
            (_registryService.isOmnibusWallet(_to) && !_registryService.getOmnibusWalletController(_to).isHolderOfRecord());
    }

    function isHolderOfRecordInternalTransfer(address[] memory _services, address _omnibusWallet) internal view returns (bool) {
        IDSRegistryService registryService = IDSRegistryService(_services[REGISTRY_SERVICE]);

        return registryService.isOmnibusWallet(_omnibusWallet) && registryService.getOmnibusWalletController(_omnibusWallet).isHolderOfRecord();
    }

    function isOmnibusTransfer(
        address[] memory _services,
        address _from,
        address _to
    ) internal view returns (bool) {
        IDSRegistryService registryService = IDSRegistryService(_services[REGISTRY_SERVICE]);

        return registryService.isOmnibusWallet(_from) || registryService.isOmnibusWallet(_to);
    }

    function isOmnibusInternalTransfer(address _omnibusWallet) internal pure returns (bool) {
        return _omnibusWallet != address(0);
    }

    function checkHoldUp(
        address[] memory _services,
        address _omnibusWallet,
        address _from,
        uint256 _value,
        bool isUSLockPeriod
    ) internal view returns (bool) {
        ComplianceServiceRegulated complianceService = ComplianceServiceRegulated(_services[COMPLIANCE_SERVICE]);
        uint64 lockPeriod;
        if (isUSLockPeriod) {
            lockPeriod = uint64(IDSComplianceConfigurationService(_services[COMPLIANCE_CONFIGURATION_SERVICE]).getUSLockPeriod());
        } else {
            lockPeriod = uint64(IDSComplianceConfigurationService(_services[COMPLIANCE_CONFIGURATION_SERVICE]).getNonUSLockPeriod());
        }

        return
            !isOmnibusInternalTransfer(_omnibusWallet) &&
            !IDSRegistryService(_services[REGISTRY_SERVICE]).isOmnibusWallet(_from) &&
            IDSWalletManager(_services[WALLET_MANAGER]).getWalletType(_from) != WALLET_TYPE_PLATFORM &&
            complianceService.getComplianceTransferableTokens(_from, uint64(now), lockPeriod) < _value;
    }

    function maxInvestorsInCategoryForNonAccredited(
        address[] memory _services,
        address _from,
        address _to,
        uint256 _value,
        address _omnibusWallet,
        uint256 fromInvestorBalance
    ) internal view returns (bool) {
        return
            IDSComplianceConfigurationService(_services[COMPLIANCE_CONFIGURATION_SERVICE]).getNonAccreditedInvestorsLimit() != 0 &&
            ComplianceServiceRegulated(_services[COMPLIANCE_SERVICE]).getTotalInvestorsCount().sub(
                ComplianceServiceRegulated(_services[COMPLIANCE_SERVICE]).getAccreditedInvestorsCount()
            ) >=
            IDSComplianceConfigurationService(_services[COMPLIANCE_CONFIGURATION_SERVICE]).getNonAccreditedInvestorsLimit() &&
            isNewInvestor(_services, _to) &&
            !isHolderOfRecordInternalTransfer(_services, _omnibusWallet) &&
            (isAccredited(_services, _from) || fromInvestorBalance > _value);
    }

    function preTransferCheck(
        address[] memory _services,
        address _from,
        address _to,
        uint256 _value,
        address _omnibusWallet
    ) public view returns (uint256 code, string memory reason) {
        if (IDSToken(_services[DS_TOKEN]).isPaused()) {
            return (10, TOKEN_PAUSED);
        }

        if (
            (isOmnibusInternalTransfer(_omnibusWallet) && IDSRegistryService(_services[REGISTRY_SERVICE]).getOmnibusWalletController(_omnibusWallet).balanceOf(_from) < _value) ||
            (!isOmnibusInternalTransfer(_omnibusWallet) && IDSToken(_services[DS_TOKEN]).balanceOf(_from) < _value)
        ) {
            return (15, NOT_ENOUGH_TOKENS);
        }

        if (
            !CommonUtils.isEmptyString(IDSRegistryService(_services[REGISTRY_SERVICE]).getInvestor(_from)) &&
            CommonUtils.isEqualString(IDSRegistryService(_services[REGISTRY_SERVICE]).getInvestor(_from), IDSRegistryService(_services[REGISTRY_SERVICE]).getInvestor(_to))
        ) {
            return (0, VALID);
        }

        bool isFromOmnibusWallet = IDSRegistryService(_services[REGISTRY_SERVICE]).isOmnibusWallet(_from);

        if (!isOmnibusInternalTransfer(_omnibusWallet) && isFromOmnibusWallet && IDSRegistryService(_services[REGISTRY_SERVICE]).isOmnibusWallet(_to)) {
            return (81, OMNIBUS_TO_OMNIBUS_TRANSFER);
        }

        uint256 fromInvestorBalance = balanceOfInvestor(_services, _from);

        if (IDSWalletManager(_services[WALLET_MANAGER]).getWalletType(_to) == WALLET_TYPE_PLATFORM) {
            if (
                (IDSComplianceConfigurationService(_services[COMPLIANCE_CONFIGURATION_SERVICE]).getForceFullTransfer() ||
                IDSComplianceConfigurationService(_services[COMPLIANCE_CONFIGURATION_SERVICE]).getWorldWideForceFullTransfer()) &&
                fromInvestorBalance > _value &&
                !isOmnibusTransfer(_services, _from, _to) &&
                !isOmnibusInternalTransfer(_omnibusWallet)
            ) {
                return (50, ONLY_FULL_TRANSFER);
            }

            return (0, VALID);
        }

        if (
            !isOmnibusInternalTransfer(_omnibusWallet) &&
            !isFromOmnibusWallet &&
            IDSWalletManager(_services[WALLET_MANAGER]).getWalletType(_from) != WALLET_TYPE_PLATFORM &&
            IDSLockManager(_services[LOCK_MANAGER]).getTransferableTokens(_from, uint64(now)) < _value
        ) {
            return (16, TOKENS_LOCKED);
        }

        if (!ComplianceServiceRegulated(_services[COMPLIANCE_SERVICE]).checkWhitelisted(_to)) {
            return (20, WALLET_NOT_IN_REGISTRY_SERVICE);
        }

        uint256 fromRegion = getCountryCompliance(_services, _from);
        uint256 toRegion = getCountryCompliance(_services, _to);

        bool isNotBeneficiaryOrHolderOfRecord = !isBeneficiaryDepositOrWithdrawl(IDSRegistryService(_services[REGISTRY_SERVICE]), _from, _to) &&
            !isHolderOfRecordInternalTransfer(_services, _omnibusWallet);

        if (fromRegion == US) {
            if (checkHoldUp(_services, _omnibusWallet, _from, _value, true)) {
                return (32, HOLD_UP_1Y);
            }

            if (
                isNotBeneficiaryOrHolderOfRecord &&
                fromInvestorBalance > _value &&
                fromInvestorBalance.sub(_value) < IDSComplianceConfigurationService(_services[COMPLIANCE_CONFIGURATION_SERVICE]).getMinUSTokens()
            ) {
                return (51, AMOUNT_OF_TOKENS_UNDER_MIN);
            }

            if (
                IDSComplianceConfigurationService(_services[COMPLIANCE_CONFIGURATION_SERVICE]).getForceFullTransfer() &&
                fromInvestorBalance > _value &&
                !isOmnibusTransfer(_services, _from, _to) &&
                !isOmnibusInternalTransfer(_omnibusWallet)
            ) {
                return (50, ONLY_FULL_TRANSFER);
            }
        } else {
            if (checkHoldUp(_services, _omnibusWallet, _from, _value, false)) {
                return (33, HOLD_UP);
            }

            if (
                !isOmnibusInternalTransfer(_omnibusWallet) &&
                !isFromOmnibusWallet &&
                toRegion == US &&
                IDSWalletManager(_services[WALLET_MANAGER]).getWalletType(_from) != WALLET_TYPE_PLATFORM &&
                (IDSComplianceConfigurationService(_services[COMPLIANCE_CONFIGURATION_SERVICE]).getBlockFlowbackEndTime() == 0 ||
                    IDSComplianceConfigurationService(_services[COMPLIANCE_CONFIGURATION_SERVICE]).getBlockFlowbackEndTime() > now)
            ) {
                return (25, FLOWBACK);
            }

            if(
                IDSComplianceConfigurationService(_services[COMPLIANCE_CONFIGURATION_SERVICE]).getWorldWideForceFullTransfer()
            ) {
                return (50, ONLY_FULL_TRANSFER);
            }

            if (
                IDSComplianceConfigurationService(_services[COMPLIANCE_CONFIGURATION_SERVICE]).getWorldWideForceFullTransfer() &&
                fromInvestorBalance > _value &&
                !isOmnibusTransfer(_services, _from, _to) &&
                !isOmnibusInternalTransfer(_omnibusWallet)
            ) {
                return (50, ONLY_FULL_TRANSFER);
            }
        }

        if (toRegion == FORBIDDEN) {
            return (26, DESTINATION_RESTRICTED);
        }

        uint256 toInvestorBalance = balanceOfInvestor(_services, _to);
        string memory toCountry = getCountry(_services, _to);

        if (fromRegion == EU && isNotBeneficiaryOrHolderOfRecord) {
            if (fromInvestorBalance.sub(_value) < IDSComplianceConfigurationService(_services[COMPLIANCE_CONFIGURATION_SERVICE]).getMinEUTokens() && fromInvestorBalance > _value) {
                return (51, AMOUNT_OF_TOKENS_UNDER_MIN);
            }
        }

        if (
            IDSComplianceConfigurationService(_services[COMPLIANCE_CONFIGURATION_SERVICE]).getForceAccredited() && !isAccredited(_services, _to) && isNotBeneficiaryOrHolderOfRecord
        ) {
            return (61, ONLY_ACCREDITED);
        }

        if (toRegion == JP) {
            if (
                IDSComplianceConfigurationService(_services[COMPLIANCE_CONFIGURATION_SERVICE]).getJPInvestorsLimit() != 0 &&
                ComplianceServiceRegulated(_services[COMPLIANCE_SERVICE]).getJPInvestorsCount() >=
                IDSComplianceConfigurationService(_services[COMPLIANCE_CONFIGURATION_SERVICE]).getJPInvestorsLimit() &&
                isNewInvestor(_services, _to) &&
                !isHolderOfRecordInternalTransfer(_services, _omnibusWallet) &&
                (!CommonUtils.isEqualString(getCountry(_services, _from), toCountry) || (fromInvestorBalance > _value))
            ) {
                return (40, MAX_INVESTORS_IN_CATEGORY);
            }
        } else if (toRegion == EU) {
            if (
                isRetail(_services, _to) &&
                ComplianceServiceRegulated(_services[COMPLIANCE_SERVICE]).getEURetailInvestorsCount(toCountry) >=
                IDSComplianceConfigurationService(_services[COMPLIANCE_CONFIGURATION_SERVICE]).getEURetailInvestorsLimit() &&
                isNewInvestor(_services, _to) &&
                !isHolderOfRecordInternalTransfer(_services, _omnibusWallet) &&
                (!CommonUtils.isEqualString(getCountry(_services, _from), toCountry) || (fromInvestorBalance > _value && isRetail(_services, _from)))
            ) {
                return (40, MAX_INVESTORS_IN_CATEGORY);
            }

            if (
                isNotBeneficiaryOrHolderOfRecord && toInvestorBalance.add(_value) < IDSComplianceConfigurationService(_services[COMPLIANCE_CONFIGURATION_SERVICE]).getMinEUTokens()
            ) {
                return (51, AMOUNT_OF_TOKENS_UNDER_MIN);
            }
        } else if (toRegion == US) {
            if (
                IDSComplianceConfigurationService(_services[COMPLIANCE_CONFIGURATION_SERVICE]).getForceAccreditedUS() &&
                !isAccredited(_services, _to) &&
                isNotBeneficiaryOrHolderOfRecord
            ) {
                return (62, ONLY_US_ACCREDITED);
            }

            uint256 usInvestorsLimit = getUSInvestorsLimit(_services);
            if (
                usInvestorsLimit != 0 &&
                fromInvestorBalance > _value &&
                ComplianceServiceRegulated(_services[COMPLIANCE_SERVICE]).getUSInvestorsCount() >= usInvestorsLimit &&
                isNewInvestor(_services, _to) &&
                !isHolderOfRecordInternalTransfer(_services, _omnibusWallet)
            ) {
                return (40, MAX_INVESTORS_IN_CATEGORY);
            }

            if (
                IDSComplianceConfigurationService(_services[COMPLIANCE_CONFIGURATION_SERVICE]).getUSAccreditedInvestorsLimit() != 0 &&
                isAccredited(_services, _to) &&
                ComplianceServiceRegulated(_services[COMPLIANCE_SERVICE]).getUSAccreditedInvestorsCount() >=
                IDSComplianceConfigurationService(_services[COMPLIANCE_CONFIGURATION_SERVICE]).getUSAccreditedInvestorsLimit() &&
                isNewInvestor(_services, _to) &&
                !isHolderOfRecordInternalTransfer(_services, _omnibusWallet) &&
                (fromRegion != US || !isAccredited(_services, _from) || fromInvestorBalance > _value)
            ) {
                return (40, MAX_INVESTORS_IN_CATEGORY);
            }

            if (
                isNotBeneficiaryOrHolderOfRecord && toInvestorBalance.add(_value) < IDSComplianceConfigurationService(_services[COMPLIANCE_CONFIGURATION_SERVICE]).getMinUSTokens()
            ) {
                return (51, AMOUNT_OF_TOKENS_UNDER_MIN);
            }
        }

        if (!isAccredited(_services, _to)) {
            if (maxInvestorsInCategoryForNonAccredited(_services, _from, _to, _value, _omnibusWallet, fromInvestorBalance)) {
                return (40, MAX_INVESTORS_IN_CATEGORY);
            }
        }

        if (
            IDSComplianceConfigurationService(_services[COMPLIANCE_CONFIGURATION_SERVICE]).getTotalInvestorsLimit() != 0 &&
            fromInvestorBalance > _value &&
            ComplianceServiceRegulated(_services[COMPLIANCE_SERVICE]).getTotalInvestorsCount() >=
            IDSComplianceConfigurationService(_services[COMPLIANCE_CONFIGURATION_SERVICE]).getTotalInvestorsLimit() &&
            isNewInvestor(_services, _to) &&
            !isHolderOfRecordInternalTransfer(_services, _omnibusWallet)
        ) {
            return (40, MAX_INVESTORS_IN_CATEGORY);
        }

        if (
            isNotBeneficiaryOrHolderOfRecord &&
            fromInvestorBalance == _value &&
            !isNewInvestor(_services, _to) &&
            ComplianceServiceRegulated(_services[COMPLIANCE_SERVICE]).getTotalInvestorsCount() <=
            IDSComplianceConfigurationService(_services[COMPLIANCE_CONFIGURATION_SERVICE]).getMinimumTotalInvestors()
        ) {
            return (71, NOT_ENOUGH_INVESTORS);
        }

        if (
            isNotBeneficiaryOrHolderOfRecord &&
            IDSWalletManager(_services[WALLET_MANAGER]).getWalletType(_from) != WALLET_TYPE_PLATFORM &&
            fromInvestorBalance.sub(_value) < IDSComplianceConfigurationService(_services[COMPLIANCE_CONFIGURATION_SERVICE]).getMinimumHoldingsPerInvestor() &&
            fromInvestorBalance > _value
        ) {
            return (51, AMOUNT_OF_TOKENS_UNDER_MIN);
        }

        if (
            isNotBeneficiaryOrHolderOfRecord &&
            IDSWalletManager(_services[WALLET_MANAGER]).getWalletType(_to) != WALLET_TYPE_PLATFORM &&
            toInvestorBalance.add(_value) < IDSComplianceConfigurationService(_services[COMPLIANCE_CONFIGURATION_SERVICE]).getMinimumHoldingsPerInvestor()
        ) {
            return (51, AMOUNT_OF_TOKENS_UNDER_MIN);
        }

        if (
            isNotBeneficiaryOrHolderOfRecord &&
            IDSComplianceConfigurationService(_services[COMPLIANCE_CONFIGURATION_SERVICE]).getMaximumHoldingsPerInvestor() != 0 &&
            toInvestorBalance.add(_value) > IDSComplianceConfigurationService(_services[COMPLIANCE_CONFIGURATION_SERVICE]).getMaximumHoldingsPerInvestor()
        ) {
            return (52, AMOUNT_OF_TOKENS_ABOVE_MAX);
        }

        return (0, VALID);
    }

    function preIssuanceCheck(
        address[] memory _services,
        address _to,
        uint256 _value
    ) public view returns (uint256 code, string memory reason) {
        ComplianceServiceRegulated complianceService = ComplianceServiceRegulated(_services[COMPLIANCE_SERVICE]);
        IDSComplianceConfigurationService complianceConfigurationService = IDSComplianceConfigurationService(_services[COMPLIANCE_CONFIGURATION_SERVICE]);
        IDSWalletManager walletManager = IDSWalletManager(_services[WALLET_MANAGER]);
        string memory toCountry = IDSRegistryService(_services[REGISTRY_SERVICE]).getCountry(IDSRegistryService(_services[REGISTRY_SERVICE]).getInvestor(_to));
        uint256 toRegion = complianceConfigurationService.getCountryCompliance(toCountry);

        if (toRegion == FORBIDDEN) {
            return (26, DESTINATION_RESTRICTED);
        }

        if (!complianceService.checkWhitelisted(_to)) {
            return (20, WALLET_NOT_IN_REGISTRY_SERVICE);
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
                if (complianceConfigurationService.getUSInvestorsLimit() != 0 && complianceService.getUSInvestorsCount() >= complianceConfigurationService.getUSInvestorsLimit()) {
                    return (40, MAX_INVESTORS_IN_CATEGORY);
                }
                // verify accredited US limit is not exceeded
                if (
                    complianceConfigurationService.getUSAccreditedInvestorsLimit() != 0 &&
                    isAccredited(_services, _to) &&
                    complianceService.getUSAccreditedInvestorsCount() >= complianceConfigurationService.getUSAccreditedInvestorsLimit()
                ) {
                    return (40, MAX_INVESTORS_IN_CATEGORY);
                }
            } else if (toRegion == EU) {
                if (
                    isRetail(_services, _to) &&
                    complianceService.getEURetailInvestorsCount(getCountry(_services, _to)) >= complianceConfigurationService.getEURetailInvestorsLimit()
                ) {
                    return (40, MAX_INVESTORS_IN_CATEGORY);
                }
            } else if (toRegion == JP) {
                if (complianceConfigurationService.getJPInvestorsLimit() != 0 && complianceService.getJPInvestorsCount() >= complianceConfigurationService.getJPInvestorsLimit()) {
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
}

/**
 *   @title Concrete compliance service for tokens with regulation
 *
 */

contract ComplianceServiceRegulated is ComplianceServiceWhitelisted {
    function initialize() public initializer forceInitializeFromProxy {
        super.initialize();
        VERSIONS.push(8);
    }

    function compareInvestorBalance(
        address _who,
        uint256 _value,
        uint256 _compareTo
    ) internal view returns (bool) {
        return (_value != 0 && getToken().balanceOfInvestor(getRegistryService().getInvestor(_who)) == _compareTo);
    }

    function recordTransfer(
        address _from,
        address _to,
        uint256 _value
    ) internal returns (bool) {
        if (compareInvestorBalance(_from, _value, _value)) {
            adjustTransferCounts(_from, _to, CommonUtils.IncDec.Decrease);
        }

        if (compareInvestorBalance(_to, _value, 0)) {
            adjustTransferCounts(_to, _from, CommonUtils.IncDec.Increase);
        }

        return true;
    }

    function adjustTransferCounts(
        address _from,
        address _to,
        CommonUtils.IncDec _increase
    ) internal {
        if (!ComplianceServiceLibrary.isBeneficiaryDepositOrWithdrawl(getRegistryService(), _from, _to)) {
            adjustTotalInvestorsCounts(_from, _increase);
        }
    }

    function recordIssuance(
        address _to,
        uint256 _value,
        uint256 _issuanceTime
    ) internal returns (bool) {
        if (compareInvestorBalance(_to, _value, 0)) {
            adjustTotalInvestorsCounts(_to, CommonUtils.IncDec.Increase);
        }

        return createIssuanceInformation(getRegistryService().getInvestor(_to), _value, _issuanceTime);
    }

    function recordBurn(address _who, uint256 _value) internal returns (bool) {
        if (compareInvestorBalance(_who, _value, _value)) {
            adjustTotalInvestorsCounts(_who, CommonUtils.IncDec.Decrease);
        }
        return true;
    }

    function recordOmnibusBurn(
        address _omnibusWallet,
        address _who,
        uint256 _value
    ) internal returns (bool) {
        if (getRegistryService().getOmnibusWalletController(_omnibusWallet).isHolderOfRecord()) {
            recordBurn(_omnibusWallet, _value);
        } else {
            recordBurn(_who, _value);
        }

        return true;
    }

    function recordSeize(
        address _from,
        address, /*_to*/
        uint256 _value
    ) internal returns (bool) {
        return recordBurn(_from, _value);
    }

    function recordOmnibusSeize(
        address _omnibusWallet,
        address _from,
        address _to,
        uint256 _value
    ) internal returns (bool) {
        if (getRegistryService().getOmnibusWalletController(_omnibusWallet).isHolderOfRecord()) {
            recordSeize(_omnibusWallet, _to, _value);
        } else {
            recordSeize(_from, _to, _value);
        }
        return true;
    }

    function adjustInvestorCountsAfterCountryChange(
        string memory _id,
        string memory _country,
        string memory _prevCountry
    ) public onlyRegistry returns (bool) {
        if (getToken().balanceOfInvestor(_id) == 0) {
            return false;
        }

        adjustInvestorsCountsByCountry(_prevCountry, _id, CommonUtils.IncDec.Decrease);
        adjustInvestorsCountsByCountry(_country, _id, CommonUtils.IncDec.Increase);

        return true;
    }

    function adjustTotalInvestorsCounts(address _wallet, CommonUtils.IncDec _increase) internal {
        uint8 walletType = getWalletManager().getWalletType(_wallet);

        if (walletType == getWalletManager().NONE()) {
            totalInvestors = _increase == CommonUtils.IncDec.Increase ? totalInvestors.add(1) : totalInvestors.sub(1);

            string memory id = getRegistryService().getInvestor(_wallet);
            string memory country = getRegistryService().getCountry(id);

            adjustInvestorsCountsByCountry(country, id, _increase);
        }
    }

    function adjustInvestorsCountsByCountry(
        string memory _country,
        string memory _id,
        CommonUtils.IncDec _increase
    ) internal {
        uint256 countryCompliance = getComplianceConfigurationService().getCountryCompliance(_country);

        if (getRegistryService().getAttributeValue(_id, getRegistryService().ACCREDITED()) == getRegistryService().APPROVED()) {
            accreditedInvestorsCount = _increase == CommonUtils.IncDec.Increase ? accreditedInvestorsCount.add(1) : accreditedInvestorsCount.sub(1);

            if (countryCompliance == US) {
                usAccreditedInvestorsCount = _increase == CommonUtils.IncDec.Increase ? usAccreditedInvestorsCount.add(1) : usAccreditedInvestorsCount.sub(1);
            }
        }

        if (countryCompliance == US) {
            usInvestorsCount = _increase == CommonUtils.IncDec.Increase ? usInvestorsCount.add(1) : usInvestorsCount.sub(1);
        } else if (countryCompliance == EU && getRegistryService().getAttributeValue(_id, getRegistryService().QUALIFIED()) != getRegistryService().APPROVED()) {
            euRetailInvestorsCount[_country] = _increase == CommonUtils.IncDec.Increase ? euRetailInvestorsCount[_country].add(1) : euRetailInvestorsCount[_country].sub(1);
        } else if (countryCompliance == JP) {
            jpInvestorsCount = _increase == CommonUtils.IncDec.Increase ? jpInvestorsCount.add(1) : jpInvestorsCount.sub(1);
        }
    }

    function createIssuanceInformation(
        string memory _investor,
        uint256 _value,
        uint256 _issuanceTime
    ) internal returns (bool) {
        uint256 issuancesCount = issuancesCounters[_investor];

        issuancesValues[_investor][issuancesCount] = _value;
        issuancesTimestamps[_investor][issuancesCount] = _issuanceTime;
        issuancesCounters[_investor] = issuancesCount.add(1);

        return true;
    }

    function preTransferCheck(
        address _from,
        address _to,
        uint256 _value
    ) public view returns (uint256 code, string memory reason) {
        return ComplianceServiceLibrary.preTransferCheck(getServices(), _from, _to, _value, address(0));
    }

    function preInternalTransferCheck(
        address _from,
        address _to,
        uint256 _value,
        address _omnibusWallet
    ) public view returns (uint256 code, string memory reason) {
        return ComplianceServiceLibrary.preTransferCheck(getServices(), _from, _to, _value, _omnibusWallet);
    }

    function getComplianceTransferableTokens(
        address _who,
        uint64 _time,
        uint64 _lockTime
    ) public view returns (uint256) {
        require(_time != 0, "Time must be greater than zero");
        string memory investor = getRegistryService().getInvestor(_who);

        uint256 balanceOfInvestor = getLockManager().getTransferableTokens(_who, _time);

        uint256 investorIssuancesCount = issuancesCounters[investor];

        //No locks, go to base class implementation
        if (investorIssuancesCount == 0) {
            return balanceOfInvestor;
        }

        uint256 totalLockedTokens = 0;
        for (uint256 i = 0; i < investorIssuancesCount; i++) {
            uint256 issuanceTimestamp = issuancesTimestamps[investor][i];

            if (_lockTime > _time || issuanceTimestamp > SafeMath.sub(_time, _lockTime)) {
                totalLockedTokens = totalLockedTokens.add(issuancesValues[investor][i]);
            }
        }

        //there may be more locked tokens than actual tokens, so the minimum between the two
        uint256 transferable = SafeMath.sub(balanceOfInvestor, Math.min(totalLockedTokens, balanceOfInvestor));

        return transferable;
    }

    function preIssuanceCheck(address _to, uint256 _value) public view returns (uint256 code, string memory reason) {
        return ComplianceServiceLibrary.preIssuanceCheck(getServices(), _to, _value);
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

    function getJPInvestorsCount() public view returns (uint256) {
        return jpInvestorsCount;
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

    function setEURetailInvestorsCount(string memory _country, uint256 _value) public onlyMaster returns (bool) {
        euRetailInvestorsCount[_country] = _value;

        return true;
    }

    function setJPInvestorsCount(uint256 _value) public onlyMaster returns (bool) {
        jpInvestorsCount = _value;

        return true;
    }

    function getServices() internal view returns (address[] memory services) {
        services = new address[](6);
        services[0] = getDSService(DS_TOKEN);
        services[1] = getDSService(REGISTRY_SERVICE);
        services[2] = getDSService(WALLET_MANAGER);
        services[3] = getDSService(COMPLIANCE_CONFIGURATION_SERVICE);
        services[4] = getDSService(LOCK_MANAGER);
        services[5] = address(this);
    }
}
