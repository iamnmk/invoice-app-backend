const express = require('express');
const router = express.Router();
const db = require('../db');

// Get all invoices
router.get('/', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM invoices ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching invoices:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get invoices for a specific organization - Placing this BEFORE the /:id route to avoid conflicts
router.get('/organization/:orgId', async (req, res) => {
  try {
    const { orgId } = req.params;
    const result = await db.query('SELECT * FROM invoices WHERE organization_id = $1 ORDER BY created_at DESC', [orgId]);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching organization invoices:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new invoice
router.post('/', async (req, res) => {
  try {
    const { 
      organization_id, 
      invoice_number, 
      client_name, 
      client_email, 
      service_id = null, // Make service_id optional with null default
      amount_total, 
      currency, 
      due_date, 
      status, 
      notes 
    } = req.body;
    
    // Validate required fields
    if (!organization_id || !invoice_number || !client_name || !client_email || !amount_total) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Validate amount_total
    if (isNaN(parseFloat(amount_total)) || parseFloat(amount_total) <= 0) {
      return res.status(400).json({ error: 'Invalid amount' });
    }
    
    const result = await db.query(
      'INSERT INTO invoices (organization_id, invoice_number, client_name, client_email, service_id, amount_total, currency, due_date, status, notes) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *',
      [organization_id, invoice_number, client_name, client_email, service_id, amount_total, currency, due_date, status, notes]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating invoice:', error);
    
    // Handle unique constraint violations
    if (error.code === '23505') {
      return res.status(400).json({ error: 'An invoice with this number already exists for this organization' });
    }
    
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update invoice status only
router.patch('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    if (!status) {
      return res.status(400).json({ error: 'Status is required' });
    }
    
    // Validate status value
    const validStatuses = ['Draft', 'Sent', 'Pending', 'Paid', 'Overdue'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status value' });
    }
    
    const result = await db.query(
      'UPDATE invoices SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [status, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Invoice not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating invoice status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get invoice by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query('SELECT * FROM invoices WHERE id = $1', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Invoice not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching invoice:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update invoice
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      client_name, 
      client_email, 
      service_id = null, // Make service_id optional with null default
      amount_total, 
      currency, 
      due_date, 
      status, 
      notes 
    } = req.body;
    
    // Validate amount_total if provided
    if (amount_total !== undefined && (isNaN(parseFloat(amount_total)) || parseFloat(amount_total) <= 0)) {
      return res.status(400).json({ error: 'Invalid amount' });
    }
    
    const result = await db.query(
      'UPDATE invoices SET client_name = $1, client_email = $2, service_id = $3, amount_total = $4, currency = $5, due_date = $6, status = $7, notes = $8, updated_at = NOW() WHERE id = $9 RETURNING *',
      [client_name, client_email, service_id, amount_total, currency, due_date, status, notes, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Invoice not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating invoice:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete invoice
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query('DELETE FROM invoices WHERE id = $1 RETURNING *', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Invoice not found' });
    }
    
    res.json({ message: 'Invoice deleted successfully' });
  } catch (error) {
    console.error('Error deleting invoice:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router; 