const express = require('express');
const { MongoClient } = require('mongodb');
const fs = require('fs');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

// Your Amazon DocumentDB details
const uri = "mongodb://servease:servease@docdb-2025-01-12-14-21-33.c1ccc8a0u3nt.ap-south-1.docdb.amazonaws.com:27017,docdb-2025-01-12-14-21-332.c1ccc8a0u3nt.ap-south-1.docdb.amazonaws.com:27017,docdb-2025-01-12-14-21-333.c1ccc8a0u3nt.ap-south-1.docdb.amazonaws.com:27017/?tls=true&replicaSet=rs0&readPreference=secondaryPreferred";

// Path to your Amazon DocumentDB CA certificate
const sslCA = fs.readFileSync('./global-bundle.pem'); // Replace with your actual certificate path

// Create an express app
const app = express();
const port = 3000;  // Port for your service

// Swagger configuration
const swaggerOptions = {
  swaggerDefinition: {
    openapi: '3.0.0',
    info: {
      title: 'Amazon DocumentDB API',
      version: '1.0.0',
      description: 'API to fetch records from Amazon DocumentDB',
    },
    servers: [
      {
        url: `http://localhost:${port}`,
      },
    ],
  },
  apis: ['./server.js'], // Path to the API docs
};

// Initialize Swagger docs
const swaggerDocs = swaggerJsdoc(swaggerOptions);

// Use Swagger UI to display the API docs
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));

// Endpoint to fetch records from DocumentDB
/**
 * @swagger
 * /records:
 *   get:
 *     summary: Get all records from the DocumentDB collection
 *     description: Fetch all records from the pricing collection in DocumentDB
 *     responses:
 *       200:
 *         description: A list of records from the collection
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *       500:
 *         description: Error fetching records
 */
app.get('/records', async (req, res) => {
  const client = new MongoClient(uri, {
    useUnifiedTopology: true,
    tls: true,
    tlsCAFile: './global-bundle.pem', // Path to CA certificate
  });

  try {
    await client.connect();
    console.log("Connected to Amazon DocumentDB");

    const db = client.db('pricing'); // Replace with your actual database name
    const collection = db.collection('Servease_pricing'); // Replace with your actual collection name

    // Fetch all records from the collection
    const records = await collection.find({}).toArray();

    res.status(200).json(records); // Send the records as JSON response
  } catch (err) {
    console.error('Error occurred while fetching records:', err);
    res.status(500).send('Error fetching records');
  } finally {
    await client.close();
  }
});

// Start the express server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
