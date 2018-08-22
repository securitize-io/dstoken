pragma solidity ^0.4.23;

import "../DSServiceConsumerInterface.sol";
import "../zeppelin/token/ERC20/ERC20.sol";

contract DSComplianceServiceInterface is DSServiceConsumerInterface {
  uint public constant NONE = 0;
  uint public constant US = 1;
  uint public constant EU = 2;
  uint public constant FORBIDDEN = 4;
  string public constant TOKEN_PAUSED = "Token Paused";
  string public constant NOT_ENOUGH_TOKENS = "Not Enough Tokens";
  string public constant TOKENS_LOCKED = "Tokens Locked";
  string public constant WALLET_NOT_IN_TEGISTRY_SERVICE = "Wallet not in registry Service";
  string public constant DESTINATION_RESTRICTED = "Destination restricted";
  string public constant COUNTRIES = "countries";
  string public constant VALID = "Valid";
  string public constant TOTAL_INVESTORS = "totalInvestors";
  string public constant US_INVESTORS_COUNT = "usInvestorsCount";
  string public constant EU_RETAIL_INVESTORS_COUNT = "euRetailInvestorsCount";
  string public constant ISSUANCES_COUNT = "issuancesCount";
  string public constant ISSUANCE_VALUE = "issuanceValue";
  string public constant ISSUANCE_TIMESTAMP = "issuanceTimestamp";
  string public constant HOLD_UP_1Y = "Hold-up 1y";
  string public constant ONLY_FULL_TRANSFER = "Only Full Transfer";
  string public constant FLOWBACK = "Flowback";
  string public constant MAX_INVESTORS_IN_CATEGORY = "Max Investors in category";
  string public constant AMOUNT_OF_TOKENS_UNDER_MIN = "Amount of tokens under min";

  modifier onlyToken() {
    assert(false);
    _;
  }

  //*****************************************
  // TOKEN ACTION VALIDATIONS
  //*****************************************

  function validateIssuance(address _to, uint _value) /*onlyToken*/ public;

  function validateBurn(address _who, uint _value) /*onlyToken*/ public returns (bool);

  function validateSeize(address _from, address _to, uint _value) /*onlyToken*/ public returns (bool);

  function validate(address _from, address _to, uint _value) /*onlyToken*/ public;

  function preIssuanceCheck(address _to, uint _value) view public returns (uint code, string reason);

  function preTransferCheck(address _from, address _to, uint _value) view public returns (uint code, string reason);

  function setCountryCompliance(string _country, uint _value) /*onlyIssuerOrAbove*/ public returns (bool);

  function getCountryCompliance(string _country) view public returns (uint);
}