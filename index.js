import GtfsRealtimeBindings from "gtfs-realtime-bindings";
import fetch from "node-fetch";
import { openDb, getRoutes } from 'gtfs';
import { readFile } from 'fs/promises';
import path from 'node:path';

const config = JSON.parse(
  await readFile(path.join(import.meta.dirname, 'config.json'), 'utf8')
);

const db = openDb(config);

const routes = getRoutes(
  {}, // No query filters
  ['route_id', 'route_short_name', 'route_color'], // Only return these fields
  [['route_short_name', 'ASC']], // Sort by this field and direction
  { db: db }, // Options for the query. Can specify which database to use if more than one are open
);

console.log(routes);

async function getRealtimeData() {
  try {
    const response = await fetch("http://percorsieorari.gtt.to.it/das_gtfsrt/trip_update.aspx");
    if (!response.ok) {
      const error = new Error(`${response.url}: ${response.status} ${response.statusText}`);
      error.response = response;
      throw error;
      process.exit(1);
    }
    const buffer = await response.arrayBuffer();
    const feed = GtfsRealtimeBindings.transit_realtime.FeedMessage.decode(
      new Uint8Array(buffer)
    );
    
    console.log(JSON.stringify(feed.entity[0].tripUpdate.stopTimeUpdate, null, 2));
  }
  catch (error) {
    console.log(error);
    process.exit(1);
  }
}

//await getRealtimeData();