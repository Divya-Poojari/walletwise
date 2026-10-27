# Walnut Folks Group — Accounts & Transactions API

A TypeScript, Node.js, Express and PostgreSQL implementation of the assessment. It provides account creation and lookup, immutable credit/debit transactions, transaction pagination, and atomic transfers.

## Stack
- Node.js 22 + TypeScript
- Express REST API
- PostgreSQL 16
- Zod request validation
- Docker Compose for local database/API setup

## Run locally (Docker recommended)
Prerequisites: Docker Desktop with Compose.

```bash
docker compose up --build
```

API base URL: `http://localhost:4000`  
Health check: `GET http://localhost:4000/health`

The database schema is applied automatically on first startup. To reset the local database and its data:

```bash
docker compose down -v
docker compose up --build
```

## Run without Docker
Prerequisites: Node.js 22+, PostgreSQL 13+.

1. Create a PostgreSQL database named `walnut_transactions`.
2. Apply the schema: `psql "$DATABASE_URL" -f db/schema.sql`
3. Copy `.env.example` to `.env` and set `DATABASE_URL`.
4. Run:

```bash
npm install
npm run dev
```

Production build:

```bash
npm run build
npm start
```

## API endpoints

### Create an account
`POST /api/accounts`

```json
{ "name": "Everyday Account" }
```

Returns `201` with account ID, name, balance (`0.00`) and creation timestamp.

### List accounts
`GET /api/accounts`

### Get one account
`GET /api/accounts/:id`

### Create a transaction
`POST /api/transactions`

Credit example:
```json
{
  "account_id": "REPLACE_WITH_ACCOUNT_UUID",
  "type": "credit",
  "amount": 100,
  "description": "Initial deposit",
  "reference_id": "deposit-001"
}
```

Debit example uses `"type": "debit"`. Amount must be positive. `reference_id` must be unique per account.

### List transactions (newest first)
`GET /api/transactions?page=1&limit=10`  
Optional account filter: `GET /api/transactions?account_id=UUID&page=1&limit=10`

Example response:
```json
{
  "data": [],
  "pagination": {
    "current_page": 1,
    "page_size": 10,
    "total_records": 0,
    "total_pages": 0,
    "has_next_page": false,
    "has_previous_page": false
  }
}
```

Allowed `limit`: 1–100. `page` must be an integer >= 1.

### Get transaction
`GET /api/transactions/:id`

### Transfer money (bonus)
`POST /api/transfers`

```json
{
  "source_account_id": "SOURCE_ACCOUNT_UUID",
  "destination_account_id": "DESTINATION_ACCOUNT_UUID",
  "amount": 30,
  "reference_id": "transfer-001",
  "description": "Transfer to savings"
}
```

Creates a debit transaction for the source and a credit transaction for the destination. Reference IDs are stored as `<reference_id>:debit` and `<reference_id>:credit`.

## Error format

```json
{
  "error": {
    "code": "INSUFFICIENT_BALANCE",
    "message": "Account has insufficient balance"
  }
}
```

Common status codes:
- `400` invalid body, UUID, or pagination parameters
- `404` account, transaction, or route not found
- `405` transaction mutation not allowed (update/delete)
- `409` duplicate reference
- `422` insufficient balance
- `500` unexpected server error

## Data integrity and design decisions
- Each balance-changing operation and its ledger insert run inside a single PostgreSQL transaction; either both commit or both roll back.
- Account rows are locked with `SELECT ... FOR UPDATE` before checking/debiting balances, preventing concurrent requests from overspending.
- A unique constraint enforces `(account_id, reference_id)` at the database layer.
- A database trigger blocks transaction `UPDATE` and `DELETE`, beyond API-level immutability.
- Money is stored as `NUMERIC(18,2)`; input amount must be positive and have at most two decimal places.
- Transaction lists sort by `created_at DESC`, with `id DESC` as a deterministic tie-breaker.
- Balance is maintained transactionally alongside the immutable ledger. The application does not expose direct balance editing.

## Assumptions
1. Every account starts with a zero balance.
2. Amounts are in a single unspecified currency and represented to two decimal places; currency conversion is out of scope.
3. A reference ID is unique within an account, not globally.
4. Invalid/missing account IDs return `404` when they are syntactically valid UUIDs but do not exist; malformed UUIDs return `400`.
5. A rejected debit creates no transaction and does not change balance.
6. Transfers create two immutable ledger entries. The provided transfer reference is suffixed with `:debit` and `:credit` to keep the entries distinct.
7. No authentication/authorization requirements were provided, so authentication is outside this assignment scope.
8. No frontend was requested in the supplied assessment brief; this submission focuses on the required API and includes runnable API/database setup.

## Project structure
```text
src/
  app.ts          Routes, validation flow, error handling
  db.ts           PostgreSQL pool and transaction helper
  errors.ts       Consistent API error type
  server.ts       HTTP server lifecycle
  validation.ts   Zod request schemas
db/
  schema.sql      Tables, constraints, indexes and immutability trigger
```

## API documentation
The endpoint examples above are the API reference. Import/copy the JSON examples into Postman and replace UUID placeholders with IDs returned by `POST /api/accounts`.

## Validation tests

Run `npm test` to execute request-schema tests. Integration testing of database locking/rollback should be run against a PostgreSQL test database before production use.

## Optional web interface

The React + TypeScript dashboard lives in `frontend/` and supports account creation, credit/debit transactions, transfers, account filtering and transaction pagination.

Start the API and database first (`docker compose up --build` from the project root). In a second terminal:

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`. By default the UI calls the API at `http://localhost:4000`; set `VITE_API_URL` if your API runs elsewhere.
