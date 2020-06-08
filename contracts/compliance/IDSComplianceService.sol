pragma solidity 0.5.17;

import "../utils/VersionedContract.sol";
import "../utils/Initializable.sol";


contract IDSComplianceService is Initializable, VersionedContract {
    constructor() internal {}

    function initialize() public {
        VERSIONS.push(4);
    }

    uint256 internal constant NONE = 0;
    uint256 internal constant US = 1;
    uint256 internal constant EU = 2;
    uint256 internal constant FORBIDDEN = 4;
    uint256 internal constant JP = 8;
    string internal constant TOKEN_PAUSED = "Token Paused";
    string internal constant NOT_ENOUGH_TOKENS = "Not Enough Tokens";
    string internal constant TOKENS_LOCKED = "Tokens Locked";
    string internal constant WALLET_NOT_IN_REGISTRY_SERVICE = "Wallet not in registry Service";
    string internal constant DESTINATION_RESTRICTED = "Destination restricted";
    string internal constant VALID = "Valid";
    string internal constant HOLD_UP = "Hold-up";
    string internal constant HOLD_UP_1Y = "Hold-up 1y";
    string internal constant ONLY_FULL_TRANSFER = "Only Full Transfer";
    string internal constant FLOWBACK = "Flowback";
    string internal constant MAX_INVESTORS_IN_CATEGORY = "Max Investors in category";
    string internal constant AMOUNT_OF_TOKENS_UNDER_MIN = "Amount of tokens under min";
    string internal constant AMOUNT_OF_TOKENS_ABOVE_MAX = "Amount of tokens above max";
    string internal constant ONLY_ACCREDITED = "Only accredited";
    string internal constant ONLY_US_ACCREDITED = "Only us accredited";
    string internal constant NOT_ENOUGH_INVESTORS = "Not enough investors";

    function adjustInvestorCountsAfterCountryChange(string memory _id, string memory _country, string memory _prevCountry) public returns (bool);

    //*****************************************
    // TOKEN ACTION VALIDATIONS
    //*****************************************

    function validateTransfer(
        address _from,
        address _to,
        uint256 _value /*onlyToken*/
    ) public returns (bool);

    function validateOmnibusInternalTransfer(
        address _omnibusWallet,
        address _from,
        address _to,
        uint256 _value /*onlyOmnibusWalletController*/
    ) public returns (bool);

    function validateIssuance(
        address _to,
        uint256 _value,
        uint256 _issuanceTime /*onlyToken*/
    ) public returns (bool);

    function validateBurn(
        address _who,
        uint256 _value /*onlyToken*/
    ) public returns (bool);

    function validateOmnibusBurn(
        address _omnibusWallet,
        address _who,
        uint256 _value /*onlyToken*/
    ) public returns (bool);

    function validateSeize(
        address _from,
        address _to,
        uint256 _value /*onlyToken*/
    ) public returns (bool);

    function validateOmnibusSeize(
        address _omnibusWallet,
        address _from,
        address _to,
        uint256 _value /*onlyToken*/
    ) public returns (bool);

    function preIssuanceCheck(address _to, uint256 _value) public view returns (uint256 code, string memory reason);

    function preTransferCheck(address _from, address _to, uint256 _value) public view returns (uint256 code, string memory reason);

    function preInternalTransferCheck(address _from, address _to, uint256 _value, address _omnibusWallet) public view returns (uint256 code, string memory reason);
}
