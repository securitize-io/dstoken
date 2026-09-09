import hre from 'hardhat';
import { expect } from 'chai';

describe('deploy-all task — globalDenylistManagerAddress validation (BC-2349, Issue 6)', function () {
  it('throws before wiring in a globalDenylistManagerAddress that holds no code', async function () {
    const [, eoaSigner] = await hre.ethers.getSigners();
    const eoaAddress = await eoaSigner.getAddress();

    await expect(
      hre.run('deploy-all', {
        name: 'Token Example',
        symbol: 'EXA',
        decimals: 2,
        compliance: 'PERMISSIONLESS',
        registryType: 'STUB',
        globalDenylistManagerAddress: eoaAddress,
      }),
    ).to.be.rejectedWith(`No contract at ${eoaAddress}`);
  });

  it('throws when globalDenylistManagerAddress has code but does not implement isGloballyDenylisted (interface drift)', async function () {
    // Any already-deployed contract with a different ABI stands in for "wrong contract
    // at that address" — deploy-trust-service exists purely as an unrelated contract
    // with code, not because trust services are a plausible real mistake here.
    const trustService = await hre.run('deploy-trust-service');
    const wrongAddress = await trustService.getAddress();

    await expect(
      hre.run('deploy-all', {
        name: 'Token Example',
        symbol: 'EXA',
        decimals: 2,
        compliance: 'PERMISSIONLESS',
        registryType: 'STUB',
        globalDenylistManagerAddress: wrongAddress,
      }),
    ).to.be.rejected;
  });

  it('still wires in a valid globalDenylistManagerAddress unchanged', async function () {
    const globalDenylistManager = await hre.ethers.deployContract('GlobalDenyListManagerMock');
    await globalDenylistManager.waitForDeployment();
    const validAddress = await globalDenylistManager.getAddress();

    const contracts = await hre.run('deploy-all', {
      name: 'Token Example',
      symbol: 'EXA',
      decimals: 2,
      compliance: 'PERMISSIONLESS',
      registryType: 'STUB',
      globalDenylistManagerAddress: validAddress,
    });

    expect(await contracts.globalDenylistManager.getAddress()).to.equal(validAddress);
  });

  it('leaves the GLOBAL_DENYLIST_MANAGER service unset (fail-open) when globalDenylistManagerAddress is omitted', async function () {
    const contracts = await hre.run('deploy-all', {
      name: 'Token Example',
      symbol: 'EXA',
      decimals: 2,
      compliance: 'PERMISSIONLESS',
      registryType: 'STUB',
    });

    expect(contracts.globalDenylistManager).to.equal(undefined);
  });
});
