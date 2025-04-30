const express = require('express');
const cors = require('cors');
const { pool } = require('./db');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Test database connection
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('Error connecting to the database:', err);
  } else {
    console.log('Database connected successfully:', res.rows[0]);
  }
});

// Import middleware
const { authenticateUser, requireAdmin, requireOrganizationAccess } = require('./middleware/auth');

// Import routes
const userRoutes = require('./routes/users');
const organizationRoutes = require('./routes/organizations');
const invoiceRoutes = require('./routes/invoices');
const dashboardRoutes = require('./routes/dashboard');
const servicesRoutes = require('./routes/services');

// Public routes
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to the Invoice Management API' });
});

// Auth routes (no authentication required)
app.use('/api/users', userRoutes);

// Protected routes
app.use('/api/organizations', authenticateUser, organizationRoutes);
app.use('/api/invoices', authenticateUser, invoiceRoutes);
app.use('/api/dashboard', authenticateUser, dashboardRoutes);
app.use('/api/services', authenticateUser, servicesRoutes);

// Start server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

module.exports = app; 