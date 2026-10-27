# WalletWise

**A full-stack account and transaction management platform** built with React, TypeScript, Node.js, Express, and PostgreSQL.

WalletWise helps users manage accounts, track balances, record credit and debit transactions, review transaction history, and transfer funds between accounts.

## Features

- Create and view accounts with current balances.
- Look up an individual account's balance using its account ID.
- Record credit and debit transactions.
- Prevent debits that exceed the available balance.
- Transfer funds between accounts atomically.
- View transaction history with pagination and newest-first ordering.
- Filter transactions by account.
- Validate request data and return consistent API errors.
- Preserve transaction history using immutable ledger records.
- Run the backend and PostgreSQL using Docker Compose.

## Technology Stack

| Layer | Technologies |
|---|---|
| Frontend | React, TypeScript, Vite |
| Backend | Node.js, TypeScript, Express |
| Database | PostgreSQL |
| Validation | Zod |
| Containers | Docker, Docker Compose |
| Tests | Vitest |

## Project Structure

```text
walletwise/
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
│   └── src/
├── API_DOCUMENTATION.md
├── ASSUMPTIONS.md
├── Dockerfile
├── docker-compose.yml
├── package.json
└── README.md
```

## Prerequisites

- Git
- Docker Desktop with Docker Compose
- A modern web browser
- Node.js and npm for running the frontend separately

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/Divya-Poojari/walletwise.git
cd walletwise
```

### 2. Start the backend and database

Make sure Docker Desktop is running, then execute:

```bash
docker compose up --build
```

Docker Compose builds the backend image, starts PostgreSQL, initializes the database schema, and starts the API.

The API is available at:

`http://localhost:4000`

### 3. Start the frontend

Open a second terminal from the project root:

```bash
cd frontend
npm install
npm run dev
```

Open the local URL printed by Vite, usually:

`http://localhost:5173`

The frontend is configured to communicate with the local API. If you change the API URL, update the frontend configuration accordingly.

### 4. Verify the API

Open this endpoint in your browser:

`http://localhost:4000/health`

Expected response:

```json
{
  "status": "ok"
}
```

### 5. Stop the application

Stop the running Compose process with `Ctrl+C`, then run:

```bash
docker compose down
```

This preserves the database volume. To remove the containers and stored database volume, use `docker compose down -v`. **Warning:** this deletes the persisted local database data.

## API Overview

Base URL: `http://localhost:4000`

| Method | Endpoint | Description |
|---|---|---|
| GET | `/health` | Check API health |
| POST | `/api/accounts` | Create an account |
| GET | `/api/accounts` | List accounts and balances |
| GET | `/api/accounts/:id` | Get account details |
| GET | `/api/accounts/:id/balance` | Get an individual account balance |
| POST | `/api/transactions` | Create a credit or debit transaction |
| GET | `/api/transactions` | List transactions with pagination |
| GET | `/api/transactions/:id` | Get transaction details |
| POST | `/api/transfers` | Transfer funds between accounts |

See [API_DOCUMENTATION.md](./API_DOCUMENTATION.md) for request examples, response formats, query parameters, and error codes.

## Example: Check an Account Balance

Request:

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

Replace `ACCOUNT_UUID` with an actual account ID returned by the API.

If the account does not exist, the API returns an appropriate `404 ACCOUNT_NOT_FOUND` response. Invalid UUID formats return `400 INVALID_ACCOUNT_ID`.

## Example: Create a Credit Transaction

```http
POST /api/transactions
Content-Type: application/json
```

```json
{
  "account_id": "ACCOUNT_UUID",
  "type": "credit",
  "amount": 1000.00,
  "description": "Deposit",
  "reference_id": "deposit-001"
}
```

Use an existing account ID. See the API documentation for debit and transfer examples.

## Data Integrity

- Accounts start with a zero balance.
- Transaction amounts must be positive and use no more than two decimal places.
- Balance updates and ledger entries are performed within database transactions.
- Transfers update both accounts and create corresponding ledger entries atomically.
- Transactions are immutable.
- Reference IDs are unique per account.
- Account balances are changed through validated transaction operations rather than a direct balance-editing endpoint.

## Testing

Install backend dependencies from the project root:

```bash
npm install
```

Run the available test suite:

```bash
npm test
```

Check `package.json` for the test scripts configured in the repository. In addition to automated tests, verify account creation, individual balance lookup, credit/debit operations, insufficient funds, transaction pagination, missing-account errors, and transfers.

## Assumptions and Limitations

- Account names are not required to be unique.
- Accounts are created with a zero balance.
- Transactions cannot be updated or deleted.
- Account deletion is not supported by the current API.
- Authentication and authorization are not implemented.
- Currency conversion is outside the current scope.

See [ASSUMPTIONS.md](./ASSUMPTIONS.md) for additional design decisions.

## Future Improvements

- Authentication and role-based access control.
- Expanded API integration and concurrency tests.
- Idempotency support for safely retrying requests.
- Audit logging and monitoring.
- Deployment of the frontend, backend API, and database.

## License

No license has been specified yet. Add a `LICENSE` file if you intend to distribute WalletWise under an open-source license.
