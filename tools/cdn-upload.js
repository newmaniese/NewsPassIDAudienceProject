/**
 * Script to upload build artifacts to CDN
 */
const AWS = require('aws-sdk');
const fs = require('fs');
const path = require('path');

// Configure AWS
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
});

// Get package version
const packageJson = require('../package.json');
const version = packageJson.version;

// Files to upload
const files = [
  { local: 'dist/newspassid.js', remote: `newspassid-${version}.js`, contentType: 'application/javascript' },
  { local: 'dist/newspassid.min.js', remote: 'newspassid.min.js', contentType: 'application/javascript' },
  { local: 'dist/newspassid.min.js', remote: `newspassid-${version}.min.js`, contentType: 'application/javascript' },
  { local: 'dist/newspassid-async.js', remote: 'newspassid-async.js', contentType: 'application/javascript' },
  { local: 'dist/newspassid-async.js', remote: `newspassid-async-${version}.js`, contentType: 'application/javascript' },
  { local: 'dist/newspassid-async.min.js', remote: 'newspassid-async.min.js', contentType: 'application/javascript' },
  { local: 'dist/newspassid-async.min.js', remote: `newspassid-async-${version}.min.js`, contentType: 'application/javascript' },
];

// Upload files
async function uploadFiles() {
  const cdnBucket = process.env.CDN_BUCKET;
  
  if (!cdnBucket) {
    console.error('CDN_BUCKET environment variable not set');
    process.exit(1);
  }
  
  console.log(`Uploading to ${cdnBucket}...`);
  
  for (const file of files) {
    try {
      const fileContent = fs.readFileSync(path.resolve(__dirname, '..', file.local));
      
      const params = {
        Bucket: cdnBucket,
        Key: file.remote,
        Body: fileContent,
        ContentType: file.contentType,
        CacheControl: 'max-age=31536000', // 1 year cache
        ACL: 'public-read'
      };
      
      await s3.putObject(params).promise();
      console.log(`Uploaded ${file.local} to ${cdnBucket}/${file.remote}`);
    } catch (error) {
      console.error(`Error uploading ${file.local}:`, error);
      process.exit(1);
    }
  }
  
  console.log('Upload complete!');
}

uploadFiles();
