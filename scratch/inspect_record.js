const fs = require('fs');
const path = require('path');

const csvPath = path.join(__dirname, '..', 'ml', 'data', 'raw_data.csv');
const content = fs.readFileSync(csvPath, 'utf8');

// Parse single record from start
let inQuotes = false;
let currentField = '';
let fields = [];
let rows = [];

for (let i = 0; i < content.length; i++) {
  const c = content[i];
  const next = content[i+1];
  if (c === '"') {
    if (inQuotes && next === '"') {
      currentField += '"';
      i++;
    } else {
      inQuotes = !inQuotes;
    }
  } else if (c === ',' && !inQuotes) {
    fields.push(currentField);
    currentField = '';
  } else if ((c === '\r' || c === '\n') && !inQuotes) {
    if (c === '\r' && next === '\n') i++;
    fields.push(currentField);
    rows.push(fields);
    fields = [];
    currentField = '';
    if (rows.length >= 3) break;
  } else {
    currentField += c;
  }
}

const header = rows[0];
const row1 = rows[1];
console.log('--- COLUMN BREAKDOWN FOR FIRST RECORD ---');
header.forEach((h, idx) => {
  const val = row1[idx] || '';
  const snippet = val.length > 80 ? val.substring(0, 80) + '... (len=' + val.length + ')' : val;
  console.log(`[${idx}] ${h}: ${snippet}`);
});
