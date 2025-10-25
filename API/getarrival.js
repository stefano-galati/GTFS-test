import { getRealTimeSchedule } from '../index.js';

export async function handler(event, context) {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  };

  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers
    };
  }

  // Parse body for POST requests
  const stops = event.body ? JSON.parse(event.body).stops : null;

  if (!stops) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Missing stop parameter' }),
    };
  }

  const data = await getRealTimeSchedule(stops);

  return {
    statusCode: 200,
    headers: { 
      ...headers,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(data),
  };
}

