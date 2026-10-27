# WalletWise — API Documentation

WalletWise provides REST APIs for account management, individual balance lookup, credit/debit transactions, transaction history, and transfers between accounts.

## Base URL

Local development:

`http://localhost:4000`

All request bodies must contain valid JSON. Responses use JSON.

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/health` | Check API health |
| POST | `/api/accounts` | Create an account |
| GET | `/api/accounts` | List accounts |
| GET | `/api/accounts/:id` | Get account details |
| GET | `/api/accounts/:id/balance` | Get an account's current balance |
| POST | `/api/transactions` | Create a credit or debit |
| GET | `/api/transactions` | List transactions with pagination |
| GET | `/api/transactions/:id` | Get transaction details |
| POST | `/api/transfers` | Transfer funds between accounts |

---

## 1. Health Check

### `GET /health`

Checks whether the API is responding.

**Response: `200 OK`**

```json
{
  "status": "ok"
}
```

---

## 2. Create Account

### `POST /api/accounts`

Creates a new account with an initial balance of zero.

**Request body**

```json
{
  "name": "Everyday Account"
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `name` | String | Yes | Account name, 1–120 characters after trimming |

**Response: `201 Created`**

```json
{
  "data": {
    "id": "ACCOUNT_UUID",
    "name": "Everyday Account",
    "balance": "0.00",
    "created_at": "2026-10-27T08:00:00.000Z"
  }
}
```

The UUID and timestamp are illustrative.

**Errors**

- `400 VALIDATION_ERROR` — missing or invalid account name.

**Note:** Account names are not required to be unique. Use the account UUID to identify an account.

---

## 3. List Accounts

### `GET /api/accounts`

Returns the accounts and their current balances.

**Response: `200 OK`**

```json
{
  "data": [
    {
      "id": "ACCOUNT_UUID",
      "name": "Everyday Account",
      "balance": "1500.00",
      "created_at": "2026-10-27T08:00:00.000Z"
    }
  ]
}
```

An empty account list returns an empty `data` array.

---

## 4. Get Account Details

### `GET /api/accounts/:id`

Returns the details and current balance of a specific account.

**Example request**

```http
GET /api/accounts/ACCOUNT_UUID
```

**Response: `200 OK`**

```json
{
  "data": {
    "id": "ACCOUNT_UUID",
    "name": "Everyday Account",
    "balance": "1500.00",
    "created_at": "2026-10-27T08:00:00.000Z"
  }
}
```

**Errors**

- `400 INVALID_ACCOUNT_ID` — invalid UUID format.
- `404 ACCOUNT_NOT_FOUND` — account does not exist.

---

## 5. Get Account Balance

### `GET /api/accounts/:id/balance`

Returns the current balance of an individual account without requiring the client to retrieve its other details.

**Example request**

```http
GET /api/accounts/ACCOUNT_UUID/balance
```

**Response: `200 OK`**

```json
{
  "data": {
    "account_id": "ACCOUNT_UUID",
    "balance": "1500.00"
  }
}
```

| Field | Type | Description |
|---|---|---|
| `account_id` | UUID string | ID of the requested account |
| `balance` | Decimal string | Current balance |

### Invalid account ID

**Response: `400 Bad Request`**

```json
{
  "error": {
    "code": "INVALID_ACCOUNT_ID",
    "message": "Account ID must be a valid UUID"
  }
}
```

### Account does not exist

**Response: `404 Not Found`**

```json
{
  "error": {
    "code": "ACCOUNT_NOT_FOUND",
    "message": "Account not found"
  }
}
```

Use an actual account UUID returned by the create-account or list-accounts endpoint.

---

## 6. Create a Credit or Debit Transaction

### `POST /api/transactions`

Records a credit or debit and updates the account balance as part of the same database transaction.

### Credit example

```json
{
  "account_id": "ACCOUNT_UUID",
  "type": "credit",
  "amount": 1000.00,
  "description": "Salary deposit",
  "reference_id": "salary-001"
}
```

### Debit example

```json
{
  "account_id": "ACCOUNT_UUID",
  "type": "debit",
  "amount": 250.00,
  "description": "Utility bill",
  "reference_id": "utility-001"
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `account_id` | UUID string | Yes | Existing account ID |
| `type` | String | Yes | `credit` or `debit` |
| `amount` | Number | Yes | Positive amount with at most two decimal places |
| `description` | String | No | Description, maximum 500 characters |
| `reference_id` | String | Yes | Non-empty reference, maximum 120 characters |

**Response: `201 Created`**

```json
{
  "data": {
    "id": "TRANSACTION_UUID",
    "account_id": "ACCOUNT_UUID",
    "type": "credit",
    "amount": "1000.00",
    "description": "Salary deposit",
    "reference_id": "salary-001",
    "created_at": "2026-10-27T08:05:00.000Z"
  }
}
```

The example values are illustrative.

**Errors**

- `400 VALIDATION_ERROR` — invalid request data.
- `404 ACCOUNT_NOT_FOUND` — account does not exist.
- `409 DUPLICATE_TRANSACTION` — duplicate reference for the account.
- `422 INSUFFICIENT_BALANCE` — debit exceeds the available balance.

A rejected debit must not create a ledger entry or change the balance.

---

## 7. List Transactions and Pagination

### `GET /api/transactions`

Returns transaction history in newest-first order.

**Query parameters**

| Parameter | Required | Default | Description |
|---|---|---|---|
| `page` | No | `1` | Page number, at least 1 |
| `limit` | No | `10` | Records per page, between 1 and 100 |
| `account_id` | No | None | Filter by account UUID |

### Examples

First page:

```http
GET /api/transactions
```

Second page with 10 records per page:

```http
GET /api/transactions?page=2&limit=10
```

Transactions for a specific account:

```http
GET /api/transactions?account_id=ACCOUNT_UUID&page=1&limit=10
```

**Response: `200 OK`**

```json
{
  "data": [
    {
      "id": "TRANSACTION_UUID",
      "account_id": "ACCOUNT_UUID",
      "type": "credit",
      "amount": "1000.00",
      "description": "Salary deposit",
      "reference_id": "salary-001",
      "created_at": "2026-10-27T08:05:00.000Z"
    }
  ],
  "pagination": {
    "current_page": 1,
    "page_size": 10,
    "total_records": 1,
    "total_pages": 1,
    "has_next_page": false,
    "has_previous_page": false
  }
}
```

The response values are examples. Transactions are ordered newest first by `created_at`.

When there are no matching records, `data` is empty and the total record and page counts are zero.

**Errors**

- `400 INVALID_PAGINATION` — invalid page or limit.
- `400 INVALID_ACCOUNT_ID` — invalid account filter UUID.

---

## 8. Get Transaction Details

### `GET /api/transactions/:id`

Returns an individual transaction by its UUID.

**Example request**

```http
GET /api/transactions/TRANSACTION_UUID
```

**Response: `200 OK`**

```json
{
  "data": {
    "id": "TRANSACTION_UUID",
    "account_id": "ACCOUNT_UUID",
    "type": "credit",
    "amount": "1000.00",
    "description": "Salary deposit",
    "reference_id": "salary-001",
    "created_at": "2026-10-27T08:05:00.000Z"
  }
}
```

**Errors**

- `400 INVALID_TRANSACTION_ID` — invalid transaction UUID.
- `404 TRANSACTION_NOT_FOUND` — transaction does not exist.

Transactions are immutable. The API does not support updating or deleting transaction records.

---

## 9. Transfer Funds Between Accounts

### `POST /api/transfers`

Transfers money from a source account to a destination account. The source debit, destination credit, balance changes, and corresponding ledger entries are performed atomically.

**Request body**

```json
{
  "source_account_id": "SOURCE_ACCOUNT_UUID",
  "destination_account_id": "DESTINATION_ACCOUNT_UUID",
  "amount": 300.00,
  "reference_id": "transfer-001",
  "description": "Transfer to savings"
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `source_account_id` | UUID string | Yes | Existing source account |
| `destination_account_id` | UUID string | Yes | Existing destination account, different from source |
| `amount` | Number | Yes | Positive amount with at most two decimal places |
| `reference_id` | String | Yes | Non-empty transfer reference, maximum 120 characters |
| `description` | String | No | Transfer description, maximum 500 characters |

**Response: `201 Created`**

```json
{
  "data": {
    "debit": {
      "id": "DEBIT_TRANSACTION_UUID",
      "account_id": "SOURCE_ACCOUNT_UUID",
      "type": "debit",
      "amount": "300.00",
      "description": "Transfer to savings",
      "reference_id": "transfer-001:debit",
      "created_at": "2026-10-27T08:10:00.000Z"
    },
    "credit": {
      "id": "CREDIT_TRANSACTION_UUID",
      "account_id": "DESTINATION_ACCOUNT_UUID",
      "type": "credit",
      "amount": "300.00",
      "description": "Transfer to savings",
      "reference_id": "transfer-001:credit",
      "created_at": "2026-10-27T08:10:00.000Z"
    }
  }
}
```

The response values are illustrative. The API uses corresponding debit and credit reference IDs for the transfer entries.

**Errors**

- `400 VALIDATION_ERROR` — invalid request data.
- `400 INVALID_TRANSFER` — source and destination are the same account.
- `404 ACCOUNT_NOT_FOUND` — source or destination account does not exist.
- `409 DUPLICATE_TRANSACTION` — duplicate reference.
- `422 INSUFFICIENT_BALANCE` — insufficient source-account funds.

A failed transfer must leave both balances unchanged and must not leave a partial transfer in the ledger.

---

## Error Response Format

Errors use a consistent JSON structure.

**Example**

```json
{
  "error": {
    "code": "ACCOUNT_NOT_FOUND",
    "message": "Account not found"
  }
}
```

Validation errors may include additional details.

### Error codes

| HTTP status | Error code | Meaning |
|---|---|---|
| `400` | `VALIDATION_ERROR` | Request validation failed |
| `400` | `INVALID_ACCOUNT_ID` | Invalid account UUID |
| `400` | `INVALID_TRANSACTION_ID` | Invalid transaction UUID |
| `400` | `INVALID_PAGINATION` | Invalid pagination parameters |
| `400` | `INVALID_TRANSFER` | Source and destination accounts are identical |
| `400` | `INVALID_JSON` | Invalid JSON request body |
| `404` | `ACCOUNT_NOT_FOUND` | Account does not exist |
| `404` | `TRANSACTION_NOT_FOUND` | Transaction does not exist |
| `404` | `ROUTE_NOT_FOUND` | API route does not exist |
| `405` | `TRANSACTION_IMMUTABLE` | Transaction update or deletion is prohibited |
| `409` | `DUPLICATE_TRANSACTION` | Duplicate transaction reference |
| `422` | `INSUFFICIENT_BALANCE` | Insufficient available balance |
| `500` | `INTERNAL_SERVER_ERROR` | Unexpected server error |

The exact status and error code depend on the API's configured error handler and validation logic.

---

## Data Integrity

- Account balances start at zero.
- Monetary amounts are stored using PostgreSQL `NUMERIC(18,2)`.
- Transaction amounts must be positive and have at most two decimal places.
- Balance changes and corresponding ledger entries are performed within database transactions.
- Account rows are locked during balance-changing operations to help prevent concurrent overspending.
- Transfers update both accounts and create both ledger entries atomically.
- Transaction reference IDs are unique per account.
- Database constraints and triggers protect transaction records against updates and deletions.
- The API does not provide a direct balance-editing endpoint or account-deletion endpoint.

## Assumptions and Limitations

- Account names are not required to be unique.
- Accounts start with a zero balance.
- Authentication and authorization are not implemented.
- Currency conversion is outside the current scope.
- Transaction records are immutable.
- Account deletion is not supported by the current API.

