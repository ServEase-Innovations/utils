const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const swaggerUi = require('swagger-ui-express');
const { swaggerSpec } = require('./docs/swaggerDocs');
const { getRecords, getRecordById, addRecord, updateRecord, uploadExcel , deleteAll } = require('./controllers/mongoDBControllers');
const emailRoutes = require('./routes/emailRoutes'); // Import email routes
const uploadRoutes = require('./routes/uploadRoutes');
const { connectToDB } = require('./controllers/mongoDBControllers')
const multer = require('multer');
const xlsx = require('xlsx');

const app = express();
const port = 3000;

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });



// Use CORS middleware (Allow all origins by default)
app.use(cors());

// Middleware to parse JSON data
app.use(bodyParser.json());

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.use(express.urlencoded({ extended: true }));

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

app.put('/records/:id', updateRecord);

// app.put('/records/:id', async (req, res) => {
 
//   const recordId = req;
//   const updateData = req.body;

//   if (!updateData || Object.keys(updateData).length === 0) {
//     return res.status(400).json({ message: 'Invalid data provided. At least one field must be updated.' });
//   }

//   const result = await updateRecord(recordId, updateData);


//   if (result && result.modifiedCount > 0) {
//     return result.status(200).json({ message: 'Record updated successfully' });
//   } else {
//     return result.status(404).json({ message: 'Record not found or no changes made' });
//   }
// });

// app.post('/upload', upload.single('file'), async (req, res) => {
//   if (!req.file) {
//     return res.status(400).json({ message: 'No file uploaded.' });
//   }

//   try {
//     // Parse the Excel file buffer
//     const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
//     const sheetName = workbook.SheetNames[0]; // Assuming the data is in the first sheet
//     const sheet = workbook.Sheets[sheetName];
//     const jsonData = xlsx.utils.sheet_to_json(sheet);

//     if (jsonData.length === 0) {
//       return res.status(400).json({ message: 'No data found in the Excel file.' });
//     }

//     // Connect to MongoDB and insert data
//     const { db, client } = await connectToDB();
//     const collection = db.collection('Servease_pricing');

//     // Insert data into MongoDB
//     const result = await collection.insertMany(jsonData);

//     // Check if records were inserted successfully
//     if (result.insertedCount > 0) {
//       return res.status(200).json({ message: `Successfully inserted ${result.insertedCount} records.` });
//     } else {
//       return res.status(500).json({ message: 'Error inserting records into MongoDB.' });
//     }
//   } catch (err) {
//     console.error('Error processing the Excel file:', err);
//     return res.status(500).json({ message: 'Error processing the Excel file.' });
//   }
// });

// app.put('/records/:id', updateRecord)

app.post('/upload', upload.single('file'), uploadExcel);

app.delete('/delete-all' , deleteAll);

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
