# LedgerFlow

A full-stack account and transaction management application with balance tracking, credit/debit operations, transaction history, pagination, and atomic transfers between accounts.

## Features

- Create and list accounts with current balances.
- Retrieve individual account details and check an account's balance separately.
- Record credit and debit transactions.
- Validate transaction amounts and prevent debits that exceed the available balance.
- Transfer funds between accounts atomically.
- Browse transaction history with pagination and newest-first ordering.
- Filter transactions by account.
- Preserve transaction history using immutable ledger records.
- Return consistent API errors for invalid requests and missing records.
- Use a React dashboard to manage accounts and transactions.

## Technology Stack

### Backend
- Node.js 22
- TypeScript
- Express
- PostgreSQL 16
- Zod for request validation

### Frontend
- React
- TypeScript
- Vite

### Development and testing
- Docker Compose
- Vitest
- PostgreSQL database constraints and triggers

## Project Structure

```text
.
├── src/
│   ├── app.ts
│   ├── db.ts
│   ├── errors.ts
│   ├── server.ts
│   └── validation.ts
├── db/
│   └── schema.sql
├── tests/
│   └── validation.test.ts
├── frontend/
│   ├── src/
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   └── style.css
│   ├── index.html
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts
├── .env.example
├── .gitignore
├── API_DOCUMENTATION.md
├── ASSUMPTIONS.md
├── Dockerfile
├── docker-compose.yml
├── package.json
└── tsconfig.json
```

## Prerequisites

For the recommended Docker setup:

- Git
- Docker Desktop with Docker Compose
- A modern web browser

For running the frontend separately, Node.js and npm are also required.

## Run with Docker Compose

### 1. Clone the repository

```bash
git clone https://github.com/YOUR_USERNAME/ledgerflow.git
cd ledgerflow
```

Replace the repository URL with your actual GitHub repository URL.

### 2. Start the API and database

```bash
docker compose up --build
```

Docker Compose builds the API image, starts PostgreSQL, waits for the database health check, and starts the backend API.

The database schema is initialized automatically when PostgreSQL creates a new data directory.

### 3. Verify the API

Health check:

```text
GET http://localhost:4000/health
```

Expected response:

```json
{
  "status": "ok"
}
```

API base URL:

`http://localhost:4000`

### 4. Start the frontend

Open a second terminal from the repository root:

```bash
cd frontend
npm install
npm run dev
```

Open the local URL printed by Vite, typically:

`http://localhost:5173`

By default, the frontend calls the API at `http://localhost:4000`. If the backend uses a different URL, configure `VITE_API_URL` according to the frontend's Vite configuration.

### 5. Stop the application

In the terminal running Docker Compose, press `Ctrl+C`. Then run:

```bash
docker compose down
```

This stops and removes the containers while preserving the named database volume.

To remove the database volume and its stored data as well, run:

```bash
docker compose down -v
```

**Warning:** Removing the volume permanently deletes the local database data.

## Run the Backend Without Docker

### Requirements

- Node.js 22 or later
- PostgreSQL 13 or later

### 1. Create the database

Create a PostgreSQL database named `walnut_transactions`.

### 2. Configure environment variables

Copy `.env.example` to `.env` and configure `DATABASE_URL` for your local PostgreSQL instance.

For example:

```env
PORT=4000
DATABASE_URL=postgres://postgres:YOUR_PASSWORD@localhost:5432/walnut_transactions
```

Use your own database username and password. Do not commit `.env` to Git.

### 3. Initialize the schema

From the repository root, apply the database schema:

```bash
psql "$DATABASE_URL" -f db/schema.sql
```

Ensure the PostgreSQL client is installed and available on your PATH.

### 4. Install dependencies and start the API

```bash
npm install
npm run dev
```

For a production build:

```bash
npm run build
npm start
```

## API Reference

Base URL: `http://localhost:4000`

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/health` | API health check |
| POST | `/api/accounts` | Create account |
| GET | `/api/accounts` | List accounts and balances |
| GET | `/api/accounts/:id` | Get account details |
| GET | `/api/accounts/:id/balance` | Get one account's balance |
| POST | `/api/transactions` | Create credit/debit transaction |
| GET | `/api/transactions` | Paginated transaction history |
| GET | `/api/transactions/:id` | Get transaction details |
| POST | `/api/transfers` | Transfer funds atomically |

Full request/response examples, validation rules, pagination details, and error codes are documented in [`API_DOCUMENTATION.md`](./API_DOCUMENTATION.md).

### Example: Create an account

```http
POST /api/accounts
Content-Type: application/json
```

```json
{
  "name": "Everyday Account"
}
```

### Example: Check a specific account's balance

```http
GET /api/accounts/ACCOUNT_UUID/balance
```

Successful response:

```json
{
  "data": {
    "account_id": "ACCOUNT_UUID",
    "balance": "1500.00"
  }
}
```

Replace `ACCOUNT_UUID` with a real account UUID returned by the API.

### Example: Create a credit transaction

```json
{
  "account_id": "ACCOUNT_UUID",
  "type": "credit",
  "amount": 1000.00,
  "description": "Salary deposit",
  "reference_id": "salary-001"
}
```

### Example: Transfer funds

```json
{
  "source_account_id": "SOURCE_ACCOUNT_UUID",
  "destination_account_id": "DESTINATION_ACCOUNT_UUID",
  "amount": 300.00,
  "reference_id": "transfer-001",
  "description": "Transfer to savings"
}
```

For additional examples and error responses, see the API documentation.

## Data Integrity and Design

- Each account starts with a zero balance.
- Amounts must be positive and have no more than two decimal places.
- Balance changes and corresponding ledger inserts execute within a database transaction.
- Account rows are locked during balance-changing operations to help prevent concurrent overspending.
- Transfers update both accounts and create both ledger entries atomically.
- Transaction reference IDs are unique within an account.
- Transactions cannot be updated or deleted through the API; database-level protection also prevents mutation.
- Account balances are updated through validated credit, debit, and transfer operations rather than direct balance-editing endpoints.

## Testing

Run the backend test suite from the repository root:

```bash
npm install
npm test
```

To run tests in watch mode:

```bash
npm run test:watch
```

The included tests cover request validation. Manually or through additional integration tests, verify account creation, balance lookup, credit/debit behavior, insufficient funds, duplicate references, pagination, missing accounts, and atomic transfers.

## Assumptions and Limitations

- Account names are not required to be unique.
- Accounts begin with zero balance; opening balances are not supported.
- Amounts are stored to two decimal places.
- Currency conversion is outside the current scope.
- Authentication and authorization are not implemented.
- There is no account deletion endpoint.
- Transactions are immutable.
- Transfer operations create one debit entry and one credit entry with corresponding reference suffixes.

See [`ASSUMPTIONS.md`](./ASSUMPTIONS.md) for additional design decisions.

## Future Improvements

- Authentication and role-based authorization.
- Automated API integration tests.
- Idempotency keys for safer retries.
- Improved audit and operational logging.
- Deployment configuration for a hosted frontend, API, and PostgreSQL database.

## License

No license has been specified. Add a `LICENSE` file if you intend to distribute this project under an open-source license.
