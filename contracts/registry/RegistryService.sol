pragma solidity 0.5.17;

import "../zeppelin/math/SafeMath.sol";
import "./IDSRegistryService.sol";
import "../service/ServiceConsumer.sol";
import "../data-stores/RegistryServiceDataStore.sol";
import "../utils/ProxyTarget.sol";

contract RegistryService is ProxyTarget, Initializable, IDSRegistryService, ServiceConsumer, RegistryServiceDataStore {
    function initialize() public initializer forceInitializeFromProxy {
        IDSRegistryService.initialize();
        ServiceConsumer.initialize();
        VERSIONS.push(5);
    }

    function registerInvestor(string memory _id, string memory _collisionHash) public onlyExchangeOrAbove newInvestor(_id) returns (bool) {
        investors[_id] = Investor(_id, _collisionHash, msg.sender, msg.sender, "", 0);

        emit DSRegistryServiceInvestorAdded(_id, msg.sender);

        return true;
    }

    function removeInvestor(string memory _id) public onlyExchangeOrAbove investorExists(_id) returns (bool) {
        IDSTrustService trustManager = getTrustService();
        require(trustManager.getRole(msg.sender) != trustManager.EXCHANGE() || investors[_id].creator == msg.sender, "Insufficient permissions");
        require(investors[_id].walletCount == 0, "Investor has wallets");

        for (uint8 index = 0; index < 16; index++) {
            delete investors[_id].attributes[index];
        }

        delete investors[_id];

        emit DSRegistryServiceInvestorRemoved(_id, msg.sender);

        return true;
    }

    function updateInvestor(
        string memory _id,
        string memory _collisionHash,
        string memory _country,
        address[] memory _wallets,
        uint8[] memory _attributeIds,
        uint256[] memory _attributeValues,
        uint256[] memory _attributeExpirations
    ) public onlyIssuerOrAbove returns (bool) {
        require(_attributeValues.length == _attributeIds.length, "Wrong length of parameters");
        require(_attributeIds.length == _attributeExpirations.length, "Wrong length of parameters");

        if (!isInvestor(_id)) {
            registerInvestor(_id, _collisionHash);
        }

        if (bytes(_country).length > 0) {
            setCountry(_id, _country);
        }

        for (uint256 i = 0; i < _wallets.length; i++) {
            if (isWallet(_wallets[i])) {
                require(CommonUtils.isEqualString(getInvestor(_wallets[i]), _id), "Wallet belongs to a different investor");
            } else {
                addWallet(_wallets[i], _id);
            }
        }

        for (uint256 i = 0; i < _attributeIds.length; i++) {
            setAttribute(_id, _attributeIds[i], _attributeValues[i], _attributeExpirations[i], "");
        }

        return true;
    }

    function getInvestorDetailsFull(string memory _id)
        public
        view
        returns (string memory, uint256[] memory, uint256[] memory, string memory, string memory, string memory, string memory)
    {
        string memory country = investors[_id].country;
        uint256[] memory attributeValues = new uint256[](4);
        uint256[] memory attributeExpiries = new uint256[](4);
        string[] memory attributeProofHashes = new string[](4);
        for (uint8 i = 0; i < 4; i++) {
            attributeValues[i] = getAttributeValue(_id, (uint8(2)**i));
            attributeExpiries[i] = getAttributeExpiry(_id, (uint8(2)**i));
            attributeProofHashes[i] = getAttributeProofHash(_id, (uint8(2)**i));
        }
        return (country, attributeValues, attributeExpiries, attributeProofHashes[0], attributeProofHashes[1], attributeProofHashes[2], attributeProofHashes[3]);
    }

    function setCountry(string memory _id, string memory _country) public onlyExchangeOrAbove investorExists(_id) returns (bool) {
        string memory prevCountry = getCountry(_id);

        getComplianceService().adjustInvestorCountsAfterCountryChange(_id, _country, prevCountry);

        investors[_id].country = _country;
        investors[_id].lastUpdatedBy = msg.sender;

        emit DSRegistryServiceInvestorCountryChanged(_id, _country, msg.sender);

        return true;
    }

    function getCountry(string memory _id) public view returns (string memory) {
        return investors[_id].country;
    }

    function getCollisionHash(string memory _id) public view returns (string memory) {
        return investors[_id].collisionHash;
    }

    function setAttribute(string memory _id, uint8 _attributeId, uint256 _value, uint256 _expiry, string memory _proofHash)
        public
        onlyExchangeOrAbove
        investorExists(_id)
        returns (bool)
    {
        require(_attributeId < 16, "Unknown attribute");

        investors[_id].attributes[_attributeId].value = _value;
        investors[_id].attributes[_attributeId].expiry = _expiry;
        investors[_id].attributes[_attributeId].proofHash = _proofHash;
        investors[_id].lastUpdatedBy = msg.sender;

        emit DSRegistryServiceInvestorAttributeChanged(_id, _attributeId, _value, _expiry, _proofHash, msg.sender);

        return true;
    }

    function getAttributeValue(string memory _id, uint8 _attributeId) public view returns (uint256) {
        return investors[_id].attributes[_attributeId].value;
    }

    function getAttributeExpiry(string memory _id, uint8 _attributeId) public view returns (uint256) {
        return investors[_id].attributes[_attributeId].expiry;
    }

    function getAttributeProofHash(string memory _id, uint8 _attributeId) public view returns (string memory) {
        return investors[_id].attributes[_attributeId].proofHash;
    }

    function addWallet(address _address, string memory _id) public onlyExchangeOrAbove investorExists(_id) newWallet(_address) returns (bool) {
        require(!getWalletManager().isSpecialWallet(_address), "Wallet has special role");

        investorsWallets[_address] = Wallet(_id, msg.sender, msg.sender);
        investors[_id].walletCount = investors[_id].walletCount.add(1);

        emit DSRegistryServiceWalletAdded(_address, _id, msg.sender);

        return true;
    }

    function removeWallet(address _address, string memory _id) public onlyExchangeOrAbove walletExists(_address) walletBelongsToInvestor(_address, _id) returns (bool) {
        IDSTrustService trustManager = getTrustService();
        require(trustManager.getRole(msg.sender) != trustManager.EXCHANGE() || investorsWallets[_address].creator == msg.sender, "Insufficient permissions");

        delete investorsWallets[_address];
        investors[_id].walletCount = investors[_id].walletCount.sub(1);

        emit DSRegistryServiceWalletRemoved(_address, _id, msg.sender);

        return true;
    }

    function addOmnibusWallet(string memory _id, address _omnibusWallet, IDSOmnibusWalletController _omnibusWalletController)
        public
        onlyIssuerOrAbove
        newOmnibusWallet(_omnibusWallet)
    {
        addWallet(_omnibusWallet, _id);
        omnibusWalletsControllers[_omnibusWallet] = _omnibusWalletController;
        emit DSRegistryServiceOmnibusWalletAdded(_omnibusWallet, _id, _omnibusWalletController);
    }

    function removeOmnibusWallet(string memory _id, address _omnibusWallet) public onlyIssuerOrAbove omnibusWalletExists(_omnibusWallet) {
        removeWallet(_omnibusWallet, _id);
        delete omnibusWalletsControllers[_omnibusWallet];
        emit DSRegistryServiceOmnibusWalletRemoved(_omnibusWallet, _id);
    }

    function getOmnibusWalletController(address _omnibusWallet) public view returns (IDSOmnibusWalletController) {
        return omnibusWalletsControllers[_omnibusWallet];
    }

    function isOmnibusWallet(address _omnibusWallet) public view returns (bool) {
        return address(omnibusWalletsControllers[_omnibusWallet]) != address(0);
    }

    function getInvestor(address _address) public view returns (string memory) {
        return investorsWallets[_address].owner;
    }

    function getInvestorDetails(address _address) public view returns (string memory, string memory) {
        return (getInvestor(_address), getCountry(getInvestor(_address)));
    }

    function isInvestor(string memory _id) public view returns (bool) {
        return !CommonUtils.isEmptyString(investors[_id].id);
    }

    function isWallet(address _address) public view returns (bool) {
        return isInvestor(getInvestor(_address));
    }
}
