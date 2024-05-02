pragma solidity ^0.8.0;

import "../service/ServiceConsumer.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

//SPDX-License-Identifier: GPL-3.0
abstract contract BaseDSContract is UUPSUpgradeable, ServiceConsumer {

    function __BaseDSContract_init() public onlyProxy onlyInitializing {
        __UUPSUpgradeable_init();
        __ServiceConsumer_init();
    }

    /**
     * @dev required by the OZ UUPS module
     */
    function _authorizeUpgrade(address) internal override onlyMaster {}

    /**
     * @dev returns proxy ERC1967 implementation address
     */
    function getImplementationAddress() external view returns (address) {
        return ERC1967Utils.getImplementation();
    }

    /**
     * @dev Returns the highest version that has been initialized. See {reinitializer}.
     */
    function getInitializedVersion() external view returns (uint64) {
        return _getInitializedVersion();
    }

}
