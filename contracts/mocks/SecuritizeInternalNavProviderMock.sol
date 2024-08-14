//SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.20;

import "../nav/ISecuritizeNavProvider.sol";


contract SecuritizeInternalNavProviderMock is ISecuritizeNavProvider {
    /**
     * @dev rate: NAV rate expressed with 6 decimals
     */
    uint256 public rate;

    constructor(uint256 _rate) {
        rate = _rate;
    }

    function initialize(uint256 _rate) public override {
        rate = _rate;
    }

    function setRate(uint256 _rate) external override {
        rate = _rate;
    }
}
