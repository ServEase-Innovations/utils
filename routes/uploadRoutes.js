// routes/uploadRoutes.js
const express = require('express');
const multer = require('multer');
const { uploadExcel } = require('../controllers/mongoDBControllers');

const upload = multer({ storage: multer.memoryStorage() });
const router = express.Router();

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
router.post('/upload', upload.single('file'), uploadExcel);

module.exports = router;
