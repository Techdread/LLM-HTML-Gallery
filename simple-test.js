console.log('Test started');
const fs = require('fs');
const path = require('path');

const onePageDir = path.resolve(__dirname, 'one-page');
console.log('One page dir:', onePageDir);
console.log('Exists:', fs.existsSync(onePageDir));

if (fs.existsSync(onePageDir)) {
    const dirs = fs.readdirSync(onePageDir);
    console.log('Directories:', dirs.slice(0, 5));
}