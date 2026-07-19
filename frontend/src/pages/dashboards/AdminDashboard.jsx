import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import client from "../../api/client.js";

const TICKET_STATUS_STYLES = {
  pending_payment: "bg-yellow-100 text-yellow-800",
  valid: "bg-brand-greenLight text-brand-greenDark",
  checked_in: "bg-blue-100 text-blue-700",
  cancelled: "bg-red-100 text-red-700",
};

function formatNaira(kobo) {
  return `₦${(kobo / 100).toLocaleString()}`;
}

export default function AdminDashboard() {
  const [statusFilter, setStatusFilter] = useState("pending");
  const [celebrities, setCelebrities] = useState([]);
  const [rejectForms, setRejectForms] = useState({});
  const [rejectOpenFor, setRejectOpenFor] = useState(null);

  const [admins, setAdmins] = useState([]);
  const [newAdminEmail, setNewAdminEmail] = useState("");
  const [adminError, setAdminError] = useState("");

  const [analytics, setAnalytics] = useState(null);
  const [tickets, setTickets] = useState([]);

  function loadCelebrities() {
    client.get(`/admin/celebrities?status=${statusFilter}`).then(({ data }) => setCelebrities(data));
  }

  function loadAdmins() {
    client.get("/admin/admins").then(({ data }) => setAdmins(data));
  }

  function loadAnalytics() {
    client.get("/admin/analytics").then(({ data }) => setAnalytics(data));
  }

  useEffect(() => {
    loadCelebrities();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  useEffect(() => {
    loadAdmins();
    loadAnalytics();
    client.get("/tickets/my").then(({ data }) => setTickets(data));
  }, []);

  async function approve(id) {
    await client.post(`/admin/celebrities/${id}/approve`);
    loadCelebrities();
  }

  async function reject(id) {
    const reason = rejectForms[id] || "";
    await client.post(`/admin/celebrities/${id}/reject`, { reason });
    setRejectOpenFor(null);
    setRejectForms({ ...rejectForms, [id]: "" });
    loadCelebrities();
  }

  async function addAdmin(e) {
    e.preventDefault();
    setAdminError("");
    try {
      await client.post("/admin/admins", { email: newAdminEmail });
      setNewAdminEmail("");
      loadAdmins();
    } catch (err) {
      setAdminError(err.response?.data?.detail || "Could not add admin.");
    }
  }

  async function removeAdmin(id) {
    setAdminError("");
    try {
      await client.delete(`/admin/admins/${id}`);
      loadAdmins();
    } catch (err) {
      setAdminError(err.response?.data?.detail || "Could not remove admin.");
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      <h1 className="text-2xl font-semibold text-brand-charcoal">Admin dashboard</h1>

      <section className="mt-8">
        <h2 className="text-lg font-semibold text-brand-charcoal">Celebrity approvals</h2>
        <div className="mt-3 flex gap-2">
          {["pending", "approved", "rejected", "all"].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`rounded-full px-3 py-1 text-xs font-medium capitalize ${
                statusFilter === s
                  ? "bg-brand-greenLight text-brand-greenDark"
                  : "bg-brand-gray text-gray-500"
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        <div className="mt-4 space-y-3">
          {celebrities.map((c) => (
            <div key={c.id} className="card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-brand-charcoal">{c.stage_name}</p>
                  <p className="text-sm text-gray-500">
                    {c.owner_full_name} · {c.owner_email} · {c.category || "No category"}
                  </p>
                  {c.bio && <p className="mt-1 text-sm text-gray-600">{c.bio}</p>}
                  <p className="mt-1 text-xs text-gray-400">
                    {new Date(c.created_at).toLocaleDateString()} · {c.verification_status}
                    {c.verification_status === "rejected" && c.rejection_reason && ` — ${c.rejection_reason}`}
                  </p>
                </div>
                {c.verification_status === "pending" && (
                  <div className="flex shrink-0 gap-2">
                    <button className="btn-primary" onClick={() => approve(c.id)}>
                      Approve
                    </button>
                    <button className="btn-secondary" onClick={() => setRejectOpenFor(c.id)}>
                      Reject
                    </button>
                  </div>
                )}
              </div>
              {rejectOpenFor === c.id && (
                <div className="mt-3 flex gap-2 border-t border-brand-border pt-3">
                  <input
                    className="input-field"
                    placeholder="Reason (optional)"
                    value={rejectForms[c.id] || ""}
                    onChange={(e) => setRejectForms({ ...rejectForms, [c.id]: e.target.value })}
                  />
                  <button className="btn-primary shrink-0" onClick={() => reject(c.id)}>
                    Confirm reject
                  </button>
                </div>
              )}
            </div>
          ))}
          {celebrities.length === 0 && <p className="mt-3 text-sm text-gray-500">Nothing here.</p>}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold text-brand-charcoal">Admins</h2>
        <form onSubmit={addAdmin} className="mt-3 flex gap-2">
          <input
            type="email"
            required
            placeholder="Promote by email..."
            className="input-field"
            value={newAdminEmail}
            onChange={(e) => setNewAdminEmail(e.target.value)}
          />
          <button type="submit" className="btn-primary shrink-0">Add admin</button>
        </form>
        {adminError && <p className="mt-1 text-xs text-red-600">{adminError}</p>}
        <div className="mt-3 space-y-2">
          {admins.map((a) => (
            <div key={a.id} className="card flex items-center justify-between">
              <div>
                <p className="font-medium text-brand-charcoal">{a.full_name}</p>
                <p className="text-sm text-gray-500">{a.email}</p>
              </div>
              <button className="btn-secondary" onClick={() => removeAdmin(a.id)}>
                Remove
              </button>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold text-brand-charcoal">Platform analytics</h2>
        {analytics && (
          <>
            <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="card">
                <p className="text-sm text-gray-500">Ticket revenue</p>
                <p className="mt-1 text-2xl font-semibold text-brand-greenDark">
                  {formatNaira(analytics.total_ticket_revenue_kobo)}
                </p>
                <p className="text-xs text-gray-400">{analytics.total_ticket_orders} paid orders</p>
              </div>
              <div className="card">
                <p className="text-sm text-gray-500">Marketplace revenue</p>
                <p className="mt-1 text-2xl font-semibold text-brand-greenDark">
                  {formatNaira(analytics.total_marketplace_revenue_kobo)}
                </p>
                <p className="text-xs text-gray-400">{analytics.total_marketplace_orders} paid orders</p>
              </div>
            </div>

            <div className="mt-4">
              <h3 className="text-sm font-semibold text-brand-charcoal">By concert</h3>
              <div className="mt-2 space-y-2">
                {analytics.concert_breakdown.map((c) => (
                  <div key={c.concert_id} className="card flex items-center justify-between">
                    <p className="text-sm text-brand-charcoal">{c.title}</p>
                    <p className="text-sm text-gray-500">
                      {c.tickets_sold} tickets · {formatNaira(c.revenue_kobo)}
                    </p>
                  </div>
                ))}
                {analytics.concert_breakdown.length === 0 && (
                  <p className="text-sm text-gray-500">No ticket sales yet.</p>
                )}
              </div>
            </div>

            <div className="mt-4">
              <h3 className="text-sm font-semibold text-brand-charcoal">By celebrity (marketplace)</h3>
              <div className="mt-2 space-y-2">
                {analytics.marketplace_breakdown.map((c) => (
                  <div key={c.celebrity_id} className="card flex items-center justify-between">
                    <p className="text-sm text-brand-charcoal">{c.stage_name}</p>
                    <p className="text-sm text-gray-500">
                      {c.items_sold} sold · {formatNaira(c.revenue_kobo)}
                    </p>
                  </div>
                ))}
                {analytics.marketplace_breakdown.length === 0 && (
                  <p className="text-sm text-gray-500">No marketplace sales yet.</p>
                )}
              </div>
            </div>
          </>
        )}
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold text-brand-charcoal">My ticket vault</h2>
        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {tickets.map((t) => (
            <div key={t.id} className="card flex items-center gap-4">
              <QRCodeSVG value={t.qr_token} size={80} />
              <div>
                <p className="font-medium text-brand-charcoal">{t.recipient_name || "You"}</p>
                <span
                  className={`mt-1 inline-block rounded-full px-3 py-1 text-xs font-medium ${TICKET_STATUS_STYLES[t.status]}`}
                >
                  {t.status.replace("_", " ")}
                </span>
              </div>
            </div>
          ))}
          {tickets.length === 0 && <p className="text-sm text-gray-500">No tickets yet.</p>}
        </div>
      </section>
    </div>
  );
}
