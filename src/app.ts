import express, { NextFunction, Request, Response } from "express";
import cors from "cors";
import helmet from "helmet";
import { z } from "zod";
import { pool, inTransaction } from "./db";
import { ApiError } from "./errors";
import { accountSchema, transactionSchema, transferSchema } from "./validation";

export const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: "1mb" }));

const asyncRoute = (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>) =>
  (req: Request, res: Response, next: NextFunction) => Promise.resolve(fn(req, res, next)).catch(next);

function parsePagination(req: Request) {
  const pageRaw = req.query.page ?? "1";
  const limitRaw = req.query.limit ?? "10";
  const page = Number(pageRaw);
  const limit = Number(limitRaw);
  if (!Number.isInteger(page) || page < 1 || !Number.isInteger(limit) || limit < 1 || limit > 100) {
    throw new ApiError(400, "INVALID_PAGINATION", "page must be >= 1 and limit must be between 1 and 100");
  }
  return { page, limit, offset: (page - 1) * limit };
}

app.get("/health", (_req, res) => res.json({ status: "ok" }));

app.post("/api/accounts", asyncRoute(async (req, res) => {
  const parsed = accountSchema.safeParse(req.body);
  if (!parsed.success) throw new ApiError(400, "VALIDATION_ERROR", "Invalid request body", parsed.error.flatten());
  const result = await pool.query(
    "INSERT INTO accounts (name) VALUES ($1) RETURNING id, name, balance, created_at",
    [parsed.data.name]
  );
  res.status(201).json({ data: result.rows[0] });
}));

app.get("/api/accounts", asyncRoute(async (_req, res) => {
  const result = await pool.query("SELECT id, name, balance, created_at FROM accounts ORDER BY created_at DESC, id DESC");
  res.json({ data: result.rows });
}));

app.get("/api/accounts/:id", asyncRoute(async (req, res) => {
  const id = z.string().uuid().safeParse(req.params.id);
  if (!id.success) throw new ApiError(400, "INVALID_ACCOUNT_ID", "Account ID must be a valid UUID");
  const result = await pool.query("SELECT id, name, balance, created_at FROM accounts WHERE id = $1", [id.data]);
  if (!result.rowCount) throw new ApiError(404, "ACCOUNT_NOT_FOUND", "Account not found");
  res.json({ data: result.rows[0] });
}));


app.get("/api/accounts/:id/balance", asyncRoute(async (req, res) => {
  const id = z.string().uuid().safeParse(req.params.id);

  if (!id.success) {
    throw new ApiError(
      400,
      "INVALID_ACCOUNT_ID",
      "Account ID must be a valid UUID"
    );
  }

  const result = await pool.query(
    "SELECT id, balance FROM accounts WHERE id = $1",
    [id.data]
  );

  if (!result.rowCount) {
    throw new ApiError(404, "ACCOUNT_NOT_FOUND", "Account not found");
  }

  res.json({
    data: {
      account_id: result.rows[0].id,
      balance: result.rows[0].balance
    }
  });
}));


app.post("/api/transactions", asyncRoute(async (req, res) => {
  const parsed = transactionSchema.safeParse(req.body);
  if (!parsed.success) throw new ApiError(400, "VALIDATION_ERROR", "Invalid request body", parsed.error.flatten());
  const input = parsed.data;

  const created = await inTransaction(async client => {
    // Lock account row so concurrent debits cannot overspend.
    const account = await client.query("SELECT id, balance FROM accounts WHERE id = $1 FOR UPDATE", [input.account_id]);
    if (!account.rowCount) throw new ApiError(404, "ACCOUNT_NOT_FOUND", "Account not found");
    const duplicate = await client.query(
      "SELECT id FROM transactions WHERE account_id = $1 AND reference_id = $2",
      [input.account_id, input.reference_id]
    );
    if (duplicate.rowCount) throw new ApiError(409, "DUPLICATE_TRANSACTION", "reference_id already exists for this account");
    const currentBalance = Number(account.rows[0].balance);
    if (input.type === "debit" && currentBalance < input.amount) {
      throw new ApiError(422, "INSUFFICIENT_BALANCE", "Account has insufficient balance");
    }
    const delta = input.type === "credit" ? input.amount : -input.amount;
    await client.query("UPDATE accounts SET balance = balance + $1 WHERE id = $2", [delta, input.account_id]);
    const tx = await client.query(
      `INSERT INTO transactions (account_id, type, amount, description, reference_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, account_id, type, amount, description, reference_id, created_at`,
      [input.account_id, input.type, input.amount, input.description, input.reference_id]
    );
    return tx.rows[0];
  });
  res.status(201).json({ data: created });
}));

app.get("/api/transactions", asyncRoute(async (req, res) => {
  const { page, limit, offset } = parsePagination(req);
  const accountId = req.query.account_id;
  if (accountId !== undefined && (typeof accountId !== "string" || !z.string().uuid().safeParse(accountId).success)) {
    throw new ApiError(400, "INVALID_ACCOUNT_ID", "account_id must be a valid UUID");
  }
  const where = accountId ? "WHERE account_id = $1" : "";
  const params = accountId ? [accountId] : [];
  const count = await pool.query(`SELECT COUNT(*)::int AS total FROM transactions ${where}`, params);
  const rows = await pool.query(
    `SELECT id, account_id, type, amount, description, reference_id, created_at
     FROM transactions ${where}
     ORDER BY created_at DESC, id DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, limit, offset]
  );
  const totalRecords = count.rows[0].total as number;
  res.json({
    data: rows.rows,
    pagination: {
      current_page: page,
      page_size: limit,
      total_records: totalRecords,
      total_pages: Math.ceil(totalRecords / limit),
      has_next_page: page * limit < totalRecords,
      has_previous_page: page > 1
    }
  });
}));

app.get("/api/transactions/:id", asyncRoute(async (req, res) => {
  const id = z.string().uuid().safeParse(req.params.id);
  if (!id.success) throw new ApiError(400, "INVALID_TRANSACTION_ID", "Transaction ID must be a valid UUID");
  const result = await pool.query(
    "SELECT id, account_id, type, amount, description, reference_id, created_at FROM transactions WHERE id = $1",
    [id.data]
  );
  if (!result.rowCount) throw new ApiError(404, "TRANSACTION_NOT_FOUND", "Transaction not found");
  res.json({ data: result.rows[0] });
}));

app.all("/api/transactions/:id", (req, _res, next) => {
  if (["PUT", "PATCH", "DELETE"].includes(req.method)) {
    return next(new ApiError(405, "TRANSACTION_IMMUTABLE", "Transactions cannot be updated or deleted"));
  }
  next();
});

app.post("/api/transfers", asyncRoute(async (req, res) => {
  const parsed = transferSchema.safeParse(req.body);
  if (!parsed.success) throw new ApiError(400, "VALIDATION_ERROR", "Invalid request body", parsed.error.flatten());
  const input = parsed.data;
  if (input.source_account_id === input.destination_account_id) {
    throw new ApiError(400, "INVALID_TRANSFER", "Source and destination accounts must be different");
  }

  const result = await inTransaction(async client => {
    // Lock in stable ID order to reduce deadlock risk.
    const ids = [input.source_account_id, input.destination_account_id].sort();
    const locked = await client.query("SELECT id, balance FROM accounts WHERE id = ANY($1::uuid[]) ORDER BY id FOR UPDATE", [ids]);
    if (locked.rowCount !== 2) throw new ApiError(404, "ACCOUNT_NOT_FOUND", "Both source and destination accounts must exist");
    const source = locked.rows.find(r => r.id === input.source_account_id);
    if (Number(source.balance) < input.amount) throw new ApiError(422, "INSUFFICIENT_BALANCE", "Source account has insufficient balance");

    const refs = [
      `${input.reference_id}:debit`,
      `${input.reference_id}:credit`
    ];
    const duplicate = await client.query(
      "SELECT reference_id FROM transactions WHERE (account_id = $1 AND reference_id = $3) OR (account_id = $2 AND reference_id = $4)",
      [input.source_account_id, input.destination_account_id, refs[0], refs[1]]
    );
    if (duplicate.rowCount) throw new ApiError(409, "DUPLICATE_TRANSACTION", "Transfer reference has already been used");

    await client.query("UPDATE accounts SET balance = balance - $1 WHERE id = $2", [input.amount, input.source_account_id]);
    await client.query("UPDATE accounts SET balance = balance + $1 WHERE id = $2", [input.amount, input.destination_account_id]);
    const debit = await client.query(
      `INSERT INTO transactions (account_id, type, amount, description, reference_id)
       VALUES ($1, 'debit', $2, $3, $4)
       RETURNING id, account_id, type, amount, description, reference_id, created_at`,
      [input.source_account_id, input.amount, input.description, refs[0]]
    );
    const credit = await client.query(
      `INSERT INTO transactions (account_id, type, amount, description, reference_id)
       VALUES ($1, 'credit', $2, $3, $4)
       RETURNING id, account_id, type, amount, description, reference_id, created_at`,
      [input.destination_account_id, input.amount, input.description, refs[1]]
    );
    return { debit: debit.rows[0], credit: credit.rows[0] };
  });
  res.status(201).json({ data: result });
}));

app.use((_req, _res, next) => next(new ApiError(404, "ROUTE_NOT_FOUND", "Route not found")));

app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof ApiError) {
    return res.status(err.status).json({ error: { code: err.code, message: err.message, ...(err.details ? { details: err.details } : {}) } });
  }
  const pgErr = err as { code?: string; message?: string };
  if (pgErr?.code === "23505") {
    return res.status(409).json({ error: { code: "DUPLICATE_TRANSACTION", message: "reference_id already exists for this account" } });
  }
  if (pgErr?.code === "23503") {
    return res.status(400).json({ error: { code: "INVALID_REFERENCE", message: "A referenced account does not exist" } });
  }
  if (err instanceof SyntaxError) {
    return res.status(400).json({ error: { code: "INVALID_JSON", message: "Request body must contain valid JSON" } });
  }
  console.error(err);
  return res.status(500).json({ error: { code: "INTERNAL_SERVER_ERROR", message: "An unexpected error occurred" } });
});
