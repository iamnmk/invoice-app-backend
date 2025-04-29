const fs = require('fs');
const path = require('path');
const { pool } = require('../db');

async function initializeDatabase() {
  try {
    console.log('Starting database initialization...');
    
    // Read SQL file
    const sqlFilePath = path.join(__dirname, 'init.sql');
    const sqlScript = fs.readFileSync(sqlFilePath, 'utf8');
    
    // Execute SQL script
    await pool.query(sqlScript);
    
    console.log('Database initialization completed successfully');
  } catch (error) {
    console.error('Error initializing database:', error);
  } finally {
    // Close pool
    await pool.end();
  }
}

// Run initialization if executed directly
if (require.main === module) {
  initializeDatabase();
}

module.exports = initializeDatabase; 