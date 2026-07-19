import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import client from "../api/client.js";
import { useAuth } from "../auth/AuthContext.jsx";

function formatNaira(kobo) {
  return `₦${(kobo / 100).toLocaleString()}`;
}

export default function MerchDetail() {
  const { id } = useParams();
  const { user } = useAuth();

  const [item, setItem] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    client.get(`/merchandise/${id}`).then(({ data }) => setItem(data));
  }, [id]);

  async function buyNow(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const { data } = await client.post(`/merchandise/${id}/buy`, { quantity: Number(quantity) });
      if (data.authorization_url) {
        window.location.href = data.authorization_url;
      }
    } catch (err) {
      setError(err.response?.data?.detail || "Could not complete purchase.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!item) {
    return <div className="mx-auto max-w-3xl px-6 py-16 text-sm text-gray-500">Loading...</div>;
  }

  const isSeller = user && user.role === "celebrity";
  const soldOut = item.quantity_available <= 0;

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <div className="card">
        <img src={item.image_url} alt={item.title} className="w-full rounded-md object-cover" />
        <h1 className="mt-4 text-xl font-semibold text-brand-charcoal">{item.title}</h1>
        <Link to={`/celebrities`} className="text-sm text-gray-500 hover:underline">
          {item.celebrity_stage_name}
        </Link>
        {item.description && <p className="mt-3 text-sm text-gray-600">{item.description}</p>}

        <p className="mt-3 text-sm text-gray-500">
          {soldOut ? "Sold out" : `${item.quantity_available} available`}
        </p>

        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

        <div className="mt-6 border-t border-brand-border pt-6">
          <p className="text-2xl font-semibold text-brand-greenDark">{formatNaira(item.price_kobo)}</p>

          {!user && (
            <p className="mt-3 text-sm text-gray-500">
              <Link to="/login" className="text-brand-green hover:underline">Log in</Link> to buy this item.
            </p>
          )}

          {user && !soldOut && (
            <form onSubmit={buyNow} className="mt-3 flex gap-2">
              <input
                type="number"
                min="1"
                max={item.quantity_available}
                required
                className="input-field w-24"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
              <button type="submit" disabled={submitting} className="btn-primary flex-1">
                {submitting ? "Processing..." : "Buy now"}
              </button>
            </form>
          )}

          {isSeller && (
            <p className="mt-3 text-sm text-gray-500">
              Manage your merchandise listings from your dashboard.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
