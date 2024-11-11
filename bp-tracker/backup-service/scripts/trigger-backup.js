require('dotenv').config();
const axios = require('axios');

async function triggerBackup() {
  try {
    const response = await axios.post('http://localhost:3002/trigger-backup');
    
    if (response.data.success) {
      console.log('\nBackup created successfully!');
      console.log('=========================');
      console.log(`Filename: ${response.data.filename}`);
      console.log(`URL: ${response.data.url}`);
    } else {
      throw new Error('Backup failed');
    }
  } catch (error) {
    console.error('Failed to trigger backup:', error.message);
    process.exit(1);
  }
}

triggerBackup();