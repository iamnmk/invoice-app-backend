const express = require('express');
const router = express.Router();
const db = require('../db');

// Get all signatures for a user in an organization
router.get('/', async (req, res) => {
  try {
    const { user_id, organization_id } = req.query;
    
    if (!user_id || !organization_id) {
      return res.status(400).json({ error: 'User ID and Organization ID are required' });
    }
    
    const result = await db.query(
      'SELECT * FROM user_signatures WHERE user_id = $1 AND organization_id = $2 ORDER BY created_at DESC',
      [user_id, organization_id]
    );
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching signatures:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get a specific signature by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await db.query(
      'SELECT * FROM user_signatures WHERE id = $1',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Signature not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching signature:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create a new signature
router.post('/', async (req, res) => {
  try {
    const { user_id, organization_id, signature_image, signature_name } = req.body;
    
    if (!user_id || !organization_id || !signature_image) {
      return res.status(400).json({ 
        error: 'Missing required fields: user_id, organization_id, and signature_image are required' 
      });
    }
    
    // Use the provided signature_name or default to "Default Signature"
    const name = signature_name || 'Default Signature';
    
    const result = await db.query(
      'INSERT INTO user_signatures (user_id, organization_id, signature_image, signature_name) VALUES ($1, $2, $3, $4) RETURNING *',
      [user_id, organization_id, signature_image, name]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating signature:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update a signature
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { signature_image, signature_name } = req.body;
    
    if (!signature_image) {
      return res.status(400).json({ error: 'Signature image is required' });
    }
    
    // Build the update query based on what's being updated
    let query;
    let params;
    
    if (signature_name) {
      query = 'UPDATE user_signatures SET signature_image = $1, signature_name = $2, updated_at = NOW() WHERE id = $3 RETURNING *';
      params = [signature_image, signature_name, id];
    } else {
      query = 'UPDATE user_signatures SET signature_image = $1, updated_at = NOW() WHERE id = $2 RETURNING *';
      params = [signature_image, id];
    }
    
    const result = await db.query(query, params);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Signature not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating signature:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete a signature
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await db.query(
      'DELETE FROM user_signatures WHERE id = $1 RETURNING id',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Signature not found' });
    }
    
    res.json({ success: true, message: 'Signature deleted successfully' });
  } catch (error) {
    console.error('Error deleting signature:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router; 