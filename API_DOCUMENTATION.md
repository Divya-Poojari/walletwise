# LedgerFlow — API Documentation

REST API for account management, credit/debit transactions, transaction history, balance lookup, and atomic account-to-account transfers.

## Base URL

Local development:

`http://localhost:4000`

## API Overview

| Method | Endpoint | Description |
|---|---|---|
| GET | `/health` | Check API health |
| POST | `/api/accounts` | Create an account |
| GET | `/api/accounts` | List accounts and current balances |
| GET | `/api/accounts/:id` | Get account details and balance |
| GET | `/api/accounts/:id/balance` | Fetch a single account's balance |
| POST | `/api/transactions` | Create a credit or debit |
| GET | `/api/transactions` | List transactions with pagination |
| GET | `/api/transactions/:id` | Get transaction details |
| POST | `/api/transfers` | Transfer funds between accounts |

All request bodies must contain valid JSON. The API returns JSON responses.

---

## 1. Health Check

### `GET /health`

Checks whether the API is responding.

**Successful response — `200 OK`**

```json
{
  "status": "ok"
}
```

---

## 2. Create Account

### `POST /api/accounts`

Creates an account with a zero opening balance.

**Request body**

```json
{
  "name": "Everyday Account"
}
```

| Field | Type | Required | Rules |
|---|---|---|---|
| `name` | String | Yes | Trimmed, 1–120 characters |

**Successful response — `201 Created`**

```json
{
  "data": {
    "id": "11111111-1111-4111-8111-111111111111",
    "name": "Everyday Account",
    "balance": "0.00",
    "created_at": "2026-10-27T08:00:00.000Z"
  }
}
```

The UUID and timestamp above are illustrative.

**Validation:** Invalid or missing names return `400 VALIDATION_ERROR`.

**Note:** Account names are not required to be unique. Account identity is determined by its UUID.

---

## 3. List Accounts

### `GET /api/accounts`

Returns all accounts, including their current balances, ordered by creation time with newest accounts first.

**Successful response — `200 OK`**

```json
{
  "data": [
    {
      "id": "11111111-1111-4111-8111-111111111111",
      "name": "Everyday Account",
      "balance": "1500.00",
      "created_at": "2026-10-27T08:00:00.000Z"
    }
  ]
}
```

An empty account list returns `"data": []`.

---

## 4. Get Account Details

### `GET /api/accounts/:id`

Returns the details and current balance of a specific account.

**Example**

`GET /api/accounts/11111111-1111-4111-8111-111111111111`

**Successful response — `200 OK`**

```json
{
  "data": {
    "id": "11111111-1111-4111-8111-111111111111",
    "name": "Everyday Account",
    "balance": "1500.00",
    "created_at": "2026-10-27T08:00:00.000Z"
  }
}
```

**Possible errors**

- `400 INVALID_ACCOUNT_ID` — the ID is not a valid UUID.
- `404 ACCOUNT_NOT_FOUND` — no account exists with that UUID.

---

## 5. Get Account Balance

### `GET /api/accounts/:id/balance`

Fetches the current balance of one account separately from its other details.

**Example**

`GET /api/accounts/11111111-1111-4111-8111-111111111111/balance`

**Successful response — `200 OK`**

```json
{
  "data": {
    "account_id": "11111111-1111-4111-8111-111111111111",
    "balance": "1500.00"
  }
}
```

| Field | Type | Description |
|---|---|---|
| `account_id` | UUID string | ID of the requested account |
| `balance` | Decimal string | Current account balance |

**Possible errors**

Invalid account ID — `400 Bad Request`

```json
{
  "error": {
    "code": "INVALID_ACCOUNT_ID",
    "message": "Account ID must be a valid UUID"
  }
}
```

Account does not exist — `404 Not Found`

```json
{
  "error": {
    "code": "ACCOUNT_NOT_FOUND",
    "message": "Account not found"
  }
}
```

Use the account UUID returned by `POST /api/accounts` or `GET /api/accounts` when testing this endpoint.

---

## 6. Create a Credit or Debit Transaction

### `POST /api/transactions`

Creates an immutable ledger entry and updates the account balance in the same database transaction.

### Credit example

**Request body**

```json
{
  "account_id": "11111111-1111-4111-8111-111111111111",
  "type": "credit",
  "amount": 1000.00,
  "description": "Salary deposit",
  "reference_id": "salary-001"
}
```

### Debit example

```json
{
  "account_id": "11111111-1111-4111-8111-111111111111",
  "type": "debit",
  "amount": 250.00,
  "description": "Utility bill",
  "reference_id": "utility-001"
}
```

| Field | Type | Required | Rules |
|---|---|---|---|
| `account_id` | UUID string | Yes | Must identify an existing account |
| `type` | String | Yes | `credit` or `debit` |
| `amount` | Number | Yes | Positive, maximum two decimal places |
| `description` | String | No | Maximum 500 characters; defaults to empty |
| `reference_id` | String | Yes | Non-empty, maximum 120 characters; unique per account |

**Successful response — `201 Created`**

```json
{
  "data": {
    "id": "22222222-2222-4222-8222-222222222222",
    "account_id": "11111111-1111-4111-8111-111111111111",
    "type": "credit",
    "amount": "1000.00",
    "description": "Salary deposit",
    "reference_id": "salary-001",
    "created_at": "2026-10-27T08:05:00.000Z"
  }
}
```

**Possible errors**

- `400 VALIDATION_ERROR` — invalid body or field values.
- `404 ACCOUNT_NOT_FOUND` — account does not exist.
- `409 DUPLICATE_TRANSACTION` — reference ID already exists for the account.
- `422 INSUFFICIENT_BALANCE` — debit exceeds the available balance.

A rejected debit does not create a transaction or change the balance.

---

## 7. List Transactions with Pagination

### `GET /api/transactions`

Returns transaction history sorted newest first by `created_at`, with transaction ID used as a tie-breaker.

**Query parameters**

| Parameter | Required | Default | Rules |
|---|---|---|---|
| `page` | No | `1` | Integer greater than or equal to 1 |
| `limit` | No | `10` | Integer between 1 and 100 |
| `account_id` | No | None | Valid account UUID to filter results |

**Examples**

- First page: `/api/transactions`
- Second page: `/api/transactions?page=2&limit=10`
- Account history: `/api/transactions?account_id=11111111-1111-4111-8111-111111111111&page=1&limit=10`

**Successful response — `200 OK`**

```json
{
  "data": [
    {
      "id": "22222222-2222-4222-8222-222222222222",
      "account_id": "11111111-1111-4111-8111-111111111111",
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

When there are no matching transactions, `data` is an empty array and `total_records` and `total_pages` are zero.

**Possible errors**

- `400 INVALID_PAGINATION` — invalid page or limit.
- `400 INVALID_ACCOUNT_ID` — invalid `account_id` filter.

---

## 8. Get a Transaction

### `GET /api/transactions/:id`

Returns one transaction by its UUID.

**Successful response — `200 OK`**

```json
{
  "data": {
    "id": "22222222-2222-4222-8222-222222222222",
    "account_id": "11111111-1111-4111-8111-111111111111",
    "type": "credit",
    "amount": "1000.00",
    "description": "Salary deposit",
    "reference_id": "salary-001",
    "created_at": "2026-10-27T08:05:00.000Z"
  }
}
```

**Possible errors**

- `400 INVALID_TRANSACTION_ID` — invalid transaction UUID.
- `404 TRANSACTION_NOT_FOUND` — transaction does not exist.

Transactions are immutable. Attempts to update or delete a transaction using `PUT`, `PATCH`, or `DELETE` on `/api/transactions/:id` return `405 TRANSACTION_IMMUTABLE`.

---

## 9. Transfer Funds Between Accounts

### `POST /api/transfers`

Transfers money from one account to another atomically. The source debit, destination credit, both balance changes, and both ledger entries commit together or roll back together.

**Request body**

```json
{
  "source_account_id": "11111111-1111-4111-8111-111111111111",
  "destination_account_id": "33333333-3333-4333-8333-333333333333",
  "amount": 300.00,
  "reference_id": "transfer-001",
  "description": "Transfer to savings"
}
```

| Field | Type | Required | Rules |
|---|---|---|---|
| `source_account_id` | UUID string | Yes | Must identify an existing account |
| `destination_account_id` | UUID string | Yes | Must identify a different existing account |
| `amount` | Number | Yes | Positive, maximum two decimal places |
| `reference_id` | String | Yes | Non-empty, maximum 120 characters |
| `description` | String | No | Maximum 500 characters; defaults to `Transfer` |

**Successful response — `201 Created`**

```json
{
  "data": {
    "debit": {
      "id": "44444444-4444-4444-8444-444444444444",
      "account_id": "11111111-1111-4111-8111-111111111111",
      "type": "debit",
      "amount": "300.00",
      "description": "Transfer to savings",
      "reference_id": "transfer-001:debit",
      "created_at": "2026-10-27T08:10:00.000Z"
    },
    "credit": {
      "id": "55555555-5555-4555-8555-555555555555",
      "account_id": "33333333-3333-4333-8333-333333333333",
      "type": "credit",
      "amount": "300.00",
      "description": "Transfer to savings",
      "reference_id": "transfer-001:credit",
      "created_at": "2026-10-27T08:10:00.000Z"
    }
  }
}
```

Transfer reference IDs are suffixed with `:debit` and `:credit` for the corresponding ledger entries.

**Possible errors**

- `400 VALIDATION_ERROR` — invalid request body.
- `400 INVALID_TRANSFER` — source and destination accounts are identical.
- `404 ACCOUNT_NOT_FOUND` — source or destination account does not exist.
- `409 DUPLICATE_TRANSACTION` — transfer reference has already been used for the corresponding account entries.
- `422 INSUFFICIENT_BALANCE` — source account has insufficient funds.

---

## Error Response Format

Errors use a consistent structure:

```json
{
  "error": {
    "code": "ACCOUNT_NOT_FOUND",
    "message": "Account not found"
  }
}
```

Validation errors may also include a `details` field.

### Error code reference

| HTTP status | Error code | Meaning |
|---|---|---|
| `400` | `VALIDATION_ERROR` | Request body failed validation |
| `400` | `INVALID_ACCOUNT_ID` | Account UUID is invalid |
| `400` | `INVALID_TRANSACTION_ID` | Transaction UUID is invalid |
| `400` | `INVALID_PAGINATION` | Pagination parameters are invalid |
| `400` | `INVALID_TRANSFER` | Source and destination accounts are the same |
| `400` | `INVALID_JSON` | Request body contains invalid JSON |
| `400` | `INVALID_REFERENCE` | Referenced database record is invalid |
| `404` | `ACCOUNT_NOT_FOUND` | Account does not exist |
| `404` | `TRANSACTION_NOT_FOUND` | Transaction does not exist |
| `404` | `ROUTE_NOT_FOUND` | API route does not exist |
| `405` | `TRANSACTION_IMMUTABLE` | Transaction update/delete is prohibited |
| `409` | `DUPLICATE_TRANSACTION` | Duplicate reference |
| `422` | `INSUFFICIENT_BALANCE` | Account lacks sufficient funds |
| `500` | `INTERNAL_SERVER_ERROR` | Unexpected server error |

---

## Data Integrity

- Account balances start at zero.
- Money is stored using PostgreSQL `NUMERIC(18,2)`.
- Transaction amounts must be positive and have at most two decimal places.
- Balance changes and corresponding ledger inserts occur within a database transaction.
- Account rows are locked during balance-changing operations to help prevent concurrent overspending.
- Transfers lock both accounts and update both balances atomically.
- Transaction reference IDs are unique per account.
- Database constraints and a trigger protect transaction records from updates and deletions.
- The API does not expose an endpoint to directly set an account balance or delete an account.

## Notes

- Authentication and authorization are not implemented.
- Account names are not required to be unique.
- Currency conversion is not implemented; the UI currently formats balances in Indian rupees.
- Use actual IDs returned by the API when testing examples.
