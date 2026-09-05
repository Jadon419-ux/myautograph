import { useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import client from "../api/client.js";
import { useAuth } from "../auth/AuthContext.jsx";
import ReviewSection from "../components/ReviewSection.jsx";
import StreamEmbed from "../components/StreamEmbed.jsx";
import { googleMapsSearchUrl } from "../utils/googleMaps.js";

function formatNaira(kobo) {
  return `₦${(kobo / 100).toLocaleString()}`;
}

export default function ConcertDetail() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const referralCode = searchParams.get("ref");
  const { user } = useAuth();

  const [concert, setConcert] = useState(null);
  const [categories, setCategories] = useState([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [recipientName, setRecipientName] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [streams, setStreams] = useState([]);
  const [confirmingStreamId, setConfirmingStreamId] = useState(null);
  const [openStreamId, setOpenStreamId] = useState(null);
  const [streamError, setStreamError] = useState("");
  const [payingStreamId, setPayingStreamId] = useState(null);

  function loadStreams() {
    client.get(`/streams/concert/${id}`).then(({ data }) => setStreams(data));
  }

  function loadAll() {
    client.get(`/concerts/${id}`).then(({ data }) => setConcert(data));
    client.get(`/tickets/concerts/${id}/categories`).then(({ data }) => {
      setCategories(data);
      if (data.length > 0) setSelectedCategoryId(String(data[0].id));
    });
    loadStreams();
  }

  async function payForStream(streamId) {
    setStreamError("");
    setPayingStreamId(streamId);
    try {
      const { data } = await client.post(`/streams/${streamId}/purchase`);
      if (data.authorization_url) {
        window.location.href = data.authorization_url;
      }
    } catch (err) {
      setStreamError(err.response?.data?.detail || "Could not start payment.");
    } finally {
      setPayingStreamId(null);
    }
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function submitPurchase(e) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setSubmitting(true);
    try {
      const { data } = await client.post("/tickets/orders", {
        category_id: Number(selectedCategoryId),
        quantity: Number(quantity),
        recipient_name: recipientName,
        recipient_email: recipientEmail,
        referral_code: referralCode || null,
      });
      if (data.authorization_url) {
        window.location.href = data.authorization_url;
      } else {
        setSuccess("Your ticket is confirmed! Find it in your dashboard's ticket vault.");
      }
    } catch (err) {
      setError(err.response?.data?.detail || "Could not complete purchase.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!concert) {
    return <div className="mx-auto max-w-4xl px-6 py-16 text-sm text-gray-500">Loading...</div>;
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      <div className="card">
        {concert.flyer_url && (
          <img
            src={concert.flyer_url}
            alt={concert.title}
            className="mb-4 h-56 w-full rounded-md object-cover"
          />
        )}
        <h1 className="text-2xl font-semibold text-brand-charcoal">{concert.title}</h1>
        <p className="mt-1 text-sm text-gray-500">
          {concert.venue} · {new Date(concert.event_date).toLocaleString()}
        </p>
        <a
          href={googleMapsSearchUrl(concert.venue)}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-1 inline-flex items-center gap-1 text-sm font-medium text-brand-green hover:underline"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11Z" />
            <circle cx="12" cy="10" r="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          View on Google Maps ↗
        </a>
        {concert.description && <p className="mt-3 text-sm text-gray-600">{concert.description}</p>}
        {concert.celebrities.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {concert.celebrities.map((celeb) => (
              <span
                key={celeb.id}
                className="rounded-full bg-brand-greenLight px-2 py-0.5 text-xs font-medium text-brand-greenDark"
              >
                {celeb.stage_name}
              </span>
            ))}
          </div>
        )}
        {referralCode && (
          <p className="mt-3 text-xs text-gray-400">Referral code applied: {referralCode}</p>
        )}
      </div>

      <div className="card mt-6">
        <h2 className="text-lg font-semibold text-brand-charcoal">Tickets</h2>

        {concert.celebrities.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-4 border-b border-brand-border pb-4">
            {concert.celebrities.map((celeb) => {
              const stream = streams.find((s) => s.celebrity_id === celeb.id);
              const locked = stream && !stream.has_access;
              return (
                <div key={celeb.id} className="flex flex-col gap-1">
                  <Link to={`/celebrities/${celeb.id}`} className="flex items-center gap-2 hover:opacity-80">
                    <span className="h-10 w-10 shrink-0 overflow-hidden rounded-full bg-brand-gray">
                      {celeb.avatar_url || celeb.profile_image_url ? (
                        <img
                          src={celeb.avatar_url || celeb.profile_image_url}
                          alt={celeb.stage_name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span className="flex h-full w-full items-center justify-center font-semibold text-gray-400">
                          {celeb.stage_name?.[0]?.toUpperCase() || "?"}
                        </span>
                      )}
                    </span>
                    <span className="text-sm font-medium text-brand-charcoal">{celeb.stage_name}</span>
                  </Link>

                  {stream && (
                    <button
                      onClick={() => {
                        if (locked) {
                          setConfirmingStreamId(stream.id);
                        } else {
                          setOpenStreamId((current) => (current === stream.id ? null : stream.id));
                        }
                      }}
                      className={`flex items-center gap-1.5 rounded-full px-2 py-1 text-xs font-medium ${
                        locked
                          ? "bg-yellow-100 text-yellow-800"
                          : "bg-brand-greenLight text-brand-greenDark"
                      }`}
                    >
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className={`h-3.5 w-3.5 ${locked ? "animate-lock-shake" : ""}`}
                      >
                        {locked ? (
                          <>
                            <rect x="5" y="11" width="14" height="9" rx="1.5" />
                            <path d="M8 11V7a4 4 0 1 1 8 0v4" />
                          </>
                        ) : (
                          <>
                            <rect x="5" y="11" width="14" height="9" rx="1.5" />
                            <path d="M8 11V7a4 4 0 0 1 7.6-1.8" />
                          </>
                        )}
                      </svg>
                      {locked
                        ? `Livestream · ${formatNaira(stream.price_kobo)}`
                        : stream.price_kobo > 0
                        ? "Livestream unlocked"
                        : "Free livestream"}
                    </button>
                  )}

                  {confirmingStreamId === stream?.id && (
                    <div className="mt-1 w-56 rounded-md border border-brand-border bg-white p-3 shadow-md">
                      {streamError && <p className="mb-2 text-xs text-red-600">{streamError}</p>}
                      {user ? (
                        <>
                          <p className="text-xs text-gray-600">
                            Pay {formatNaira(stream.price_kobo)} to unlock {celeb.stage_name}'s livestream?
                          </p>
                          <div className="mt-2 flex gap-2">
                            <button
                              className="btn-primary flex-1 text-xs"
                              disabled={payingStreamId === stream.id}
                              onClick={() => payForStream(stream.id)}
                            >
                              {payingStreamId === stream.id ? "Starting..." : "Pay"}
                            </button>
                            <button
                              className="btn-secondary flex-1 text-xs"
                              onClick={() => setConfirmingStreamId(null)}
                            >
                              Cancel
                            </button>
                          </div>
                        </>
                      ) : (
                        <p className="text-xs text-gray-600">
                          <Link to="/login" className="text-brand-green hover:underline">
                            Log in
                          </Link>{" "}
                          to pay and unlock this livestream.
                        </p>
                      )}
                    </div>
                  )}

                  {openStreamId === stream?.id && stream.has_access && (
                    <div className="mt-2 w-72">
                      <StreamEmbed url={stream.embed_url} title={stream.title} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {categories.length === 0 && (
          <p className="mt-3 text-sm text-gray-500">No ticket categories available yet.</p>
        )}

        <div className="mt-4 space-y-2">
          {categories.map((c) => {
            const remaining = c.quantity_total - c.quantity_sold;
            return (
              <div key={c.id} className="flex items-center gap-3 rounded-md border border-brand-border p-3">
                {c.flyer_url && (
                  <img src={c.flyer_url} alt="" className="h-14 w-14 shrink-0 rounded-md object-cover" />
                )}
                <div>
                  <p className="font-medium text-brand-charcoal">{c.name}</p>
                  {c.description && <p className="text-sm text-gray-500">{c.description}</p>}
                  <p className="text-sm text-gray-500">
                    {c.is_free ? "Free" : formatNaira(c.price_kobo)} · {remaining} remaining
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {(user?.role === "fan" || user?.role === "admin") && categories.length > 0 && (
          <form onSubmit={submitPurchase} className="mt-6 space-y-3 border-t border-brand-border pt-6">
            {error && <p className="text-sm text-red-600">{error}</p>}
            {success && <p className="text-sm text-brand-greenDark">{success}</p>}

            <div>
              <label className="label">Ticket category</label>
              <select
                className="input-field"
                value={selectedCategoryId}
                onChange={(e) => setSelectedCategoryId(e.target.value)}
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} — {c.is_free ? "Free" : formatNaira(c.price_kobo)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">Quantity</label>
              <input
                type="number"
                min={1}
                className="input-field"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
            </div>

            <div>
              <label className="label">Recipient name (optional — leave blank for yourself)</label>
              <input
                className="input-field"
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
              />
            </div>

            <div>
              <label className="label">Recipient email (optional)</label>
              <input
                type="email"
                className="input-field"
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
              />
            </div>

            <button type="submit" disabled={submitting} className="btn-primary w-full">
              {submitting ? "Processing..." : "Buy ticket"}
            </button>
          </form>
        )}

        {!user && categories.length > 0 && (
          <p className="mt-6 border-t border-brand-border pt-6 text-sm text-gray-500">
            <Link to={`/login`} className="text-brand-green hover:underline">
              Log in
            </Link>{" "}
            or{" "}
            <Link to={`/signup?role=fan`} className="text-brand-green hover:underline">
              sign up as a fan
            </Link>{" "}
            to buy tickets.
          </p>
        )}
      </div>

      <ReviewSection targetType="concert" targetId={id} />
    </div>
  );
}
