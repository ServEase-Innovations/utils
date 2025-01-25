const { MongoClient } = require('mongodb');
const fs = require('fs');
const xlsx = require('xlsx');
const { ObjectId } = require('mongodb');  // Ensure ObjectId is imported

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
 *   delete:
 *     summary: Delete a record from the database
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: The ID of the record to delete
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Successfully deleted the record
 *       400:
 *         description: Invalid ID format
 *       404:
 *         description: Record not found
 *       500:
 *         description: Internal server error
 * /delete-data:
 *   post:
 *     summary: Delete data from a specific collection in DocumentDB
 *     description: Deletes documents from a collection in DocumentDB based on a filter.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               collection:
 *                 type: string
 *                 description: The name of the collection to delete from.
 *                 example: users
 *               filter:
 *                 type: object
 *                 description: The filter to match documents for deletion.
 *                 example: { "name": "John" }
 *     responses:
 *       200:
 *         description: Successfully deleted documents.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "1 document(s) deleted"
 *       400:
 *         description: Bad request, missing collection or filter.
 *       404:
 *         description: No documents found matching the filter.
 *       500:
 *         description: Internal server error.
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

// Route to delete all records from the collection
/**
 * @swagger
 * /delete-all:
 *   delete:
 *     summary: Delete all records in the Servease_pricing collection
 *     description: Deletes all records from the "Servease_pricing" collection in the MongoDB database.
 *     responses:
 *       200:
 *         description: Successfully deleted all records.
 *       404:
 *         description: No records found to delete.
 *       500:
 *         description: Internal server error.
 */


const deleteAll = async (req, res) => {
  const { db, client } = await connectToDB();
  try {
    const collection = db.collection('Servease_pricing');
    
    // Delete all records in the collection
    const result = await collection.deleteMany({});
    
    if (result.deletedCount > 0) {
      return res.status(200).send(`Successfully deleted ${result.deletedCount} records.`);
    } else {
      return res.status(404).send('No records found to delete.');
    }
  } catch (err) {
    console.error('Error deleting records:', err);
    res.status(500).send('Error deleting records from MongoDB.');
  } finally {
    await client.close();
  }
};

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
 // Make sure to import ObjectId

 async function updateRecord(req, res) {

  console.log(" req ", req)
  console.log("res ", res)

   const recordId = req.params?.id;  // Get recordId from URL params
   const updateData = req.body;      // Get updateData from request body
 
   // Validate the recordId format
  //  if (!ObjectId.isValid(updateData)) {
  //    console.error("Invalid ObjectId format");
  //    return res.status(400).json({ message: "Invalid ID format" });
  //  }
 
   const { db, client } = await connectToDB();
   try {
     // Clean up field names (remove any empty strings, invalid names, or keys with spaces)
     const sanitizedUpdateData = Object.fromEntries(
       Object.entries(updateData).filter(([key, value]) => {
         // Remove empty strings or undefined values and ensure keys are not empty or only spaces
         return key.trim() !== "" && value !== undefined && key !== "";
       })
     );
 
     console.log("Sanitized Update Data: ", sanitizedUpdateData); // Log sanitized data for debugging
 
     if (Object.keys(sanitizedUpdateData).length === 0) {
       console.error("No valid fields to update");
       return res.status(400).json({ message: "No valid fields to update" });
     }
 
     const collection = db.collection("Servease_pricing");
 
     // Ensure index exists on _id field (optional, only if necessary)
     await collection.createIndex({ _id: 1 });
 
     // Perform the update operation
     const result = await collection.updateOne(
       { _id: new ObjectId(recordId) },  // Convert the recordId to ObjectId
       { $set: sanitizedUpdateData }     // Only include sanitized fields for update
     );


     console.log("result ",result)
 
     if (result.modifiedCount > 0) {
       console.log("Record updated successfully!");
       return res.status(200).json({ message: "Record updated successfully!" });
     } else {
       console.log("No document was updated.");
       return res.status(404).json({ message: "No record found to update." });
     }
   } catch (error) {
     console.error("Error occurred while updating record:", error);
     return res.status(500).json({ message: "Internal server error." });
   } 
   finally {
     await client.close();
   }
 }

 async function deleteRecord (req, res) {
  const { collection, filter } = req.body;

  if (!collection || !filter) {
    return res.status(400).send({ error: 'Collection and filter are required' });
  }

  try {
    const db = await connectToDb();
    const result = await db.collection(collection).deleteMany(filter); // deleteMany is used here, change to deleteOne for single item deletion

    if (result.deletedCount === 0) {
      return res.status(404).send({ message: 'No documents matched the filter' });
    }

    return res.status(200).send({
      message: `${result.deletedCount} document(s) deleted`,
    });
  } catch (error) {
    console.error('Error deleting data:', error);
    return res.status(500).send({ error: 'Error deleting data from DocumentDB' });
  }
};
 


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
  uploadExcel,
  deleteAll,
  deleteRecord
};
