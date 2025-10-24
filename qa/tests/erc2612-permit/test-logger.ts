import fs from 'fs';
import path from 'path';

export interface TestResult {
  testName: string;
  testNumber: number;
  network: string;
  dsTokenAddress: string;
  transactionHash?: string;
  blockNumber?: number;
  gasUsed?: string;
  owner?: string;
  spender?: string;
  recipient?: string;
  attacker?: string;
  spender1?: string;
  spender2?: string;
  user1?: string;
  user2?: string;
  allowanceSet?: number;
  value?: number;
  nonceBefore?: number;
  nonceAfter?: number;
  timestamp: string;
  status: 'PASSED' | 'FAILED';
  errorMessage?: string;
  additionalNotes?: string;
}

export class TestLogger {
  private outputDir: string;

  constructor(outputDir: string) {
    this.outputDir = outputDir;
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
  }

  /**
   * Saves test results as both JSON and Markdown files
   */
  saveTestResult(testData: TestResult): { jsonPath: string; mdPath: string } {
    const timestamp = new Date().toISOString()
      .replace(/[:.]/g, '-')
      .split('T').join('-')
      .substring(0, 19);
    
    const baseFilename = `test${testData.testNumber}-${this.sanitizeFilename(testData.testName)}-${timestamp}`;
    
    // Save JSON
    const jsonPath = path.join(this.outputDir, `${baseFilename}.json`);
    fs.writeFileSync(jsonPath, JSON.stringify(testData, null, 2));
    
    // Generate and save Markdown
    const markdown = this.generateMarkdown(testData);
    const mdPath = path.join(this.outputDir, `${baseFilename}.md`);
    fs.writeFileSync(mdPath, markdown);
    
    console.log(`\n📝 Evidence saved:`);
    console.log(`   JSON: ${path.basename(jsonPath)}`);
    console.log(`   Markdown: ${path.basename(mdPath)}`);
    
    return { jsonPath, mdPath };
  }

  private generateMarkdown(testData: TestResult): string {
    const etherscanTxLink = testData.transactionHash 
      ? `https://sepolia.etherscan.io/tx/${testData.transactionHash}`
      : 'N/A';
    const etherscanAddressLink = `https://sepolia.etherscan.io/address/${testData.dsTokenAddress}`;
    const date = new Date(testData.timestamp).toISOString().split('T')[0];
    const statusEmoji = testData.status === 'PASSED' ? '✅' : '❌';

    let testDetails = '';
    if (testData.owner) testDetails += `- **Owner:** \`${testData.owner}\`\n`;
    if (testData.spender) testDetails += `- **Spender:** \`${testData.spender}\`\n`;
    if (testData.recipient) testDetails += `- **Recipient:** \`${testData.recipient}\`\n`;
    if (testData.attacker) testDetails += `- **Attacker:** \`${testData.attacker}\`\n`;
    if (testData.spender1) testDetails += `- **Spender 1:** \`${testData.spender1}\`\n`;
    if (testData.spender2) testDetails += `- **Spender 2:** \`${testData.spender2}\`\n`;
    if (testData.user1) testDetails += `- **User 1:** \`${testData.user1}\`\n`;
    if (testData.user2) testDetails += `- **User 2:** \`${testData.user2}\`\n`;
    if (testData.allowanceSet !== undefined) testDetails += `- **Allowance Set:** ${testData.allowanceSet}\n`;
    if (testData.value !== undefined) testDetails += `- **Value:** ${testData.value}\n`;
    if (testData.nonceBefore !== undefined) testDetails += `- **Nonce Before:** ${testData.nonceBefore}\n`;
    if (testData.nonceAfter !== undefined) testDetails += `- **Nonce After:** ${testData.nonceAfter}\n`;

    return `# ERC-2612 Permit Test Evidence - Test ${testData.testNumber}

## Test Information
- **Test Name:** ${testData.testName}
- **Test Number:** ${testData.testNumber}
- **Network:** ${testData.network}
- **Date:** ${date}
- **Status:** ${statusEmoji} ${testData.status}

## Deployed Contracts
- **DSToken:** [\`${testData.dsTokenAddress}\`](${etherscanAddressLink})

## Test Execution
${testData.transactionHash ? `- **Transaction Hash:** [\`${testData.transactionHash}\`](${etherscanTxLink})` : '- **Transaction Hash:** N/A (Reverted or Read-only)'}
${testData.blockNumber ? `- **Block Number:** ${testData.blockNumber.toLocaleString()}` : ''}
${testData.gasUsed ? `- **Gas Used:** ${testData.gasUsed}` : ''}

## Test Details
${testDetails}
${testData.additionalNotes ? `\n## Additional Notes\n${testData.additionalNotes}\n` : ''}
${testData.errorMessage ? `\n## Error\n\`\`\`\n${testData.errorMessage}\n\`\`\`\n` : ''}

## Evidence Files
- **JSON:** \`${path.basename(this.outputDir)}/test${testData.testNumber}-${this.sanitizeFilename(testData.testName)}-${date}.json\`
- **Markdown:** This file

---
*Generated: ${testData.timestamp}*
`;
  }

  private sanitizeFilename(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 50);
  }
}

