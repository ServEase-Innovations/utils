const express = require('express');
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');
const { MongoClient, ObjectId } = require('mongodb');
const fs = require('fs');

const app = express();
const port = 3000;

// MongoDB URI and SSL certificate
const uri = "mongodb://servease:servease@docdb-2025-01-12-14-21-33.c1ccc8a0u3nt.ap-south-1.docdb.amazonaws.com:27017,docdb-2025-01-12-14-21-332.c1ccc8a0u3nt.ap-south-1.docdb.amazonaws.com:27017,docdb-2025-01-12-14-21-333.c1ccc8a0u3nt.ap-south-1.docdb.amazonaws.com:27017/?tls=true&replicaSet=rs0&readPreference=secondaryPreferred";
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
    return [];
  } finally {
    await client.close();
  }
}

// MongoDB Update Record
async function updateRecord(recordId, updateData) {
  const client = new MongoClient(uri, {
    useUnifiedTopology: true,
    tls: true,
    tlsCAFile: './global-bundle.pem',  // Path to the CA file
  });

  try {
    await client.connect();
    const db = client.db("pricing");
    const collection = db.collection("Servease_pricing");

    const result = await collection.updateOne(
      { _id: new ObjectId(recordId) }, // Convert the id to ObjectId
      { $set: updateData }
    );

    return result;
  } catch (error) {
    console.error("Error occurred while updating record:", error);
    return null;
  } finally {
    await client.close();
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
 * /records/{id}:
 *   put:
 *     summary: Update a record in the database
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: The ID of the record to update
 *         schema:
 *           type: string
 *       - in: body
 *         name: record
 *         description: The record data to update
 *         required: true
 *         schema:
 *           type: object
 *           properties:
 *             name:
 *               type: string
 *             price:
 *               type: number
 *             description:
 *               type: string
 *     responses:
 *       200:
 *         description: Record updated successfully
 *       400:
 *         description: Invalid ID or data
 *       404:
 *         description: Record not found
 */

app.get('/records', async (req, res) => {
  const records = await fetchRecords();
  res.json(records);
});

app.put('/records/:id', async (req, res) => {
  const recordId = req.params.id;  // Get the record ID from URL params
  const updateData = req.body;  // Get the update data from request body

  // Validate the ObjectId format
  if (!ObjectId.isValid(recordId)) {
    return res.status(400).json({ message: 'Invalid ID format' });
  }

  // Check if the update data is valid
  if (!updateData || Object.keys(updateData).length === 0) {
    return res.status(400).json({ message: 'Invalid data provided' });
  }

  // Check that at least one field is provided (optional)
  // Modify the validation to be flexible to your use case
  if (!updateData.name && !updateData.price && !updateData.description) {
    return res.status(400).json({ message: 'At least one field (name, price, or description) must be provided' });
  }

  // Update the record in MongoDB
  const result = await updateRecord(recordId, updateData);

  if (result && result.modifiedCount > 0) {
    return res.status(200).json({ message: 'Record updated successfully' });
  } else {
    return res.status(404).json({ message: 'Record not found or no changes made' });
  }
});

// Start the Server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
