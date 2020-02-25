pragma solidity ^0.5.0;

import "../utils/VersionedContract.sol";
import "../utils/Initializable.sol";
import "../omnibus/IDSOmnibusWalletController.sol";

contract IDSRegistryService is Initializable, VersionedContract {
    constructor() internal {}

    function initialize() public isNotInitialized {
        VERSIONS.push(3);
    }

    event DSRegistryServiceInvestorAdded(string _investorId, address _sender);
    event DSRegistryServiceInvestorRemoved(string _investorId, address _sender);
    event DSRegistryServiceInvestorCountryChanged(string _investorId, string _country, address _sender);
    event DSRegistryServiceInvestorAttributeChanged(string _investorId, uint256 _attributeId, uint256 _value, uint256 _expiry, string _proofHash, address _sender);
    event DSRegistryServiceWalletAdded(address _wallet, string _investorId, address _sender);
    event DSRegistryServiceWalletRemoved(address _wallet, string _investorId, address _sender);
    event DSRegistryServiceOmnibusWalletAdded(address _omnibusWallet, string _investorId, IDSOmnibusWalletController omnibusWalletController);
    event DSRegistryServiceOmnibusWalletRemoved(address _omnibusWallet, string _investorId);

    uint8 public constant NONE = 0;
    uint8 public constant KYC_APPROVED = 1;
    uint8 public constant ACCREDITED = 2;
    uint8 public constant QUALIFIED = 4;
    uint8 public constant PROFESSIONAL = 8;

    uint8 public constant PENDING = 0;
    uint8 public constant APPROVED = 1;
    uint8 public constant REJECTED = 2;

    modifier investorExists(string memory _id) {
        require(isInvestor(_id), "Unknown investor");
        _;
    }

    modifier newInvestor(string memory _id) {
        require(!isInvestor(_id));
        _;
    }

    modifier walletExists(address _address) {
        require(isWallet(_address));
        _;
    }

    modifier newWallet(address _address) {
        require(!isWallet(_address));
        _;
    }

    modifier newOmnibusWallet(address _omnibusWallet) {
        require(!isOmnibusWallet(_omnibusWallet));
        _;
    }

    modifier omnibusWalletExists(address _omnibusWallet) {
        require(isOmnibusWallet(_omnibusWallet));
        _;
    }

    modifier walletBelongsToInvestor(address _address, string memory _id) {
        require(keccak256(abi.encodePacked(getInvestor(_address))) == keccak256(abi.encodePacked(_id)));
        _;
    }

    function registerInvestor(
        string memory _id,
        string memory _collision_hash /*onlyExchangeOrAbove newInvestor(_id)*/
    ) public returns (bool);
    function updateInvestor(
        string memory _id,
        string memory _collisionHash,
        string memory _country,
        address[] memory _wallets,
        uint8[] memory _attributeIds,
        uint256[] memory _attributeValues,
        uint256[] memory _attributeExpirations /*onlyIssuerOrAbove*/
    ) public returns (bool);
    function removeInvestor(
        string memory _id /*onlyExchangeOrAbove investorExists(_id)*/
    ) public returns (bool);
    function setCountry(
        string memory _id,
        string memory _country /*onlyExchangeOrAbove investorExists(_id)*/
    ) public returns (bool);
    function getCountry(string memory _id) public view returns (string memory);
    function getCollisionHash(string memory _id) public view returns (string memory);
    function setAttribute(
        string memory _id,
        uint8 _attributeId,
        uint256 _value,
        uint256 _expiry,
        string memory _proofHash /*onlyExchangeOrAbove investorExists(_id)*/
    ) public returns (bool);
    function getAttributeValue(string memory _id, uint8 _attributeId) public view returns (uint256);
    function getAttributeExpiry(string memory _id, uint8 _attributeId) public view returns (uint256);
    function getAttributeProofHash(string memory _id, uint8 _attributeId) public view returns (string memory);
    function addWallet(
        address _address,
        string memory _id /*onlyExchangeOrAbove newWallet(_address)*/
    ) public returns (bool);
    function removeWallet(
        address _address,
        string memory _id /*onlyExchangeOrAbove walletExists walletBelongsToInvestor(_address, _id)*/
    ) public returns (bool);
    function addOmnibusWallet(
        string memory _id,
        address _omnibusWallet,
        IDSOmnibusWalletController _omnibusWalletController /*onlyIssuerOrAbove newOmnibusWallet*/
    ) public;
    function removeOmnibusWallet(
        string memory _id,
        address _omnibusWallet /*onlyIssuerOrAbove omnibusWalletControllerExists*/
    ) public;
    function getOmnibusWalletController(address _omnibusWallet) public view returns (IDSOmnibusWalletController);
    function isOmnibusWallet(address _omnibusWallet) public view returns (bool);
    function getInvestor(address _address) public view returns (string memory);
    function getInvestorDetails(address _address) public view returns (string memory, string memory);
    function getInvestorDetailsFull(string memory _id)
        public
        view
        returns (string memory, uint256[] memory, uint256[] memory, string memory, string memory, string memory, string memory);

    function isInvestor(string memory _id) public view returns (bool);
    function isWallet(address _address) public view returns (bool);
}
