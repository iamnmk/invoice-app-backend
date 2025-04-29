const jwt = require('jsonwebtoken');
const db = require('../db');

// Secret key for JWT (should be in environment variables in production)
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Generate JWT token
const generateToken = (user) => {
  return jwt.sign(
    { 
      id: user.id,
      email: user.email,
      role: user.role,
      organizationId: user.organization_id
    },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
};

// Authenticate user middleware
const authenticateUser = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    const token = authHeader.split(' ')[1];
    
    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Check if user exists
    const result = await db.query(
      'SELECT id, organization_id, name, email, role, status FROM users WHERE id = $1',
      [decoded.id]
    );
    
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid token' });
    }
    
    const user = result.rows[0];
    
    // Check if user is suspended
    if (user.status === 'Suspended') {
      return res.status(403).json({ error: 'User account is suspended' });
    }
    
    // Attach user to request
    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
    console.error('Authentication error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Check if user is admin middleware
const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'Admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

// Check if user belongs to organization middleware
const requireOrganizationAccess = (req, res, next) => {
  const orgId = req.params.orgId || req.body.organizationId;
  
  if (!req.user || req.user.organization_id !== orgId) {
    return res.status(403).json({ error: 'Access denied' });
  }
  next();
};

module.exports = {
  generateToken,
  authenticateUser,
  requireAdmin,
  requireOrganizationAccess
}; 