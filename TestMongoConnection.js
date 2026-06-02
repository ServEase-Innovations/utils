const { MongoClient } = require('mongodb');

const uri = process.env.MONGO_URI?.trim();
if (!uri) {
  console.error("Set MONGO_URI in services/utils/.env.development");
  process.exit(1);
}

async function connectMongo() {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    console.log("Connected to MongoDB successfully!");
    // Perform your database operations here
  } catch (err) {
    console.error("Error connecting to MongoDB:", err);
  } finally {
    await client.close();
  }
}

connectMongo();
