// db.js
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: 'localhost',
  port: 8889,          // як у твоєму PHP
  user: 'root',
  password: 'root',
  database: 'ucoffee_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

module.exports = pool;