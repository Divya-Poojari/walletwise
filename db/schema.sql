CREATE TABLE IF NOT EXISTS accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(120) NOT NULL CHECK (length(trim(name)) > 0),
  balance NUMERIC(18,2) NOT NULL DEFAULT 0 CHECK (balance >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
  type VARCHAR(10) NOT NULL CHECK (type IN ('credit', 'debit')),
  amount NUMERIC(18,2) NOT NULL CHECK (amount > 0),
  description VARCHAR(500) NOT NULL DEFAULT '',
  reference_id VARCHAR(120) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT transactions_account_reference_unique UNIQUE (account_id, reference_id)
);

CREATE INDEX IF NOT EXISTS transactions_account_created_idx
  ON transactions (account_id, created_at DESC, id DESC);

-- Guard against direct SQL updates/deletes too: transaction records are append-only.
CREATE OR REPLACE FUNCTION prevent_transaction_mutation()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Transactions are immutable; UPDATE and DELETE are prohibited';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS transactions_immutable_trigger ON transactions;
CREATE TRIGGER transactions_immutable_trigger
BEFORE UPDATE OR DELETE ON transactions
FOR EACH ROW EXECUTE FUNCTION prevent_transaction_mutation();

-- PostgreSQL 13+ supplies gen_random_uuid via pgcrypto on many installs; ensure extension.
CREATE EXTENSION IF NOT EXISTS pgcrypto;
