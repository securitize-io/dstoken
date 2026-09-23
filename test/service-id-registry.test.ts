import { expect } from 'chai';
import { readFileSync } from 'fs';
import path from 'path';
import { loadFixture } from '@nomicfoundation/hardhat-toolbox/network-helpers';
import { deployDSTokenRegulated } from './utils/fixture';
import { DSConstants } from '../utils/globals';

/**
 * The service-id registry exists twice: as `public constant`s on `IDSServiceConsumer` (what
 * contracts resolve) and as `DSConstants.services` in TypeScript (what the deployment utilities
 * resolve). Nothing in the build links them, so they can drift silently and each side remain
 * self-consistent — a component can be correct against its own source of truth and still fail to
 * interoperate.
 *
 * That has happened twice: `DEPRECATED_ISSUER_MULTICALL` / `DEPRECATED_TA_MULTICALL` were `0` in
 * Solidity while TypeScript used 8194/8195 (and being both `0`, they also collided with each
 * other), and `BULK_OPERATOR` was absent from Solidity entirely despite holding `ROLE_ISSUER` on
 * live tokens. These tests turn either kind of divergence into a build failure.
 */
describe('Service id registry parity', function () {
  /**
   * Present in Solidity but deliberately not exposed to tooling. `UNUSED_1` is a placeholder
   * holding a gap in the bitmask; no service is registered under it and nothing off-chain needs it.
   */
  const SOLIDITY_ONLY = new Set(['UNUSED_1']);

  function solidityConstants(): Map<string, bigint> {
    const source = readFileSync(
      path.join(__dirname, '..', 'contracts', 'service', 'IDSServiceConsumer.sol'),
      'utf8',
    );
    const found = new Map<string, bigint>();
    for (const [, name, value] of source.matchAll(/uint256 public constant (\w+)\s*=\s*(\d+);/g)) {
      found.set(name, BigInt(value));
    }
    return found;
  }

  it('every TypeScript service id equals the value compiled into the contract', async function () {
    // Read the deployed getters rather than re-parsing the source: this compares against the
    // bytecode that will actually be executed.
    const { dsToken } = await loadFixture(deployDSTokenRegulated);

    for (const [name, expected] of Object.entries(DSConstants.services)) {
      const onChain = await (dsToken as any)[name]();
      expect(onChain, `${name} differs between DSConstants and the deployed contract`).to.equal(
        BigInt(expected),
      );
    }
  });

  it('every Solidity service id constant is exposed in DSConstants', function () {
    // Catches the BULK_OPERATOR case: a contract-side id that tooling cannot address, so the
    // deployment utilities silently never wire it.
    const missing = [...solidityConstants().keys()].filter(
      (name) => !SOLIDITY_ONLY.has(name) && !(name in DSConstants.services),
    );

    expect(missing, `Solidity constants absent from DSConstants.services: ${missing.join(', ')}`).to.be.empty;
  });

  it('no two service ids collide', function () {
    // Two names sharing an id means the second registration silently overwrites the first, which
    // is what both multicall constants being 0 would have caused.
    const byId = new Map<string, string[]>();
    for (const [name, id] of Object.entries(DSConstants.services)) {
      const key = String(id);
      byId.set(key, [...(byId.get(key) ?? []), name]);
    }

    const collisions = [...byId.entries()].filter(([, names]) => names.length > 1);
    const described = collisions.map(([id, names]) => `id ${id}: ${names.join(', ')}`);

    expect(described, `colliding service ids: ${described.join(' | ')}`).to.be.empty;
  });

  it('no service id is zero, which setDSService would accept without resolving to any service', function () {
    // setDSService writes services[_serviceId] for any uint256 with no validation, so a zero id is
    // stored and emits DSServiceSet exactly as a real registration would.
    const zeroed = Object.entries(DSConstants.services).filter(([, id]) => Number(id) === 0);

    expect(zeroed.map(([name]) => name), 'service ids set to zero').to.be.empty;
  });
});
