const { MongoClient, ObjectId } = require('mongodb');
const fs = require('fs');
const xlsx = require('xlsx');

const uri = "mongodb://servease:servease@docdb-2025-01-12-14-21-33.c1ccc8a0u3nt.ap-south-1.docdb.amazonaws.com:27017,docdb-2025-01-12-14-21-332.c1ccc8a0u3nt.ap-south-1.docdb.amazonaws.com:27017,docdb-2025-01-12-14-21-333.c1ccc8a0u3nt.ap-south-1.docdb.amazonaws.com:27017/?tls=true&replicaSet=rs0&readPreference=secondaryPreferred&retryWrites=false"; // Replace with your MongoDB URI
const sslCA = fs.readFileSync('./global-bundle.p7b'); // Path to the CA file


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
 *       201:
 *         description: Record added successfully
 *       400:
 *         description: Invalid data provided
 * /records/{id}:
 *   get:
 *     summary: Get a record by its ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: The ID of the record to retrieve
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: A single record from the database
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 _id:
 *                   type: string
 *                 name:
 *                   type: string
 *                 price:
 *                   type: number
 *                 description:
 *                   type: string
 *       400:
 *         description: Invalid ID format
 *       404:
 *         description: Record not found
 *   put:
 *     summary: Update a record in the database
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: The ID of the record to update
 *         schema:
 *           type: string
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
 *         description: Record updated successfully
 *       400:
 *         description: Invalid ID or data
 *       404:
 *         description: Record not found or no changes made
 */

/**
 * @swagger
 * /upload:
 *   post:
 *     summary: Upload an Excel file and insert its data into MongoDB
 *     tags: [Upload]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Successfully inserted the records into MongoDB
 *       400:
 *         description: No file uploaded or invalid file format
 *       500:
 *         description: Error processing the Excel file or inserting data into MongoDB
 */


// Function to connect to the database
async function connectToDB() {
  const client = new MongoClient(uri, {
    useUnifiedTopology: true,
    tls: true,
    tlsCAFile: './../global-bundle.pem',
  });
  await client.connect();
  const db = client.db("pricing");
  return { db, client };
}

// Fetch all records
async function getRecords() {
  const { db, client } = await connectToDB();
  try {
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

// Fetch a single record by ID
async function getRecordById(recordId) {
  const { db, client } = await connectToDB();
  try {
    const collection = db.collection("Servease_pricing");
    const record = await collection.findOne({ _id: new ObjectId(recordId) });
    return record;
  } catch (error) {
    console.error("Error occurred while fetching record:", error);
    return null;
  } finally {
    await client.close();
  }
}

// Add a new record
async function addRecord(newRecord) {
  const { db, client } = await connectToDB();
  try {
    const collection = db.collection("Servease_pricing");
    const result = await collection.insertOne(newRecord);
    return result;
  } catch (error) {
    console.error("Error occurred while adding record:", error);
    return null;
  } finally {
    await client.close();
  }
}

// Update an existing record
async function updateRecord(recordId, updateData) {
  const { db, client } = await connectToDB();
  try {
    const collection = db.collection("Servease_pricing");
    const result = await collection.updateOne(
      { _id: new ObjectId(recordId) },
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

const uploadExcel = async (req, res) => {
  if (!req.file) {
    return res.status(400).send('No file uploaded.');
  }

  const { db, client } = await connectToDB();
  try {
    // Parse the Excel file buffer
    const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const jsonData = xlsx.utils.sheet_to_json(sheet);

    // Insert data into MongoDB
    const collection = db.collection("Servease_pricing");
    const result = await collection.insertMany(jsonData);
    res.status(200).send(`Successfully inserted ${result.insertedCount} records.`);
  } catch (err) {
    console.error('Error processing the Excel file:', err);
    res.status(500).send('Error processing the Excel file.');
  }
  finally {
    await client.close();
  }
};

module.exports = {
  getRecords,
  getRecordById,
  addRecord,
  updateRecord,
  uploadExcel
};
