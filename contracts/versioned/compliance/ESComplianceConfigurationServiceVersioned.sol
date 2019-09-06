pragma solidity ^0.4.23;

import "./DSComplianceConfigurationServiceInterfaceVersioned.sol";
import "../service/ESServiceConsumerVersioned.sol";

contract ESComplianceConfigurationServiceVersioned is DSComplianceConfigurationServiceInterfaceVersioned, ESServiceConsumerVersioned {
  constructor(address _address, string _namespace) public ESServiceConsumerVersioned(_address, _namespace) {
    VERSIONS.push(3);
  }

  string internal constant COUNTRIES = "countries";
  string internal constant FORCE_FULL_TRANSFER = "force_full_transfer";
  string internal constant MIN_US_TOKENS = "min_us_tokens";
  string internal constant MIN_EU_TOKENS = "min_eu_tokens";
  string internal constant TOTAL_INVESTORS_LIMIT = "total_investors_limit";
  string internal constant US_INVESTORS_LIMIT = "us_investors_limit";
  string internal constant US_ACCREDITED_INVESTORS_LIMIT = "us_accredited_investors_limit";
  string internal constant NON_ACCREDITED_INVESTORS_LIMIT = "non_accredited_investors_limit";
  string internal constant MAX_US_INVESTORS_PERCENTAGE = "max_us_investors_percentage";
  string internal constant BLOCK_FLOWBACK_END_TIME = "block_flowback_end_time";
  string internal constant NON_US_LOCK_PERIOD = "non_us_lock_period";
  string internal constant MINIMUM_TOTAL_INVESTORS = "minimum_total_investors";
  string internal constant MINIMUM_HOLDINGS_PER_INVESTOR = "minimum_holdings_per_investor";
  string internal constant MAXIMUM_HOLDINGS_PER_INVESTOR = "maximum_holdings_per_investor";
  string internal constant FORCE_ACCREDITED = "force_accredited";
  string internal constant FORCE_ACCREDITED_US = "force_accredited_us";
  string internal constant EU_RETAIL_LIMIT = "eu_retail_limit";
  string internal constant US_LOCK_PERIOD = "us_lock_period";

  function setCountryCompliance(string _country, uint _value) onlyIssuerOrAbove public {
      setUint(COUNTRIES, _country, _value);
  }

  function getCountryCompliance(string _country) view public returns (uint) {
      return getUint(COUNTRIES, _country);
  }

  function getTotalInvestorsLimit() public view returns (uint) {
    return getUint(TOTAL_INVESTORS_LIMIT);
  }

  function setTotalInvestorsLimit(uint _value) public onlyIssuerOrAbove {
    setUint(TOTAL_INVESTORS_LIMIT, _value);
  }

  function getMinUsTokens() public view returns (uint) {
    return getUint(MIN_US_TOKENS);
  }

  function setMinUsTokens(uint _value) public onlyIssuerOrAbove {
    setUint(MIN_US_TOKENS, _value);
  }

  function getMinEuTokens() public view returns (uint) {
    return getUint(MIN_EU_TOKENS);
  }

  function setMinEuTokens(uint _value) public onlyIssuerOrAbove {
    setUint(MIN_EU_TOKENS, _value);
  }

  function getUsInvestorsLimit() public view returns (uint) {
    return getUint(US_INVESTORS_LIMIT);
  }

  function setUsInvestorsLimit(uint _value) public onlyIssuerOrAbove {
    setUint(US_INVESTORS_LIMIT, _value);
  }

  function getUsAccreditedInvestorsLimit() public view returns (uint) {
    return getUint(US_ACCREDITED_INVESTORS_LIMIT);
  }

  function setUsAccreditedInvestorsLimit(uint _value) public onlyIssuerOrAbove {
    setUint(US_ACCREDITED_INVESTORS_LIMIT, _value);
  }

  function getNonAccreditedInvestorsLimit() public view returns (uint) {
    return getUint(NON_ACCREDITED_INVESTORS_LIMIT);
  }

  function setNonAccreditedInvestorsLimit(uint _value) public onlyIssuerOrAbove {
    setUint(NON_ACCREDITED_INVESTORS_LIMIT, _value);
  }

  function getMaxUsInvestorsPercentage() public view returns (uint) {
    return getUint(MAX_US_INVESTORS_PERCENTAGE);
  }

  function setMaxUsInvestorsPercentage(uint _value) public onlyIssuerOrAbove {
    setUint(MAX_US_INVESTORS_PERCENTAGE, _value);
  }

  function getBlockFlowbackEndTime() public view returns (uint) {
    return getUint(BLOCK_FLOWBACK_END_TIME);
  }

  function setBlockFlowbackEndTime(uint _value) public onlyIssuerOrAbove {
    setUint(BLOCK_FLOWBACK_END_TIME, _value);
  }

  function getNonUsLockPeriod() public view returns (uint) {
    return getUint(NON_US_LOCK_PERIOD);
  }

  function setNonUsLockPeriod(uint _value) public onlyIssuerOrAbove {
    setUint(NON_US_LOCK_PERIOD, _value);
  }

  function getMinimumTotalInvestors() public view returns (uint) {
    return getUint(MINIMUM_TOTAL_INVESTORS);
  }

  function setMinimumTotalInvestors(uint _value) public onlyIssuerOrAbove {
    setUint(MINIMUM_TOTAL_INVESTORS, _value);
  }

  function getMinimumHoldingsPerInvestor() public view returns (uint) {
    return getUint(MINIMUM_HOLDINGS_PER_INVESTOR);
  }

  function setMinimumHoldingsPerInvestor(uint _value) public onlyIssuerOrAbove {
    setUint(MINIMUM_HOLDINGS_PER_INVESTOR, _value);
  }

  function getMaximumHoldingsPerInvestor() public view returns (uint) {
    return getUint(MAXIMUM_HOLDINGS_PER_INVESTOR);
  }

  function setMaximumHoldingsPerInvestor(uint _value) public onlyIssuerOrAbove {
    setUint(MAXIMUM_HOLDINGS_PER_INVESTOR, _value);
  }


  function getEuRetailLimit() public view returns (uint) {
    return getUint(EU_RETAIL_LIMIT);
  }

  function setEuRetailLimit(uint _value) public onlyIssuerOrAbove {
    setUint(EU_RETAIL_LIMIT, _value);
  }

  function getUsLockPeriod() public view returns (uint) {
    return getUint(US_LOCK_PERIOD);
  }

  function setUsLockPeriod(uint _value) public onlyIssuerOrAbove {
    setUint(US_LOCK_PERIOD, _value);
  }

  function getForceFullTransfer() public view returns (bool) {
    return getBoolean(FORCE_FULL_TRANSFER);
  }

  function setForceFullTransfer(bool _value) public onlyIssuerOrAbove {
    setBoolean(FORCE_FULL_TRANSFER, _value);
  }

  function getForceAccreditedUS() public view returns (bool) {
    return getBoolean(FORCE_ACCREDITED_US);
  }

  function setForceAccreditedUS(bool _value) public onlyIssuerOrAbove {
    setBoolean(FORCE_ACCREDITED_US, _value);
  }

  function getForceAccredited() public view returns (bool) {
    return getBoolean(FORCE_ACCREDITED);
  }

  function setForceAccredited(bool _value) public onlyIssuerOrAbove {
    setBoolean(FORCE_ACCREDITED, _value);
  }

  function setAll(uint[] _uint_values, bool[] _bool_values) public onlyIssuerOrAbove {
    require(_uint_values.length == 14);
    require(_bool_values.length == 3);
    setTotalInvestorsLimit(_uint_values[0]);
    setMinUsTokens(_uint_values[1]);
    setMinEuTokens(_uint_values[2]);
    setUsInvestorsLimit(_uint_values[3]);
    setUsAccreditedInvestorsLimit(_uint_values[4]);
    setNonAccreditedInvestorsLimit(_uint_values[5]);
    setMaxUsInvestorsPercentage(_uint_values[6]);
    setBlockFlowbackEndTime(_uint_values[7]);
    setNonUsLockPeriod(_uint_values[8]);
    setMinimumTotalInvestors(_uint_values[9]);
    setMinimumHoldingsPerInvestor(_uint_values[10]);
    setMaximumHoldingsPerInvestor(_uint_values[11]);
    setEuRetailLimit(_uint_values[12]);
    setUsLockPeriod(_uint_values[13]);
    setForceFullTransfer(_bool_values[0]);
    setForceAccredited(_bool_values[1]);
    setForceAccreditedUS(_bool_values[2]);
  }

  function getAll() public view returns (uint[],bool[]){
    uint[] memory uintValues = new uint[](14);
    bool[] memory boolValues = new bool[](3);

    uintValues[0] = getTotalInvestorsLimit();
    uintValues[1] = getMinUsTokens();
    uintValues[2] = getMinEuTokens();
    uintValues[3] = getUsInvestorsLimit();
    uintValues[4] = getUsAccreditedInvestorsLimit();
    uintValues[5] = getNonAccreditedInvestorsLimit();
    uintValues[6] = getMaxUsInvestorsPercentage();
    uintValues[7] = getBlockFlowbackEndTime();
    uintValues[8] = getNonUsLockPeriod();
    uintValues[9] = getMinimumTotalInvestors();
    uintValues[10] = getMinimumHoldingsPerInvestor();
    uintValues[11] = getMaximumHoldingsPerInvestor();
    uintValues[12] = getEuRetailLimit();
    uintValues[13] = getUsLockPeriod();
    boolValues[0] = getForceFullTransfer();
    boolValues[1] = getForceAccredited();
    boolValues[2] = getForceAccreditedUS();
    return (uintValues,boolValues);
  }
}
