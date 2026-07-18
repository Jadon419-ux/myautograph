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

export default function Marketplace() {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    client
      .get("/marketplace/listings")
      .then(({ data }) => setListings(data))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <h1 className="text-2xl font-semibold text-brand-charcoal">Marketplace</h1>
      <p className="mt-1 text-sm text-gray-500">
        Buy autographs directly from fans, or bid on time-limited auctions.
      </p>

      {loading && <p className="mt-8 text-sm text-gray-500">Loading...</p>}

      <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {listings.map((l) => (
          <Link key={l.id} to={`/marketplace/${l.id}`} className="card block hover:shadow-md">
            <img src={l.content_url} alt={l.caption} className="h-40 w-full rounded-md object-cover" />
            <p className="mt-3 font-medium text-brand-charcoal">{l.celebrity_stage_name}</p>
            {l.caption && <p className="text-sm text-gray-500 line-clamp-2">{l.caption}</p>}

            {l.listing_type === "fixed_price" ? (
              <p className="mt-2 text-lg font-semibold text-brand-greenDark">
                {formatNaira(l.price_kobo)}
              </p>
            ) : (
              <div className="mt-2 flex items-center justify-between">
                <p className="text-lg font-semibold text-brand-greenDark">
                  {formatNaira(l.current_highest_bid_kobo ?? l.price_kobo)}
                </p>
                <span className="rounded-full bg-brand-greenLight px-2 py-0.5 text-xs font-medium text-brand-greenDark">
                  {timeRemaining(l.auction_ends_at)}
                </span>
              </div>
            )}
          </Link>
        ))}
      </div>

      {!loading && listings.length === 0 && (
        <p className="mt-8 text-sm text-gray-500">No listings yet.</p>
      )}
    </div>
  );
}
