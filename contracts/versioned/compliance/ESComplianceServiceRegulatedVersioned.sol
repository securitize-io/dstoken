pragma solidity ^0.4.23;

import "./ESComplianceServiceWhitelistedVersioned.sol";

library ESComplianceServiceLibrary {
  uint internal constant DS_TOKEN = 0;
  uint internal constant REGISTRY_SERVICE = 1;
  uint internal constant WALLET_MANAGER = 2;
  uint internal constant COMPLIANCE_CONFIGURATION_SERVICE = 3;
  uint internal constant LOCK_MANAGER = 4;
  uint internal constant COMPLIANCE_SERVICE = 5;
  uint internal constant NONE = 0;
  uint internal constant US = 1;
  uint internal constant EU = 2;
  uint internal constant FORBIDDEN = 4;
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

  using SafeMath for uint256;

  function isRetail(address[] services, address _wallet) internal view returns (bool) {
    DSRegistryServiceInterfaceVersioned registry = DSRegistryServiceInterfaceVersioned(services[REGISTRY_SERVICE]);

    return registry.getAttributeValue(registry.getInvestor(_wallet), registry.QUALIFIED()) != registry.APPROVED();
  }

  function isAccredited(address[] services, address _wallet) internal view returns (bool) {
    DSRegistryServiceInterfaceVersioned registry = DSRegistryServiceInterfaceVersioned(services[REGISTRY_SERVICE]);

    return registry.getAttributeValue(registry.getInvestor(_wallet), registry.ACCREDITED()) == registry.APPROVED();
  }

  function balanceOfInvestor(address[] services, address _wallet) internal view returns (uint) {
    DSRegistryServiceInterfaceVersioned registry = DSRegistryServiceInterfaceVersioned(services[REGISTRY_SERVICE]);
    DSTokenInterfaceVersioned token = DSTokenInterfaceVersioned(services[DS_TOKEN]);

    return token.balanceOfInvestor(registry.getInvestor(_wallet));
  }

  function isNewInvestor(address[] services, address _wallet) internal view returns (bool) {
    return balanceOfInvestor(services, _wallet) == 0;
  }

  function getCountry(address[] services, address _wallet) internal view returns (string) {
    DSRegistryServiceInterfaceVersioned registry = DSRegistryServiceInterfaceVersioned(services[REGISTRY_SERVICE]);

    return registry.getCountry(registry.getInvestor(_wallet));
  }

  function getCountryCompliance(address[] services, address _wallet) internal view returns (uint) {
    return DSComplianceConfigurationServiceInterfaceVersioned(services[COMPLIANCE_CONFIGURATION_SERVICE]).getCountryCompliance(getCountry(services, _wallet));
  }

  function getUsInvestorsLimit(address[] services) public view returns (uint) {
    ESComplianceServiceRegulatedVersioned complianceService = ESComplianceServiceRegulatedVersioned(services[COMPLIANCE_SERVICE]);
    DSComplianceConfigurationServiceInterfaceVersioned compConfService = DSComplianceConfigurationServiceInterfaceVersioned(services[COMPLIANCE_CONFIGURATION_SERVICE]);

    if (compConfService.getMaxUsInvestorsPercentage() == 0) {
        return compConfService.getUsInvestorsLimit();
    }

    if (compConfService.getUsInvestorsLimit() == 0) {
        return compConfService.getMaxUsInvestorsPercentage().mul(complianceService.getTotalInvestorsCount()).div(100);
    }

    return Math.min256(compConfService.getUsInvestorsLimit(), compConfService.getMaxUsInvestorsPercentage().mul(complianceService.getTotalInvestorsCount()).div(100));
  }

  function preTransferCheck(address[] services, address _from, address _to, uint _value) public view returns (uint code, string reason) {
    ESComplianceServiceRegulatedVersioned complianceService = ESComplianceServiceRegulatedVersioned(services[COMPLIANCE_SERVICE]);

    if (DSTokenInterfaceVersioned(services[DS_TOKEN]).isPaused()) {
      return (10, TOKEN_PAUSED);
    }

    if (DSTokenInterfaceVersioned(services[DS_TOKEN]).balanceOf(_from) < _value) {
      return (15, NOT_ENOUGH_TOKENS);
    }

    if (keccak256(abi.encodePacked(DSRegistryServiceInterfaceVersioned(services[REGISTRY_SERVICE]).getInvestor(_from))) != keccak256("") &&
        keccak256(abi.encodePacked(DSRegistryServiceInterfaceVersioned(services[REGISTRY_SERVICE]).getInvestor(_from))) == keccak256(abi.encodePacked(DSRegistryServiceInterfaceVersioned(services[REGISTRY_SERVICE]).getInvestor(_to)))) {
            return (0, VALID);
    }

    uint fromInvestorBalance = balanceOfInvestor(services, _from);

    if (DSWalletManagerInterfaceVersioned(services[WALLET_MANAGER]).getWalletType(_to) == DSWalletManagerInterfaceVersioned(services[WALLET_MANAGER]).PLATFORM()) {
        if (DSComplianceConfigurationServiceInterfaceVersioned(services[COMPLIANCE_CONFIGURATION_SERVICE]).getForceFullTransfer() && fromInvestorBalance > _value) {
            return (50, ONLY_FULL_TRANSFER);
        }

        return (0, VALID);
    }

    if (DSWalletManagerInterfaceVersioned(services[WALLET_MANAGER]).getWalletType(_from) != DSWalletManagerInterfaceVersioned(services[WALLET_MANAGER]).PLATFORM() && DSLockManagerInterfaceVersioned(services[LOCK_MANAGER]).getTransferableTokens(_from, uint64(now)) < _value) {
        return (16, TOKENS_LOCKED);
    }


    if (!complianceService.checkWhitelisted(_to)) {
        return (20, WALLET_NOT_IN_REGISTRY_SERVICE);
    }

    uint fromRegion = getCountryCompliance(services, _from);
    uint toRegion = getCountryCompliance(services, _to);

    if (fromRegion == US) {
        if (complianceService.getComplianceTransferableTokens(_from, uint64(now), uint64(DSComplianceConfigurationServiceInterfaceVersioned(services[COMPLIANCE_CONFIGURATION_SERVICE]).getUsLockPeriod())) < _value) {
            return (32, HOLD_UP_1Y);
        }

        if (fromInvestorBalance > _value &&
            fromInvestorBalance.sub(_value) < DSComplianceConfigurationServiceInterfaceVersioned(services[COMPLIANCE_CONFIGURATION_SERVICE]).getMinUsTokens()) {
           return (51, AMOUNT_OF_TOKENS_UNDER_MIN);
        }

        if (DSComplianceConfigurationServiceInterfaceVersioned(services[COMPLIANCE_CONFIGURATION_SERVICE]).getForceFullTransfer() && fromInvestorBalance > _value) {
            return (50, ONLY_FULL_TRANSFER);
        }
    } else {
        if (DSWalletManagerInterfaceVersioned(services[WALLET_MANAGER]).getWalletType(_from) != DSWalletManagerInterfaceVersioned(services[WALLET_MANAGER]).PLATFORM() && complianceService.getComplianceTransferableTokens(_from, uint64(now), uint64(DSComplianceConfigurationServiceInterfaceVersioned(services[COMPLIANCE_CONFIGURATION_SERVICE]).getNonUsLockPeriod())) < _value) {
            return (33, HOLD_UP);
        }

        if (toRegion == US && !(DSWalletManagerInterfaceVersioned(services[WALLET_MANAGER]).getWalletType(_from) == DSWalletManagerInterfaceVersioned(services[WALLET_MANAGER]).PLATFORM()) &&
               (DSComplianceConfigurationServiceInterfaceVersioned(services[COMPLIANCE_CONFIGURATION_SERVICE]).getBlockFlowbackEndTime() == 0 ||
                DSComplianceConfigurationServiceInterfaceVersioned(services[COMPLIANCE_CONFIGURATION_SERVICE]).getBlockFlowbackEndTime() > now)) {
            return (25, FLOWBACK);
        }
    }

    if (toRegion == FORBIDDEN) {
        return (26, DESTINATION_RESTRICTED);
    }

    if (toRegion == EU) {
        if (isRetail(services, _to) && complianceService.getEURetailInvestorsCount(getCountry(services, _to)) >= DSComplianceConfigurationServiceInterfaceVersioned(services[COMPLIANCE_CONFIGURATION_SERVICE]).getEuRetailLimit() &&
            isNewInvestor(services, _to) &&
            (keccak256(abi.encodePacked(getCountry(services, _from))) != keccak256(abi.encodePacked(getCountry(services, _to))) ||
            (fromInvestorBalance > _value && isRetail(services, _from)))) {
            return (40, MAX_INVESTORS_IN_CATEGORY);
        }

        if (balanceOfInvestor(services, _to).add(_value) < DSComplianceConfigurationServiceInterfaceVersioned(services[COMPLIANCE_CONFIGURATION_SERVICE]).getMinEuTokens()) {
            return (51, AMOUNT_OF_TOKENS_UNDER_MIN);
        }
    }

    if (fromRegion == EU) {
        if (fromInvestorBalance.sub(_value) < DSComplianceConfigurationServiceInterfaceVersioned(services[COMPLIANCE_CONFIGURATION_SERVICE]).getMinEuTokens() &&
            fromInvestorBalance > _value) {
            return (51, AMOUNT_OF_TOKENS_UNDER_MIN);
        }
    }

    if (DSComplianceConfigurationServiceInterfaceVersioned(services[COMPLIANCE_CONFIGURATION_SERVICE]).getForceAccredited() && !isAccredited(services, _to)) {
        return (61, ONLY_ACCREDITED);
    }

    if (toRegion == US) {
        if(DSComplianceConfigurationServiceInterfaceVersioned(services[COMPLIANCE_CONFIGURATION_SERVICE]).getForceAccreditedUS() && !isAccredited(services, _to)) {
            return (61,ONLY_US_ACCREDITED);
        }

        uint usInvestorsLimit = getUsInvestorsLimit(services);
        if (usInvestorsLimit != 0 && fromInvestorBalance > _value && complianceService.getUSInvestorsCount() >= usInvestorsLimit &&
            isNewInvestor(services, _to)) {
            return (41, ONLY_FULL_TRANSFER);
        }

        if (DSComplianceConfigurationServiceInterfaceVersioned(services[COMPLIANCE_CONFIGURATION_SERVICE]).getUsAccreditedInvestorsLimit() != 0 && isAccredited(services, _to) && complianceService.getUSAccreditedInvestorsCount() >= DSComplianceConfigurationServiceInterfaceVersioned(services[COMPLIANCE_CONFIGURATION_SERVICE]).getUsAccreditedInvestorsLimit() &&
            isNewInvestor(services, _to) &&
            (fromRegion != US || (fromInvestorBalance > _value && isAccredited(services, _from)))) {
            return (40, MAX_INVESTORS_IN_CATEGORY);
        }

        if (balanceOfInvestor(services, _to).add(_value) < DSComplianceConfigurationServiceInterfaceVersioned(services[COMPLIANCE_CONFIGURATION_SERVICE]).getMinUsTokens()) {
            return (51, AMOUNT_OF_TOKENS_UNDER_MIN);
        }
    }

    if (!isAccredited(services, _to)) {
        if (DSComplianceConfigurationServiceInterfaceVersioned(services[COMPLIANCE_CONFIGURATION_SERVICE]).getNonAccreditedInvestorsLimit() != 0 && complianceService.getTotalInvestorsCount().sub(complianceService.getAccreditedInvestorsCount()) >= DSComplianceConfigurationServiceInterfaceVersioned(services[COMPLIANCE_CONFIGURATION_SERVICE]).getNonAccreditedInvestorsLimit() &&
            isNewInvestor(services, _to) &&
            (isAccredited(services, _from) || fromInvestorBalance > _value)) {
            return (40, MAX_INVESTORS_IN_CATEGORY);
        }
    }

    if (DSComplianceConfigurationServiceInterfaceVersioned(services[COMPLIANCE_CONFIGURATION_SERVICE]).getTotalInvestorsLimit() != 0 && fromInvestorBalance > _value &&
        complianceService.getTotalInvestorsCount() >= DSComplianceConfigurationServiceInterfaceVersioned(services[COMPLIANCE_CONFIGURATION_SERVICE]).getTotalInvestorsLimit() &&
        balanceOfInvestor(services, _to) == 0) {
        return (41, ONLY_FULL_TRANSFER);
    }

    if (balanceOfInvestor(services, _from) == _value && !isNewInvestor(services, _to) &&
        complianceService.getTotalInvestorsCount() <= DSComplianceConfigurationServiceInterfaceVersioned(services[COMPLIANCE_CONFIGURATION_SERVICE]).getMinimumTotalInvestors()) {
        return (71, NOT_ENOUGH_INVESTORS);
    }

    if (DSWalletManagerInterfaceVersioned(services[WALLET_MANAGER]).getWalletType(_from) != DSWalletManagerInterfaceVersioned(services[WALLET_MANAGER]).PLATFORM() &&
        fromInvestorBalance.sub(_value) < DSComplianceConfigurationServiceInterfaceVersioned(services[COMPLIANCE_CONFIGURATION_SERVICE]).getMinimumHoldingsPerInvestor()) {
        return (51, AMOUNT_OF_TOKENS_UNDER_MIN);
    }

    if (DSWalletManagerInterfaceVersioned(services[WALLET_MANAGER]).getWalletType(_to) != DSWalletManagerInterfaceVersioned(services[WALLET_MANAGER]).PLATFORM() &&
        balanceOfInvestor(services, _to).add(_value) < DSComplianceConfigurationServiceInterfaceVersioned(services[COMPLIANCE_CONFIGURATION_SERVICE]).getMinimumHoldingsPerInvestor()) {
        return (51, AMOUNT_OF_TOKENS_UNDER_MIN);
    }

    if (DSComplianceConfigurationServiceInterfaceVersioned(services[COMPLIANCE_CONFIGURATION_SERVICE]).getMaximumHoldingsPerInvestor() != 0 &&
        balanceOfInvestor(services, _to).add(_value) > DSComplianceConfigurationServiceInterfaceVersioned(services[COMPLIANCE_CONFIGURATION_SERVICE]).getMaximumHoldingsPerInvestor()) {
        return (52, AMOUNT_OF_TOKENS_ABOVE_MAX);
    }

    return (0, VALID);
  }

  function preIssuanceCheck(ESComplianceServiceRegulatedVersioned _complianceService, address _to, uint _value) public view returns (uint code, string reason) {
    if (isNewInvestor(_complianceService, _to)) {
      // verify global non accredited limit
      if (!isAccredited(_complianceService, _to)) {
        if (getComplianceConfigurationService(_complianceService).getNonAccreditedInvestorsLimit() != 0 && 
            _complianceService.getTotalInvestorsCount().sub(_complianceService.getAccreditedInvestorsCount()) >= getComplianceConfigurationService(_complianceService).getNonAccreditedInvestorsLimit()) {
          return (40, MAX_INVESTORS_IN_CATEGORY);
        }
      }
      // verify global investors limit
      if (getComplianceConfigurationService(_complianceService).getTotalInvestorsLimit() != 0 && 
          _complianceService.getTotalInvestorsCount() >= getComplianceConfigurationService(_complianceService).getTotalInvestorsLimit()) {
        return (40, MAX_INVESTORS_IN_CATEGORY);
      }
    }

    if (getWalletManager(_complianceService).getWalletType(_to) != getWalletManager(_complianceService).PLATFORM() &&
      balanceOfInvestor(_complianceService, _to).add(_value) < getComplianceConfigurationService(_complianceService).getMinimumHoldingsPerInvestor()) {
      return (51, AMOUNT_OF_TOKENS_UNDER_MIN);
    }
    if (getComplianceConfigurationService(_complianceService).getMaximumHoldingsPerInvestor() != 0 &&
      balanceOfInvestor(_complianceService, _to).add(_value) > getComplianceConfigurationService(_complianceService).getMaximumHoldingsPerInvestor()) {
      return (52, AMOUNT_OF_TOKENS_ABOVE_MAX);
    }

    return (0, VALID);
  }

  function locationSpecificCheckForIssuance(ESComplianceServiceRegulatedVersioned _complianceService, address _to, uint _toRegion) public view returns (uint code, string reason) {
    if (isNewInvestor(_complianceService, _to)) {
      if (_toRegion == US) {
        // verify US investors limit is not exceeded
        if (getComplianceConfigurationService(_complianceService).getUsInvestorsLimit() != 0 &&
            _complianceService.getUSInvestorsCount() >= getComplianceConfigurationService(_complianceService).getUsInvestorsLimit()) {
          return (40, MAX_INVESTORS_IN_CATEGORY);
        }
        // verify accredited US limit is not exceeded
        if (getComplianceConfigurationService(_complianceService).getUsAccreditedInvestorsLimit() != 0 &&
            isAccredited(_complianceService, _to) &&
            _complianceService.getUSAccreditedInvestorsCount() >= getComplianceConfigurationService(_complianceService).getUsAccreditedInvestorsLimit()) {
          return (40, MAX_INVESTORS_IN_CATEGORY);
        }

      } else if (_toRegion == EU) {
        if (isRetail(_complianceService, _to) && 
          _complianceService.getEURetailInvestorsCount(getCountry(_complianceService, _to)) >= getComplianceConfigurationService(_complianceService).getEuRetailLimit()) {
          return (40, MAX_INVESTORS_IN_CATEGORY);
        }
      }

      return (0, VALID);
    }
  }

  function getToken(DSServiceConsumerInterfaceVersioned _service) public view returns (DSTokenInterfaceVersioned){
    return DSTokenInterfaceVersioned(_service.getDSService(_service.DS_TOKEN()));
  }

  function getTrustService(DSServiceConsumerInterfaceVersioned _service) public view returns (DSTrustServiceInterfaceVersioned) {
    return DSTrustServiceInterfaceVersioned(_service.getDSService(_service.TRUST_SERVICE()));
  }

  function getWalletManager(DSServiceConsumerInterfaceVersioned _service) public view returns (DSWalletManagerInterfaceVersioned) {
    return DSWalletManagerInterfaceVersioned(_service.getDSService(_service.WALLET_MANAGER()));
  }

  function getLockManager(DSServiceConsumerInterfaceVersioned _service) public view returns (DSLockManagerInterfaceVersioned) {
    return DSLockManagerInterfaceVersioned(_service.getDSService(_service.LOCK_MANAGER()));
  }

  function getComplianceService(DSServiceConsumerInterfaceVersioned _service) public view returns (DSComplianceServiceInterfaceVersioned) {
    return DSComplianceServiceInterfaceVersioned(_service.getDSService(_service.COMPLIANCE_SERVICE()));
  }

  function getRegistryService(DSServiceConsumerInterfaceVersioned _service) public view returns (DSRegistryServiceInterfaceVersioned) {
    return DSRegistryServiceInterfaceVersioned(_service.getDSService(_service.REGISTRY_SERVICE()));
  }

  function getIssuanceInformationManager(DSServiceConsumerInterfaceVersioned _service) public view returns (DSIssuanceInformationManagerInterfaceVersioned) {
    return DSIssuanceInformationManagerInterfaceVersioned(_service.getDSService(_service.ISSUANCE_INFORMATION_MANAGER()));
  }

  function getComplianceConfigurationService(DSServiceConsumerInterfaceVersioned _service) public view returns (DSComplianceConfigurationServiceInterfaceVersioned) {
    return DSComplianceConfigurationServiceInterfaceVersioned(_service.getDSService(_service.COMPLIANCE_CONFIGURATION_SERVICE()));
  }
}

/**
*   @title Concrete compliance service for tokens with regulation
*
*/

contract ESComplianceServiceRegulatedVersioned is ESComplianceServiceWhitelistedVersioned {
    using SafeMath for uint256;

    constructor(address _address, string _namespace) public ESComplianceServiceWhitelistedVersioned(_address, _namespace) {
        VERSIONS.push(4);
    }

    function recordBurn(address _who, uint _value) internal returns (bool) {
        if (_value != 0 && getToken().balanceOfInvestor(getRegistryService().getInvestor(_who)) == _value) {
            adjustTotalInvestorsCounts(_who, false);
        }

        return true;
    }

    function recordSeize(address _from, address /*_to*/, uint _value) internal returns (bool) {
        if (_value != 0 && getToken().balanceOfInvestor(getRegistryService().getInvestor(_from)) == _value) {
            adjustTotalInvestorsCounts(_from, false);
        }

        return true;
    }

    function adjustInvestorCountsAfterCountryChange(string _id,string _country,string _prevCountry) public onlyRegistry returns (bool) {
        if(getToken().balanceOfInvestor(_id) == 0) {
            return;
        }

        adjustInvestorsCountsByCountry(_prevCountry,_id,false);
        adjustInvestorsCountsByCountry(_country,_id,true);

        return true;
    }

    function adjustTotalInvestorsCounts(address _wallet, bool _increase) internal {
        if (getWalletManager().getWalletType(_wallet) == getWalletManager().NONE()) {
            setUint(TOTAL_INVESTORS, _increase ? getUint(TOTAL_INVESTORS).add(1) : getUint(TOTAL_INVESTORS).sub(1));

            string memory id = getRegistryService().getInvestor(_wallet);
            string memory country = getRegistryService().getCountry(id);

            adjustInvestorsCountsByCountry(country,id,_increase);
        }
    }

    function adjustInvestorsCountsByCountry(string _country,string _id, bool _increase) internal {
        uint countryCompliance = getComplianceConfigurationService().getCountryCompliance(_country);

        if (getRegistryService().getAttributeValue(_id, getRegistryService().ACCREDITED()) == getRegistryService().APPROVED()) {
          setUint(ACCREDITED_INVESTORS_COUNT, _increase ? getUint(ACCREDITED_INVESTORS_COUNT).add(1) : getUint(ACCREDITED_INVESTORS_COUNT).sub(1));
          if (countryCompliance == US) {
            setUint(US_ACCREDITED_INVESTORS_COUNT, _increase ? getUint(US_ACCREDITED_INVESTORS_COUNT).add(1) : getUint(US_ACCREDITED_INVESTORS_COUNT).sub(1));
          }
        }

        if (countryCompliance == US) {
          setUint(US_INVESTORS_COUNT, _increase ? getUint(US_INVESTORS_COUNT).add(1) : getUint(US_INVESTORS_COUNT).sub(1));
        } else if (countryCompliance == EU && getRegistryService().getAttributeValue(_id, getRegistryService().QUALIFIED()) != getRegistryService().APPROVED()) {
          setUint(EU_RETAIL_INVESTORS_COUNT, _country, _increase ? getUint(EU_RETAIL_INVESTORS_COUNT, _country).add(1) : getUint(EU_RETAIL_INVESTORS_COUNT, _country).sub(1));
        }
    }

    function createIssuanceInformation(string _investor, uint _value, uint _issuanceTime) internal returns (bool) {
        uint issuancesCount = getUint(ISSUANCES_COUNT, _investor);

        setUint(ISSUANCE_VALUE, _investor, issuancesCount, _value);
        setUint(ISSUANCE_TIMESTAMP, _investor, issuancesCount, _issuanceTime);
        setUint(ISSUANCES_COUNT, _investor, issuancesCount.add(1));

        return true;
    }

    function recordIssuance(address _to, uint _value, uint _issuanceTime) internal returns (bool){
        if (_value != 0 && getToken().balanceOfInvestor(getRegistryService().getInvestor(_to)) == 0) {
            adjustTotalInvestorsCounts(_to, true);
        }

        require(createIssuanceInformation(getRegistryService().getInvestor(_to), _value, _issuanceTime));

        return true;
    }

    function preTransferCheck(address _from, address _to, uint _value) view public returns (uint code, string reason) {
        address[] memory services = new address[](6);

        services[0] = getDSService(DS_TOKEN);
        services[1] = getDSService(REGISTRY_SERVICE);
        services[2] = getDSService(WALLET_MANAGER);
        services[3] = getDSService(COMPLIANCE_CONFIGURATION_SERVICE);
        services[4] = getDSService(LOCK_MANAGER);
        services[5] = this;

        (code, reason) = ESComplianceServiceLibrary.preTransferCheck(services,_from, _to, _value);

        if (code != 0) {
            return (code, reason);
        } else {
            return checkTransfer(_from, _to, _value);
        }
    }

    function getComplianceTransferableTokens(address _who, uint64 _time, uint64 _lockTime) public view returns (uint) {
        require(_time != 0, "time must be greater than zero");

        string memory investor = getRegistryService().getInvestor(_who);

        uint balanceOfHolder = getLockManager().getTransferableTokens(_who, _time);

        uint holderIssuancesCount = getUint(ISSUANCES_COUNT, investor);

        //No locks, go to base class implementation
        if (holderIssuancesCount == 0) {
            return balanceOfHolder;
        }

        uint totalLockedTokens = 0;
        for (uint i = 0; i < holderIssuancesCount; i++) {
            uint issuanceTimestamp = getUint(ISSUANCE_TIMESTAMP, investor, i);

            if (_lockTime > _time || issuanceTimestamp > SafeMath.sub(_time, _lockTime)) {
                totalLockedTokens = totalLockedTokens.add(getUint(ISSUANCE_VALUE, investor, i));
            }
        }

        //there may be more locked tokens than actual tokens, so the minimum between the two
        uint transferable = SafeMath.sub(balanceOfHolder, Math.min256(totalLockedTokens, balanceOfHolder));

        return transferable;
    }

    function preIssuanceCheck(address _to, uint _value) view public returns (uint code, string reason) {
        if (!checkWhitelisted(_to)) {
            return (20, WALLET_NOT_IN_REGISTRY_SERVICE);
        }

        (code, reason) = locationSpecificCheckForIssuance(_to);
        require(code == 0, reason);
        return ESComplianceServiceLibrary.preIssuanceCheck(this, _to, _value);
    }

    function locationSpecificCheckForIssuance(address _to) view internal returns (uint code, string reason) {
        string memory toInvestor = getRegistryService().getInvestor(_to);
        string memory toCountry = getRegistryService().getCountry(toInvestor);
        uint toRegion = getComplianceConfigurationService().getCountryCompliance(toCountry);

        if (toRegion == FORBIDDEN) {
            return (26, DESTINATION_RESTRICTED);
        } 

        return ESComplianceServiceLibrary.locationSpecificCheckForIssuance(this, _to, toRegion);
    }

    function recordTransfer(address _from, address _to, uint _value) internal returns (bool) {
        if (_value != 0 && getToken().balanceOfInvestor(getRegistryService().getInvestor(_from)) == _value) {
            adjustTotalInvestorsCounts(_from, false);
        }

        if (_value != 0 && getToken().balanceOfInvestor(getRegistryService().getInvestor(_to)) == 0) {
            adjustTotalInvestorsCounts(_to, true);
        }

        return true;
    }

    function checkTransfer(address, address, uint) view internal returns (uint, string){
        return (0, VALID);
    }

    function getTotalInvestorsCount() public view returns (uint256) {
        return getUint(TOTAL_INVESTORS);
    }

    function getUSInvestorsCount() public view returns (uint){
        return getUint(US_INVESTORS_COUNT);
    }

    function getUSAccreditedInvestorsCount() public view returns (uint) {
        return getUint(US_ACCREDITED_INVESTORS_COUNT);
    }

    function getAccreditedInvestorsCount() public view returns (uint) {
        return getUint(ACCREDITED_INVESTORS_COUNT);
    }

    function getEURetailInvestorsCount(string _country) public view returns (uint){
        return getUint(EU_RETAIL_INVESTORS_COUNT, _country);
    }

    function setTotalInvestorsCount(uint256 _value) public onlyMaster returns (bool) {
        setUint(TOTAL_INVESTORS, _value);

        return true;
    }

    function setUSInvestorsCount(uint256 _value) public onlyMaster returns (bool) {
        setUint(US_INVESTORS_COUNT, _value);

        return true;
    }

    function setUSAccreditedInvestorsCount(uint256 _value) public onlyMaster returns (bool) {
         setUint(US_ACCREDITED_INVESTORS_COUNT, _value);

         return true;
    }

    function setAccreditedInvestorsCount(uint256 _value) public onlyMaster returns (bool) {
        setUint(ACCREDITED_INVESTORS_COUNT, _value);

        return true;
    }

    function setEuRetailInvestorsCount(string _country, uint256 _value) public onlyMaster returns (bool) {
        setUint(EU_RETAIL_INVESTORS_COUNT, _country, _value);

        return true;
    }
}