pragma solidity ^0.8.20;

import "./IDSWalletRegistrar.sol";
import "../utils/BaseDSContract.sol";

//SPDX-License-Identifier: GPL-3.0
contract WalletRegistrar is IDSWalletRegistrar, BaseDSContract {
    function initialize() public override onlyProxy initializer {
        __BaseDSContract_init();
    }

    function registerWallet(
        string memory _id,
        address[] memory _wallets,
        string memory _collisionHash,
        string memory _country,
        uint8[] memory _attributeIds,
        uint256[] memory _attributeValues,
        uint256[] memory _attributeExpirations
    ) public override onlyOwnerOrIssuerOrAbove returns (bool) {
        require(_attributeValues.length == _attributeIds.length, "Wrong length of parameters");
        require(_attributeIds.length == _attributeExpirations.length, "Wrong length of parameters");

        IDSRegistryService registryService = getRegistryService();

        if (!registryService.isInvestor(_id)) {
            registryService.registerInvestor(_id, _collisionHash);
            registryService.setCountry(_id, _country);
        }

        for (uint256 i = 0; i < _wallets.length; i++) {
            if (registryService.isWallet(_wallets[i])) {
                require(CommonUtils.isEqualString(registryService.getInvestor(_wallets[i]), _id), "Wallet belongs to a different investor");
            } else {
                registryService.addWallet(_wallets[i], _id);
            }
        }

        for (uint256 i = 0; i < _attributeIds.length; i++) {
            registryService.setAttribute(_id, _attributeIds[i], _attributeValues[i], _attributeExpirations[i], "");
        }

        return true;
    }
}
