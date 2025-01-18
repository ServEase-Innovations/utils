const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const swaggerUi = require('swagger-ui-express');
const { swaggerSpec } = require('./docs/swaggerDocs');
const { getRecords, getRecordById, addRecord, updateRecord } = require('./controllers/mongoDBControllers');
const emailRoutes = require('./routes/emailRoutes'); // Import email routes

const app = express();
const port = 3000;

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


app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
