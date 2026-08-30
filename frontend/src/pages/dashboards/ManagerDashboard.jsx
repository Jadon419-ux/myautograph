import { useEffect, useState } from "react";
import client from "../../api/client.js";
import ShareProfileLink from "../../components/ShareProfileLink.jsx";
import PasswordField from "../../components/PasswordField.jsx";
import QrScanner from "../../components/QrScanner.jsx";
import WithdrawalPanel from "../../components/WithdrawalPanel.jsx";
import { toUtcIso } from "../../utils/datetime.js";

function formatNaira(kobo) {
  return `₦${(kobo / 100).toLocaleString()}`;
}

export default function ManagerDashboard() {
  const [roster, setRoster] = useState([]);
  const [form, setForm] = useState({
    email: "",
    phone_number: "",
    password: "",
    full_name: "",
    stage_name: "",
    category: "",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [concerts, setConcerts] = useState([]);
  const [ticketForm, setTicketForm] = useState({
    title: "",
    venue: "",
    event_date: "",
    description: "",
    celebrity_id: "",
    agent_commission_percent: "10",
  });
  const [ticketError, setTicketError] = useState("");

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
  const [agentInviteForm, setAgentInviteForm] = useState({ email: "" });
  const [showScanner, setShowScanner] = useState(false);
  const [manualToken, setManualToken] = useState("");
  const [checkinResult, setCheckinResult] = useState(null);
  const [checkinError, setCheckinError] = useState("");

  async function loadRoster() {
    const { data } = await client.get("/managers/roster");
    setRoster(data);
  }

  async function loadConcerts() {
    const { data } = await client.get("/concerts");
    const { data: myRoster } = await client.get("/managers/roster");
    const rosterIds = new Set(myRoster.map((c) => c.id));
    setConcerts(data.filter((c) => c.celebrities.some((celeb) => rosterIds.has(celeb.id))));
  }

  useEffect(() => {
    loadRoster();
    loadConcerts();
  }, []);

  async function onboardCelebrity(e) {
    e.preventDefault();
    setError("");
    setSuccess("");
    try {
      await client.post("/managers/roster", form);
      setForm({ email: "", phone_number: "", password: "", full_name: "", stage_name: "", category: "" });
      setSuccess("Celebrity onboarded successfully.");
      loadRoster();
    } catch (err) {
      setError(err.response?.data?.detail || "Could not onboard celebrity.");
    }
  }

  async function createTicket(e) {
    e.preventDefault();
    setTicketError("");
    try {
      await client.post("/concerts", {
        title: ticketForm.title,
        venue: ticketForm.venue,
        event_date: toUtcIso(ticketForm.event_date),
        description: ticketForm.description,
        celebrity_id: Number(ticketForm.celebrity_id),
        agent_commission_percent: Number(ticketForm.agent_commission_percent || 0),
      });
      setTicketForm({
        title: "",
        venue: "",
        event_date: "",
        description: "",
        celebrity_id: "",
        agent_commission_percent: "10",
      });
      loadConcerts();
    } catch (err) {
      setTicketError(err.response?.data?.detail || "Could not create ticket.");
    }
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
    setTicketError("");
    try {
      await client.post(`/tickets/concerts/${selectedConcertId}/categories`, {
        name: categoryForm.name,
        is_free: categoryForm.is_free,
        price_kobo: categoryForm.is_free ? 0 : Math.round(Number(categoryForm.price_naira) * 100),
        quantity_total: Number(categoryForm.quantity_total),
        sales_start: toUtcIso(categoryForm.sales_start),
        sales_end: toUtcIso(categoryForm.sales_end),
      });
      setCategoryForm({ name: "", is_free: false, price_naira: "", quantity_total: "", sales_start: "", sales_end: "" });
      loadTicketing(selectedConcertId);
    } catch (err) {
      setTicketError(err.response?.data?.detail || "Could not create ticket category.");
    }
  }

  async function inviteAgent(e) {
    e.preventDefault();
    setTicketError("");
    try {
      await client.post(`/tickets/concerts/${selectedConcertId}/referrals/agents`, {
        email: agentInviteForm.email,
      });
      setAgentInviteForm({ email: "" });
      loadTicketing(selectedConcertId);
    } catch (err) {
      setTicketError(err.response?.data?.detail || "Could not send invite.");
    }
  }

  function extractTicketToken(raw) {
    const trimmed = (raw || "").trim();
    const match = trimmed.match(/\/tickets\/verify\/([^/?#]+)/);
    return match ? match[1] : trimmed;
  }

  async function handleScan(rawToken) {
    setCheckinError("");
    setCheckinResult(null);
    try {
      const token = extractTicketToken(rawToken);
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
      <h1 className="text-2xl font-semibold text-brand-charcoal">Manager dashboard</h1>

      <section className="mt-8">
        <h2 className="text-lg font-semibold text-brand-charcoal">Wallet & withdrawals</h2>
        <div className="mt-3">
          <WithdrawalPanel />
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold text-brand-charcoal">My roster</h2>
        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {roster.map((c) => (
            <div key={c.id} className="card">
              <h3 className="font-semibold text-brand-charcoal">{c.stage_name}</h3>
              {c.category && <p className="text-sm text-gray-500">{c.category}</p>}
              <div className="mt-3 border-t border-brand-border pt-3">
                <p className="text-xs text-gray-500">Share their autograph page</p>
                <div className="mt-2">
                  <ShareProfileLink celebrityId={c.id} />
                </div>
              </div>
            </div>
          ))}
        </div>
        {roster.length === 0 && <p className="mt-3 text-sm text-gray-500">No celebrities onboarded yet.</p>}
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold text-brand-charcoal">Onboard a new celebrity</h2>
        <form onSubmit={onboardCelebrity} className="card mt-3 space-y-3">
          {error && <p className="text-sm text-red-600">{error}</p>}
          {success && <p className="text-sm text-brand-greenDark">{success}</p>}

          <div>
            <label className="label">Full name</label>
            <input
              required
              className="input-field"
              value={form.full_name}
              onChange={(e) => setForm({ ...form, full_name: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Stage name</label>
            <input
              required
              className="input-field"
              value={form.stage_name}
              onChange={(e) => setForm({ ...form, stage_name: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Category</label>
            <input
              placeholder="Music, Film, Sports..."
              className="input-field"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Email</label>
            <input
              type="email"
              required
              className="input-field"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Phone number</label>
            <input
              type="tel"
              required
              placeholder="+234..."
              className="input-field"
              value={form.phone_number}
              onChange={(e) => setForm({ ...form, phone_number: e.target.value })}
            />
          </div>
          <PasswordField
            id="manager_onboard_password"
            label="Temporary password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />
          <button type="submit" className="btn-primary">Onboard celebrity</button>
        </form>
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold text-brand-charcoal">Create a ticket</h2>
        <p className="mt-1 text-sm text-gray-500">
          Set up a ticketed event for one of your celebrities and, optionally, invite agents to help sell.
        </p>
        <form onSubmit={createTicket} className="card mt-3 space-y-3">
          {ticketError && <p className="text-sm text-red-600">{ticketError}</p>}
          <div>
            <label className="label">Star</label>
            <select
              required
              className="input-field"
              value={ticketForm.celebrity_id}
              onChange={(e) => setTicketForm({ ...ticketForm, celebrity_id: e.target.value })}
            >
              <option value="">Select a celebrity from your roster...</option>
              {roster.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.stage_name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Title</label>
            <input
              required
              className="input-field"
              value={ticketForm.title}
              onChange={(e) => setTicketForm({ ...ticketForm, title: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Venue</label>
            <input
              required
              className="input-field"
              value={ticketForm.venue}
              onChange={(e) => setTicketForm({ ...ticketForm, venue: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Event date</label>
            <input
              type="datetime-local"
              required
              className="input-field"
              value={ticketForm.event_date}
              onChange={(e) => setTicketForm({ ...ticketForm, event_date: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Description</label>
            <textarea
              className="input-field"
              rows={3}
              value={ticketForm.description}
              onChange={(e) => setTicketForm({ ...ticketForm, description: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Agent commission % (of ticket price, on referred sales)</label>
            <input
              type="number"
              min="0"
              max="93"
              step="0.1"
              required
              className="input-field"
              value={ticketForm.agent_commission_percent}
              onChange={(e) => setTicketForm({ ...ticketForm, agent_commission_percent: e.target.value })}
            />
            <p className="mt-1 text-xs text-gray-500">
              The platform keeps a fixed 7% of referred sales; this is what agents earn from the rest.
            </p>
          </div>
          <button type="submit" className="btn-primary">Create ticket</button>
        </form>
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold text-brand-charcoal">My tickets</h2>
        <div className="mt-3 space-y-4">
          {concerts.map((c) => (
            <div key={c.id} className="card">
              <h3 className="font-semibold text-brand-charcoal">{c.title}</h3>
              <p className="text-sm text-gray-500">
                {c.venue} · {new Date(c.event_date).toLocaleString()}
              </p>
              <p className="mt-1 text-xs text-gray-500">
                Agent commission: {c.agent_commission_percent}%
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
              <button
                className={selectedConcertId === c.id ? "btn-primary mt-3" : "btn-secondary mt-3"}
                onClick={() => selectConcert(c.id)}
              >
                {selectedConcertId === c.id ? "Managing tickets" : "Manage tickets"}
              </button>
            </div>
          ))}
          {concerts.length === 0 && <p className="text-sm text-gray-500">No tickets created yet.</p>}
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
            <h3 className="font-semibold text-brand-charcoal">Invite an agent to sell tickets</h3>
            <p className="mt-1 text-sm text-gray-500">
              Buyers pay the listed ticket price — no markup. When an agent sells via their link,
              they automatically earn {selectedConcert?.agent_commission_percent ?? 0}% of the
              ticket price to their wallet; the platform keeps a fixed 7%.
            </p>
            <div className="mt-2 space-y-2">
              {referrals.map((r) => (
                <div key={r.id} className="flex items-center justify-between rounded-md border border-brand-border p-2 text-sm">
                  <span>Referral #{r.id} — {r.commission_percent}% commission</span>
                  <span className="text-gray-500">{r.status}</span>
                </div>
              ))}
            </div>
            <form onSubmit={inviteAgent} className="mt-4 space-y-2 border-t border-brand-border pt-4">
              <div>
                <label className="label">Agent email</label>
                <input
                  type="email"
                  required
                  className="input-field"
                  value={agentInviteForm.email}
                  onChange={(e) => setAgentInviteForm({ ...agentInviteForm, email: e.target.value })}
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
              <div className="mt-2 flex items-center gap-3 rounded-md border border-brand-border p-3">
                {checkinResult.holder_avatar_url && (
                  <img
                    src={checkinResult.holder_avatar_url}
                    alt=""
                    className="h-12 w-12 rounded-full object-cover"
                  />
                )}
                <div className="text-sm">
                  <p className="font-medium text-brand-charcoal">
                    Checked in: {checkinResult.recipient_name || "Guest"} ({checkinResult.status})
                  </p>
                  <p className="text-gray-500">
                    {checkinResult.ticket_number} · {checkinResult.category_name} ·{" "}
                    {checkinResult.concert_title}
                  </p>
                </div>
              </div>
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
