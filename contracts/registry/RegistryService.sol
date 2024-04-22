pragma solidity ^0.8.20;

import "./IDSRegistryService.sol";
import "../service/ServiceConsumer.sol";
import "../data-stores/RegistryServiceDataStore.sol";
import "../utils/ProxyTarget.sol";

//SPDX-License-Identifier: UNLICENSED
contract RegistryService is ProxyTarget, Initializable, IDSRegistryService, ServiceConsumer, RegistryServiceDataStore {
    function initialize() public override(IDSRegistryService, ServiceConsumer) initializer forceInitializeFromProxy {
        IDSRegistryService.initialize();
        ServiceConsumer.initialize();
        VERSIONS.push(6);
    }

    function registerInvestor(string memory _id, string memory _collisionHash) public override onlyExchangeOrAbove newInvestor(_id) returns (bool) {
        investors[_id] = Investor(_id, _collisionHash, msg.sender, msg.sender, "", 0);

        emit DSRegistryServiceInvestorAdded(_id, msg.sender);

        return true;
    }

    function removeInvestor(string memory _id) public override onlyExchangeOrAbove investorExists(_id) returns (bool) {
        require(getTrustService().getRole(msg.sender) != EXCHANGE || investors[_id].creator == msg.sender, "Insufficient permissions");
        require(investors[_id].walletCount == 0, "Investor has wallets");

        for (uint8 index = 0; index < 16; index++) {
            delete attributes[_id][index];
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
    ) public override onlyIssuerOrTransferAgentOrAbove returns (bool) {
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
        override
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

    function setCountry(string memory _id, string memory _country) public override onlyExchangeOrAbove investorExists(_id) returns (bool) {
        string memory prevCountry = getCountry(_id);

        getComplianceService().adjustInvestorCountsAfterCountryChange(_id, _country, prevCountry);

        investors[_id].country = _country;
        investors[_id].lastUpdatedBy = msg.sender;

        emit DSRegistryServiceInvestorCountryChanged(_id, _country, msg.sender);

        return true;
    }

    function getCountry(string memory _id) public view override returns (string memory) {
        return investors[_id].country;
    }

    function getCollisionHash(string memory _id) public view override returns (string memory) {
        return investors[_id].collisionHash;
    }

    function setAttribute(string memory _id, uint8 _attributeId, uint256 _value, uint256 _expiry, string memory _proofHash)
        public
        override
        onlyExchangeOrAbove
        investorExists(_id)
        returns (bool)
    {
        require(_attributeId < 16, "Unknown attribute");

        attributes[_id][_attributeId].value = _value;
        attributes[_id][_attributeId].expiry = _expiry;
        attributes[_id][_attributeId].proofHash = _proofHash;
        investors[_id].lastUpdatedBy = msg.sender;

        emit DSRegistryServiceInvestorAttributeChanged(_id, _attributeId, _value, _expiry, _proofHash, msg.sender);

        return true;
    }

    function getAttributeValue(string memory _id, uint8 _attributeId) public view override returns (uint256) {
        return attributes[_id][_attributeId].value;
    }

    function getAttributeExpiry(string memory _id, uint8 _attributeId) public view override returns (uint256) {
        return attributes[_id][_attributeId].expiry;
    }

    function getAttributeProofHash(string memory _id, uint8 _attributeId) public view override returns (string memory) {
        return attributes[_id][_attributeId].proofHash;
    }

    function addWallet(address _address, string memory _id) public override onlyExchangeOrAbove investorExists(_id) newWallet(_address) returns (bool) {
        require(!getWalletManager().isSpecialWallet(_address), "Wallet has special role");

        investorsWallets[_address] = Wallet(_id, msg.sender, msg.sender);
        investors[_id].walletCount++;

        emit DSRegistryServiceWalletAdded(_address, _id, msg.sender);

        return true;
    }

    /**
     * @dev Add wallet by investor. This method should verify the new wallet to add,
     * the sender should be an investor, and the new wallet will be added to the retrieved investor (msg.sender)
     * @param _address - Wallet to be added
     * @return bool
     */
    function addWalletByInvestor(address _address) public override newWallet(_address) returns (bool) {
        require(!getWalletManager().isSpecialWallet(_address), "Wallet has special role");

        string memory owner = getInvestor(msg.sender);
        require(isInvestor(owner), "Unknown investor");

        investorsWallets[_address] = Wallet(owner, msg.sender, msg.sender);
        investors[owner].walletCount++;

        emit DSRegistryServiceWalletAdded(_address, owner, msg.sender);

        return true;
    }

    function removeWallet(address _address, string memory _id) public override onlyExchangeOrAbove walletExists(_address) walletBelongsToInvestor(_address, _id) returns (bool) {
        require(getTrustService().getRole(msg.sender) != EXCHANGE || investorsWallets[_address].creator == msg.sender, "Insufficient permissions");

        delete investorsWallets[_address];
        investors[_id].walletCount--;

        emit DSRegistryServiceWalletRemoved(_address, _id, msg.sender);

        return true;
    }

    function addOmnibusWallet(string memory _id, address _omnibusWallet, IDSOmnibusWalletController _omnibusWalletController)
        public
        override
        onlyIssuerOrAbove
        newOmnibusWallet(_omnibusWallet)
    {
        addWallet(_omnibusWallet, _id);
        omnibusWalletsControllers[_omnibusWallet] = _omnibusWalletController;
        emit DSRegistryServiceOmnibusWalletAdded(_omnibusWallet, _id, _omnibusWalletController);
    }

    function removeOmnibusWallet(string memory _id, address _omnibusWallet) public override onlyIssuerOrAbove omnibusWalletExists(_omnibusWallet) {
        removeWallet(_omnibusWallet, _id);
        delete omnibusWalletsControllers[_omnibusWallet];
        emit DSRegistryServiceOmnibusWalletRemoved(_omnibusWallet, _id);
    }

    function getOmnibusWalletController(address _omnibusWallet) public view override returns (IDSOmnibusWalletController) {
        return omnibusWalletsControllers[_omnibusWallet];
    }

    function isOmnibusWallet(address _omnibusWallet) public view override returns (bool) {
        return address(omnibusWalletsControllers[_omnibusWallet]) != address(0);
    }

    function getInvestor(address _address) public view override returns (string memory) {
        return investorsWallets[_address].owner;
    }

    function getInvestorDetails(address _address) public view override returns (string memory, string memory) {
        return (getInvestor(_address), getCountry(getInvestor(_address)));
    }

    function isInvestor(string memory _id) public view override returns (bool) {
        return !CommonUtils.isEmptyString(investors[_id].id);
    }

    function isAccreditedInvestor(string calldata _id) external view override returns (bool) {
        return getAttributeValue(_id, ACCREDITED) == APPROVED;
    }

    function isAccreditedInvestor(address _wallet) external view override returns (bool) {
        string memory investor = investorsWallets[_wallet].owner;
        return getAttributeValue(investor, ACCREDITED) == APPROVED;
    }

    function isQualifiedInvestor(address _wallet) external view override returns (bool) {
        string memory investor = investorsWallets[_wallet].owner;
        return getAttributeValue(investor, QUALIFIED) == APPROVED;
    }

    function isQualifiedInvestor(string calldata _id) external view override returns (bool) {
        return getAttributeValue(_id, QUALIFIED) == APPROVED;
    }

    function getInvestors(address _from, address _to) external view override returns (string memory, string memory) {
        return (investorsWallets[_from].owner, investorsWallets[_to].owner);
    }

    function isWallet(address _address) public view override returns (bool) {
        return isInvestor(getInvestor(_address));
    }
}
