// services/db.js
const { Pool } = require('pg');
const { Client } = require('pg');  // Import the Client to listen to notifications
require('dotenv').config();
require('dotenv').config();
const socketIo = require('socket.io'); 


const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

// Set up the client for listening to notifications
const client = new Client({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

client.connect()
  .then(() => {
    console.log('Listening for serviceprovider_engagement insert notifications...');
    // Listen to the 'serviceprovider_engagement_insert' channel
    client.query('LISTEN engagement_insert');

    // When a notification is received, send the data to the WebSocket server
    client.on('notification', (msg) => {
      const payload = JSON.parse(msg.payload);
      // Emit the payload to all connected WebSocket clients
      io.emit('newServiceProviderEngagement', payload);  // 'newServiceProviderEngagement' is the event name
    });
  })
  .catch((err) => {
    console.error('Error connecting to PostgreSQL:', err.stack);
  });

module.exports = pool;