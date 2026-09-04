import { useState } from "react";
import { Link } from "react-router-dom";
import client from "../api/client.js";
import { useAuth } from "../auth/AuthContext.jsx";

function formatNaira(kobo) {
  return `₦${(kobo / 100).toLocaleString()}`;
}

const TICKET_STATUS_STYLES = {
  pending_payment: "bg-yellow-100 text-yellow-800",
  valid: "bg-brand-greenLight text-brand-greenDark",
  checked_in: "bg-blue-100 text-blue-700",
  cancelled: "bg-red-100 text-red-700",
};

const ACCOUNT_TYPE_LABELS = {
  fan: "Fan",
  celebrity: "Celebrity",
  agent: "Agent",
  manager: "Manager",
  admin: "Admin",
  sales_agent: "Sales agent",
};

export default function WalletMenu() {
  const { user, authenticatorInvites, refreshAuthenticatorInvites } = useAuth();
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [wallet, setWallet] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [followerCount, setFollowerCount] = useState(null);
  const [fundAmount, setFundAmount] = useState("");
  const [fundStatus, setFundStatus] = useState("");
  const [authenticatorError, setAuthenticatorError] = useState("");

  const pendingAuthenticatorInvites = authenticatorInvites.filter((a) => a.status === "pending");

  function loadAll() {
    client.get("/wallet/me").then(({ data }) => setWallet(data));
    client.get("/wallet/transactions").then(({ data }) => setTransactions(data));
    client.get("/tickets/my").then(({ data }) => setTickets(data));
    client.get("/social/followers/me").then(({ data }) => setFollowerCount(data.follower_count));
    setLoaded(true);
  }

  function toggle() {
    const next = !open;
    setOpen(next);
    if (next && !loaded) loadAll();
  }

  async function respondToAuthenticatorInvite(id, action) {
    setAuthenticatorError("");
    try {
      await client.post(`/authenticators/${id}/${action}`);
      refreshAuthenticatorInvites();
    } catch (err) {
      setAuthenticatorError(err.response?.data?.detail || "Could not respond to this invite.");
    }
  }

  async function topUp(e) {
    e.preventDefault();
    setFundStatus("");
    try {
      const { data } = await client.post("/wallet/fund", {
        amount_kobo: Math.round(Number(fundAmount || 0) * 100),
      });
      if (data.authorization_url) {
        window.location.href = data.authorization_url;
      }
    } catch (err) {
      setFundStatus(err.response?.data?.detail || "Could not start wallet funding.");
    }
  }

  const topUpHistory = transactions.filter((t) => t.type === "funding");
  const spendings = transactions.filter((t) => t.amount_kobo < 0);

  return (
    <div className="relative">
      <button
        onClick={toggle}
        aria-label="Wallet menu"
        className="relative flex h-9 w-9 items-center justify-center rounded-md border border-brand-border text-brand-charcoal hover:bg-brand-gray"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
          <path strokeLinecap="round" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
        {pendingAuthenticatorInvites.length > 0 && (
          <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full border-2 border-white bg-brand-green" />
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-50 mt-2 max-h-[80vh] w-80 overflow-y-auto rounded-lg border border-brand-border bg-white p-4 shadow-lg">
            <div>
              <h3 className="text-sm font-semibold text-brand-charcoal">About</h3>
              <div className="mt-2 space-y-1 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-gray-500">Name</span>
                  <span className="text-brand-charcoal">{user?.full_name}</span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-gray-500">Phone number</span>
                  <span className="text-brand-charcoal">{user?.phone_number || "—"}</span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-gray-500">Email</span>
                  <span className="truncate text-brand-charcoal">{user?.email}</span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-gray-500">Account type</span>
                  <span className="text-brand-charcoal">
                    {ACCOUNT_TYPE_LABELS[user?.role] || user?.role}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-gray-500">Followers</span>
                  <span className="text-brand-charcoal">{followerCount ?? "—"}</span>
                </div>
              </div>
            </div>

            {authenticatorInvites.length > 0 && (
              <div className="mt-4 border-t border-brand-border pt-3">
                <h3 className="text-sm font-semibold text-brand-charcoal">Ticket authenticator invites</h3>
                {authenticatorError && (
                  <p className="mt-1 text-xs text-red-600">{authenticatorError}</p>
                )}
                <div className="mt-2 space-y-2">
                  {authenticatorInvites.map((a) => (
                    <div key={a.id} className="rounded-md border border-brand-border p-2 text-xs">
                      <p className="text-brand-charcoal">
                        <span className="font-medium">{a.inviter_name}</span> invited you to
                        authenticate tickets for <span className="font-medium">{a.concert_title}</span>
                      </p>
                      {a.status === "pending" && (
                        <div className="mt-2 flex gap-2">
                          <button
                            className="btn-primary flex-1 text-xs"
                            onClick={() => respondToAuthenticatorInvite(a.id, "accept")}
                          >
                            Accept
                          </button>
                          <button
                            className="btn-secondary flex-1 text-xs"
                            onClick={() => respondToAuthenticatorInvite(a.id, "decline")}
                          >
                            Decline
                          </button>
                        </div>
                      )}
                      {a.status === "accepted" && (
                        <Link
                          to={`/authenticate/${a.concert_id}`}
                          onClick={() => setOpen(false)}
                          className="btn-primary mt-2 block text-center text-xs"
                        >
                          Scan tickets
                        </Link>
                      )}
                      {a.status === "declined" && (
                        <p className="mt-1 text-gray-500">Declined</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-4 border-t border-brand-border pt-3">
              <h3 className="text-sm font-semibold text-brand-charcoal">Buy tickets</h3>
              <div className="mt-2 flex gap-2">
                <Link
                  to="/concerts"
                  onClick={() => setOpen(false)}
                  className="btn-secondary flex-1 text-center text-xs"
                >
                  Social events
                </Link>
                <Link
                  to="/transport"
                  onClick={() => setOpen(false)}
                  className="btn-secondary flex-1 text-center text-xs"
                >
                  Transport
                </Link>
              </div>
            </div>

            <div className="mt-4 border-t border-brand-border pt-3">
              <p className="text-sm text-gray-500">Wallet balance</p>
              <p className="mt-1 text-2xl font-semibold text-brand-greenDark">
                {formatNaira(wallet?.balance_kobo ?? 0)}
              </p>
              {wallet && wallet.held_kobo > 0 && (
                <p className="mt-1 text-xs text-gray-500">
                  {formatNaira(wallet.held_kobo)} held · {formatNaira(wallet.available_kobo)} available
                </p>
              )}
            </div>

            <form onSubmit={topUp} className="mt-3 flex gap-2">
              <input
                type="number"
                step="0.01"
                min="100"
                required
                placeholder="Amount (₦)"
                className="input-field"
                value={fundAmount}
                onChange={(e) => setFundAmount(e.target.value)}
              />
              <button type="submit" className="btn-primary shrink-0">Top up</button>
            </form>
            {fundStatus && <p className="mt-1 text-xs text-red-600">{fundStatus}</p>}

            <div className="mt-4 border-t border-brand-border pt-3">
              <h3 className="text-sm font-semibold text-brand-charcoal">Top up history</h3>
              <div className="mt-2 space-y-1">
                {topUpHistory.map((t) => (
                  <div key={t.id} className="flex items-center justify-between text-xs">
                    <span className="text-gray-500">{new Date(t.created_at).toLocaleDateString()}</span>
                    <span className="text-brand-greenDark">+{formatNaira(t.amount_kobo)}</span>
                  </div>
                ))}
                {topUpHistory.length === 0 && <p className="text-xs text-gray-500">No top-ups yet.</p>}
              </div>
            </div>

            <div className="mt-4 border-t border-brand-border pt-3">
              <h3 className="text-sm font-semibold text-brand-charcoal">Wallet spendings</h3>
              <div className="mt-2 space-y-1">
                {spendings.map((t) => (
                  <div key={t.id} className="flex items-center justify-between text-xs">
                    <span className="text-gray-500">
                      {t.description || t.type} · {new Date(t.created_at).toLocaleDateString()}
                    </span>
                    <span className="text-red-600">-{formatNaira(Math.abs(t.amount_kobo))}</span>
                  </div>
                ))}
                {spendings.length === 0 && <p className="text-xs text-gray-500">No spending yet.</p>}
              </div>
            </div>

            <div className="mt-4 border-t border-brand-border pt-3">
              <h3 className="text-sm font-semibold text-brand-charcoal">Ticket vault</h3>
              <div className="mt-2 space-y-2">
                {tickets.map((t) => (
                  <div key={t.id} className="flex items-center justify-between text-xs">
                    <span className="text-brand-charcoal">{t.recipient_name || "You"}</span>
                    <span
                      className={`rounded-full px-2 py-0.5 font-medium ${TICKET_STATUS_STYLES[t.status]}`}
                    >
                      {t.status.replace("_", " ")}
                    </span>
                  </div>
                ))}
                {tickets.length === 0 && <p className="text-xs text-gray-500">No tickets yet.</p>}
              </div>
              <Link
                to="/dashboard"
                onClick={() => setOpen(false)}
                className="mt-2 block text-xs text-brand-green hover:underline"
              >
                View full dashboard →
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
