const express = require('express');
const router = express.Router();
const db = require('../db');

// Get all services
router.get('/', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM services ORDER BY name');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching services:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get services for a specific organization
router.get('/organization/:orgId', async (req, res) => {
  try {
    const { orgId } = req.params;
    const result = await db.query('SELECT * FROM services WHERE organization_id = $1 ORDER BY name', [orgId]);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching organization services:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get service by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query('SELECT * FROM services WHERE id = $1', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Service not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching service:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new service
router.post('/', async (req, res) => {
  try {
    const { 
      organization_id, 
      name, 
      description, 
      price 
    } = req.body;
    
    if (!organization_id || !name) {
      return res.status(400).json({ error: 'Organization ID and name are required' });
    }
    
    const result = await db.query(
      'INSERT INTO services (organization_id, name, description, price) VALUES ($1, $2, $3, $4) RETURNING *',
      [organization_id, name, description || null, price || 0]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating service:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update service
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      name, 
      description, 
      price 
    } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }
    
    const result = await db.query(
      'UPDATE services SET name = $1, description = $2, price = $3, updated_at = NOW() WHERE id = $4 RETURNING *',
      [name, description || null, price || 0, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Service not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating service:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete service
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if service is used by any invoices
    const invoiceCheck = await db.query('SELECT COUNT(*) FROM invoices WHERE service_id = $1', [id]);
    
    if (parseInt(invoiceCheck.rows[0].count) > 0) {
      return res.status(400).json({ 
        error: 'Service cannot be deleted because it is associated with invoices' 
      });
    }
    
    const result = await db.query('DELETE FROM services WHERE id = $1 RETURNING *', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Service not found' });
    }
    
    res.json({ message: 'Service deleted successfully' });
  } catch (error) {
    console.error('Error deleting service:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router; 