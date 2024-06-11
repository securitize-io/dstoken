pragma solidity ^0.8.20;

import "./IDSTokenIssuer.sol";
import "../utils/BaseDSContract.sol";

//SPDX-License-Identifier: GPL-3.0
contract TokenIssuer is IDSTokenIssuer, BaseDSContract {
    function initialize() public override onlyProxy initializer {
        __BaseDSContract_init();
    }

    function issueTokens(
        string memory _id,
        address _to,
        uint256[] memory _issuanceValues,
        string calldata _reason,
        uint256[] memory _locksValues,
        uint64[] memory _lockReleaseTimes,
        string memory _collisionHash,
        string memory _country,
        uint256[] memory _attributeValues,
        uint256[] memory _attributeExpirations
    ) public override onlyIssuerOrAbove returns (bool) {
        require(_issuanceValues.length == 2, "Wrong length of parameters");
        require(_attributeValues.length == _attributeExpirations.length, "Wrong length of parameters");
        require(_locksValues.length == _lockReleaseTimes.length, "Wrong length of parameters");
        if (getRegistryService().isWallet(_to)) {
            require(CommonUtils.isEqualString(getRegistryService().getInvestor(_to), _id), "Wallet does not belong to investor");
        } else {
            registerInvestor(_id, _to, _collisionHash, _country, _attributeValues, _attributeExpirations);
        }

        getToken().issueTokensWithMultipleLocks(_to, _issuanceValues[0], _issuanceValues[1], _locksValues, _reason, _lockReleaseTimes);

        return true;
    }

    function registerInvestor(
        string memory _id,
        address _wallet,
        string memory _collisionHash,
        string memory _country,
        uint256[] memory _attributeValues,
        uint256[] memory _attributeExpirations
    ) private {
        if (!getRegistryService().isInvestor(_id)) {
            getRegistryService().registerInvestor(_id, _collisionHash);
            getRegistryService().setCountry(_id, _country);

            if (_attributeValues.length > 0) {
                require(_attributeValues.length == 3, "Wrong length of parameters");
                getRegistryService().setAttribute(_id, KYC_APPROVED, _attributeValues[0], _attributeExpirations[0], "");
                getRegistryService().setAttribute(_id, ACCREDITED, _attributeValues[1], _attributeExpirations[1], "");
                getRegistryService().setAttribute(_id, QUALIFIED, _attributeValues[2], _attributeExpirations[2], "");
            }

        }
        getRegistryService().addWallet(_wallet, _id);
    }
}
