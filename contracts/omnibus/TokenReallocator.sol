pragma solidity ^0.8.13;

import "../service/ServiceConsumer.sol";
import "../utils/ProxyTarget.sol";
import "./IDSTokenReallocator.sol";

//SPDX-License-Identifier: UNLICENSED
contract TokenReallocator is ProxyTarget, Initializable, ServiceConsumer, IDSTokenReallocator {
    function initialize() public override(ServiceConsumer, IDSTokenReallocator) initializer forceInitializeFromProxy {
        ServiceConsumer.initialize();
        VERSIONS.push(1);
    }

    function reallocateTokens (
        string memory _id,
        address _wallet,
        string memory _collisionHash,
        string memory _country,
        uint8[] memory _attributeIds,
        uint256[] memory _attributeValues,
        uint256[] memory _attributeExpirations,
        uint256 _value,
        bool isAffiliate
    ) public override onlyIssuerOrTransferAgentOrAbove returns (bool) {
        require(_attributeValues.length == _attributeIds.length, "Wrong length of parameters");
        require(_attributeIds.length == _attributeExpirations.length, "Wrong length of parameters");
        IDSRegistryService registryService = getRegistryService();

        if (registryService.isWallet(_wallet)) {
            require(CommonUtils.isEqualString(registryService.getInvestor(_wallet), _id), "Wallet belongs to a different investor");
        } else {
            if (!registryService.isInvestor(_id)) {
                registryService.registerInvestor(_id, _collisionHash);
                registryService.setCountry(_id, _country);

                for (uint256 i = 0; i < _attributeIds.length; i++) {
                    registryService.setAttribute(_id, _attributeIds[i], _attributeValues[i], _attributeExpirations[i], "");
                }
            }
            registryService.addWallet(_wallet, _id);
        }

        address[] memory addresses = new address[](1);
        uint256[] memory values = new uint256[](1);
        addresses[0] = _wallet;
        values[0] = _value;
        getOmnibusTBEController().bulkTransfer(addresses, values);

        if (isAffiliate && !getLockManager().isInvestorLocked(_id)) {
            getLockManager().lockInvestor(_id);
        }
        return true;
    }
}
