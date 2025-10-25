import { getRealTimeSchedule } from '../index.js';

export async function handler(event, context) {
  const stop = event.queryStringParameters?.stop;

  if (!stop) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Missing stop parameter' }),
    };
  }

  const data = await getRealTimeSchedule(stop);

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  };
}
