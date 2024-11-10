const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = 3001;
const DATA_FILE = path.join(__dirname, 'data', 'bp_readings.json');

// Ensure data directory exists
const ensureDataDir = async () => {
  const dataDir = path.join(__dirname, 'data');
  try {
    await fs.access(dataDir);
  } catch {
    await fs.mkdir(dataDir);
  }
};

// Initialize data file if it doesn't exist
const initDataFile = async () => {
  try {
    await fs.access(DATA_FILE);
  } catch {
    await fs.writeFile(DATA_FILE, JSON.stringify([]));
  }
};

app.use(cors());
app.use(express.json());

// Get all readings
app.get('/api/readings', async (req, res) => {
  try {
    const data = await fs.readFile(DATA_FILE, 'utf8');
    res.json(JSON.parse(data));
  } catch (error) {
    console.error('Error reading data:', error);
    res.status(500).json({ error: 'Failed to read data' });
  }
});

// Add new reading
app.post('/api/readings', async (req, res) => {
  try {
    const data = await fs.readFile(DATA_FILE, 'utf8');
    const readings = JSON.parse(data);
    readings.push(req.body);
    await fs.writeFile(DATA_FILE, JSON.stringify(readings, null, 2));
    res.json(req.body);
  } catch (error) {
    console.error('Error writing data:', error);
    res.status(500).json({ error: 'Failed to write data' });
  }
});

// Initialize server
const startServer = async () => {
  await ensureDataDir();
  await initDataFile();
  
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
};

startServer();
