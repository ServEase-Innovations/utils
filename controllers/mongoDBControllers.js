const { MongoClient } = require('mongodb');
const fs = require('fs');
const xlsx = require('xlsx');
const { ObjectId } = require('mongodb');  // Ensure ObjectId is imported

const uri = "mongodb://13.235.76.56:27017"; // Replace with your MongoDB URI
const sslCA = fs.readFileSync('./global-bundle.p7b'); // Path to the CA file


/**
 * @swagger
 * /records:
 *   get:
 *     tags:
 *       - pricing
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
 *     tags:
 *       - pricing
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
 *
 * /records/{id}:
 *   get:
 *     tags:
 *       - pricing
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
 *     tags:
 *       - pricing
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
 *     tags:
 *       - pricing
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
 *
 * /delete-data:
 *   post:
 *     tags:
 *       - pricing
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
 *         description: Internal server error
 *
 * /delete-all:
 *   delete:
 *     tags:
 *       - pricing
 *     summary: Delete all records in the Servease_pricing collection
 *     description: Deletes all records from the "Servease_pricing" collection in the MongoDB database.
 *     responses:
 *       200:
 *         description: Successfully deleted all records.
 *       404:
 *         description: No records found to delete.
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /upload:
 *   post:
 *     summary: Upload an Excel file and insert its data into MongoDB Pricing collection
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

/**
 * @swagger
 * /user-settings:
 *   get:
 *     tags:
 *       - user-settings
 *     summary: Get all user-settings from the database
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
 *     tags:
 *       - user-settings
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
 *
 * /user-settings/{id}:
 *   get:
 *     tags:
 *       - user-settings
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
 *     tags:
 *       - user-settings
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
 *     tags:
 *       - user-settings
 *     summary: Delete a user-settings from the database
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
 *
 *
 * /user-settings/delete-all:
 *   delete:
 *     tags:
 *       - user-settings
 *     summary: Delete all records in the user settings collection
 *     description: Deletes all records from the user settings collection in the MongoDB database.
 *     responses:
 *       200:
 *         description: Successfully deleted all records.
 *       404:
 *         description: No records found to delete.
 *       500:
 *         description: Internal server error
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
    tls: false,
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

 async function updateRecord(req, res) {

   const recordId = req.params?.id;  // Get recordId from URL params
   const updateData = req.body;      // Get updateData from request body
 
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
  const { id } = req.params;

  if (!ObjectId.isValid(id)) {
    return res.status(400).send({ error: 'Invalid ID format' });
  }

  try {
    const { db, client } = await connectToDB();
    const collection = db.collection('Servease_pricing'); // Replace with your collection name

    const result = await collection.deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      return res.status(404).send({ message: 'Record not found' });
    }

    return res.status(200).send({ message: 'Record successfully deleted' });
  } catch (error) {
    console.error('Error deleting record:', error);
    return res.status(500).send({ error: 'Internal server error' });
  } finally {
    client.close();
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

async function connectToDBUserPreference() {
  const client = new MongoClient(uri, {
    useUnifiedTopology: true,
    tls: false,
    tlsCAFile: './../global-bundle.pem',
  });
  await client.connect();
  const db = client.db("user");
  return { db, client };
}

async function getUserSettingsRecords() {
  const { db, client } = await connectToDBUserPreference();
  try {
    const collection = db.collection("settings");
    const records = await collection.find({}).toArray();
    return records;
  } catch (error) {
    console.error("Error occurred while fetching records:", error);
    return [];
  } finally {
    await client.close();
  }
}

const deleteAlUserPreference = async (req, res) => {
  const { db, client } = await connectToDBUserPreference();
  try {
    const collection = db.collection('settings');
    
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


async function getUserSettingsById(userId) {
  console.log("Fetching user settings for userId:", userId);
  const { db, client } = await connectToDBUserPreference();
  try {
    const collection = db.collection("settings");

    const records = await collection.find({ userId: parseInt(userId) }).toArray();

    if (records.length === 0) {
      console.log("No records found for userId:", userId);
      return null;
    }

    return records;
  } catch (error) {
    console.error("Error occurred while fetching records:", error);
    return null;
  } finally {
    await client.close();
  }
}


async function addSettings(newRecord) {
  const { db, client } = await connectToDBUserPreference();
  try {
    const collection = db.collection("settings");
    const result = await collection.insertOne(newRecord);
    return result;
  } catch (error) {
    console.error("Error occurred while adding record:", error);
    return null;
  } finally {
    await client.close();
  }
}

async function updateUserSettings(req, res) {

  const recordId = req.params?.id;  // Get recordId from URL params
  const updateData = req.body;      // Get updateData from request body

  const { db, client } = await connectToDBUserPreference();
  try {
    // Clean up field names (remove any empty strings, invalid names, or keys with spaces)
    const sanitizedUpdateData = Object.fromEntries(
      Object.entries(updateData).filter(([key, value]) => {
        // Remove empty strings or undefined values and ensure keys are not empty or only spaces
        return key.trim() !== "" && value !== undefined && key !== "";
      })
    );

    if (Object.keys(sanitizedUpdateData).length === 0) {
      console.error("No valid fields to update");
      return res.status(400).json({ message: "No valid fields to update" });
    }

    const collection = db.collection("settings");

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

async function deleteUserSettings (req, res) {
  const { id } = req.params;

  if (!ObjectId.isValid(id)) {
    return res.status(400).send({ error: 'Invalid ID format' });
  }

  try {
    const { db, client } = await connectToDBUserPreference();
    const collection = db.collection('settings');

    const result = await collection.deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      return res.status(404).send({ message: 'Record not found' });
    }

    return res.status(200).send({ message: 'Record successfully deleted' });
  } catch (error) {
    console.error('Error deleting record:', error);
    return res.status(500).send({ error: 'Internal server error' });
  } finally {
    client.close();
  }
};

async function deleteUserPreferenceRecord (req, res) {
  const { id } = req.params;

  if (!ObjectId.isValid(id)) {
    return res.status(400).send({ error: 'Invalid ID format' });
  }

  try {
    const { db, client } = await connectToDBUserPreference();
    const collection = db.collection('settings');

    const result = await collection.deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      return res.status(404).send({ message: 'Record not found' });
    }

    return res.status(200).send({ message: 'Record successfully deleted' });
  } catch (error) {
    console.error('Error deleting record:', error);
    return res.status(500).send({ error: 'Internal server error' });
  } finally {
    client.close();
  }
};
 



module.exports = {
  getRecords,
  getRecordById,
  addRecord,
  updateRecord,
  uploadExcel,
  deleteAll,
  deleteRecord,
  getUserSettingsRecords,
  getUserSettingsById,
  addSettings,
  deleteUserPreferenceRecord,
  updateUserSettings,
  deleteUserSettings,
  deleteAlUserPreference
};
