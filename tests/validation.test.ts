import { describe, expect, it } from "vitest";
import { accountSchema, transactionSchema, transferSchema } from "../src/validation";

const accountId = "7b0b5d9c-4b82-4e2c-92e6-9b50f6e91b62";
const otherAccountId = "7b0b5d9c-4b82-4e2c-92e6-9b50f6e91b63";

describe("request validation", () => {
  it("requires an account name", () => {
    expect(accountSchema.safeParse({ name: "Main account" }).success).toBe(true);
    expect(accountSchema.safeParse({ name: " " }).success).toBe(false);
  });

  it("accepts valid credit/debit transactions and rejects invalid amounts/types", () => {
    const valid = { account_id: accountId, type: "credit", amount: 12.5, reference_id: "ref-1" };
    expect(transactionSchema.safeParse(valid).success).toBe(true);
    expect(transactionSchema.safeParse({ ...valid, amount: 0 }).success).toBe(false);
    expect(transactionSchema.safeParse({ ...valid, type: "transfer" }).success).toBe(false);
    expect(transactionSchema.safeParse({ ...valid, amount: 1.234 }).success).toBe(false);
    expect(transactionSchema.safeParse({ ...valid, reference_id: "" }).success).toBe(false);
  });

  it("requires distinct transfer accounts and positive amount", () => {
    const valid = { source_account_id: accountId, destination_account_id: otherAccountId, amount: 30, reference_id: "transfer-1" };
    expect(transferSchema.safeParse(valid).success).toBe(true);
    expect(transferSchema.safeParse({ ...valid, amount: -1 }).success).toBe(false);
  });
});
