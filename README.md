# Invoice Management Backend

This is the backend for the Invoice Management platform, built with Node.js, Express, and PostgreSQL.

## Prerequisites

- Node.js (v14 or higher)
- PostgreSQL database

## Setup

1. Clone the repository
2. Install dependencies:

```bash
cd cl-backend
npm install
```

3. Create a `.env` file in the root directory with the following content:

```
# PostgreSQL Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=invoice_db
DB_USER=postgres
DB_PASSWORD=your_password
DB_SSL=false

# Server Configuration
PORT=3001
NODE_ENV=development
```

Replace `your_password` with your actual PostgreSQL password.

4. Create the PostgreSQL database (if not existing already):

```sql
CREATE DATABASE invoice_db;
```

5. Initialize the database:

```bash
node src/db/init-db.js
```

## Running the server

```bash
# Development mode with auto-restart
npm run dev

# Production mode
npm start
```

The server will run on port 3001 by default (or the port specified in the `.env` file).

## API Endpoints

### Invoices

- `GET /api/invoices` - Get all invoices
- `GET /api/invoices/:id` - Get invoice by ID
- `POST /api/invoices` - Create a new invoice
- `PUT /api/invoices/:id` - Update an existing invoice
- `DELETE /api/invoices/:id` - Delete an invoice 