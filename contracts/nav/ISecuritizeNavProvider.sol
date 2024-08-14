//SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.20;

/**
 * @title ISecuritizeNavProvider
 * @dev Defines a common interface to get NAV (Native Asset Value) Rate to
 */
interface ISecuritizeNavProvider {
    /**
     * @dev Emitted when owner updates rate.
     * @param oldValue Old rate value
     * @param newValue New rate value
     */
    event RateUpdated(uint256 oldValue, uint256 newValue);

    /**
     * @dev Proxy Initializer.
     * @param _rate the initial rate value
    */
    function initialize(uint256 _rate) external;


    /**
     * @dev Set rate. It is expressed with the same decimal numbers as stable coin
     */
    function setRate(uint256 _rate) external;

    /**
     * @dev The asset:liquidity rate.
     * @return The asset:liquidity rate.
     */
    function rate() external view returns (uint256);
}
