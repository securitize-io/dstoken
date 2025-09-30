import { expect } from 'chai';
import { loadFixture } from '@nomicfoundation/hardhat-toolbox/network-helpers';
import hre from 'hardhat';

async function deployRebasingLibraryMock() {
  const mock = await hre.ethers.deployContract('RebasingLibraryMock');
  return { mock };
}

describe('RebasingLibrary rounding', function () {
  it('Should round down when converting tokens to shares and back to avoid losing protocol tokens', async function () {
    const { mock } = await loadFixture(deployRebasingLibraryMock);
    const multiplier = hre.ethers.parseUnits('1.5', 18);
    const decimals = 18;
    const initialTokens = hre.ethers.parseUnits('1', 18);

    const shares = await mock.convertTokensToShares(initialTokens, multiplier, decimals);
    const finalTokens = await mock.convertSharesToTokens(shares, multiplier, decimals);

    expect(finalTokens).to.be.at.most(initialTokens);
    expect(initialTokens - finalTokens).to.be.at.most(1n);
  });

  it('Should never inflate totals across many conversions', async function () {
    const { mock } = await loadFixture(deployRebasingLibraryMock);
    const multiplier = hre.ethers.parseUnits('1.7', 18);
    const decimals = 18;

    let totalShares = 0n;
    let totalTokensIn = 0n;
    
    // Simulate 1000 small deposits
    for (let i = 0n; i < 1000n; i++) {
      const tokens = 1_000_000_000_000_000n + i;
      const shares = await mock.convertTokensToShares(tokens, multiplier, decimals);
      totalTokensIn += tokens;
      totalShares += shares;
    }

    const totalTokensOut = await mock.convertSharesToTokens(totalShares, multiplier, decimals);

    expect(totalTokensOut).to.be.at.most(totalTokensIn);
    // Checks that protocol does not lose tokens due to rounding errors
    expect(totalTokensOut).to.be.below(totalTokensIn);
  });
});
