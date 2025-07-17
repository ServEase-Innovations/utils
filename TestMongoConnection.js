const { MongoClient } = require('mongodb');

const uri = "mongodb://serveaso:serveaso@43.204.100.109:27017/?authSource=admin"; // Replace with your EC2's public IP address

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
