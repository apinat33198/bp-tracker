require('dotenv').config();
const AWS = require('aws-sdk');

const s3 = new AWS.S3({
  region: process.env.AWS_REGION,
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
});

async function cleanupOldBackups() {
  try {
    const retentionDays = process.env.RETENTION_DAYS || 30;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    const listParams = {
      Bucket: process.env.AWS_BUCKET,
      Prefix: 'backups/'
    };

    const objects = await s3.listObjects(listParams).promise();
    const oldObjects = objects.Contents.filter(obj => {
      return new Date(obj.LastModified) < cutoffDate;
    });

    console.log(`Found ${oldObjects.length} backups older than ${retentionDays} days`);

    for (const obj of oldObjects) {
      await s3.deleteObject({
        Bucket: process.env.AWS_BUCKET,
        Key: obj.Key
      }).promise();
      console.log(`Deleted: ${obj.Key}`);
    }

    console.log('\nCleanup completed successfully!');
  } catch (error) {
    console.error('Cleanup failed:', error);
    process.exit(1);
  }
}

cleanupOldBackups();