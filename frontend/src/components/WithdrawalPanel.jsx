import { useEffect, useState } from "react";
import client from "../api/client.js";
import { useAuth } from "../auth/AuthContext.jsx";

function formatNaira(kobo) {
  return `₦${(kobo / 100).toLocaleString()}`;
}

const STATUS_STYLES = {
  paid: "text-brand-greenDark",
  pending: "text-yellow-700",
  failed: "text-red-600",
};

export default function WithdrawalPanel() {
  const { user } = useAuth();
  const [wallet, setWallet] = useState(null);
  const [banks, setBanks] = useState([]);
  const [account, setAccount] = useState(null);
  const [withdrawals, setWithdrawals] = useState([]);
  const [loading, setLoading] = useState(true);

  const [accountForm, setAccountForm] = useState({ bank_code: "", account_number: "" });
  const [accountError, setAccountError] = useState("");
  const [accountSaving, setAccountSaving] = useState(false);

  const [amount, setAmount] = useState("");
  const [withdrawError, setWithdrawError] = useState("");
  const [withdrawSuccess, setWithdrawSuccess] = useState("");
  const [withdrawing, setWithdrawing] = useState(false);

  function loadAll() {
    Promise.all([
      client.get("/wallet/me").then(({ data }) => setWallet(data)),
      client
        .get("/withdrawals/banks")
        .then(({ data }) => setBanks(data))
        .catch(() => setBanks([])),
      client
        .get("/withdrawals/account")
        .then(({ data }) => setAccount(data))
        .catch(() => setAccount(null)),
      client
        .get("/withdrawals/mine")
        .then(({ data }) => setWithdrawals(data))
        .catch(() => setWithdrawals([])),
    ]).finally(() => setLoading(false));
  }

  useEffect(() => {
    loadAll();
  }, []);

  async function saveAccount(e) {
    e.preventDefault();
    setAccountError("");
    setAccountSaving(true);
    try {
      const { data } = await client.post("/withdrawals/account", accountForm);
      setAccount(data);
      setAccountForm({ bank_code: "", account_number: "" });
    } catch (err) {
      setAccountError(err.response?.data?.detail || "Could not verify this account.");
    } finally {
      setAccountSaving(false);
    }
  }

  async function requestWithdrawal(e) {
    e.preventDefault();
    setWithdrawError("");
    setWithdrawSuccess("");
    setWithdrawing(true);
    try {
      const { data } = await client.post("/withdrawals", {
        amount_kobo: Math.round(Number(amount) * 100),
      });
      if (data.status === "paid") {
        setWithdrawSuccess(`${formatNaira(data.amount_kobo)} sent to your account.`);
      } else if (data.status === "pending") {
        setWithdrawSuccess("Your withdrawal is processing.");
      } else {
        setWithdrawError(data.failure_reason || "Withdrawal failed.");
      }
      setAmount("");
      loadAll();
    } catch (err) {
      setWithdrawError(err.response?.data?.detail || "Could not process withdrawal.");
    } finally {
      setWithdrawing(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-gray-500">Loading wallet...</p>;
  }

  const availableKobo = wallet ? wallet.available_kobo : 0;

  return (
    <div className="space-y-4">
      <div className="card">
        <p className="text-sm text-gray-500">Available to withdraw</p>
        <p className="mt-1 text-2xl font-semibold text-brand-greenDark">{formatNaira(availableKobo)}</p>
      </div>

      <div className="card">
        <h3 className="font-semibold text-brand-charcoal">Withdrawal account</h3>
        {account ? (
          <div className="mt-2 text-sm text-gray-600">
            <p>{account.bank_name} — {account.account_number}</p>
            <p className="mt-1 text-xs text-gray-500">Registered name: {account.account_name}</p>
          </div>
        ) : (
          <p className="mt-2 text-sm text-gray-500">No verified withdrawal account yet.</p>
        )}

        <form onSubmit={saveAccount} className="mt-4 space-y-2 border-t border-brand-border pt-4">
          <div>
            <label className="label">Bank</label>
            <select
              required
              className="input-field"
              value={accountForm.bank_code}
              onChange={(e) => setAccountForm({ ...accountForm, bank_code: e.target.value })}
            >
              <option value="">Select your bank...</option>
              {banks.map((b) => (
                <option key={b.code} value={b.code}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Account number</label>
            <input
              required
              className="input-field"
              value={accountForm.account_number}
              onChange={(e) => setAccountForm({ ...accountForm, account_number: e.target.value })}
            />
          </div>
          {accountError && <p className="text-xs text-red-600">{accountError}</p>}
          <p className="text-xs text-gray-500">
            The account must be registered to {user?.full_name} — we verify this with your bank
            before saving it.
          </p>
          <button type="submit" disabled={accountSaving} className="btn-secondary">
            {accountSaving ? "Verifying..." : account ? "Update account" : "Verify account"}
          </button>
        </form>
      </div>

      <div className="card">
        <h3 className="font-semibold text-brand-charcoal">Withdraw funds</h3>
        <form onSubmit={requestWithdrawal} className="mt-2 flex gap-2">
          <input
            type="number"
            min="500"
            step="0.01"
            required
            placeholder="Amount (₦)"
            className="input-field"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            disabled={!account}
          />
          <button type="submit" disabled={withdrawing || !account} className="btn-primary shrink-0">
            {withdrawing ? "Sending..." : "Withdraw"}
          </button>
        </form>
        {!account && (
          <p className="mt-2 text-xs text-gray-500">Add a verified account above first.</p>
        )}
        {withdrawError && <p className="mt-2 text-xs text-red-600">{withdrawError}</p>}
        {withdrawSuccess && <p className="mt-2 text-xs text-brand-greenDark">{withdrawSuccess}</p>}
      </div>

      <div className="card">
        <h3 className="font-semibold text-brand-charcoal">Withdrawal history</h3>
        <div className="mt-2 space-y-2">
          {withdrawals.map((w) => (
            <div
              key={w.id}
              className="flex items-center justify-between rounded-md border border-brand-border p-2 text-sm"
            >
              <span>
                {formatNaira(w.amount_kobo)} · {new Date(w.created_at).toLocaleDateString()}
              </span>
              <span className={STATUS_STYLES[w.status] || "text-gray-500"}>
                {w.status === "failed" && w.failure_reason ? w.failure_reason : w.status}
              </span>
            </div>
          ))}
          {withdrawals.length === 0 && <p className="text-sm text-gray-500">No withdrawals yet.</p>}
        </div>
      </div>
    </div>
  );
}
