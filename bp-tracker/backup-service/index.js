const express = require('express');
const axios = require('axios');
const AWS = require('aws-sdk');
const cron = require('node-cron');
const fs = require('fs').promises;
const path = require('path');

// Environment variables configuration
const config = {
  API_URL: process.env.API_URL || 'http://server:3001',
  BACKUP_INTERVAL: process.env.BACKUP_INTERVAL || '0 0 * * *', // Daily at midnight
  AWS_BUCKET: process.env.AWS_BUCKET || 'bp-tracker-backups',
  AWS_REGION: process.env.AWS_REGION || 'ap-southeast-1',
  RETENTION_DAYS: parseInt(process.env.RETENTION_DAYS || '30'),
};

// Configure AWS SDK
const s3 = new AWS.S3({
  region: config.AWS_REGION,
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
});

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3002;

// Format date for filenames and logging
const formatDate = () => {
  const now = new Date();
  return now.toISOString()
    .replace(/[:.]/g, '-')
    .replace('T', '_')
    .slice(0, -5);
};

// Create backup and upload to S3
const createBackup = async () => {
  try {
    console.log(`[${formatDate()}] Starting backup process...`);

    // Fetch data from API
    const response = await axios.get(`${config.API_URL}/api/backup`, {
      responseType: 'json'
    });

    // Prepare backup data
    const backupData = JSON.stringify(response.data, null, 2);
    const timestamp = formatDate();
    const filename = `bp-tracker-backup-${timestamp}.json`;

    // Upload to S3
    const uploadParams = {
      Bucket: config.AWS_BUCKET,
      Key: `backups/${filename}`,
      Body: backupData,
      ContentType: 'application/json'
    };

    const uploadResult = await s3.upload(uploadParams).promise();
    console.log(`[${formatDate()}] Backup uploaded successfully:`, uploadResult.Location);

    // Clean up old backups
    await cleanupOldBackups();

    return {
      success: true,
      filename,
      url: uploadResult.Location
    };
  } catch (error) {
    console.error(`[${formatDate()}] Backup failed:`, error);
    throw error;
  }
};

// Clean up old backups
const cleanupOldBackups = async () => {
  try {
    console.log(`[${formatDate()}] Starting cleanup of old backups...`);

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - config.RETENTION_DAYS);

    // List all objects in the backup folder
    const listParams = {
      Bucket: config.AWS_BUCKET,
      Prefix: 'backups/'
    };

    const objects = await s3.listObjects(listParams).promise();
    const oldObjects = objects.Contents.filter(obj => {
      const objDate = new Date(obj.LastModified);
      return objDate < cutoffDate;
    });

    // Delete old backups
    for (const obj of oldObjects) {
      await s3.deleteObject({
        Bucket: config.AWS_BUCKET,
        Key: obj.Key
      }).promise();
      console.log(`[${formatDate()}] Deleted old backup: ${obj.Key}`);
    }

    return {
      success: true,
      deletedCount: oldObjects.length
    };
  } catch (error) {
    console.error(`[${formatDate()}] Cleanup failed:`, error);
    throw error;
  }
};

// Schedule regular backups
cron.schedule(config.BACKUP_INTERVAL, async () => {
  try {
    await createBackup();
  } catch (error) {
    console.error(`[${formatDate()}] Scheduled backup failed:`, error);
  }
});

// API Endpoints
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date() });
});

// Manual backup trigger
app.post('/trigger-backup', async (req, res) => {
  try {
    const result = await createBackup();
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// List backups
app.get('/list-backups', async (req, res) => {
  try {
    const listParams = {
      Bucket: config.AWS_BUCKET,
      Prefix: 'backups/'
    };

    const objects = await s3.listObjects(listParams).promise();
    const backups = objects.Contents.map(obj => ({
      key: obj.Key,
      size: obj.Size,
      lastModified: obj.LastModified
    }));

    res.json(backups);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`[${formatDate()}] Backup service running on port ${PORT}`);
});