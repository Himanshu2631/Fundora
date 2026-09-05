const fs = require('fs');
const https = require('https');
const path = require('path');
const { URL } = require('url');

const url = 'https://zenodo.org/api/records/8287320/files/raw_data.csv/content';
const dest = path.join(__dirname, '..', 'ml', 'data', 'raw_data.csv');

console.log('Downloading MDCC raw_data.csv via Zenodo API...');
console.log('Destination:', dest);

function download(targetUrl, destPath, cb) {
  const parsed = new URL(targetUrl);
  const options = {
    hostname: parsed.hostname,
    path: parsed.pathname + parsed.search,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': '*/*'
    }
  };

  https.get(options, function(response) {
    if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
      console.log('Redirecting to:', response.headers.location);
      return download(response.headers.location, destPath, cb);
    }
    if (response.statusCode !== 200) {
      return cb(new Error('Status code: ' + response.statusCode + ' - ' + response.statusMessage));
    }
    const file = fs.createWriteStream(destPath);
    const totalBytes = parseInt(response.headers['content-length'], 10) || 0;
    let downloaded = 0;
    let lastLog = 0;

    response.on('data', chunk => {
      downloaded += chunk.length;
      if (downloaded - lastLog > 5 * 1024 * 1024) {
        console.log(`Downloaded ${(downloaded / 1024 / 1024).toFixed(1)} MB / ${(totalBytes / 1024 / 1024).toFixed(1)} MB`);
        lastLog = downloaded;
      }
    });

    response.pipe(file);
    file.on('finish', function() {
      file.close(() => {
        console.log(`Download complete: ${(downloaded / 1024 / 1024).toFixed(1)} MB written.`);
        cb(null);
      });
    });
  }).on('error', function(err) {
    fs.unlink(destPath, () => {});
    cb(err);
  });
}

download(url, dest, err => {
  if (err) {
    console.error('Download failed:', err);
    process.exit(1);
  } else {
    console.log('Successfully saved to:', dest);
  }
});
