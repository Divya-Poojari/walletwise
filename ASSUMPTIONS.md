# Assumptions
- Accounts begin with a zero balance.
- Currency is not specified; all amounts use two decimal places.
- `reference_id` uniqueness is scoped to an account.
- Rejected transactions do not create ledger rows and never affect balances.
- Transfers are represented by one debit and one credit ledger entry, committed atomically.
- Authentication, authorization and UI are not specified in the supplied assignment brief and are out of scope.
