const express = require('express');
const router = express.Router();
const db = require('../db');
const bcrypt = require('bcrypt');
const { generateToken } = require('../middleware/auth');

// Get all users for an organization
router.get('/organization/:orgId', async (req, res) => {
  try {
    const { orgId } = req.params;
    const result = await db.query(
      'SELECT id, organization_id, name, email, role, status, created_at, updated_at FROM users WHERE organization_id = $1',
      [orgId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query(
      'SELECT id, organization_id, name, email, role, status, created_at, updated_at FROM users WHERE id = $1',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Register first user (admin) for a new organization
router.post('/register-admin', async (req, res) => {
  try {
    const { name, email, password, organizationName, industry } = req.body;
    
    // Hash the password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);
    
    // Create organization first
    const orgResult = await db.query(
      'INSERT INTO organizations (name, industry) VALUES ($1, $2) RETURNING *',
      [organizationName, industry]
    );
    
    const organization = orgResult.rows[0];
    
    // Create admin user
    const userResult = await db.query(
      'INSERT INTO users (organization_id, name, email, password_hash, role) VALUES ($1, $2, $3, $4, $5) RETURNING id, organization_id, name, email, role, status, created_at, updated_at',
      [organization.id, name, email, passwordHash, 'Admin']
    );
    
    const user = userResult.rows[0];
    
    // Generate JWT token
    const token = generateToken(user);
    
    res.status(201).json({
      user,
      organization,
      token
    });
  } catch (error) {
    console.error('Error registering admin:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add new user to an organization (admin only)
router.post('/organization/:orgId', async (req, res) => {
  try {
    const { orgId } = req.params;
    const { name, email, password, role } = req.body;
    
    // Hash the password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);
    
    // Create user with provided role or default to Member
    const result = await db.query(
      'INSERT INTO users (organization_id, name, email, password_hash, role) VALUES ($1, $2, $3, $4, $5) RETURNING id, organization_id, name, email, role, status, created_at, updated_at',
      [orgId, name, email, passwordHash, role || 'Member']
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update user
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, role, status } = req.body;
    
    const result = await db.query(
      'UPDATE users SET name = $1, email = $2, role = $3, status = $4, updated_at = NOW() WHERE id = $5 RETURNING id, organization_id, name, email, role, status, created_at, updated_at',
      [name, email, role, status, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Change user password
router.put('/:id/password', async (req, res) => {
  try {
    const { id } = req.params;
    const { password } = req.body;
    
    // Hash the password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);
    
    const result = await db.query(
      'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2 RETURNING id',
      [passwordHash, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('Error updating password:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete user
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if user is the last admin of their organization
    const userCheck = await db.query(
      'SELECT u.id, u.organization_id, u.role, COUNT(a.id) as admin_count FROM users u LEFT JOIN users a ON u.organization_id = a.organization_id AND a.role = \'Admin\' WHERE u.id = $1 GROUP BY u.id, u.organization_id, u.role',
      [id]
    );
    
    if (userCheck.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const user = userCheck.rows[0];
    
    // Prevent deleting the last admin
    if (user.role === 'Admin' && user.admin_count <= 1) {
      return res.status(400).json({ error: 'Cannot delete the last admin of an organization' });
    }
    
    // Delete the user
    await db.query('DELETE FROM users WHERE id = $1', [id]);
    
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// User login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Find user by email
    const result = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const user = result.rows[0];
    
    // Check if user is suspended
    if (user.status === 'Suspended') {
      return res.status(403).json({ error: 'User account is suspended' });
    }
    
    // Verify password
    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Create a user object without the password hash
    const userWithoutPassword = { ...user };
    delete userWithoutPassword.password_hash;
    
    // Generate JWT token
    const token = generateToken(user);
    
    // Get organization details
    const orgResult = await db.query('SELECT * FROM organizations WHERE id = $1', [user.organization_id]);
    
    res.json({
      user: userWithoutPassword,
      organization: orgResult.rows[0],
      token
    });
  } catch (error) {
    console.error('Error during login:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router; 