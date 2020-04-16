pragma solidity ^0.5.0;

import "./IDSLockManager.sol";
import "../data-stores/InvestorLockManagerDataStore.sol";

contract InvestorLockManager is ProxyTarget, Initializable, IDSLockManager, InvestorLockManagerDataStore {}
