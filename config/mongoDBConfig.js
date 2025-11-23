require('dotenv').config();

module.exports = {
  getServerUrl: (req) => {
    const protocol = req.protocol;        // http or https
    const host = req.get('host');         // e.g. localhost:3001 or 98.130.60.70:3001
    return `${protocol}://${host}`;
  }
};