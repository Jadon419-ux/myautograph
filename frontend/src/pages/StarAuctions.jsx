import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import client from "../api/client.js";

function formatNaira(kobo) {
  return `₦${(kobo / 100).toLocaleString()}`;
}

function timeRemaining(endsAt) {
  const diffMs = new Date(endsAt) - new Date();
  if (diffMs <= 0) return "Ended";
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  if (hours >= 24) return `${Math.floor(hours / 24)}d left`;
  if (hours >= 1) return `${hours}h left`;
  return `${Math.floor(diffMs / (1000 * 60))}m left`;
}

export default function StarAuctions() {
  const [auctions, setAuctions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    client
      .get("/star-auctions")
      .then(({ data }) => setAuctions(data))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <h1 className="text-2xl font-semibold text-brand-charcoal">Star auctions</h1>
      <p className="mt-1 text-sm text-gray-500">
        Bid on autographed material straight from celebrities, using your My Autograph wallet balance.
      </p>

      {loading && <p className="mt-8 text-sm text-gray-500">Loading...</p>}

      <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {auctions.map((a) => (
          <Link key={a.id} to={`/star-auctions/${a.id}`} className="card block hover:shadow-md">
            <img src={a.image_url} alt={a.title} className="h-40 w-full rounded-md object-cover" />
            <p className="mt-3 font-medium text-brand-charcoal">{a.title}</p>
            <p className="text-sm text-gray-500">{a.celebrity_stage_name}</p>
            <div className="mt-2 flex items-center justify-between">
              <p className="text-lg font-semibold text-brand-greenDark">
                {formatNaira(a.current_highest_bid_kobo ?? a.starting_price_kobo)}
              </p>
              <span className="rounded-full bg-brand-greenLight px-2 py-0.5 text-xs font-medium text-brand-greenDark">
                {timeRemaining(a.ends_at)}
              </span>
            </div>
          </Link>
        ))}
      </div>

      {!loading && auctions.length === 0 && (
        <p className="mt-8 text-sm text-gray-500">No auctions running right now.</p>
      )}
    </div>
  );
}
