const fs = require('fs');
const readline = require('readline');
const path = require('path');

const csvPath = path.join(__dirname, '..', 'ml', 'data', 'raw_data.csv');
const rl = readline.createInterface({
  input: fs.createReadStream(csvPath),
  crlfDelay: Infinity
});

let lineCount = 0;
rl.on('line', line => {
  lineCount++;
  if (lineCount <= 3) {
    console.log(`\n--- LINE ${lineCount} (first 300 chars) ---`);
    console.log(line.substring(0, 300));
  } else {
    rl.close();
  }
});
