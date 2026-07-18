import { useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import client from "../api/client.js";
import { useAuth } from "../auth/AuthContext.jsx";
import ReviewSection from "../components/ReviewSection.jsx";

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

  function loadAll() {
    client.get(`/concerts/${id}`).then(({ data }) => setConcert(data));
    client.get(`/tickets/concerts/${id}/categories`).then(({ data }) => {
      setCategories(data);
      if (data.length > 0) setSelectedCategoryId(String(data[0].id));
    });
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
        <h1 className="text-2xl font-semibold text-brand-charcoal">{concert.title}</h1>
        <p className="mt-1 text-sm text-gray-500">
          {concert.venue} · {new Date(concert.event_date).toLocaleString()}
        </p>
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

        {categories.length === 0 && (
          <p className="mt-3 text-sm text-gray-500">No ticket categories available yet.</p>
        )}

        <div className="mt-4 space-y-2">
          {categories.map((c) => {
            const remaining = c.quantity_total - c.quantity_sold;
            return (
              <div key={c.id} className="flex items-center justify-between rounded-md border border-brand-border p-3">
                <div>
                  <p className="font-medium text-brand-charcoal">{c.name}</p>
                  <p className="text-sm text-gray-500">
                    {c.is_free ? "Free" : formatNaira(c.price_kobo)} · {remaining} remaining
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {user?.role === "fan" && categories.length > 0 && (
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
