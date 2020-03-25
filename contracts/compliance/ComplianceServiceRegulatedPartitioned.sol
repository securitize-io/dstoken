pragma solidity ^0.5.0;

import "./ComplianceServiceRegulated.sol";
import "../zeppelin/math/Math.sol";

library ComplianceServicePartitionedLibrary {
  uint internal constant NONE = 0;
  uint internal constant US = 1;
  uint internal constant EU = 2;
  uint internal constant FORBIDDEN = 4;
  uint256 internal constant DS_TOKEN = 0;
  uint256 internal constant REGISTRY_SERVICE = 1;
  uint256 internal constant WALLET_MANAGER = 2;
  uint256 internal constant COMPLIANCE_CONFIGURATION_SERVICE = 3;
  uint256 internal constant LOCK_MANAGER = 4;
  uint256 internal constant COMPLIANCE_SERVICE = 5;
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
  string internal constant ONLY_US_ACCREDITED = "Only US accredited";
  string internal constant NOT_ENOUGH_INVESTORS = "Not enough investors";
  string internal constant OMNIBUS_TO_OMNIBUS_TRANSFER = "Omnibus to omnibus transfer";

  using SafeMath for uint256;

  function isRetail(address[] memory _services, address _wallet) internal view returns (bool) {
      IDSRegistryService registry = IDSRegistryService(_services[REGISTRY_SERVICE]);

      return registry.getAttributeValue(registry.getInvestor(_wallet), registry.QUALIFIED()) != registry.APPROVED();
  }

  function isAccredited(address[] memory _services, address _wallet) internal view returns (bool) {
      IDSRegistryService registry = IDSRegistryService(_services[REGISTRY_SERVICE]);

      return registry.getAttributeValue(registry.getInvestor(_wallet), registry.ACCREDITED()) == registry.APPROVED();
  }

  function balanceOfInvestor(address[] memory _services, address _wallet) public view returns (uint256) {
      IDSRegistryService registry = IDSRegistryService(_services[REGISTRY_SERVICE]);
      IDSToken token = IDSToken(_services[DS_TOKEN]);

      return token.balanceOfInvestor(registry.getInvestor(_wallet));
  }

  function isNewInvestor(address[] memory _services, address _wallet) internal view returns (bool) {
      IDSRegistryService registryService = IDSRegistryService(_services[REGISTRY_SERVICE]);

      // Return whether this investor has 0 balance and is not an omnibus wallet in BENEFICIARY mode (which is not considered an invesor)
      return balanceOfInvestor(_services, _wallet) == 0 && !(registryService.isOmnibusWallet(_wallet) && !registryService.getOmnibusWalletController(_wallet).isHolderOfRecord());
  }

  function getCountry(address[] memory _services, address _wallet) internal view returns (string memory) {
      IDSRegistryService registry = IDSRegistryService(_services[REGISTRY_SERVICE]);

      return registry.getCountry(registry.getInvestor(_wallet));
  }

  function getCountryCompliance(address[] memory _services, address _wallet) internal view returns (uint256) {
      return IDSComplianceConfigurationService(_services[COMPLIANCE_CONFIGURATION_SERVICE]).getCountryCompliance(getCountry(_services, _wallet));
  }

  function isBeneficiaryDepositOrWithdrawl(address[] memory _services, address _from, address _to) internal view returns (bool) {
      IDSRegistryService registryService = IDSRegistryService(_services[REGISTRY_SERVICE]);

      return
          (registryService.isOmnibusWallet(_from) && !registryService.getOmnibusWalletController(_from).isHolderOfRecord()) ||
          (registryService.isOmnibusWallet(_to) && !registryService.getOmnibusWalletController(_to).isHolderOfRecord());
  }

  function isHolderOfRecordInternalTransfer(address[] memory _services, address _omnibusWallet) internal view returns (bool) {
      IDSRegistryService registryService = IDSRegistryService(_services[REGISTRY_SERVICE]);

      return registryService.isOmnibusWallet(_omnibusWallet) && registryService.getOmnibusWalletController(_omnibusWallet).isHolderOfRecord();
  }

  function getUsInvestorsLimit(address[] memory _services) internal view returns (uint256) {
      ComplianceServiceRegulated complianceService = ComplianceServiceRegulated(_services[COMPLIANCE_SERVICE]);
      IDSComplianceConfigurationService compConfService = IDSComplianceConfigurationService(_services[COMPLIANCE_CONFIGURATION_SERVICE]);

      if (compConfService.getMaxUsInvestorsPercentage() == 0) {
          return compConfService.getUsInvestorsLimit();
      }

      if (compConfService.getUsInvestorsLimit() == 0) {
          return compConfService.getMaxUsInvestorsPercentage().mul(complianceService.getTotalInvestorsCount()).div(100);
      }

      return Math.min(compConfService.getUsInvestorsLimit(), compConfService.getMaxUsInvestorsPercentage().mul(complianceService.getTotalInvestorsCount()).div(100));
  }

  function isOmnibusInternalTransfer(address _omnibusWallet) internal pure returns (bool) {
      return _omnibusWallet != address(0);
  }

  function preTransferCheck(address[] memory _services, address _from, address _to, uint256 _value, address _omnibusWallet) public view returns (uint256 code, string memory reason) {
      ComplianceServiceRegulatedPartitioned complianceService = ComplianceServiceRegulatedPartitioned(_services[COMPLIANCE_SERVICE]);

      if (IDSToken(_services[DS_TOKEN]).isPaused()) {
          return (10, TOKEN_PAUSED);
      }

      if (
          IDSToken(_services[DS_TOKEN]).balanceOf(_from) < _value ||
          (isOmnibusInternalTransfer(_omnibusWallet) &&
              IDSRegistryService(_services[REGISTRY_SERVICE]).getOmnibusWalletController(_omnibusWallet).balanceOf(_from) < _value)
      ) {
          return (15, NOT_ENOUGH_TOKENS);
      }

      if (
          keccak256(abi.encodePacked(IDSRegistryService(_services[REGISTRY_SERVICE]).getInvestor(_from))) != keccak256("") &&
          keccak256(abi.encodePacked(IDSRegistryService(_services[REGISTRY_SERVICE]).getInvestor(_from))) ==
          keccak256(abi.encodePacked(IDSRegistryService(_services[REGISTRY_SERVICE]).getInvestor(_to)))
      ) {
          return (0, VALID);
      }

      if (
          !isOmnibusInternalTransfer(_omnibusWallet) &&
          IDSRegistryService(_services[REGISTRY_SERVICE]).isOmnibusWallet(_from) &&
          IDSRegistryService(_services[REGISTRY_SERVICE]).isOmnibusWallet(_to)
      ) {
          return (81, OMNIBUS_TO_OMNIBUS_TRANSFER);
      }

      uint256 fromInvestorBalance = balanceOfInvestor(_services, _from);

      if (IDSWalletManager(_services[WALLET_MANAGER]).getWalletType(_to) == IDSWalletManager(_services[WALLET_MANAGER]).PLATFORM()) {
        if (IDSComplianceConfigurationService(_services[COMPLIANCE_CONFIGURATION_SERVICE]).getForceFullTransfer() && fromInvestorBalance > _value) {
            return (50, ONLY_FULL_TRANSFER);
        }

        return (0, VALID);
      }

      if (
        !isOmnibusInternalTransfer(_omnibusWallet) &&
        !IDSRegistryService(_services[REGISTRY_SERVICE]).isOmnibusWallet(_from) &&
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
            !isOmnibusInternalTransfer(_omnibusWallet) &&
            !IDSRegistryService(_services[REGISTRY_SERVICE]).isOmnibusWallet(_from) &&
            complianceService.getComplianceTransferableTokens(
                _from,
                uint64(now),
                false
            ) <
            _value
          ) {
            return (32, HOLD_UP_1Y);
          }

          if (
              (!isBeneficiaryDepositOrWithdrawl(_services, _from, _to) &&
                  fromInvestorBalance > _value &&
                  fromInvestorBalance.sub(_value) < IDSComplianceConfigurationService(_services[COMPLIANCE_CONFIGURATION_SERVICE]).getMinUsTokens())
          ) {
              return (51, AMOUNT_OF_TOKENS_UNDER_MIN);
          }

          if (IDSComplianceConfigurationService(_services[COMPLIANCE_CONFIGURATION_SERVICE]).getForceFullTransfer() && fromInvestorBalance > _value) {
              return (50, ONLY_FULL_TRANSFER);
          }
      } else {
          if (
              !isOmnibusInternalTransfer(_omnibusWallet) &&
              !IDSRegistryService(_services[REGISTRY_SERVICE]).isOmnibusWallet(_from) &&
              IDSWalletManager(_services[WALLET_MANAGER]).getWalletType(_from) != IDSWalletManager(_services[WALLET_MANAGER]).PLATFORM() &&
              complianceService.getComplianceTransferableTokens(
                  _from,
                  uint64(now),
                  false
              ) <
              _value
          ) {
              return (33, HOLD_UP);
          }

          if (
            !isOmnibusInternalTransfer(_omnibusWallet) &&
            !IDSRegistryService(_services[REGISTRY_SERVICE]).isOmnibusWallet(_from) &&
            toRegion == US &&
            IDSWalletManager(_services[WALLET_MANAGER]).getWalletType(_from) != IDSWalletManager(_services[WALLET_MANAGER]).PLATFORM() &&
            IDSComplianceConfigurationService(_services[COMPLIANCE_CONFIGURATION_SERVICE]).getBlockFlowbackEndTime() != 0 &&
            complianceService.getComplianceTransferableTokens(_from, now, true) < _value) {
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
              !isHolderOfRecordInternalTransfer(_services, _omnibusWallet) &&
              (keccak256(abi.encodePacked(getCountry(_services, _from))) != keccak256(abi.encodePacked(getCountry(_services, _to))) ||
                  (fromInvestorBalance > _value && isRetail(_services, _from)))
          ) {
              return (40, MAX_INVESTORS_IN_CATEGORY);
          }

          if (
              !isBeneficiaryDepositOrWithdrawl(_services, _from, _to) &&
              !isHolderOfRecordInternalTransfer(_services, _omnibusWallet) &&
              balanceOfInvestor(_services, _to).add(_value) < IDSComplianceConfigurationService(_services[COMPLIANCE_CONFIGURATION_SERVICE]).getMinEuTokens()
          ) {
              return (51, AMOUNT_OF_TOKENS_UNDER_MIN);
          }
      }

      if (fromRegion == EU && !isBeneficiaryDepositOrWithdrawl(_services, _from, _to) && !isHolderOfRecordInternalTransfer(_services, _omnibusWallet)) {
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
          if (
              usInvestorsLimit != 0 &&
              fromInvestorBalance > _value &&
              complianceService.getUSInvestorsCount() >= usInvestorsLimit &&
              isNewInvestor(_services, _to) &&
              !isHolderOfRecordInternalTransfer(_services, _omnibusWallet)
          ) {
              return (41, ONLY_FULL_TRANSFER);
          }

          if (
              IDSComplianceConfigurationService(_services[COMPLIANCE_CONFIGURATION_SERVICE]).getUsAccreditedInvestorsLimit() != 0 &&
              isAccredited(_services, _to) &&
              complianceService.getUSAccreditedInvestorsCount() >=
              IDSComplianceConfigurationService(_services[COMPLIANCE_CONFIGURATION_SERVICE]).getUsAccreditedInvestorsLimit() &&
              isNewInvestor(_services, _to) &&
              !isHolderOfRecordInternalTransfer(_services, _omnibusWallet) &&
              (fromRegion != US || !isAccredited(_services, _from) || balanceOfInvestor(_services, _from) > _value)
          ) {
              return (40, MAX_INVESTORS_IN_CATEGORY);

          }

          if (
              !isBeneficiaryDepositOrWithdrawl(_services, _from, _to) &&
              !isHolderOfRecordInternalTransfer(_services, _omnibusWallet) &&
              balanceOfInvestor(_services, _to).add(_value) < IDSComplianceConfigurationService(_services[COMPLIANCE_CONFIGURATION_SERVICE]).getMinUsTokens()
          ) {
              return (51, AMOUNT_OF_TOKENS_UNDER_MIN);
          }
      }

      if (!isAccredited(_services, _to)) {
          if (
              IDSComplianceConfigurationService(_services[COMPLIANCE_CONFIGURATION_SERVICE]).getNonAccreditedInvestorsLimit() != 0 &&
              complianceService.getTotalInvestorsCount().sub(complianceService.getAccreditedInvestorsCount()) >=
              IDSComplianceConfigurationService(_services[COMPLIANCE_CONFIGURATION_SERVICE]).getNonAccreditedInvestorsLimit() &&
              isNewInvestor(_services, _to) &&
              !isHolderOfRecordInternalTransfer(_services, _omnibusWallet) &&
              (isAccredited(_services, _from) || fromInvestorBalance > _value)
          ) {
              return (40, MAX_INVESTORS_IN_CATEGORY);
          }
      }

      if (
          IDSComplianceConfigurationService(_services[COMPLIANCE_CONFIGURATION_SERVICE]).getTotalInvestorsLimit() != 0 &&
          fromInvestorBalance > _value &&
          complianceService.getTotalInvestorsCount() >= IDSComplianceConfigurationService(_services[COMPLIANCE_CONFIGURATION_SERVICE]).getTotalInvestorsLimit() &&
          isNewInvestor(_services, _to) &&
          !isHolderOfRecordInternalTransfer(_services, _omnibusWallet)
      ) {
          return (41, ONLY_FULL_TRANSFER);
      }

      if (
          !isBeneficiaryDepositOrWithdrawl(_services, _from, _to) &&
          !isHolderOfRecordInternalTransfer(_services, _omnibusWallet) &&
          balanceOfInvestor(_services, _from) == _value &&
          !isNewInvestor(_services, _to) &&
          complianceService.getTotalInvestorsCount() <= IDSComplianceConfigurationService(_services[COMPLIANCE_CONFIGURATION_SERVICE]).getMinimumTotalInvestors()
      ) {
          return (71, NOT_ENOUGH_INVESTORS);
      }

      if (
          !isBeneficiaryDepositOrWithdrawl(_services, _from, _to) &&
          !isHolderOfRecordInternalTransfer(_services, _omnibusWallet) &&
          IDSWalletManager(_services[WALLET_MANAGER]).getWalletType(_from) != IDSWalletManager(_services[WALLET_MANAGER]).PLATFORM() &&
          fromInvestorBalance.sub(_value) < IDSComplianceConfigurationService(_services[COMPLIANCE_CONFIGURATION_SERVICE]).getMinimumHoldingsPerInvestor()
      ) {
          return (51, AMOUNT_OF_TOKENS_UNDER_MIN);
      }

      if (
          !isBeneficiaryDepositOrWithdrawl(_services, _from, _to) &&
          !isHolderOfRecordInternalTransfer(_services, _omnibusWallet) &&
          IDSWalletManager(_services[WALLET_MANAGER]).getWalletType(_to) != IDSWalletManager(_services[WALLET_MANAGER]).PLATFORM() &&
          balanceOfInvestor(_services, _to).add(_value) < IDSComplianceConfigurationService(_services[COMPLIANCE_CONFIGURATION_SERVICE]).getMinimumHoldingsPerInvestor()
      ) {
          return (51, AMOUNT_OF_TOKENS_UNDER_MIN);
      }

      if (
          !isBeneficiaryDepositOrWithdrawl(_services, _from, _to) &&
          !isHolderOfRecordInternalTransfer(_services, _omnibusWallet) &&
          IDSComplianceConfigurationService(_services[COMPLIANCE_CONFIGURATION_SERVICE]).getMaximumHoldingsPerInvestor() != 0 &&
          balanceOfInvestor(_services, _to).add(_value) > IDSComplianceConfigurationService(_services[COMPLIANCE_CONFIGURATION_SERVICE]).getMaximumHoldingsPerInvestor()
      ) {
          return (52, AMOUNT_OF_TOKENS_ABOVE_MAX);
      }

      return (0, VALID);
  }

  function getLockTime(IDSComplianceConfigurationService _complianceConfiguration, uint _partitionRegion, bool _checkFlowback) public view returns (uint) {
    if (_partitionRegion == US) {
        return _complianceConfiguration.getUsLockPeriod();
    } else {
      uint lockTime = _complianceConfiguration.getNonUsLockPeriod();
      if (_checkFlowback) {
        lockTime = Math.max(lockTime, _complianceConfiguration.getBlockFlowbackEndTime());
      }
      return lockTime;
    }
  }
}

/**
*   @title Concrete compliance service for tokens with regulation
*
*/

contract ComplianceServiceRegulatedPartitioned is IDSComplianceServicePartitioned, ComplianceServiceRegulated {
    using SafeMath for uint256;

    function initialize() public initializer onlyFromProxy {
        ComplianceServiceRegulated.initialize();
        IDSComplianceServicePartitioned.initialize();
        VERSIONS.push(1);
    }

    function preTransferCheck(address _from, address _to, uint256 _value) public view returns (uint256 code, string memory reason) {
        return ComplianceServicePartitionedLibrary.preTransferCheck(getServices(), _from, _to, _value, address(0));
    }

    function getLockTime(bool _checkFlowback, bytes32 _partition) internal view returns (uint) {
      IDSComplianceConfigurationService complianceConfiguration = getComplianceConfigurationService();
      uint partitionRegion = getPartitionsManager().getPartitionRegion(_partition);
      return ComplianceServicePartitionedLibrary.getLockTime(complianceConfiguration, partitionRegion, _checkFlowback);
    }

    function getComplianceTransferableTokens(address _who, uint256 _time, bool _checkFlowback) public view returns (uint transferable) {
      for (uint index = 0; index < getTokenPartitioned().partitionCountOf(_who); ++index) {
        bytes32 partition = getTokenPartitioned().partitionOf(_who, index);
        transferable = SafeMath.add(transferable, getComplianceTransferableTokens(_who, _time, _checkFlowback, partition));
      }
    }

    function getComplianceTransferableTokens(address _who, uint256 _time, bool _checkFlowback, bytes32 _partition) public view returns (uint) {
      require(_time != 0, "non zero time required"); // Might be redundant
      if (getPartitionsManager().getPartitionIssuanceDate(_partition).add(getLockTime(_checkFlowback, _partition)) > _time) {
        return 0;
      }

      return getLockManagerPartitioned().getTransferableTokens(_who, _time, _partition);
    }

    function getComplianceTransferableTokens(address _who, uint256 _time, address _to) public view returns (uint transferable) {
      return getComplianceTransferableTokens(_who, _time, getRegion(_to) == US);
    }

    function getComplianceTransferableTokens(address _who, uint256 _time, address _to, bytes32 _partition) public view returns (uint) {
      return getComplianceTransferableTokens(_who, _time, getRegion(_to) == US, _partition);
    }

    function getRegion(address _who) internal view returns(uint256) {
      return getComplianceConfigurationService().getCountryCompliance(getRegistryService().getCountry(getRegistryService().getInvestor(_who)));
    }
}