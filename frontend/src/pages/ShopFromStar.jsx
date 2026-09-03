import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
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

const TABS = [
  { key: "marketplace", label: "Marketplace" },
  { key: "merch", label: "Merch" },
];

export default function ShopFromStar() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = TABS.some((t) => t.key === searchParams.get("tab"))
    ? searchParams.get("tab")
    : "marketplace";

  const [listings, setListings] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      client.get("/marketplace/listings").then(({ data }) => setListings(data)),
      client.get("/merchandise").then(({ data }) => setItems(data)),
    ]).finally(() => setLoading(false));
  }, []);

  function selectTab(key) {
    setSearchParams(key === "marketplace" ? {} : { tab: key });
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <h1 className="text-2xl font-semibold text-brand-charcoal">Shop from Star</h1>
      <p className="mt-1 text-sm text-gray-500">
        Buy autographs directly from fans and bid on auctions, or pick up merchandise sold
        straight from celebrities.
      </p>

      <div className="mt-6 flex gap-2 border-b border-brand-border">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => selectTab(tab.key)}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium ${
              activeTab === tab.key
                ? "border-brand-green text-brand-green"
                : "border-transparent text-gray-500 hover:text-brand-charcoal"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading && <p className="mt-8 text-sm text-gray-500">Loading...</p>}

      {!loading && activeTab === "marketplace" && (
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
          {listings.length === 0 && (
            <p className="text-sm text-gray-500">No marketplace listings yet.</p>
          )}
        </div>
      )}

      {!loading && activeTab === "merch" && (
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
          {items.length === 0 && <p className="text-sm text-gray-500">No merchandise listed yet.</p>}
        </div>
      )}
    </div>
  );
}
