import csv from "csv-parser";
import { MongoClient } from "mongodb";
import dotenv from "dotenv";
import { Readable } from "stream";
import AdmZip from "adm-zip";

dotenv.config();

const files = ["stop_times.txt", "trips.txt", "stops.txt"];
const collections = ["stop_times", "trips", "stops"];
const BATCH_SIZE = 500;

const uri = process.env.MONGO_URI;
const client = new MongoClient(uri);

async function updateCollection(name, zipEntries) {
  console.log(`Updating collection: ${name}`);

  const db = client.db("gtt-static-gtfs");

  // Drop old collection if it exists
  await db.collection(name).drop().catch(() => {
    console.log(`${name} collection does not exist, skipping drop.`);
  });

  const collection = db.collection(name);

  const entry = zipEntries.find(e => e.entryName === `${name}.txt`);
  if (!entry) throw new Error(`Entry "${name}.txt" not found in zip`);

  const buffer = entry.getData(); // Buffer of the CSV
  const stream = Readable.from(buffer).pipe(csv());

  const batch = [];

  // Wrap stream in a promise to await completion
  await new Promise((resolve, reject) => {
    stream.on("data", (row) => {
      batch.push(row);
      if (batch.length === BATCH_SIZE) {
        stream.pause();
        collection.insertMany(batch, { ordered: false })
          .then(() => {
            batch.length = 0;  // clear batch
            stream.resume();
          })
          .catch(reject);
      }
    });

    stream.on("end", async () => {
      try {
        if (batch.length) await collection.insertMany(batch, { ordered: false });
        console.log(`${name} ✅ CSV import complete!`);
        resolve();
      } catch (err) {
        reject(err);
      }
    });

    stream.on("error", reject);
  });
}

async function main() {
  try {
    await client.connect();

    // Fetch and unzip GTFS feed
    const response = await fetch("https://www.gtt.to.it/open_data/gtt_gtfs.zip");
    const buffer = Buffer.from(await response.arrayBuffer());
    const zip = new AdmZip(buffer);
    const zipEntries = zip.getEntries().filter(e => files.includes(e.entryName));

    // Sequentially import each collection
    for (const name of collections) {
      await updateCollection(name, zipEntries);
    }

    console.log("✅ All collections imported successfully!");
  } catch (err) {
    console.error(err);
  } finally {
    await client.close();
  }
}

main();
