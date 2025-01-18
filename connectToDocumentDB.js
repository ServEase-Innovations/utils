const express = require('express');
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');
const { MongoClient, ObjectId } = require('mongodb');
const fs = require('fs');

const app = express();
const port = 3000;

// MongoDB URI and SSL certificate
const uri = "mongodb://servease:servease@docdb-2025-01-12-14-21-33.c1ccc8a0u3nt.ap-south-1.docdb.amazonaws.com:27017,docdb-2025-01-12-14-21-332.c1ccc8a0u3nt.ap-south-1.docdb.amazonaws.com:27017,docdb-2025-01-12-14-21-333.c1ccc8a0u3nt.ap-south-1.docdb.amazonaws.com:27017/?tls=true&replicaSet=rs0&readPreference=secondaryPreferred&retryWrites=false";
const sslCA = fs.readFileSync('./global-bundle.p7b');  // Path to the CA file

// Express JSON middleware for parsing JSON body
app.use(express.json());

// Swagger Definition
const serverUrl = process.env.BASE_URL || 'http://3.110.168.35:3000';

// Swagger Definition
const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'My API',
    version: '1.0.0',
    description: 'API to interact with Amazon DocumentDB',
  },
  servers: [
    {
      url: serverUrl,  // Use dynamic URL
    },
  ],
};

// Swagger Options
const options = {
  swaggerDefinition,
  apis: ['./connectToDocumentDB.js'],  // Path to the Swagger annotations in your code
};

// Generate Swagger Specification
const swaggerSpec = swaggerJsdoc(options);

// Serve Swagger UI at /api-docs
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// MongoDB Connection and Fetching Records
async function addRecord(recordData) {
  const client = new MongoClient(uri, {
    useUnifiedTopology: true,
    tls: true,
    tlsCAFile: './global-bundle.pem',  // Path to the CA file
  });

  try {
    await client.connect();
    const db = client.db("pricing");
    const collection = db.collection("Servease_pricing");

    // Log the record data for debugging purposes
    console.log("Data to be added:", recordData);

    const result = await collection.insertOne(recordData);

    // Log the result of the operation
    console.log("Record inserted:", result);
    return result;
  } catch (error) {
    console.error("Error occurred while adding record:", error);
    throw new Error("Failed to insert record");
  } finally {
    await client.close();
  }
}

/**
 * @swagger
 * /records:
 *   post:
 *     summary: Add a new record to the database
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               price:
 *                 type: number
 *               description:
 *                 type: string
 *     responses:
 *       200:
 *         description: Record added successfully
 *       400:
 *         description: Invalid input data
 *       500:
 *         description: Internal Server Error
 */

app.post('/records', async (req, res) => {
  const recordData = req.body;

  // Input validation (you can customize this as needed)
  if (!recordData || !recordData.name || !recordData.price || !recordData.description) {
    return res.status(400).json({ message: 'Invalid data provided. Name, price, and description are required.' });
  }

  try {
    const result = await addRecord(recordData);
    res.status(200).json({ message: 'Record added successfully', result });
  } catch (error) {
    console.error('Error adding record:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

// Start the Server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
