import { useEffect, useState } from "react";
import client from "../../api/client.js";
import ShareProfileLink from "../../components/ShareProfileLink.jsx";
import PasswordField from "../../components/PasswordField.jsx";
import QrScanner from "../../components/QrScanner.jsx";
import WithdrawalPanel from "../../components/WithdrawalPanel.jsx";
import { toUtcIso } from "../../utils/datetime.js";
import { CLOUDINARY_CONFIGURED, uploadImage } from "../../lib/cloudinary.js";
import { googleMapsSearchUrl } from "../../utils/googleMaps.js";

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
    celebrity_ids: [],
    agent_commission_percent: "10",
    flyer_url: "",
  });
  const [ticketError, setTicketError] = useState("");
  const [flyerUploading, setFlyerUploading] = useState(false);

  const [selectedConcertId, setSelectedConcertId] = useState(null);
  const [categories, setCategories] = useState([]);
  const [referrals, setReferrals] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [categoryForm, setCategoryForm] = useState({
    name: "",
    description: "",
    flyer_url: "",
    is_free: false,
    price_naira: "",
    quantity_total: "",
    sales_start: "",
    sales_end: "",
  });
  const [categoryFlyerUploading, setCategoryFlyerUploading] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [manualToken, setManualToken] = useState("");
  const [checkinResult, setCheckinResult] = useState(null);
  const [checkinError, setCheckinError] = useState("");
  const [authenticators, setAuthenticators] = useState([]);
  const [authenticatorEmail, setAuthenticatorEmail] = useState("");
  const [authenticatorError, setAuthenticatorError] = useState("");
  const [invitingAuthenticator, setInvitingAuthenticator] = useState(false);

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

  async function handleFlyerChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    setTicketError("");
    setFlyerUploading(true);
    try {
      const url = await uploadImage(file);
      setTicketForm((f) => ({ ...f, flyer_url: url }));
    } catch (err) {
      setTicketError(err.message || "Could not upload flyer.");
    } finally {
      setFlyerUploading(false);
      e.target.value = "";
    }
  }

  function toggleTicketFormCelebrity(celebrityId) {
    setTicketForm((f) => {
      const id = Number(celebrityId);
      const already = f.celebrity_ids.includes(id);
      return {
        ...f,
        celebrity_ids: already
          ? f.celebrity_ids.filter((existing) => existing !== id)
          : [...f.celebrity_ids, id],
      };
    });
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
        celebrity_ids: ticketForm.celebrity_ids,
        agent_commission_percent: Number(ticketForm.agent_commission_percent || 0),
        flyer_url: ticketForm.flyer_url || null,
      });
      setTicketForm({
        title: "",
        venue: "",
        event_date: "",
        description: "",
        celebrity_ids: [],
        agent_commission_percent: "10",
        flyer_url: "",
      });
      loadConcerts();
    } catch (err) {
      setTicketError(err.response?.data?.detail || "Could not create event.");
    }
  }

  async function loadTicketing(concertId) {
    const { data: cats } = await client.get(`/tickets/concerts/${concertId}/categories`);
    setCategories(cats);
    const { data: refs } = await client.get("/tickets/referrals/mine");
    setReferrals(refs.filter((r) => r.concert_id === concertId));
    const { data: stats } = await client.get(`/tickets/concerts/${concertId}/analytics`);
    setAnalytics(stats);
    const { data: auths } = await client.get("/authenticators/mine");
    setAuthenticators(auths.filter((a) => a.concert_id === concertId));
  }

  async function inviteAuthenticator(e) {
    e.preventDefault();
    setAuthenticatorError("");
    setInvitingAuthenticator(true);
    try {
      await client.post(`/authenticators/concerts/${selectedConcertId}/invite`, {
        email: authenticatorEmail,
      });
      setAuthenticatorEmail("");
      loadTicketing(selectedConcertId);
    } catch (err) {
      setAuthenticatorError(err.response?.data?.detail || "Could not send invite.");
    } finally {
      setInvitingAuthenticator(false);
    }
  }

  function selectConcert(concertId) {
    setSelectedConcertId(concertId);
    setCheckinResult(null);
    setCheckinError("");
    setShowScanner(false);
    loadTicketing(concertId);
  }

  async function handleCategoryFlyerChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    setTicketError("");
    setCategoryFlyerUploading(true);
    try {
      const url = await uploadImage(file);
      setCategoryForm((f) => ({ ...f, flyer_url: url }));
    } catch (err) {
      setTicketError(err.message || "Could not upload ticket image.");
    } finally {
      setCategoryFlyerUploading(false);
      e.target.value = "";
    }
  }

  async function createCategory(e) {
    e.preventDefault();
    setTicketError("");
    try {
      await client.post(`/tickets/concerts/${selectedConcertId}/categories`, {
        name: categoryForm.name,
        description: categoryForm.description,
        flyer_url: categoryForm.flyer_url || null,
        is_free: categoryForm.is_free,
        price_kobo: categoryForm.is_free ? 0 : Math.round(Number(categoryForm.price_naira) * 100),
        quantity_total: Number(categoryForm.quantity_total),
        sales_start: toUtcIso(categoryForm.sales_start),
        sales_end: toUtcIso(categoryForm.sales_end),
      });
      setCategoryForm({
        name: "",
        description: "",
        flyer_url: "",
        is_free: false,
        price_naira: "",
        quantity_total: "",
        sales_start: "",
        sales_end: "",
      });
      loadTicketing(selectedConcertId);
    } catch (err) {
      setTicketError(err.response?.data?.detail || "Could not create ticket type.");
    }
  }

  async function respondToAgentRequest(referralId, action) {
    setTicketError("");
    try {
      await client.post(`/tickets/referrals/${referralId}/${action}`);
      loadTicketing(selectedConcertId);
    } catch (err) {
      setTicketError(err.response?.data?.detail || "Could not respond to this request.");
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
        <h2 className="text-lg font-semibold text-brand-charcoal">Create an event</h2>
        <p className="mt-1 text-sm text-gray-500">
          Set up an event for one or more of your celebrities. Once it's created, add the ticket
          types (VIP, Regular, etc.) that will all live under it.
        </p>
        <form onSubmit={createTicket} className="card mt-3 space-y-3">
          {ticketError && <p className="text-sm text-red-600">{ticketError}</p>}
          <div>
            <label className="label">Event name</label>
            <input
              required
              className="input-field"
              value={ticketForm.title}
              onChange={(e) => setTicketForm({ ...ticketForm, title: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Event promotion picture</label>
            {ticketForm.flyer_url && (
              <img
                src={ticketForm.flyer_url}
                alt="Flyer preview"
                className="mb-2 h-32 w-full rounded-md object-cover"
              />
            )}
            {CLOUDINARY_CONFIGURED ? (
              <label className="btn-secondary inline-block cursor-pointer">
                {flyerUploading ? "Uploading..." : ticketForm.flyer_url ? "Change picture" : "Upload picture"}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFlyerChange}
                  disabled={flyerUploading}
                />
              </label>
            ) : (
              <p className="text-xs text-gray-400">Flyer uploads aren't configured yet.</p>
            )}
            <p className="mt-1 text-xs text-gray-500">
              Shown publicly on the event's page so fans browsing can see it.
            </p>
          </div>
          <div>
            <label className="label">Location</label>
            <input
              required
              placeholder="Venue name, City, State/Province, Country"
              className="input-field"
              value={ticketForm.venue}
              onChange={(e) => setTicketForm({ ...ticketForm, venue: e.target.value })}
            />
            {ticketForm.venue.trim() && (
              <a
                href={googleMapsSearchUrl(ticketForm.venue.trim())}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 inline-block text-xs text-brand-green hover:underline"
              >
                View on Google Maps ↗
              </a>
            )}
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
            <label className="label">Link your invited stars (optional)</label>
            <div className="space-y-1 rounded-md border border-brand-border p-3">
              {roster.map((c) => (
                <label key={c.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={ticketForm.celebrity_ids.includes(c.id)}
                    onChange={() => toggleTicketFormCelebrity(c.id)}
                  />
                  {c.stage_name}
                </label>
              ))}
              {roster.length === 0 && (
                <p className="text-sm text-gray-500">No celebrities onboarded yet.</p>
              )}
            </div>
            <p className="mt-1 text-xs text-gray-500">
              Leave unchecked for events with no specific artist attached, like a movie screening.
            </p>
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
          <button type="submit" className="btn-primary">Create event</button>
        </form>
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold text-brand-charcoal">My events</h2>
        <div className="mt-3 space-y-4">
          {concerts.map((c) => (
            <div key={c.id} className="card">
              <h3 className="font-semibold text-brand-charcoal">{c.title}</h3>
              <p className="text-sm text-gray-500">
                <a
                  href={googleMapsSearchUrl(c.venue)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-brand-green hover:underline"
                >
                  {c.venue}
                </a>{" "}
                · {new Date(c.event_date).toLocaleString()}
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
            <h3 className="font-semibold text-brand-charcoal">Ticket types</h3>
            <div className="mt-2 space-y-2">
              {categories.map((cat) => (
                <div key={cat.id} className="flex items-center gap-3 rounded-md border border-brand-border p-2 text-sm">
                  {cat.flyer_url && (
                    <img src={cat.flyer_url} alt="" className="h-10 w-10 shrink-0 rounded object-cover" />
                  )}
                  <div className="flex-1">
                    <p className="font-medium text-brand-charcoal">{cat.name}</p>
                    {cat.description && <p className="text-xs text-gray-500">{cat.description}</p>}
                  </div>
                  <span className="shrink-0 text-gray-500">
                    {cat.is_free ? "Free" : formatNaira(cat.price_kobo)} · {cat.quantity_sold}/{cat.quantity_total} sold
                  </span>
                </div>
              ))}
              {categories.length === 0 && <p className="text-sm text-gray-500">No ticket types yet.</p>}
            </div>

            <form onSubmit={createCategory} className="mt-4 space-y-2 border-t border-brand-border pt-4">
              <h4 className="text-sm font-semibold text-brand-charcoal">Add a new ticket type</h4>
              <div>
                <label className="label">Ticket title</label>
                <input
                  required
                  className="input-field"
                  value={categoryForm.name}
                  onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                />
              </div>
              <div>
                <label className="label">Ticket image</label>
                {categoryForm.flyer_url && (
                  <img
                    src={categoryForm.flyer_url}
                    alt="Ticket image preview"
                    className="mb-2 h-24 w-full rounded-md object-cover"
                  />
                )}
                {CLOUDINARY_CONFIGURED ? (
                  <label className="btn-secondary inline-block cursor-pointer">
                    {categoryFlyerUploading
                      ? "Uploading..."
                      : categoryForm.flyer_url
                      ? "Change image"
                      : "Upload image"}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleCategoryFlyerChange}
                      disabled={categoryFlyerUploading}
                    />
                  </label>
                ) : (
                  <p className="text-xs text-gray-400">Image uploads aren't configured yet.</p>
                )}
                <p className="mt-1 text-xs text-gray-500">
                  Shown next to the QR code on this ticket type's tickets. If left blank, the event's
                  promotion picture is used instead.
                </p>
              </div>
              <div>
                <label className="label">Ticket description</label>
                <textarea
                  className="input-field"
                  rows={2}
                  value={categoryForm.description}
                  onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
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
                  <label className="label">Ticket price (₦)</label>
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
              <button type="submit" className="btn-primary">Add new ticket type</button>
            </form>
          </div>

          <div className="card mt-4">
            <h3 className="font-semibold text-brand-charcoal">Agent requests</h3>
            <p className="mt-1 text-sm text-gray-500">
              Agents can request to help sell tickets for this event. Buyers pay the listed ticket
              price — no markup. If you accept, the agent earns{" "}
              {selectedConcert?.agent_commission_percent ?? 0}% of the ticket price to their wallet
              on tickets they sell; the platform keeps a fixed 7%.
            </p>
            <div className="mt-2 space-y-2">
              {referrals
                .filter((r) => r.invitee_role === "agent" && r.requested_by_invitee)
                .map((r) => (
                  <div
                    key={r.id}
                    className="flex items-center justify-between gap-3 rounded-md border border-brand-border p-2 text-sm"
                  >
                    <span>
                      {r.invitee_name || "An agent"} — {r.commission_percent}% commission
                    </span>
                    {r.status === "pending" ? (
                      <div className="flex shrink-0 gap-2">
                        <button
                          className="btn-primary"
                          onClick={() => respondToAgentRequest(r.id, "accept")}
                        >
                          Accept
                        </button>
                        <button
                          className="btn-secondary"
                          onClick={() => respondToAgentRequest(r.id, "decline")}
                        >
                          Decline
                        </button>
                      </div>
                    ) : (
                      <span className="shrink-0 text-gray-500">{r.status}</span>
                    )}
                  </div>
                ))}
              {referrals.filter((r) => r.invitee_role === "agent" && r.requested_by_invitee).length ===
                0 && <p className="text-sm text-gray-500">No agent requests yet.</p>}
            </div>
          </div>

          <div className="card mt-4">
            <h3 className="font-semibold text-brand-charcoal">Ticket authenticators</h3>
            <p className="mt-1 text-sm text-gray-500">
              Invite someone by email to scan and check in tickets at the venue for this event. They
              don't need to be an agent or manager — any My Autograph account can accept.
            </p>
            <div className="mt-2 space-y-2">
              {authenticators.map((a) => (
                <div
                  key={a.id}
                  className="flex items-center justify-between gap-3 rounded-md border border-brand-border p-2 text-sm"
                >
                  <span>{a.invitee_name}</span>
                  <span
                    className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${
                      a.status === "accepted"
                        ? "bg-brand-greenLight text-brand-greenDark"
                        : a.status === "declined"
                        ? "bg-red-100 text-red-700"
                        : "bg-yellow-100 text-yellow-800"
                    }`}
                  >
                    {a.status}
                  </span>
                </div>
              ))}
              {authenticators.length === 0 && (
                <p className="text-sm text-gray-500">No ticket authenticators invited yet.</p>
              )}
            </div>
            <form
              onSubmit={inviteAuthenticator}
              className="mt-4 flex gap-2 border-t border-brand-border pt-4"
            >
              <input
                type="email"
                required
                placeholder="Their email address"
                className="input-field"
                value={authenticatorEmail}
                onChange={(e) => setAuthenticatorEmail(e.target.value)}
              />
              <button type="submit" disabled={invitingAuthenticator} className="btn-primary shrink-0">
                {invitingAuthenticator ? "Sending..." : "Invite"}
              </button>
            </form>
            {authenticatorError && <p className="mt-2 text-xs text-red-600">{authenticatorError}</p>}
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
