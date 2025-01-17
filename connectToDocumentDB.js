const { MongoClient } = require('mongodb');
const fs = require('fs');

// Your Amazon DocumentDB details
const uri = "mongodb://servease:servease@docdb-2025-01-12-14-21-33.c1ccc8a0u3nt.ap-south-1.docdb.amazonaws.com:27017,docdb-2025-01-12-14-21-332.c1ccc8a0u3nt.ap-south-1.docdb.amazonaws.com:27017,docdb-2025-01-12-14-21-333.c1ccc8a0u3nt.ap-south-1.docdb.amazonaws.com:27017/?tls=true&replicaSet=rs0&readPreference=secondaryPreferred";

// Path to your Amazon DocumentDB CA certificate
const sslCA = fs.readFileSync('./global-bundle.p7b');  // Replace with your path to the downloaded certificate file

async function fetchRecords() {
  const client = new MongoClient(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    tls: true,  // Enable TLS encryption
    tlsCAFile: './global-bundle.p7b',  // Path to the CA certificate
  });

  try {
    // Connect to the Amazon DocumentDB cluster
    await client.connect();
    console.log("Connected to Amazon DocumentDB");

    // Select the database and collection
    const db = client.db("pricing");  // Replace with your actual database name
    const collection = db.collection("Servease_pricing");  // Replace with your actual collection name

    // Fetch all records from the collection
    const records = await collection.find({}).toArray();
    
    // Print the fetched records
    // console.log("Fetched records:", records);
  } catch (err) {
    console.error("Error occurred while fetching records:", err);
  } finally {
    // Close the connection to the DocumentDB
    await client.close();
  }
}

// Call the function to fetch records
fetchRecords();
