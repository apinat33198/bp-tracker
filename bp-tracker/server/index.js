const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = 3001;
const DATA_FILE = path.join(__dirname, 'data', 'bp_readings.json');

// Middleware
app.use(cors());
app.use(express.json());

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

// Error handling middleware
const errorHandler = (err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
};

// Routes
app.get('/api/readings', async (req, res, next) => {
  try {
    const data = await fs.readFile(DATA_FILE, 'utf8');
    res.json(JSON.parse(data));
  } catch (error) {
    next(error);
  }
});

app.post('/api/readings', async (req, res, next) => {
  try {
    const data = await fs.readFile(DATA_FILE, 'utf8');
    const readings = JSON.parse(data);
    const newReading = {
      ...req.body,
      id: req.body.id || Date.now().toString()
    };
    
    readings.push(newReading);
    await fs.writeFile(DATA_FILE, JSON.stringify(readings, null, 2));
    res.status(201).json(newReading);
  } catch (error) {
    next(error);
  }
});

// Backup endpoint
app.get('/api/backup', async (req, res, next) => {
  try {
    const data = await fs.readFile(DATA_FILE, 'utf8');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    res.setHeader('Content-Disposition', `attachment; filename=bp_readings_backup_${timestamp}.json`);
    res.setHeader('Content-Type', 'application/json');
    res.send(data);
  } catch (error) {
    next(error);
  }
});

// Import data endpoint
app.post('/api/import', async (req, res, next) => {
  try {
    const newData = req.body;
    if (!Array.isArray(newData)) {
      throw new Error('Invalid data format');
    }
    await fs.writeFile(DATA_FILE, JSON.stringify(newData, null, 2));
    res.json({ message: 'Data imported successfully' });
  } catch (error) {
    next(error);
  }
});

// Delete reading endpoint
app.delete('/api/readings/:id', async (req, res, next) => {
  try {
    const data = await fs.readFile(DATA_FILE, 'utf8');
    let readings = JSON.parse(data);
    readings = readings.filter(reading => reading.id !== req.params.id);
    await fs.writeFile(DATA_FILE, JSON.stringify(readings, null, 2));
    res.json({ message: 'Reading deleted successfully' });
  } catch (error) {
    next(error);
  }
});

// Update reading endpoint
app.put('/api/readings/:id', async (req, res, next) => {
  try {
    const data = await fs.readFile(DATA_FILE, 'utf8');
    let readings = JSON.parse(data);
    const index = readings.findIndex(reading => reading.id === req.params.id);
    
    if (index === -1) {
      return res.status(404).json({ error: 'Reading not found' });
    }

    readings[index] = { ...readings[index], ...req.body };
    await fs.writeFile(DATA_FILE, JSON.stringify(readings, null, 2));
    res.json(readings[index]);
  } catch (error) {
    next(error);
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'healthy' });
});

// Use error handling middleware
app.use(errorHandler);

// Initialize server
const startServer = async () => {
  try {
    await ensureDataDir();
    await initDataFile();
    
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
      console.log(`Data file: ${DATA_FILE}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received. Shutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});
