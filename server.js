// server.js
import express from 'express';
import dotenv from 'dotenv';
import { getRealTimeSchedule } from './index.js';

// Load environment variables from .env file
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

function getData(stop){
    return { stop: stop, data: "Sample data for stop " + stop };
}

// API route
app.get('/api', async (req, res) => {
  const stop = req.query.stop;
  if (stop) {
    const data = await getRealTimeSchedule(stop);
    res.status(200).json(data);
  }
  else
    res.status(400).json({ error: 'Missing stop parameter' });
});

// API route status
app.get('/api/status', (req, res) => {
    res.status(200).json({ status: 'API is running' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});
