import GtfsRealtimeBindings from "gtfs-realtime-bindings";
import fetch from "node-fetch";
import fs from "fs";
import csv from "csv-parser";
import { openDb, getRoutes } from 'gtfs';
import { readFile } from 'fs/promises';
import path from 'node:path';
import mongoose from 'mongoose';
import dotenv from "dotenv";
dotenv.config();

const uri = process.env.MONGO_URI;

async function getRealtimeData(tripIds) {
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
    
    //console.log(JSON.stringify(feed.entity[0], null, 2));
    return feed.entity.filter(x => tripIds.includes(x.id));
  }
  catch (error) {
    console.log(error);
    process.exit(1);
  }
}

function getStaticArrivalTimes(stopId) {
  const time = new Date();
  const timeString = time.toTimeString().slice(0, 8); // "hh:mm:ss"
  const maxTime = new Date(time.getTime() + 60 * 60 * 1000); // 1 hour from now
  const maxTimeString = maxTime.toTimeString().slice(0, 8); // "hh:mm:ss"

  const results = [];

  return new Promise((resolve, reject) => {

    fs.createReadStream("./gtt_gtfs/stop_times.txt")
      .pipe(csv())
      .on("data", (data) => {
        if (data.stop_id == stopId 
          // && data.arrival_time >= timeString
          // && data.arrival_time < maxTimeString
        ) 
          results.push(data);
      })
      .on("end", () => resolve(results))
      .on("error", reject);

      return results;
  });
}

function getStops() {
  const results = [];

  return new Promise((resolve, reject) => {

    fs.createReadStream("./gtt_gtfs/stops.txt")
      .pipe(csv())
      .on("data", (data) => results.push(data))
      .on("end", () => resolve(results))
      .on("error", reject);

      return results;
  });
}

function getTrips(tripIds) {
  const results = [];

  return new Promise((resolve, reject) => {
    fs.createReadStream("./gtt_gtfs/trips.txt")
      .pipe(csv())
      .on("data", (data) => results.push(data))
      .on("end", () => {
        resolve(results);
      })
      .on("error", reject);

      return results.filter(x => tripIds.includes(x.trip_id));
  });
};

async function example() {
  
  const stopCode = "408";

  //get stopId from stopCode
  const stops = await getStops();
  const stop = stops.find(x => x.stop_code == stopCode);
  if (!stop) {
    console.log("Stop not found");
    return;
  }
  const stopId = stop.stop_id;
  //console.log("Stop " + stopId);

  //get static arrival times for the stopId
  const staticData = await getStaticArrivalTimes(stopId);
  //console.log(staticData);

  let trips = staticData.map(x => ({ trip_id: x.trip_id, stop_sequence: x.stop_sequence, arrival_time: x.arrival_time }));
  
  const tripsMapping = await getTrips(trips.map(x => x.trip_id));
  //console.log(tripsMapping);

  trips = trips.map(x => {
    const lineNumber = tripsMapping.find(y => y.trip_id == x.trip_id)?.route_id;
    return { ...x, line: lineNumber };
  });

  const realtimeData = await getRealtimeData(trips.map(x => x.trip_id));
  //console.log(JSON.stringify(realtimeData, null, 2));

  //console.log("Static");
  //console.log(trips.map(x => x.trip_id));

  //console.log("Real-time");
  //realtimeData.forEach(x => console.log(x.id));

  realtimeData.forEach(x => {
    const trip = trips.find(y => y.trip_id == x.id);
    const stopTimeUpdate = x.tripUpdate.stopTimeUpdate.find(y => y.stopSequence == trip.stop_sequence);

    console.log(trip);
    console.log(x.tripUpdate.stopTimeUpdate[0]);

  });

  // trips.forEach(trip => {
  //   const foundTrip = realtimeData.find(x => x.id == trip.trip_id);
  //   if(foundTrip){
  //     //console.log(foundTrip.tripUpdate.stopTimeUpdate);
  //     const foundDelay = foundTrip.tripUpdate.stopTimeUpdate.find(x => x.stopSequence == trip.stop_sequence);
  //     if (foundDelay) {
  //       console.log(trip.line ,trip.arrival_time, foundDelay.arrival.delay);
  //     }
  //   }
  // });
}

example();