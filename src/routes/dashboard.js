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
        SUM(CASE WHEN status = 'Sent' OR status = 'Overdue' THEN amount_total ELSE 0 END) as total_outstanding,
        COUNT(CASE WHEN status = 'Draft' THEN 1 END) as draft_count,
        COUNT(CASE WHEN status = 'Sent' THEN 1 END) as sent_count,
        COUNT(CASE WHEN status = 'Paid' THEN 1 END) as paid_count,
        COUNT(CASE WHEN status = 'Overdue' THEN 1 END) as overdue_count,
        SUM(amount_total) as total_amount,
        MAX(currency) as currency
      FROM invoices
      WHERE organization_id = $1`,
      [orgId]
    );
    
    // Get recent invoices - Use client_name directly from invoices table
    const recentInvoicesResult = await db.query(
      `SELECT * 
       FROM invoices 
       WHERE organization_id = $1
       ORDER BY created_at DESC
       LIMIT 5`,
      [orgId]
    );
    
    // Get monthly revenue for the last 6 months
    const monthlyRevenueResult = await db.query(
      `SELECT 
         TO_CHAR(paid_date, 'Mon') as month,
         SUM(amount_total) as revenue
       FROM invoices
       WHERE organization_id = $1 
         AND status = 'Paid'
         AND paid_date >= CURRENT_DATE - INTERVAL '6 months'
       GROUP BY TO_CHAR(paid_date, 'Mon'), EXTRACT(MONTH FROM paid_date)
       ORDER BY EXTRACT(MONTH FROM paid_date) DESC
       LIMIT 6`,
      [orgId]
    );
    
    // Format the response to match frontend expectations
    res.json({
      organization: orgResult.rows[0],
      userStats: {
        total: parseInt(userCountResult.rows[0].total_users) || 0,
        admins: parseInt(userCountResult.rows[0].admin_count) || 0,
        members: parseInt(userCountResult.rows[0].total_users) - parseInt(userCountResult.rows[0].admin_count) || 0
      },
      invoiceStats: {
        total: parseInt(invoiceStatsResult.rows[0].total_invoices) || 0,
        paid: parseInt(invoiceStatsResult.rows[0].paid_count) || 0,
        pending: parseInt(invoiceStatsResult.rows[0].sent_count) || 0,
        overdue: parseInt(invoiceStatsResult.rows[0].overdue_count) || 0,
        totalAmount: parseFloat(invoiceStatsResult.rows[0].total_amount) || 0,
        currency: invoiceStatsResult.rows[0].currency || 'USD'
      },
      recentInvoices: recentInvoicesResult.rows.map(invoice => ({
        id: invoice.id,
        invoice_number: invoice.invoice_number,
        client_name: invoice.client_name,
        amount_total: parseFloat(invoice.amount_total),
        status: invoice.status,
        due_date: invoice.due_date,
        created_at: invoice.created_at
      })),
      monthlyRevenue: monthlyRevenueResult.rows.map(row => ({
        month: row.month,
        revenue: parseFloat(row.revenue) || 0
      })).reverse()
    });
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router; 