import fs from "fs";
import csv from "csv-parser";
import { MongoClient } from "mongodb";
import dotenv from "dotenv";

dotenv.config();

const uri = process.env.MONGO_URI;

const client = new MongoClient(uri);

async function run() {
  await client.connect();
  const db = client.db("gtt-static-gtfs");
  const collection = db.collection("trips");

  const batch = [];
  const stream = fs.createReadStream("gtt_gtfs/trips.txt").pipe(csv());

  stream.on("data", (row) => {
    batch.push(row);
    if (batch.length === 1000) { // batch insert
      stream.pause();
      collection.insertMany(batch)
        .then(() => {
          batch.length = 0;
          stream.resume();
        })
        .catch(console.error);
    }
  });

  stream.on("end", async () => {
    if (batch.length) await collection.insertMany(batch);
    console.log("✅ CSV import complete!");
    await client.close();
  });
}

//run().catch(console.error);
