const express = require('express');
const router = express.Router();
const db = require('../db');

// Get dashboard data for a specific organization
router.get('/organization/:orgId', async (req, res) => {
  try {
    const { orgId } = req.params;
    
    // Get organization details
    const orgResult = await db.query('SELECT * FROM organizations WHERE id = $1', [orgId]);
    
    if (orgResult.rows.length === 0) {
      return res.status(404).json({ error: 'Organization not found' });
    }
    
    // Get user count
    const userCountResult = await db.query(
      'SELECT COUNT(*) as total_users, SUM(CASE WHEN role = \'Admin\' THEN 1 ELSE 0 END) as admin_count FROM users WHERE organization_id = $1',
      [orgId]
    );
    
    // Get invoice stats
    const invoiceStatsResult = await db.query(
      `SELECT 
        COUNT(*) as total_invoices,
        SUM(CASE WHEN status = 'Paid' THEN amount_total ELSE 0 END) as total_paid,
        SUM(CASE WHEN status = 'Sent' OR status = 'Overdue' THEN amount_total ELSE 0 END) as total_pending,
        COUNT(CASE WHEN status = 'Draft' THEN 1 END) as draft_count,
        COUNT(CASE WHEN status = 'Sent' THEN 1 END) as sent_count,
        COUNT(CASE WHEN status = 'Paid' THEN 1 END) as paid_count,
        COUNT(CASE WHEN status = 'Overdue' THEN 1 END) as overdue_count
      FROM invoices
      WHERE organization_id = $1`,
      [orgId]
    );
    
    // Get recent invoices
    const recentInvoicesResult = await db.query(
      `SELECT i.*, u.name as issued_by_name
       FROM invoices i
       LEFT JOIN users u ON i.issued_by_user_id = u.id
       WHERE i.organization_id = $1
       ORDER BY i.created_at DESC
       LIMIT 5`,
      [orgId]
    );
    
    // Get services count
    const servicesCountResult = await db.query(
      'SELECT COUNT(*) as total_services FROM services WHERE organization_id = $1',
      [orgId]
    );
    
    res.json({
      organization: orgResult.rows[0],
      user_stats: userCountResult.rows[0],
      invoice_stats: invoiceStatsResult.rows[0],
      recent_invoices: recentInvoicesResult.rows,
      service_stats: servicesCountResult.rows[0]
    });
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router; 