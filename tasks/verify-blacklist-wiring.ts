import { task, types } from 'hardhat/config';
import { DSConstants } from '../utils/globals';
import { assertAddress, parseAddressList } from './utils/task.helper';

/**
 * BC-2643 (read-only): service 8197 lives in two maps, the DSToken and its ComplianceService.
 * They must agree (and equal --global when given) or the TSV checker and compliance disagree.
 * Throws on any mismatch so it can gate scripts and CI.
 */
task('verify-blacklist-wiring', 'Verify that token and compliance point to the same (global) blacklist manager')
  .addParam('tokens', 'Comma-separated DSToken addresses', undefined, types.string)
  .addOptionalParam('global', 'Expected global BlackListManager address', undefined, types.string)
  .setAction(async (args, hre) => {
    const { ethers } = hre;
    const tokens = parseAddressList('--tokens', args.tokens, hre);
    if (tokens.length === 0) throw new Error('--tokens must contain at least one address');
    const expected = args.global ? assertAddress('--global', args.global, hre) : undefined;

    const results: Array<{ token: string; tokenBlm: string; complianceBlm: string; ok: boolean; problems: string[] }> = [];
    for (const tokenAddress of tokens) {
      const problems: string[] = [];
      let tokenBlm: string = ethers.ZeroAddress;
      let complianceBlm: string = ethers.ZeroAddress;
      try {
        const token = await ethers.getContractAt('DSToken', tokenAddress);
        tokenBlm = await token.getDSService(DSConstants.services.BLACKLIST_MANAGER);
        const complianceAddress = await token.getDSService(DSConstants.services.COMPLIANCE_SERVICE);
        if (complianceAddress === ethers.ZeroAddress) {
          problems.push('compliance service (8) is not set');
        } else {
          const compliance = await ethers.getContractAt('ComplianceServiceGlobalWhitelisted', complianceAddress);
          complianceBlm = await compliance.getDSService(DSConstants.services.BLACKLIST_MANAGER);
        }
      } catch (error: any) {
        problems.push(`could not read wiring: ${error.shortMessage ?? error.message}`);
      }
      if (problems.length === 0) {
        if (tokenBlm === ethers.ZeroAddress) problems.push('token 8197 is not set');
        if (tokenBlm !== complianceBlm) problems.push('token 8197 and compliance 8197 differ');
        if (expected && tokenBlm !== expected) problems.push(`token 8197 is not the expected global ${expected}`);
        if (expected && complianceBlm !== expected) problems.push(`compliance 8197 is not the expected global ${expected}`);
      }
      const ok = problems.length === 0;
      results.push({ token: tokenAddress, tokenBlm, complianceBlm, ok, problems });
      console.log(`${ok ? 'OK      ' : 'MISMATCH'} token ${tokenAddress}`);
      console.log(`           token 8197:      ${tokenBlm}`);
      console.log(`           compliance 8197: ${complianceBlm}`);
      problems.forEach(problem => console.log(`           - ${problem}`));
    }

    const failed = results.filter(result => !result.ok);
    if (failed.length > 0) {
      throw new Error(`Blacklist wiring mismatch on ${failed.length} of ${results.length} token(s): ${failed.map(f => f.token).join(', ')}`);
    }
    console.log(`\nAll ${results.length} token(s) wired consistently${expected ? ` to ${expected}` : ''}`);
    return results;
  });
