pragma solidity ^0.5.0;

import "./IDSTokenIssuer.sol";
import "../service/ServiceConsumer.sol";
import "../utils/ProxyTarget.sol";

contract TokenIssuer is ProxyTarget, Initializable, IDSTokenIssuer, ServiceConsumer {
    function initialize() public initializer onlyFromProxy {
        IDSTokenIssuer.initialize();
        ServiceConsumer.initialize();
        VERSIONS.push(2);
    }

    function issueTokens(
        string memory _id,
        address _to,
        uint256[] memory _issuanceValues,
        string memory _reason,
        uint256[] memory _locksValues,
        uint64[] memory _lockReleaseTimes,
        string memory _collisionHash,
        string memory _country,
        uint256[] memory _attributeValues,
        uint256[] memory _attributeExpirations
    ) public onlyIssuerOrAbove returns (bool) {
        require(_issuanceValues.length == 2);
        require(_attributeValues.length == 3);
        require(_attributeExpirations.length == 3);
        require(_locksValues.length == _lockReleaseTimes.length);

        if (getRegistryService().isWallet(_to)) {
            require(keccak256(abi.encodePacked(getRegistryService().getInvestor(_to))) == keccak256(abi.encodePacked(_id)), "Wallet does not belong to investor");
        } else {
            if (!getRegistryService().isInvestor(_id)) {
                getRegistryService().registerInvestor(_id, _collisionHash);
                getRegistryService().setCountry(_id, _country);
            }

            getRegistryService().addWallet(_to, _id);
        }

        getRegistryService().setAttribute(_id, getRegistryService().KYC_APPROVED(), _attributeValues[0], _attributeExpirations[0], "");
        getRegistryService().setAttribute(_id, getRegistryService().ACCREDITED(), _attributeValues[1], _attributeExpirations[1], "");
        getRegistryService().setAttribute(_id, getRegistryService().QUALIFIED(), _attributeValues[2], _attributeExpirations[2], "");

        getToken().issueTokensCustom(_to, _issuanceValues[0], _issuanceValues[1], 0, "", 0);

        for (uint256 i = 0; i < _locksValues.length; i++) {
            getLockManager().addManualLockRecord(_to, _locksValues[i], _reason, _lockReleaseTimes[i]);
        }

        return true;
    }

}
