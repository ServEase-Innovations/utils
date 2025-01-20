const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const swaggerUi = require('swagger-ui-express');
const { swaggerSpec } = require('./docs/swaggerDocs');
const multer = require('multer');
const xlsx = require('xlsx');
const { getRecords, getRecordById, addRecord, updateRecord  } = require('./controllers/mongoDBControllers');
const emailRoutes = require('./routes/emailRoutes'); // Import email routes
const { MongoClient, ObjectId } = require('mongodb');

const app = express();
const port = 3000;

const storage = multer.memoryStorage();
const upload = multer({ storage });

// Use CORS middleware (Allow all origins by default)
app.use(cors());

// Middleware to parse JSON data
app.use(bodyParser.json());

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Serve static files (for the front-end)
app.use(express.static('public'));

// Use email routes
app.use('/send-email', emailRoutes);

app.get('/records', async (req, res) => {
  const records = await getRecords();
  res.json(records);
});

app.post('/records', async (req, res) => {
  const recordData = req.body;

  // Input validation
  if (!recordData || !recordData.name || !recordData.price || !recordData.description) {
    return res.status(400).json({ message: 'Invalid data provided. Name, price, and description are required.' });
  }

  try {
    const result = await addRecord(recordData);
    res.status(201).json({ message: 'Record added successfully', result });
  } catch (error) {
    console.error('Error adding record:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

app.get('/records/:id', async (req, res) => {
  const recordId = req.params.id;

  if (!ObjectId.isValid(recordId)) {
    return res.status(400).json({ message: 'Invalid ID format' });
  }

  const record = await getRecordById(recordId);

  if (record) {
    return res.status(200).json(record);
  } else {
    return res.status(404).json({ message: 'Record not found' });
  }
});

app.put('/records/:id', async (req, res) => {
  const recordId = req.params.id;
  const updateData = req.body;

  if (!updateData || Object.keys(updateData).length === 0) {
    return res.status(400).json({ message: 'Invalid data provided. At least one field must be updated.' });
  }

  const result = await updateRecord(recordId, updateData);

  if (result && result.modifiedCount > 0) {
    return res.status(200).json({ message: 'Record updated successfully' });
  } else {
    return res.status(404).json({ message: 'Record not found or no changes made' });
  }
});

const uri = "mongodb://servease:servease@docdb-2025-01-12-14-21-33.c1ccc8a0u3nt.ap-south-1.docdb.amazonaws.com:27017,docdb-2025-01-12-14-21-332.c1ccc8a0u3nt.ap-south-1.docdb.amazonaws.com:27017,docdb-2025-01-12-14-21-333.c1ccc8a0u3nt.ap-south-1.docdb.amazonaws.com:27017/?tls=true&replicaSet=rs0&readPreference=secondaryPreferred&retryWrites=false"; // Replace with your MongoDB URI

async function connectToDB() {
  const client = new MongoClient(uri, {
    useUnifiedTopology: true,
    tls: true,
    tlsCAFile: './global-bundle.pem',
  });
  await client.connect();
  const db = client.db("pricing");
  return { db, client };
}


// API endpoint to upload Excel file and push data to MongoDB
app.post('/upload', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).send('No file uploaded.');
  }

  try {
    // Parse the Excel file buffer
    const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });

    // Assuming the data is in the first sheet
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    
    // Convert sheet data to JSON
    const jsonData = xlsx.utils.sheet_to_json(sheet);

    const { db, client } = await connectToDB();
    const collection = db.collection("Servease_pricing");

    // Insert data into MongoDB
    collection.insertMany(jsonData)
      .then(result => {
        res.status(200).send(`Successfully inserted ${result.insertedCount} records.`);
      })
      .catch(err => {
        console.error('Error inserting data into MongoDB:', err);
        res.status(500).send('Error inserting data into MongoDB.');
      });
  } catch (err) {
    console.error('Error reading the Excel file:', err);
    res.status(500).send('Error reading the Excel file.');
  }
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
