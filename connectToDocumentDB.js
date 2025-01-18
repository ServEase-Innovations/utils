const express = require('express');
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');
const { MongoClient } = require('mongodb');
const fs = require('fs');

const app = express();
const port = 3000;

// MongoDB URI and SSL certificate
const uri = "mongodb://servease:servease@docdb-2025-01-12-14-21-33.c1ccc8a0u3nt.ap-south-1.docdb.amazonaws.com:27017,docdb-2025-01-12-14-21-332.c1ccc8a0u3nt.ap-south-1.docdb.amazonaws.com:27017,docdb-2025-01-12-14-21-333.c1ccc8a0u3nt.ap-south-1.docdb.amazonaws.com:27017/?tls=true&replicaSet=rs0&readPreference=secondaryPreferred";
const sslCA = fs.readFileSync('./global-bundle.p7b');  // Path to the CA file

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
      url: 'http://localhost:3000',
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
async function fetchRecords() {
  const client = new MongoClient(uri, {
    useUnifiedTopology: true,
    tls: true,
    tlsCAFile: './global-bundle.pem',  // Path to the CA file
  });

  try {
    await client.connect();
    const db = client.db("pricing");
    const collection = db.collection("Servease_pricing");
    const records = await collection.find({}).toArray();
    return records;
  } catch (error) {
    console.error("Error occurred while fetching records:", error);
  }
}

/**
 * @swagger
 * /records:
 *   get:
 *     summary: Get all records from the database
 *     responses:
 *       200:
 *         description: A list of records from the database
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   _id:
 *                     type: string
 *                   name:
 *                     type: string
 *                   price:
 *                     type: number
 *                   description:
 *                     type: string
 */
app.get('/records', async (req, res) => {
  const records = await fetchRecords();
  res.json(records);
});

app.get('/hello', (req, res) => {
  res.json({ message: 'Hello World' });
});

// Start the Server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
