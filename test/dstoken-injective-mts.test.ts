import { expect } from 'chai';
import { spawnSync } from 'child_process';
import { mkdtempSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import hre from 'hardhat';
import { INVESTORS } from './utils/fixture';

const isInjectiveLocal = hre.network.name === 'injectiveLocal';
const describeInjective = isInjectiveLocal ? describe : describe.skip;

const INJHOME = process.env.INJHOME ?? '';
const INJECTIVED_BIN = process.env.INJECTIVED_BIN ?? 'injectived';
const PASSPHRASE = process.env.INJECTIVE_LOCAL_PASSPHRASE ?? '12345678';
const KEYRING_BACKEND = process.env.INJECTIVE_LOCAL_KEYRING_BACKEND ?? 'file';

if (isInjectiveLocal && INJHOME.length === 0) {
  throw new Error('Set INJHOME to the bootstrapped injectived home before running the injectiveLocal MTS test.');
}

const TX_FLAGS = [
  '--home', INJHOME,
  '--chain-id', 'injective-1',
  '--node', 'tcp://127.0.0.1:26657',
  '--keyring-backend', KEYRING_BACKEND,
  '--broadcast-mode', 'sync',
  '--gas', '3000000',
  '--fees', '100000000000000inj',
  '--yes',
  '--output', 'json',
];
const QUERY_FLAGS = [
  '--home', INJHOME,
  '--chain-id', 'injective-1',
  '--node', 'tcp://127.0.0.1:26657',
  '--output', 'json',
];
const KEY_FLAGS = [
  '--home', INJHOME,
  '--keyring-backend', KEYRING_BACKEND,
  '--output', 'json',
];

const ACTION_RECEIVE = 2;
const ACTION_SEND = 8;

const runInjectived = (args: string[], input = '') => {
  const result = spawnSync(INJECTIVED_BIN, args, {
    encoding: 'utf8',
    input,
    maxBuffer: 10 * 1024 * 1024,
  });

  if (result.status !== 0) {
    throw new Error([
      `${INJECTIVED_BIN} ${args.join(' ')} failed`,
      result.stdout,
      result.stderr,
      result.error?.message,
    ].filter(Boolean).join('\n'));
  }

  return result.stdout.trim();
};

const extractJson = (output: string) => {
  const start = output.indexOf('{');
  if (start === -1) {
    throw new Error(`No JSON object in injectived output: ${output}`);
  }
  return JSON.parse(output.slice(start));
};

const sleep = (milliseconds: number) => {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, milliseconds);
};

const detectRunningInjectiveHome = () => {
  const result = spawnSync('ps', ['-eo', 'command'], {
    encoding: 'utf8',
    maxBuffer: 10 * 1024 * 1024,
  });

  if (result.status !== 0) {
    return undefined;
  }

  for (const line of result.stdout.split('\n')) {
    const match = line.match(/\binjectived\b.*--home\s+(\S+)\s+start\b/);
    if (match) {
      return match[1];
    }
  }

  return undefined;
};

const waitForTx = (txHash: string) => {
  let lastError = '';
  for (let attempt = 0; attempt < 30; attempt++) {
    const result = spawnSync(INJECTIVED_BIN, ['query', 'tx', txHash, ...QUERY_FLAGS], {
      encoding: 'utf8',
      maxBuffer: 10 * 1024 * 1024,
    });

    if (result.status === 0) {
      const tx = extractJson(result.stdout.trim());
      const txResponse = tx.tx_response ?? tx;
      if (Number(txResponse.code ?? 0) !== 0) {
        throw new Error(`injectived tx failed with code ${txResponse.code}: ${txResponse.raw_log ?? result.stdout}`);
      }
      return txResponse;
    }

    lastError = result.stderr || result.stdout;
    sleep(1_000);
  }

  throw new Error(`Timed out waiting for injectived tx ${txHash}: ${lastError}`);
};

const runTx = (args: string[]) => {
  const output = runInjectived(args, `${PASSPHRASE}\n${PASSPHRASE}\n${PASSPHRASE}\n`);
  const tx = extractJson(output);
  if (Number(tx.code ?? 0) !== 0) {
    throw new Error(`injectived tx failed with code ${tx.code}: ${tx.raw_log ?? output}`);
  }
  return tx.txhash ? waitForTx(tx.txhash) : tx;
};

const assertInjectivedKey = (keyName: string) => {
  try {
    runInjectived(['keys', 'show', keyName, ...KEY_FLAGS], `${PASSPHRASE}\n${PASSPHRASE}\n${PASSPHRASE}\n`);
  } catch (error) {
    const details = error instanceof Error ? error.message : String(error);
    const runningHome = detectRunningInjectiveHome();
    const runningHomeHint = runningHome && runningHome !== INJHOME
      ? `Detected running injectived home: ${runningHome}`
      : undefined;
    throw new Error([
      `Missing injectived key "${keyName}" in INJHOME=${INJHOME} using keyring backend "${KEYRING_BACKEND}".`,
      'Export the same INJHOME used by the terminal running ./injectived.sh, then rerun the test.',
      runningHomeHint,
      details,
    ].filter(Boolean).join('\n'));
  }
};

const assertInjectivedKeys = () => {
  assertInjectivedKey('localkey');
  assertInjectivedKey('user1');
};

const injAddressFromEth = (ethAddress: string) => {
  const output = runInjectived(['keys', 'parse', ethAddress.replace(/^0x/, ''), '--output', 'json']);
  const parsed = extractJson(output);
  return parsed.formats[0] as string;
};

const createNamespace = (denom: string, tokenAddress: string) => {
  const dir = mkdtempSync(join(tmpdir(), 'dstoken-mts-'));
  const file = join(dir, 'namespace.json');
  writeFileSync(file, JSON.stringify({
    denom,
    evm_hook: tokenAddress,
    evm_post_hook: tokenAddress,
    role_permissions: [
      {
        name: 'EVERYONE',
        role_id: 0,
        permissions: ACTION_RECEIVE | ACTION_SEND,
      },
    ],
  }));

  runTx(['tx', 'permissions', 'create-namespace', file, '--from', 'localkey', ...TX_FLAGS]);
};

const bankSend = (fromKey: string, to: string, denom: string, amount: bigint) => {
  runTx(['tx', 'bank', 'send', fromKey, to, `${amount.toString()}${denom}`, ...TX_FLAGS]);
};

const registerInvestorOnChain = async (investorId: string, wallet: string, registryService: any) => {
  await (await registryService.registerInvestor(investorId, '')).wait();
  await (await registryService.addWallet(wallet, investorId)).wait();
};

describeInjective('DS Token Injective MTS integration', function() {
  this.timeout(600_000);

  it('uses the Bank precompile and permissions hooks for regulated transfers', async function() {
    assertInjectivedKeys();

    const [owner, holder, blocked] = await hre.ethers.getSigners();

    const contracts = await hre.run('deploy-all', {
      name: 'Token Example 1',
      symbol: 'TX1',
      decimals: 2,
      compliance: 'INJECTIVE_MTS',
    });

    const dsToken = contracts.dsToken;
    const registryService = contracts.registryService;
    const complianceService = contracts.complianceService;
    const complianceConfigurationService = contracts.complianceConfigurationService;
    const tokenAddress = await dsToken.getAddress();
    const denom = `erc20:${tokenAddress}`;

    await (await dsToken.setMTSDenom(denom)).wait();
    createNamespace(denom, tokenAddress);

    await (await owner.sendTransaction({
      to: tokenAddress,
      value: hre.ethers.parseEther('1'),
    })).wait();

    await registerInvestorOnChain(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, holder.address, registryService);
    await registerInvestorOnChain(INVESTORS.INVESTOR_ID.INVESTOR_ID_2, owner.address, registryService);
    await registerInvestorOnChain(INVESTORS.INVESTOR_ID.CHINA_INVESTOR_ID, blocked.address, registryService);
    await (await registryService.setCountry(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, INVESTORS.Country.USA)).wait();
    await (await registryService.setCountry(INVESTORS.INVESTOR_ID.INVESTOR_ID_2, INVESTORS.Country.USA)).wait();
    await (await registryService.setCountry(INVESTORS.INVESTOR_ID.CHINA_INVESTOR_ID, INVESTORS.Country.CHINA)).wait();
    await (await complianceConfigurationService.setCountryCompliance(
      INVESTORS.Country.CHINA,
      INVESTORS.Compliance.FORBIDDEN,
    )).wait();

    await (await dsToken.issueTokens(holder.address, 500)).wait();
    expect(await dsToken.totalSupply()).to.equal(500);
    expect(await dsToken.balanceOf(holder.address)).to.equal(500);
    expect(await dsToken.balanceOfInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1)).to.equal(500);
    expect(await dsToken.walletCount()).to.equal(1);
    expect(await complianceService.getTotalInvestorsCount()).to.equal(1);

    await (await dsToken.connect(holder).transfer(owner.address, 100)).wait();

    expect(await dsToken.balanceOf(holder.address)).to.equal(400);
    expect(await dsToken.balanceOf(owner.address)).to.equal(100);
    expect(await dsToken.balanceOfInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1)).to.equal(400);
    expect(await dsToken.balanceOfInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_2)).to.equal(100);
    expect(await dsToken.walletCount()).to.equal(2);
    expect(await complianceService.getTotalInvestorsCount()).to.equal(2);

    bankSend('user1', injAddressFromEth(owner.address), denom, 25n);

    expect(await dsToken.balanceOf(holder.address)).to.equal(375);
    expect(await dsToken.balanceOf(owner.address)).to.equal(125);
    expect(await dsToken.balanceOfInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1)).to.equal(375);
    expect(await dsToken.balanceOfInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_2)).to.equal(125);
    expect(await complianceService.getTotalInvestorsCount()).to.equal(2);

    expect(() => bankSend('user1', injAddressFromEth(blocked.address), denom, 1n))
      .to.throw(/transfer is restricted by EVM hook/i);
    await expect(dsToken.connect(holder).transfer(blocked.address, 1)).to.be.reverted;

    expect(await dsToken.balanceOf(holder.address)).to.equal(375);
    expect(await dsToken.balanceOf(blocked.address)).to.equal(0);
  });
});
