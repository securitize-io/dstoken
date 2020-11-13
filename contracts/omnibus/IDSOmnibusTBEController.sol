pragma solidity 0.5.17;

import "../service/ServiceConsumer.sol";
import "../utils/ProxyTarget.sol";
import "../data-stores/OmnibusTBEControllerDataStore.sol";
import "../utils/VersionedContract.sol";
import "../utils/Initializable.sol";

contract IDSOmnibusTBEController is Initializable, VersionedContract {
    using SafeMath for uint256;

    function initialize(address _omnibusWallet) public {
        VERSIONS.push(3);
    }

    function bulkIssuance(uint256 value, uint256 issuanceTime, uint256 totalInvestors, uint256 accreditedInvestors,
        uint256 usAccreditedInvestors, uint256 usTotalInvestors, uint256 jpTotalInvestors, bytes32[] memory euRetailCountries,
        bytes32[] memory euRetailCountryCounts) public;

    function bulkBurn(uint256 value, uint256 issuanceTime, uint256 totalInvestors, uint256 accreditedInvestors,
        uint256 usAccreditedInvestors, uint256 usTotalInvestors, uint256 jpTotalInvestors, bytes32[] memory euRetailCountries,
        bytes32[] memory euRetailCountryCounts) public;

    function bulkTransfer(address[] memory wallets, uint256[] memory values) public;

    function adjustCounters(uint256 totalDelta, uint256 accreditedDelta,
        uint256 usAccreditedDelta, uint256 usTotalDelta, uint256 jpTotalDelta, bytes32[] memory euRetailCountries,
        bytes32[] memory euRetailCountryDeltas) public;

    function getOmnibusWallet() public view returns (address);
}
