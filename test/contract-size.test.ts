import { expect } from 'chai';
import hre from 'hardhat';

// EIP-170 limit on deployed (runtime) bytecode. The hardhat network in hardhat.config.ts runs with
// allowUnlimitedContractSize: true, so an oversized implementation deploys fine in every other test
// and only fails on a real network. This test is the only gate; keep it green before pushing.
const EIP170_LIMIT = 24_576;

// Every contract that is deployed as a UUPS implementation or a linked library.
const DEPLOYED_CONTRACTS = [
  'DSToken',
  'TokenLibrary',
  'TrustService',
  'RegistryService',
  'StubRegistryService',
  'ComplianceServiceRegulated',
  'ComplianceServiceWhitelisted',
  'ComplianceServiceGlobalWhitelisted',
  'ComplianceServicePermissionless',
  'ComplianceConfigurationService',
  'ComplianceServiceLibrary',
  'WalletManager',
  'InvestorLockManager',
  'BlackListManager',
  'TokenIssuer',
  'WalletRegistrar',
  'TransactionRelayer',
  'BulkOperator',
  'SecuritizeRebasingProvider',
];

const deployedSize = async (name: string): Promise<number> => {
  const artifact = await hre.artifacts.readArtifact(name);
  // '0x' prefix, two hex chars per byte
  return (artifact.deployedBytecode.length - 2) / 2;
};

describe('Contract size (EIP-170)', function () {
  for (const name of DEPLOYED_CONTRACTS) {
    it(`${name} runtime bytecode is within the EIP-170 limit`, async function () {
      const size = await deployedSize(name);
      expect(size, `${name}: ${size} bytes, ${size - EIP170_LIMIT} over the limit`).to.be.at.most(EIP170_LIMIT);
    });
  }

  it('reports DSToken headroom', async function () {
    const size = await deployedSize('DSToken');
    // Informational: printed so a PR reviewer can see how much room a token change left.
    console.log(`      DSToken: ${size} bytes, ${EIP170_LIMIT - size} bytes of headroom`);
  });
});
