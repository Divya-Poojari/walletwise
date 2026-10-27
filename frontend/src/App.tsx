import { FormEvent, useEffect, useState } from "react";

const API = import.meta.env.VITE_API_URL || "http://localhost:4000";
type Account = { id: string; name: string; balance: string; created_at: string };
type Tx = { id: string; account_id: string; type: string; amount: string; description: string; reference_id: string; created_at: string };
type Page = { current_page: number; page_size: number; total_records: number; total_pages: number; has_next_page: boolean; has_previous_page: boolean };

async function request(path: string, init?: RequestInit) {
  const res = await fetch(`${API}${path}`, { ...init, headers: { "Content-Type": "application/json", ...(init?.headers || {}) } });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body?.error?.message || `Request failed (${res.status})`);
  return body;
}
const money = (v: string | number) => Number(v).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const shortDate = (s: string) => new Date(s).toLocaleString();

export default function App() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<Tx[]>([]);
  const [pageInfo, setPageInfo] = useState<Page | null>(null);
  const [page, setPage] = useState(1);
  const [filterAccount, setFilterAccount] = useState("");
  const [name, setName] = useState("");
  const [balanceLookupId, setBalanceLookupId] = useState("");
  const [balanceResult, setBalanceResult] = useState<{ account_id: string; balance: string } | null>(null);
  const [balanceLookupError, setBalanceLookupError] = useState("");
  const [accountId, setAccountId] = useState("");
  const [type, setType] = useState("credit");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [reference, setReference] = useState("");
  const [source, setSource] = useState("");
  const [destination, setDestination] = useState("");
  const [transferAmount, setTransferAmount] = useState("");
  const [transferReference, setTransferReference] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function loadAccounts() {
    const result = await request("/api/accounts");
    setAccounts(result.data);
    if (!accountId && result.data.length) setAccountId(result.data[0].id);
    if (!balanceLookupId && result.data.length) setBalanceLookupId(result.data[0].id);
    if (!source && result.data.length) setSource(result.data[0].id);
    if (!destination && result.data.length > 1) setDestination(result.data[1].id);
  }
  async function loadTransactions(nextPage = page, account = filterAccount) {
    const params = new URLSearchParams({ page: String(nextPage), limit: "8" });
    if (account) params.set("account_id", account);
    const result = await request(`/api/transactions?${params}`);
    setTransactions(result.data);
    setPageInfo(result.pagination);
  }
  useEffect(() => { loadAccounts().catch(e => setError(e.message)); }, []);
  useEffect(() => { loadTransactions(page, filterAccount).catch(e => setError(e.message)); }, [page, filterAccount]);
  async function runAction(action: () => Promise<void>) {
    setBusy(true); setError(""); setNotice("");
    try { await action(); } catch (e) { setError(e instanceof Error ? e.message : "Something went wrong"); }
    finally { setBusy(false); }
  }
  async function lookupBalance(e: FormEvent) {
    e.preventDefault();
    setBalanceResult(null);
    setBalanceLookupError("");
    await runAction(async () => {
      try {
        const result = await request(`/api/accounts/${encodeURIComponent(balanceLookupId.trim())}/balance`);
        setBalanceResult(result.data);
      } catch (e) {
        const message = e instanceof Error ? e.message : "Unable to fetch account balance";
        setBalanceLookupError(message);
        throw e;
      }
    });
  }

  async function createAccount(e: FormEvent) {
    e.preventDefault();
    await runAction(async () => {
      const result = await request("/api/accounts", { method: "POST", body: JSON.stringify({ name }) });
      setName(""); await loadAccounts(); setNotice(`Account created: ${result.data.name}`);
    });
  }
  async function createTransaction(e: FormEvent) {
    e.preventDefault();
    await runAction(async () => {
      await request("/api/transactions", { method: "POST", body: JSON.stringify({ account_id: accountId, type, amount: Number(amount), description, reference_id: reference }) });
      setAmount(""); setDescription(""); setReference(""); await loadAccounts(); await loadTransactions(1, filterAccount); setPage(1); setNotice("Transaction recorded successfully.");
    });
  }
  async function transfer(e: FormEvent) {
    e.preventDefault();
    await runAction(async () => {
      await request("/api/transfers", { method: "POST", body: JSON.stringify({ source_account_id: source, destination_account_id: destination, amount: Number(transferAmount), reference_id: transferReference, description: "Account transfer" }) });
      setTransferAmount(""); setTransferReference(""); await loadAccounts(); await loadTransactions(1, filterAccount); setPage(1); setNotice("Transfer completed atomically.");
    });
  }
  return <main className="shell">
    <header className="topbar"><div className="brand"><div className="brandmark">W</div><div><b>Walnut Ledger</b><span>Accounts & transaction management</span></div></div><div className="api-status"><i/> API workspace</div></header>
    <section className="hero"><div><p className="eyebrow">FINANCIAL OPERATIONS</p><h1>Account overview</h1><p className="muted">Track balances and record transactions with an immutable ledger.</p></div><button className="secondary" onClick={() => runAction(async () => { await loadAccounts(); await loadTransactions(page, filterAccount); setNotice("Data refreshed."); })}>↻ Refresh data</button></section>
    {error && <div className="alert error">{error}<button onClick={() => setError("")}>×</button></div>}
    {notice && <div className="alert success">{notice}<button onClick={() => setNotice("")}>×</button></div>}
    <section className="stats">
      <div className="stat"><span>Total accounts</span><strong>{accounts.length}</strong><small>Registered accounts</small></div>
      <div className="stat"><span>Combined balance</span><strong>₹{money(accounts.reduce((sum, a) => sum + Number(a.balance), 0))}</strong><small>Across all accounts</small></div>
      <div className="stat"><span>Ledger entries</span><strong>{pageInfo?.total_records ?? "—"}</strong><small>{filterAccount ? "Selected account" : "All accounts"}</small></div>
    </section>
    <section className="panel balance-lookup">
      <div className="panel-head"><div><h2>Account balance lookup</h2><p>Check one account's current balance using its account ID.</p></div><span className="icon">₹</span></div>
      <form onSubmit={lookupBalance}>
        <label>Select account</label>
        <select value={balanceLookupId} onChange={e => { setBalanceLookupId(e.target.value); setBalanceResult(null); setBalanceLookupError(""); }}>
          <option value="">Choose an account</option>
          {accounts.map(a => <option key={a.id} value={a.id}>{a.name} · {a.id}</option>)}
        </select>
        <label>Account ID (you can paste an ID to check an account or test a missing account)</label>
        <input value={balanceLookupId} onChange={e => { setBalanceLookupId(e.target.value); setBalanceResult(null); setBalanceLookupError(""); }} placeholder="Enter account UUID" required />
        <button disabled={busy || !balanceLookupId.trim()} className="primary">Check balance</button>
      </form>
      {balanceResult && <div className="balance-result"><span>Current balance</span><strong>₹{money(balanceResult.balance)}</strong><small>Account ID: {balanceResult.account_id}</small></div>}
      {balanceLookupError && <div className="alert error" role="alert">{balanceLookupError}</div>}
    </section>
    <section className="columns">
      <div className="panel"><div className="panel-head"><div><h2>Create account</h2><p>Add an account with a zero opening balance.</p></div><span className="icon">＋</span></div>
        <form onSubmit={createAccount}><label>Account name</label><input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Everyday account" required maxLength={120}/><button disabled={busy} className="primary">Create account</button></form>
      </div>
      <div className="panel"><div className="panel-head"><div><h2>New transaction</h2><p>Record a credit or debit against an account.</p></div><span className="icon">↕</span></div>
        <form onSubmit={createTransaction}><label>Account</label><select required value={accountId} onChange={e => setAccountId(e.target.value)}><option value="">Select account</option>{accounts.map(a => <option key={a.id} value={a.id}>{a.name} · ₹{money(a.balance)}</option>)}</select>
        <div className="form-row"><div><label>Type</label><select value={type} onChange={e => setType(e.target.value)}><option value="credit">Credit</option><option value="debit">Debit</option></select></div><div><label>Amount (₹)</label><input type="number" min="0.01" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} required placeholder="0.00"/></div></div>
        <label>Description</label><input value={description} onChange={e => setDescription(e.target.value)} maxLength={500} placeholder="What is this transaction for?"/>
        <label>Reference ID</label><input value={reference} onChange={e => setReference(e.target.value)} required maxLength={120} placeholder="Unique reference for this account"/>
        <button disabled={busy || !accounts.length} className="primary">Record transaction</button></form>
      </div>
    </section>
    <section className="panel transfer-panel"><div className="panel-head"><div><h2>Money transfer</h2><p>Move funds between accounts in one atomic operation.</p></div><span className="icon">⇄</span></div>
      <form onSubmit={transfer} className="transfer-form"><div><label>From account</label><select value={source} onChange={e => setSource(e.target.value)} required>{accounts.map(a => <option key={a.id} value={a.id}>{a.name} · ₹{money(a.balance)}</option>)}</select></div><div><label>To account</label><select value={destination} onChange={e => setDestination(e.target.value)} required>{accounts.filter(a => a.id !== source).map(a => <option key={a.id} value={a.id}>{a.name} · ₹{money(a.balance)}</option>)}</select></div><div><label>Amount (₹)</label><input type="number" min="0.01" step="0.01" value={transferAmount} onChange={e => setTransferAmount(e.target.value)} required/></div><div><label>Reference ID</label><input value={transferReference} onChange={e => setTransferReference(e.target.value)} required maxLength={120}/></div><button disabled={busy || accounts.length < 2} className="primary">Transfer funds</button></form>
    </section>
    <section className="panel ledger"><div className="panel-head ledger-head"><div><h2>Transaction ledger</h2><p>Immutable records sorted newest first.</p></div><select className="filter" value={filterAccount} onChange={e => { setPage(1); setFilterAccount(e.target.value); }}><option value="">All accounts</option>{accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select></div>
      <div className="table-wrap"><table><thead><tr><th>Transaction</th><th>Account</th><th>Type</th><th>Amount</th><th>Reference</th><th>Created</th></tr></thead><tbody>
        {transactions.map(tx => <tr key={tx.id}><td><b>{tx.description || "Transaction"}</b><small>{tx.id.slice(0, 8)}…</small></td><td>{accounts.find(a => a.id === tx.account_id)?.name || tx.account_id.slice(0, 8)}</td><td><span className={`pill ${tx.type}`}>{tx.type}</span></td><td className={tx.type === "credit" ? "positive" : "negative"}>{tx.type === "credit" ? "+" : "−"}₹{money(tx.amount)}</td><td className="reference">{tx.reference_id}</td><td>{shortDate(tx.created_at)}</td></tr>)}
        {!transactions.length && <tr><td colSpan={6} className="empty">No transactions yet. Create an account and record a transaction to get started.</td></tr>}
      </tbody></table></div>
      <div className="pagination"><span>Page {pageInfo?.current_page ?? page} of {Math.max(pageInfo?.total_pages ?? 0, 1)} · {pageInfo?.total_records ?? 0} records</span><div><button className="secondary" disabled={!pageInfo?.has_previous_page} onClick={() => setPage(p => Math.max(1, p - 1))}>Previous</button><button className="secondary" disabled={!pageInfo?.has_next_page} onClick={() => setPage(p => p + 1)}>Next</button></div></div>
    </section>
    <footer>Walnut Ledger <span>•</span> Transactions are append-only. Balances update atomically.</footer>
  </main>;
}
