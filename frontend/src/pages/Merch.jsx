import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import client from "../api/client.js";

function formatNaira(kobo) {
  return `₦${(kobo / 100).toLocaleString()}`;
}

export default function Merch() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    client
      .get("/merchandise")
      .then(({ data }) => setItems(data))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <h1 className="text-2xl font-semibold text-brand-charcoal">Star merchandise</h1>
      <p className="mt-1 text-sm text-gray-500">
        Autographed material sold directly by celebrities — photos, memorabilia, and more.
      </p>

      {loading && <p className="mt-8 text-sm text-gray-500">Loading...</p>}

      <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((m) => (
          <Link key={m.id} to={`/merch/${m.id}`} className="card block hover:shadow-md">
            <img src={m.image_url} alt={m.title} className="h-40 w-full rounded-md object-cover" />
            <p className="mt-3 font-medium text-brand-charcoal">{m.title}</p>
            <p className="text-sm text-gray-500">{m.celebrity_stage_name}</p>
            <div className="mt-2 flex items-center justify-between">
              <p className="text-lg font-semibold text-brand-greenDark">{formatNaira(m.price_kobo)}</p>
              <span className="text-xs text-gray-500">
                {m.quantity_available > 0 ? `${m.quantity_available} left` : "Sold out"}
              </span>
            </div>
          </Link>
        ))}
      </div>

      {!loading && items.length === 0 && (
        <p className="mt-8 text-sm text-gray-500">No merchandise listed yet.</p>
      )}
    </div>
  );
}
