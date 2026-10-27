import { z } from "zod";

export const accountSchema = z.object({
  name: z.string().trim().min(1, "Account name is required").max(120)
}).strict();

export const transactionSchema = z.object({
  account_id: z.string().uuid("account_id must be a valid UUID"),
  type: z.enum(["credit", "debit"], { errorMap: () => ({ message: "type must be either credit or debit" }) }),
  amount: z.number().finite().positive("amount must be greater than 0").refine(v => Math.round(v * 100) === v * 100, "amount may have at most 2 decimal places"),
  description: z.string().trim().max(500).optional().default(""),
  reference_id: z.string().trim().min(1, "reference_id is required").max(120)
}).strict();

export const transferSchema = z.object({
  source_account_id: z.string().uuid(),
  destination_account_id: z.string().uuid(),
  amount: z.number().finite().positive().refine(v => Math.round(v * 100) === v * 100, "amount may have at most 2 decimal places"),
  reference_id: z.string().trim().min(1).max(120),
  description: z.string().trim().max(500).optional().default("Transfer")
}).strict();
