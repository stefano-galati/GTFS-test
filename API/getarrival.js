import { getRealTimeSchedule } from '../index.js';

export async function handler(event, context) {
  const stop = event.queryStringParameters?.stop;

  if (!stop) {
    return {
      statusCode: 400,
      headers: {
        "Access-Control-Allow-Origin": "*", // allow all origins
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
      body: JSON.stringify({ error: 'Missing stop parameter' }),
    };
  }

  const data = await getRealTimeSchedule(stop);

  return {
    statusCode: 200,
    headers: { 
      'Content-Type': 'application/json',
      "Access-Control-Allow-Origin": "*", // allow all origins
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type", 
    },
    body: JSON.stringify(data),
  };
}
