# API Documentation

Base URL: `http://localhost:4000`

## Accounts
| Method | Path | Description |
|---|---|---|
| POST | `/api/accounts` | Create account; body requires `name` |
| GET | `/api/accounts` | List accounts |
| GET | `/api/accounts/:id` | Get account and current balance |

## Transactions
| Method | Path | Description |
|---|---|---|
| POST | `/api/transactions` | Create credit/debit transaction |
| GET | `/api/transactions?page=1&limit=10` | Paginated transactions, newest first |
| GET | `/api/transactions?account_id={uuid}&page=1&limit=10` | Paginated account ledger |
| GET | `/api/transactions/:id` | Get immutable transaction |

Transaction body:
```json
{
  "account_id": "UUID",
  "type": "credit",
  "amount": 100,
  "description": "Deposit",
  "reference_id": "deposit-001"
}
```

## Transfers
`POST /api/transfers`

```json
{
  "source_account_id": "UUID",
  "destination_account_id": "UUID",
  "amount": 30,
  "reference_id": "transfer-001",
  "description": "Transfer"
}
```

## Error codes
`VALIDATION_ERROR`, `INVALID_PAGINATION`, `INVALID_ACCOUNT_ID`, `ACCOUNT_NOT_FOUND`, `TRANSACTION_NOT_FOUND`, `DUPLICATE_TRANSACTION`, `INSUFFICIENT_BALANCE`, `TRANSACTION_IMMUTABLE`, `ROUTE_NOT_FOUND`, `INTERNAL_SERVER_ERROR`.
