// services/engagementService.js
const pool = require('./db'); // Assuming db.js contains the pool connection

function toEpochSeconds(value) {
  if (!value) return null;
  const ms = new Date(value).getTime();
  return Number.isFinite(ms) ? Math.floor(ms / 1000) : null;
}

const getAllEngagements = async () => {
  try {
    // Query to get all rows from the engagement table
    const result = await pool.query(
      `SELECT engagement_id, customerid, serviceproviderid, booking_type, service_type,
              task_status, assignment_status, start_date, end_date, start_epoch, end_epoch, created_at
       FROM engagements
       ORDER BY created_at DESC`
    );
    return result.rows.map((row) => ({
      ...row,
      start_date_epoch: toEpochSeconds(row.start_date),
      end_date_epoch: toEpochSeconds(row.end_date),
      created_at_epoch: toEpochSeconds(row.created_at),
      start_epoch: row.start_epoch != null ? Number(row.start_epoch) : null,
      end_epoch: row.end_epoch != null ? Number(row.end_epoch) : null,
    }));
  } catch (err) {
    console.error('Database query error:', err);
    throw err; // Rethrow the error to be handled by the calling function
  }
};

module.exports = { getAllEngagements };
