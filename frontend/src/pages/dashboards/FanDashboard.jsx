import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import client from "../../api/client.js";

const TICKET_STATUS_STYLES = {
  pending_payment: "bg-yellow-100 text-yellow-800",
  valid: "bg-brand-greenLight text-brand-greenDark",
  checked_in: "bg-blue-100 text-blue-700",
  cancelled: "bg-red-100 text-red-700",
};

const STATUS_STYLES = {
  pending: "bg-yellow-100 text-yellow-800",
  fulfilled: "bg-brand-greenLight text-brand-greenDark",
  declined: "bg-red-100 text-red-700",
};

const LISTING_STATUS_STYLES = {
  active: "bg-brand-greenLight text-brand-greenDark",
  pending_sale: "bg-yellow-100 text-yellow-800",
  sold: "bg-blue-100 text-blue-700",
  cancelled: "bg-red-100 text-red-700",
};

function formatNaira(kobo) {
  return `₦${(kobo / 100).toLocaleString()}`;
}

const REVIEW_TARGET_LABELS = {
  celebrity: "Celebrity",
  concert: "Concert",
  marketplace_listing: "Marketplace purchase",
};

const REVIEW_TARGET_PATHS = {
  celebrity: (id) => `/celebrities/${id}`,
  concert: (id) => `/concerts/${id}`,
  marketplace_listing: (id) => `/marketplace/${id}`,
};

export default function FanDashboard() {
  const [requests, setRequests] = useState([]);
  const [autographs, setAutographs] = useState([]);
  const [streams, setStreams] = useState([]);
  const [celebrities, setCelebrities] = useState({});
  const [tickets, setTickets] = useState([]);
  const [transferForms, setTransferForms] = useState({});
  const [transferStatus, setTransferStatus] = useState({});
  const [sellForms, setSellForms] = useState({});
  const [sellOpenFor, setSellOpenFor] = useState(null);
  const [sellStatus, setSellStatus] = useState({});
  const [myListings, setMyListings] = useState([]);
  const [myBids, setMyBids] = useState([]);
  const [myReviews, setMyReviews] = useState([]);

  function loadAutographs() {
    client.get("/autographs/mine").then(({ data }) => setAutographs(data));
  }

  function loadMarketplace() {
    client.get("/marketplace/mine").then(({ data }) => setMyListings(data));
    client.get("/marketplace/mine/bids").then(({ data }) => setMyBids(data));
  }

  function loadReviews() {
    client.get("/reviews/mine").then(({ data }) => setMyReviews(data));
  }

  useEffect(() => {
    client.get("/autographs/requests/mine").then(({ data }) => setRequests(data));
    loadAutographs();
    loadMarketplace();
    loadReviews();
    client.get("/streams/upcoming").then(({ data }) => setStreams(data));
    client.get("/tickets/my").then(({ data }) => setTickets(data));
    client.get("/celebrities").then(({ data }) => {
      const map = {};
      data.forEach((c) => (map[c.id] = c.stage_name));
      setCelebrities(map);
    });
  }, []);

  async function transferAutograph(e, autographId) {
    e.preventDefault();
    const to_email = transferForms[autographId]?.to_email;
    setTransferStatus({ ...transferStatus, [autographId]: "" });
    try {
      await client.post(`/autographs/${autographId}/transfer`, { to_email });
      setTransferForms({ ...transferForms, [autographId]: { to_email: "" } });
      loadAutographs();
    } catch (err) {
      setTransferStatus({
        ...transferStatus,
        [autographId]: err.response?.data?.detail || "Could not transfer this autograph.",
      });
    }
  }

  async function listForSale(e, autographId) {
    e.preventDefault();
    const form = sellForms[autographId] || {};
    setSellStatus({ ...sellStatus, [autographId]: "" });
    try {
      await client.post("/marketplace/listings", {
        autograph_id: autographId,
        listing_type: form.listing_type || "fixed_price",
        price_kobo: Math.round((form.price || 0) * 100),
        auction_duration_hours:
          form.listing_type === "auction" ? Number(form.duration_hours || 24) : undefined,
      });
      setSellOpenFor(null);
      setSellForms({ ...sellForms, [autographId]: {} });
      loadMarketplace();
    } catch (err) {
      setSellStatus({
        ...sellStatus,
        [autographId]: err.response?.data?.detail || "Could not list this autograph.",
      });
    }
  }

  async function cancelListing(listingId) {
    await client.delete(`/marketplace/listings/${listingId}`);
    loadMarketplace();
  }

  async function deleteReview(reviewId) {
    await client.delete(`/reviews/${reviewId}`);
    loadReviews();
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      <h1 className="text-2xl font-semibold text-brand-charcoal">Fan dashboard</h1>

      <section className="mt-8">
        <h2 className="text-lg font-semibold text-brand-charcoal">My autograph requests</h2>
        <div className="mt-3 space-y-3">
          {requests.map((r) => (
            <div key={r.id} className="card flex items-center justify-between">
              <div>
                <p className="font-medium text-brand-charcoal">
                  {celebrities[r.celebrity_id] || `Celebrity #${r.celebrity_id}`}
                </p>
                {r.message && <p className="text-sm text-gray-500">{r.message}</p>}
              </div>
              <span className={`rounded-full px-3 py-1 text-xs font-medium ${STATUS_STYLES[r.status]}`}>
                {r.status}
              </span>
            </div>
          ))}
          {requests.length === 0 && <p className="text-sm text-gray-500">No requests yet.</p>}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold text-brand-charcoal">My autograph vault</h2>
        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {autographs.map((a) => (
            <div key={a.id} className="card">
              <img src={a.content_url} alt={a.caption} className="w-full rounded-md object-cover" />
              {a.caption && <p className="mt-2 text-sm text-gray-600">{a.caption}</p>}
              <Link to={`/verify?code=${a.verification_code}`} className="mt-2 block text-xs text-brand-green hover:underline">
                Verify · {a.verification_code}
              </Link>

              <form
                onSubmit={(e) => transferAutograph(e, a.id)}
                className="mt-3 flex gap-2 border-t border-brand-border pt-3"
              >
                <input
                  type="email"
                  required
                  placeholder="Transfer to email..."
                  className="input-field"
                  value={transferForms[a.id]?.to_email || ""}
                  onChange={(e) =>
                    setTransferForms({ ...transferForms, [a.id]: { to_email: e.target.value } })
                  }
                />
                <button type="submit" className="btn-secondary shrink-0">Transfer</button>
              </form>
              {transferStatus[a.id] && (
                <p className="mt-1 text-xs text-red-600">{transferStatus[a.id]}</p>
              )}

              <div className="mt-3 border-t border-brand-border pt-3">
                {sellOpenFor === a.id ? (
                  <form onSubmit={(e) => listForSale(e, a.id)} className="space-y-2">
                    <div className="flex gap-2">
                      <select
                        className="input-field"
                        value={sellForms[a.id]?.listing_type || "fixed_price"}
                        onChange={(e) =>
                          setSellForms({
                            ...sellForms,
                            [a.id]: { ...sellForms[a.id], listing_type: e.target.value },
                          })
                        }
                      >
                        <option value="fixed_price">Fixed price</option>
                        <option value="auction">Auction</option>
                      </select>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        required
                        placeholder="Price (₦)"
                        className="input-field"
                        value={sellForms[a.id]?.price || ""}
                        onChange={(e) =>
                          setSellForms({
                            ...sellForms,
                            [a.id]: { ...sellForms[a.id], price: e.target.value },
                          })
                        }
                      />
                    </div>
                    {sellForms[a.id]?.listing_type === "auction" && (
                      <input
                        type="number"
                        min="1"
                        placeholder="Auction duration (hours)"
                        className="input-field"
                        value={sellForms[a.id]?.duration_hours || ""}
                        onChange={(e) =>
                          setSellForms({
                            ...sellForms,
                            [a.id]: { ...sellForms[a.id], duration_hours: e.target.value },
                          })
                        }
                      />
                    )}
                    <div className="flex gap-2">
                      <button type="submit" className="btn-primary flex-1">List for sale</button>
                      <button
                        type="button"
                        className="btn-secondary"
                        onClick={() => setSellOpenFor(null)}
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : (
                  <button className="btn-secondary w-full" onClick={() => setSellOpenFor(a.id)}>
                    List for sale
                  </button>
                )}
                {sellStatus[a.id] && <p className="mt-1 text-xs text-red-600">{sellStatus[a.id]}</p>}
              </div>
            </div>
          ))}
        </div>
        {autographs.length === 0 && <p className="mt-3 text-sm text-gray-500">Nothing collected yet.</p>}
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold text-brand-charcoal">My marketplace listings</h2>
        <div className="mt-3 space-y-3">
          {myListings.map((l) => (
            <div key={l.id} className="card flex items-center justify-between">
              <Link to={`/marketplace/${l.id}`} className="flex-1">
                <p className="font-medium text-brand-charcoal">{l.celebrity_stage_name}</p>
                <p className="text-sm text-gray-500">
                  {l.listing_type === "fixed_price"
                    ? formatNaira(l.price_kobo)
                    : `Current bid: ${formatNaira(l.current_highest_bid_kobo ?? l.price_kobo)}`}
                </p>
              </Link>
              <div className="flex items-center gap-3">
                <span
                  className={`rounded-full px-3 py-1 text-xs font-medium ${LISTING_STATUS_STYLES[l.status]}`}
                >
                  {l.status.replace("_", " ")}
                </span>
                {l.status === "active" && (
                  <button className="btn-secondary" onClick={() => cancelListing(l.id)}>
                    Cancel
                  </button>
                )}
              </div>
            </div>
          ))}
          {myListings.length === 0 && <p className="text-sm text-gray-500">You haven't listed anything for sale.</p>}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold text-brand-charcoal">My bids</h2>
        <div className="mt-3 space-y-3">
          {myBids.map((l) => (
            <Link key={l.id} to={`/marketplace/${l.id}`} className="card flex items-center justify-between hover:shadow-md">
              <div>
                <p className="font-medium text-brand-charcoal">{l.celebrity_stage_name}</p>
                <p className="text-sm text-gray-500">
                  Current bid: {formatNaira(l.current_highest_bid_kobo ?? l.price_kobo)}
                </p>
              </div>
              <span
                className={`rounded-full px-3 py-1 text-xs font-medium ${LISTING_STATUS_STYLES[l.status]}`}
              >
                {l.status.replace("_", " ")}
              </span>
            </Link>
          ))}
          {myBids.length === 0 && <p className="text-sm text-gray-500">You haven't bid on any auctions.</p>}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold text-brand-charcoal">My reviews</h2>
        <div className="mt-3 space-y-3">
          {myReviews.map((r) => (
            <div key={r.id} className="card flex items-center justify-between">
              <Link to={REVIEW_TARGET_PATHS[r.target_type](r.target_id)} className="flex-1">
                <p className="font-medium text-brand-charcoal">{REVIEW_TARGET_LABELS[r.target_type]}</p>
                <p className="text-sm text-brand-green">
                  {"★".repeat(r.rating)}
                  <span className="text-brand-border">{"★".repeat(5 - r.rating)}</span>
                </p>
                {r.comment && <p className="text-sm text-gray-500">{r.comment}</p>}
              </Link>
              <button className="btn-secondary" onClick={() => deleteReview(r.id)}>
                Delete
              </button>
            </div>
          ))}
          {myReviews.length === 0 && <p className="text-sm text-gray-500">You haven't written any reviews yet.</p>}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold text-brand-charcoal">Streams</h2>
        <div className="mt-3 space-y-2">
          {streams.map((s) => (
            <Link
              key={s.id}
              to={`/celebrities/${s.celebrity_id}`}
              className="card flex items-center justify-between hover:shadow-md"
            >
              <div>
                <p className="font-medium text-brand-charcoal">{s.title}</p>
                <p className="text-sm text-gray-500">
                  {celebrities[s.celebrity_id] || `Celebrity #${s.celebrity_id}`}
                </p>
              </div>
              {s.is_live && (
                <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700">
                  LIVE
                </span>
              )}
            </Link>
          ))}
          {streams.length === 0 && <p className="text-sm text-gray-500">No streams scheduled.</p>}
        </div>
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
