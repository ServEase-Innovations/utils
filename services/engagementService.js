// services/engagementService.js
const pool = require('./db'); // Assuming db.js contains the pool connection

const getAllEngagements = async () => {
  try {
    // Query to get all rows from the engagement table
    const result = await pool.query(
      `SELECT engagement_id, customerid, serviceproviderid, booking_type, service_type,
              task_status, assignment_status, start_date, end_date, created_at
       FROM engagements
       ORDER BY created_at DESC`
    );
    return result.rows; // Return the rows from the query
  } catch (err) {
    console.error('Database query error:', err);
    throw err; // Rethrow the error to be handled by the calling function
  }
};

module.exports = { getAllEngagements };
