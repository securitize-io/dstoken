const ejs = require('ejs');
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const template = fs.readFileSync(path.join(__dirname, './EternalStorageClient.ejs'), 'utf-8');

const names = ['Boolean', 'Uint', 'Address', 'String'];
const types = ['bool', 'uint256', 'address', 'string'];
const abbrs = {bool: 'B', uint256: 'U', int: 'I', address: 'A', string: 'S', bytes: 'Bs'};

const functionArgumentsByType = yaml.safeLoad(fs.readFileSync(path.join(__dirname, './EternalStorageClientArguments.yml'), 'utf-8'));

const data = ejs.render(template, { names,types,functionArgumentsByType,abbrs });

fs.writeFileSync(path.join(__dirname, '../contracts/versioned/storage/EternalStorageClientVersioned.sol'), data);

console.log('EternalStorageClient contract file generated');
