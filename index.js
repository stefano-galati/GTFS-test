import GtfsRealtimeBindings from "gtfs-realtime-bindings";
import fetch from "node-fetch";
import { openDb, getRoutes } from 'gtfs';
import mongoose from 'mongoose';
import dotenv from "dotenv";
import { MongoClient } from "mongodb";



dotenv.config();

const uri = process.env.MONGO_URI;


const client = new MongoClient(uri);

await client.connect()
  .then(() => console.log('✅ Connected to MongoDB Atlas'))
  .catch(err => console.error('❌ Connection error:', err));

const db = client.db("gtt-static-gtfs");
const trips = db.collection("trips");
const stopTimes = db.collection("stop_times");
const stops = db.collection("stops");

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
    
    return feed
  }
  catch (error) {
    console.log(error);
    process.exit(1);
  }
}

const time = new Date();
const hours = time.getHours()
const minutes = time.getMinutes()
const seconds = time.getSeconds()

const timeString = hours.toString().padStart(2, "0") + ":" + minutes.toString().padStart(2, "0") + ":" + seconds.toString().padStart(2, "0");
const nextHourString = (hours == 23 ? "00" : (hours + 1).toString().padStart(2, "0")) + ":" + minutes.toString().padStart(2, "0") + ":" + seconds.toString().padStart(2, "0");
const nextHourOverflowString = (hours + 1).toString().padStart(2, "0") + ":" + minutes.toString().padStart(2, "0") + ":" + seconds.toString().padStart(2, "0");
const previousHourString = (hours == 0 ? "23" : (hours - 1).toString().padStart(2, "0")) + ":" + minutes.toString().padStart(2, "0") + ":" + seconds.toString().padStart(2, "0");


//start from stop_code
const stopCode = "408";
const foundStop = await stops.findOne({ stop_code: stopCode });
//get stop_id
const foundStopId = foundStop.stop_id;
//get stop_times for that stop_id
console.log(previousHourString, timeString, nextHourString);

let foundStopTimes;
if(previousHourString > nextHourString){
  foundStopTimes = await stopTimes.find({ stop_id: foundStopId, $or: [ { arrival_time: { $gte: previousHourString } }, { arrival_time: { $lte: nextHourString } }, { arrival_time: { $gte:previousHourString, $lte: nextHourOverflowString } } ] }).toArray();
}
else{
  foundStopTimes = await stopTimes.find({ stop_id: foundStopId, arrival_time: {$gte: previousHourString, $lte: nextHourString}}).toArray();
}

//get trip_ids from stop_times
let infos = foundStopTimes.map(async s => {
  const routeId = await trips.findOne({ trip_id: s.trip_id }).then(t => t.route_id);
  return { "route_id": routeId, "trip_id": s.trip_id, "arrival_time": s.arrival_time, "stop_sequence": s.stop_sequence }
});
infos = await Promise.all(infos);

//get realtime data
const realtimeData =  await getRealtimeData();
// console.log(JSON.stringify(realtimeData, null, 2));
console.log(`Fetched ${realtimeData.entity.length} realtime entities`);
// console.log(realtimeData.entity.map(e => e.id));
// console.log(infos.map(t => t.trip_id));

const entityList = [];

realtimeData.entity.forEach(e => {
  console.log(e.id);
  infos.forEach(i => {
    if (e.id == i.trip_id) {
      if(e.tripUpdate && e.tripUpdate.stopTimeUpdate.some(stu => stu.stopSequence == i.stop_sequence)){
        const delay = e.tripUpdate.stopTimeUpdate.find(stu => stu.stopSequence == i.stop_sequence).arrival.delay;
        entityList.push({
          ...i,
          delay: (delay>=86400) ? (delay-86400) : delay //correct delay if greater than 24 hours
        });
      }
      //print realtime entities that have an id of a trip in the chosen time interval which stops at the chosen stop
      console.log(i, JSON.stringify(e, null, 2));
    }
  });
});

console.log(JSON.stringify(entityList, null, 2));
process.exit(0);