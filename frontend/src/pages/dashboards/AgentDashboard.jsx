import { useEffect, useState } from "react";
import client from "../../api/client.js";
import { useAuth } from "../../auth/AuthContext.jsx";
import QrScanner from "../../components/QrScanner.jsx";

function formatNaira(kobo) {
  return `₦${(kobo / 100).toLocaleString()}`;
}

export default function AgentDashboard() {
  const { user } = useAuth();
  const [concerts, setConcerts] = useState([]);
  const [celebrities, setCelebrities] = useState([]);
  const [form, setForm] = useState({ title: "", venue: "", event_date: "", description: "" });
  const [linkSelections, setLinkSelections] = useState({});
  const [error, setError] = useState("");

  const [selectedConcertId, setSelectedConcertId] = useState(null);
  const [categories, setCategories] = useState([]);
  const [referrals, setReferrals] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [categoryForm, setCategoryForm] = useState({
    name: "",
    is_free: false,
    price_naira: "",
    quantity_total: "",
    sales_start: "",
    sales_end: "",
  });
  const [inviteForm, setInviteForm] = useState({ celebrity_id: "", commission_percent: "" });
  const [showScanner, setShowScanner] = useState(false);
  const [manualToken, setManualToken] = useState("");
  const [checkinResult, setCheckinResult] = useState(null);
  const [checkinError, setCheckinError] = useState("");

  async function loadAll() {
    const { data } = await client.get("/concerts");
    setConcerts(data.filter((c) => c.agent_id === user.id));
    const { data: allCelebrities } = await client.get("/celebrities");
    setCelebrities(allCelebrities);
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function createConcert(e) {
    e.preventDefault();
    setError("");
    try {
      await client.post("/concerts", form);
      setForm({ title: "", venue: "", event_date: "", description: "" });
      loadAll();
    } catch (err) {
      setError(err.response?.data?.detail || "Could not create concert.");
    }
  }

  async function linkCelebrity(concertId) {
    const celebrityId = linkSelections[concertId];
    if (!celebrityId) return;
    await client.post(`/concerts/${concertId}/celebrities/${celebrityId}`);
    loadAll();
  }

  async function loadTicketing(concertId) {
    const { data: cats } = await client.get(`/tickets/concerts/${concertId}/categories`);
    setCategories(cats);
    const { data: refs } = await client.get("/tickets/referrals/mine");
    setReferrals(refs.filter((r) => r.concert_id === concertId));
    const { data: stats } = await client.get(`/tickets/concerts/${concertId}/analytics`);
    setAnalytics(stats);
  }

  function selectConcert(concertId) {
    setSelectedConcertId(concertId);
    setCheckinResult(null);
    setCheckinError("");
    setShowScanner(false);
    loadTicketing(concertId);
  }

  async function createCategory(e) {
    e.preventDefault();
    setError("");
    try {
      await client.post(`/tickets/concerts/${selectedConcertId}/categories`, {
        name: categoryForm.name,
        is_free: categoryForm.is_free,
        price_kobo: categoryForm.is_free ? 0 : Math.round(Number(categoryForm.price_naira) * 100),
        quantity_total: Number(categoryForm.quantity_total),
        sales_start: categoryForm.sales_start,
        sales_end: categoryForm.sales_end,
      });
      setCategoryForm({ name: "", is_free: false, price_naira: "", quantity_total: "", sales_start: "", sales_end: "" });
      loadTicketing(selectedConcertId);
    } catch (err) {
      setError(err.response?.data?.detail || "Could not create ticket category.");
    }
  }

  async function inviteCelebrity(e) {
    e.preventDefault();
    setError("");
    try {
      await client.post(`/tickets/concerts/${selectedConcertId}/referrals`, {
        celebrity_id: Number(inviteForm.celebrity_id),
        commission_percent: Number(inviteForm.commission_percent),
      });
      setInviteForm({ celebrity_id: "", commission_percent: "" });
      loadTicketing(selectedConcertId);
    } catch (err) {
      setError(err.response?.data?.detail || "Could not send invite.");
    }
  }

  async function handleScan(token) {
    setCheckinError("");
    setCheckinResult(null);
    try {
      const { data } = await client.post(`/tickets/checkin/${token}`);
      setCheckinResult(data);
    } catch (err) {
      setCheckinError(err.response?.data?.detail || "Check-in failed.");
    }
  }

  async function handleManualCheckin(e) {
    e.preventDefault();
    if (!manualToken) return;
    await handleScan(manualToken);
    setManualToken("");
  }

  const selectedConcert = concerts.find((c) => c.id === selectedConcertId);

  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      <h1 className="text-2xl font-semibold text-brand-charcoal">Agent dashboard</h1>
      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      <section className="mt-8">
        <h2 className="text-lg font-semibold text-brand-charcoal">Create a concert</h2>
        <form onSubmit={createConcert} className="card mt-3 space-y-3">
          <div>
            <label className="label">Title</label>
            <input
              required
              className="input-field"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Venue</label>
            <input
              required
              className="input-field"
              value={form.venue}
              onChange={(e) => setForm({ ...form, venue: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Event date</label>
            <input
              type="datetime-local"
              required
              className="input-field"
              value={form.event_date}
              onChange={(e) => setForm({ ...form, event_date: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Description</label>
            <textarea
              className="input-field"
              rows={3}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
          <button type="submit" className="btn-primary">Create concert</button>
        </form>
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold text-brand-charcoal">My concerts</h2>
        <div className="mt-3 space-y-4">
          {concerts.map((c) => (
            <div key={c.id} className="card">
              <h3 className="font-semibold text-brand-charcoal">{c.title}</h3>
              <p className="text-sm text-gray-500">
                {c.venue} · {new Date(c.event_date).toLocaleString()}
              </p>
              {c.celebrities.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {c.celebrities.map((celeb) => (
                    <span
                      key={celeb.id}
                      className="rounded-full bg-brand-greenLight px-2 py-0.5 text-xs font-medium text-brand-greenDark"
                    >
                      {celeb.stage_name}
                    </span>
                  ))}
                </div>
              )}
              <div className="mt-3 flex gap-2">
                <select
                  className="input-field"
                  value={linkSelections[c.id] || ""}
                  onChange={(e) => setLinkSelections({ ...linkSelections, [c.id]: e.target.value })}
                >
                  <option value="">Link a celebrity...</option>
                  {celebrities.map((celeb) => (
                    <option key={celeb.id} value={celeb.id}>
                      {celeb.stage_name}
                    </option>
                  ))}
                </select>
                <button className="btn-secondary" onClick={() => linkCelebrity(c.id)}>
                  Link
                </button>
              </div>
              <button
                className={selectedConcertId === c.id ? "btn-primary mt-3" : "btn-secondary mt-3"}
                onClick={() => selectConcert(c.id)}
              >
                {selectedConcertId === c.id ? "Managing tickets" : "Manage tickets"}
              </button>
            </div>
          ))}
          {concerts.length === 0 && <p className="text-sm text-gray-500">No concerts yet.</p>}
        </div>
      </section>

      {selectedConcertId && (
        <section className="mt-10">
          <h2 className="text-lg font-semibold text-brand-charcoal">
            Ticketing — {selectedConcert?.title}
          </h2>

          <div className="card mt-3">
            <h3 className="font-semibold text-brand-charcoal">Ticket categories</h3>
            <div className="mt-2 space-y-2">
              {categories.map((cat) => (
                <div key={cat.id} className="flex items-center justify-between rounded-md border border-brand-border p-2 text-sm">
                  <span>{cat.name}</span>
                  <span className="text-gray-500">
                    {cat.is_free ? "Free" : formatNaira(cat.price_kobo)} · {cat.quantity_sold}/{cat.quantity_total} sold
                  </span>
                </div>
              ))}
              {categories.length === 0 && <p className="text-sm text-gray-500">No categories yet.</p>}
            </div>

            <form onSubmit={createCategory} className="mt-4 space-y-2 border-t border-brand-border pt-4">
              <div>
                <label className="label">Category name</label>
                <input
                  required
                  className="input-field"
                  value={categoryForm.name}
                  onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={categoryForm.is_free}
                  onChange={(e) => setCategoryForm({ ...categoryForm, is_free: e.target.checked })}
                />
                Free ticket
              </label>
              {!categoryForm.is_free && (
                <div>
                  <label className="label">Price (₦)</label>
                  <input
                    type="number"
                    min="0"
                    required
                    className="input-field"
                    value={categoryForm.price_naira}
                    onChange={(e) => setCategoryForm({ ...categoryForm, price_naira: e.target.value })}
                  />
                </div>
              )}
              <div>
                <label className="label">Quantity available</label>
                <input
                  type="number"
                  min="1"
                  required
                  className="input-field"
                  value={categoryForm.quantity_total}
                  onChange={(e) => setCategoryForm({ ...categoryForm, quantity_total: e.target.value })}
                />
              </div>
              <div>
                <label className="label">Sales start</label>
                <input
                  type="datetime-local"
                  required
                  className="input-field"
                  value={categoryForm.sales_start}
                  onChange={(e) => setCategoryForm({ ...categoryForm, sales_start: e.target.value })}
                />
              </div>
              <div>
                <label className="label">Sales end</label>
                <input
                  type="datetime-local"
                  required
                  className="input-field"
                  value={categoryForm.sales_end}
                  onChange={(e) => setCategoryForm({ ...categoryForm, sales_end: e.target.value })}
                />
              </div>
              <button type="submit" className="btn-primary">Add category</button>
            </form>
          </div>

          <div className="card mt-4">
            <h3 className="font-semibold text-brand-charcoal">Invite a Star to sell tickets</h3>
            <div className="mt-2 space-y-2">
              {referrals.map((r) => (
                <div key={r.id} className="flex items-center justify-between rounded-md border border-brand-border p-2 text-sm">
                  <span>Referral #{r.id} — {r.commission_percent}% commission</span>
                  <span className="text-gray-500">{r.status}</span>
                </div>
              ))}
            </div>
            <form onSubmit={inviteCelebrity} className="mt-4 space-y-2 border-t border-brand-border pt-4">
              <div>
                <label className="label">Celebrity</label>
                <select
                  required
                  className="input-field"
                  value={inviteForm.celebrity_id}
                  onChange={(e) => setInviteForm({ ...inviteForm, celebrity_id: e.target.value })}
                >
                  <option value="">Select...</option>
                  {(selectedConcert?.celebrities || []).map((celeb) => (
                    <option key={celeb.id} value={celeb.id}>
                      {celeb.stage_name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Commission %</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  required
                  className="input-field"
                  value={inviteForm.commission_percent}
                  onChange={(e) => setInviteForm({ ...inviteForm, commission_percent: e.target.value })}
                />
              </div>
              <button type="submit" className="btn-primary">Send invite</button>
            </form>
          </div>

          {analytics && (
            <div className="card mt-4">
              <h3 className="font-semibold text-brand-charcoal">Sales analytics</h3>
              <p className="mt-1 text-sm text-gray-600">
                {analytics.total_tickets_sold} tickets sold · {formatNaira(analytics.total_revenue_kobo)} revenue
              </p>
              <div className="mt-3 space-y-2">
                {analytics.breakdown.map((b) => (
                  <div key={b.referral_link_id ?? "direct"} className="flex items-center justify-between rounded-md border border-brand-border p-2 text-sm">
                    <span>{b.seller_label}</span>
                    <span className="text-gray-500">
                      {b.tickets_sold} sold · {formatNaira(b.revenue_kobo)}
                      {b.commission_kobo > 0 && ` · ${formatNaira(b.commission_kobo)} commission`}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="card mt-4">
            <h3 className="font-semibold text-brand-charcoal">Check-in</h3>
            {checkinError && <p className="mt-2 text-sm text-red-600">{checkinError}</p>}
            {checkinResult && (
              <p className="mt-2 text-sm text-brand-greenDark">
                Checked in: {checkinResult.recipient_name || "Guest"} ({checkinResult.status})
              </p>
            )}

            <button className="btn-secondary mt-3" onClick={() => setShowScanner((s) => !s)}>
              {showScanner ? "Stop camera" : "Scan with camera"}
            </button>
            {showScanner && (
              <div className="mt-3">
                <QrScanner onScan={handleScan} />
              </div>
            )}

            <form onSubmit={handleManualCheckin} className="mt-4 flex gap-2 border-t border-brand-border pt-4">
              <input
                className="input-field"
                placeholder="Paste ticket code..."
                value={manualToken}
                onChange={(e) => setManualToken(e.target.value)}
              />
              <button type="submit" className="btn-primary">Check in</button>
            </form>
          </div>
        </section>
      )}
    </div>
  );
}
