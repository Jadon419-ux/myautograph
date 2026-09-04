import { useEffect, useState } from "react";
import client from "../../api/client.js";
import { useAuth } from "../../auth/AuthContext.jsx";
import QrScanner from "../../components/QrScanner.jsx";
import ShareProfileLink from "../../components/ShareProfileLink.jsx";
import WithdrawalPanel from "../../components/WithdrawalPanel.jsx";
import { toUtcIso } from "../../utils/datetime.js";
import { CLOUDINARY_CONFIGURED, uploadImage } from "../../lib/cloudinary.js";
import { googleMapsSearchUrl } from "../../utils/googleMaps.js";

function formatNaira(kobo) {
  return `₦${(kobo / 100).toLocaleString()}`;
}

export default function AgentDashboard() {
  const { user } = useAuth();
  const [allEvents, setAllEvents] = useState([]);
  const [concerts, setConcerts] = useState([]);
  const [celebrities, setCelebrities] = useState([]);
  const [linkSelections, setLinkSelections] = useState({});
  const [error, setError] = useState("");

  const [mySellRequests, setMySellRequests] = useState([]);
  const [requestingConcertId, setRequestingConcertId] = useState(null);

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
  const [inviteForm, setInviteForm] = useState({ celebrity_id: "", commission_percent: "" });
  const [showScanner, setShowScanner] = useState(false);
  const [manualToken, setManualToken] = useState("");
  const [checkinResult, setCheckinResult] = useState(null);
  const [checkinError, setCheckinError] = useState("");

  async function loadAll() {
    const { data } = await client.get("/concerts");
    setAllEvents(data);
    setConcerts(data.filter((c) => c.agent_id === user.id));
    const { data: allCelebrities } = await client.get("/celebrities");
    setCelebrities(allCelebrities);
    const { data: refs } = await client.get("/tickets/referrals/mine");
    setMySellRequests(
      refs.filter((r) => r.invitee_role === "agent" && r.invitee_user_id === user.id)
    );
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function requestToSell(concertId) {
    setError("");
    setRequestingConcertId(concertId);
    try {
      await client.post(`/tickets/concerts/${concertId}/referrals/agents/request`);
      loadAll();
    } catch (err) {
      setError(err.response?.data?.detail || "Could not send request.");
    } finally {
      setRequestingConcertId(null);
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

  async function handleCategoryFlyerChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    setError("");
    setCategoryFlyerUploading(true);
    try {
      const url = await uploadImage(file);
      setCategoryForm((f) => ({ ...f, flyer_url: url }));
    } catch (err) {
      setError(err.message || "Could not upload ticket image.");
    } finally {
      setCategoryFlyerUploading(false);
      e.target.value = "";
    }
  }

  async function createCategory(e) {
    e.preventDefault();
    setError("");
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
      setError(err.response?.data?.detail || "Could not create ticket type.");
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
  const linkedCelebrities = Array.from(
    new Map(concerts.flatMap((c) => c.celebrities).map((celeb) => [celeb.id, celeb])).values()
  );

  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      <h1 className="text-2xl font-semibold text-brand-charcoal">Agent dashboard</h1>
      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      <section className="mt-8">
        <h2 className="text-lg font-semibold text-brand-charcoal">Wallet & withdrawals</h2>
        <div className="mt-3">
          <WithdrawalPanel />
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold text-brand-charcoal">Request to sell tickets</h2>
        <p className="mt-1 text-sm text-gray-500">
          Events are created by Managers. Browse events below and request to help sell tickets for
          one — the Manager will accept or decline your request.
        </p>
        <div className="mt-3 space-y-3">
          {allEvents.map((c) => {
            const myRequest = mySellRequests.find((r) => r.concert_id === c.id);
            return (
              <div key={c.id} className="card flex items-center justify-between gap-4">
                <div>
                  <p className="font-medium text-brand-charcoal">{c.title}</p>
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
                </div>
                {myRequest ? (
                  <span
                    className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${
                      myRequest.status === "accepted"
                        ? "bg-brand-greenLight text-brand-greenDark"
                        : myRequest.status === "declined"
                        ? "bg-red-100 text-red-700"
                        : "bg-yellow-100 text-yellow-800"
                    }`}
                  >
                    {myRequest.status}
                  </span>
                ) : (
                  <button
                    className="btn-secondary shrink-0"
                    disabled={requestingConcertId === c.id}
                    onClick={() => requestToSell(c.id)}
                  >
                    {requestingConcertId === c.id ? "Sending..." : "Request to sell tickets"}
                  </button>
                )}
              </div>
            );
          })}
          {allEvents.length === 0 && <p className="text-sm text-gray-500">No events yet.</p>}
        </div>
      </section>

      {concerts.length > 0 && (
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
      )}

      {mySellRequests.length > 0 && (
        <section className="mt-10">
          <h2 className="text-lg font-semibold text-brand-charcoal">My sell requests</h2>
          <p className="mt-1 text-sm text-gray-500">
            Buyers pay the listed ticket price — no markup. Once a Manager accepts your request,
            you'll earn the commission percentage they set for that event, deposited straight to
            your wallet whenever someone buys through your link.
          </p>
          <div className="mt-3 space-y-3">
            {mySellRequests
              .filter((r) => r.status === "pending")
              .map((r) => (
                <div key={r.id} className="card flex items-center justify-between gap-4">
                  <p className="text-sm text-gray-600">
                    Request to sell tickets for <span className="font-medium">{r.concert_title}</span> —{" "}
                    {r.commission_percent}% commission
                  </p>
                  <span className="shrink-0 rounded-full bg-yellow-100 px-3 py-1 text-xs font-medium text-yellow-800">
                    Awaiting manager
                  </span>
                </div>
              ))}
            {mySellRequests
              .filter((r) => r.status === "accepted")
              .map((r) => (
                <div key={r.id} className="card">
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">{r.concert_title}</span> — {r.commission_percent}%
                    commission
                  </p>
                  <p className="mt-2 break-all text-xs text-gray-500">
                    {`${window.location.origin}/concerts/${r.concert_id}?ref=${r.code}`}
                  </p>
                </div>
              ))}
            {mySellRequests
              .filter((r) => r.status === "declined")
              .map((r) => (
                <div key={r.id} className="card">
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">{r.concert_title}</span>
                  </p>
                  <span className="mt-1 inline-block rounded-full bg-red-100 px-3 py-1 text-xs font-medium text-red-700">
                    Declined
                  </span>
                </div>
              ))}
          </div>
        </section>
      )}

      {linkedCelebrities.length > 0 && (
        <section className="mt-10">
          <h2 className="text-lg font-semibold text-brand-charcoal">Share celebrity pages</h2>
          <p className="mt-1 text-sm text-gray-500">
            Share a Star's autograph page with friends and fans so they can follow.
          </p>
          <div className="mt-3 space-y-3">
            {linkedCelebrities.map((celeb) => (
              <div key={celeb.id} className="card">
                <p className="font-medium text-brand-charcoal">{celeb.stage_name}</p>
                <div className="mt-2">
                  <ShareProfileLink celebrityId={celeb.id} />
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

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
