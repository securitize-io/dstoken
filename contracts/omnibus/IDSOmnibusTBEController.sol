pragma solidity 0.5.17;

import "../service/ServiceConsumer.sol";
import "../utils/ProxyTarget.sol";
import "../data-stores/OmnibusTBEControllerDataStore.sol";
import "../utils/VersionedContract.sol";
import "../utils/Initializable.sol";

contract IDSOmnibusTBEController is Initializable, VersionedContract {
    using SafeMath for uint256;

    function initialize(address _omnibusWallet) public;

    function bulkIssuance(uint256 value, uint256 issuanceTime, uint256 totalInvestors, uint256 accreditedInvestors,
        uint256 usAccreditedInvestors, uint256 usTotalInvestors, uint256 jpTotalInvestors, bytes32[] memory euRetailCountries,
        uint256[] memory euRetailCountryCounts) public returns(bool);

    function bulkBurn(uint256 value, uint256 totalInvestors, uint256 accreditedInvestors,
        uint256 usAccreditedInvestors, uint256 usTotalInvestors, uint256 jpTotalInvestors, bytes32[] memory euRetailCountries,
        uint256[] memory euRetailCountryCounts) public;

    function bulkTransfer(address[] memory wallets, uint256[] memory values) public;

    function adjustCounters(int256 totalDelta, int256 accreditedDelta,
        int256 usAccreditedDelta, int256 usTotalDelta, int256 jpTotalDelta, bytes32[] memory euRetailCountries,
        int256[] memory euRetailCountryDeltas) public;

    function getOmnibusWallet() public view returns (address);
}
