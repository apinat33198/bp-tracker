require('dotenv').config();
const AWS = require('aws-sdk');
const axios = require('axios');

const s3 = new AWS.S3({
  region: process.env.AWS_REGION,
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
});

async function verifyLatestBackup() {
  try {
    // Get latest backup from S3
    const listParams = {
      Bucket: process.env.AWS_BUCKET,
      Prefix: 'backups/',
      MaxKeys: 1
    };
    
    const objects = await s3.listObjectsV2(listParams).promise();
    if (objects.Contents.length === 0) {
      console.error('No backups found');
      process.exit(1);
    }

    const latestBackup = objects.Contents[0];
    console.log(`Found latest backup: ${latestBackup.Key}`);

    // Get backup content
    const getParams = {
      Bucket: process.env.AWS_BUCKET,
      Key: latestBackup.Key
    };
    
    const backupData = await s3.getObject(getParams).promise();
    const backupContent = JSON.parse(backupData.Body.toString());

    // Verify backup structure
    if (!Array.isArray(backupContent)) {
      throw new Error('Invalid backup format: not an array');
    }

    console.log(`Backup verified successfully: ${backupContent.length} records found`);
    process.exit(0);
  } catch (error) {
    console.error('Verification failed:', error);
    process.exit(1);
  }
}

verifyLatestBackup();