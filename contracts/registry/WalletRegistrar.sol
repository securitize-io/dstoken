pragma solidity ^0.5.0;

import "./IDSWalletRegistrar.sol";
import "../service/ServiceConsumer.sol";
import "../utils/ProxyTarget.sol";
import "../utils/Initializable.sol";

contract WalletRegistrar is ProxyTarget, Initializable, IDSWalletRegistrar, ServiceConsumer {
    function initialize() public initializer onlyFromProxy {
        VERSIONS.push(1);
    }

    function registerWallet(
        string memory _id,
        address _wallet,
        string memory _collisionHash,
        string memory _country,
        uint256[] memory _attributeValues,
        uint256[] memory _attributeExpirations
    ) public onlyOwner returns (bool) {
        require(_attributeValues.length == 3);
        require(_attributeExpirations.length == 3);

        if (getRegistryService().isWallet(_wallet)) {
            require(keccak256(abi.encodePacked(getRegistryService().getInvestor(_wallet))) == keccak256(abi.encodePacked(_id)), "Wallet does not belong to investor");
        } else {
            if (!getRegistryService().isInvestor(_id)) {
                getRegistryService().registerInvestor(_id, _collisionHash);
                getRegistryService().setCountry(_id, _country);
            }

            getRegistryService().addWallet(_wallet, _id);
        }

        getRegistryService().setAttribute(_id, getRegistryService().KYC_APPROVED(), _attributeValues[0], _attributeExpirations[0], "");
        getRegistryService().setAttribute(_id, getRegistryService().ACCREDITED(), _attributeValues[1], _attributeExpirations[1], "");
        getRegistryService().setAttribute(_id, getRegistryService().QUALIFIED(), _attributeValues[2], _attributeExpirations[2], "");

        return true;
    }
}
