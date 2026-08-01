import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import client from "../api/client.js";
import { useAuth } from "../auth/AuthContext.jsx";

function formatNaira(kobo) {
  return `₦${(kobo / 100).toLocaleString()}`;
}

export default function StarAuctionDetail() {
  const { id } = useParams();
  const { user } = useAuth();

  const [auction, setAuction] = useState(null);
  const [bids, setBids] = useState([]);
  const [wallet, setWallet] = useState(null);
  const [bidAmount, setBidAmount] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function loadAll() {
    client.get(`/star-auctions/${id}`).then(({ data }) => setAuction(data));
    client.get(`/star-auctions/${id}/bids`).then(({ data }) => setBids(data));
    if (user) {
      client.get("/wallet/me").then(({ data }) => setWallet(data));
    }
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const hasEnded = auction?.ends_at && new Date(auction.ends_at) <= new Date();
  const isTopBidder = bids.length > 0 && user && bids[0].bidder_user_id === user.id;

  async function submitBid(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await client.post(`/star-auctions/${id}/bids`, { amount_kobo: Math.round(bidAmount * 100) });
      setBidAmount("");
      loadAll();
    } catch (err) {
      setError(err.response?.data?.detail || "Could not place bid.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!auction) {
    return <div className="mx-auto max-w-3xl px-6 py-16 text-sm text-gray-500">Loading...</div>;
  }

  const isActive = auction.status === "active";

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <div className="card">
        <img src={auction.image_url} alt={auction.title} className="w-full rounded-md object-cover" />
        <h1 className="mt-4 text-xl font-semibold text-brand-charcoal">{auction.title}</h1>
        <Link to="/celebrities" className="text-sm text-gray-500 hover:underline">
          {auction.celebrity_stage_name}
        </Link>
        {auction.description && <p className="mt-1 text-sm text-gray-600">{auction.description}</p>}

        <p className="mt-3 text-sm text-gray-500">
          Status: <span className="font-medium text-brand-charcoal">{auction.status}</span>
        </p>

        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

        <div className="mt-6 border-t border-brand-border pt-6">
          <p className="text-2xl font-semibold text-brand-greenDark">
            {formatNaira(auction.current_highest_bid_kobo ?? auction.starting_price_kobo)}
          </p>
          <p className="text-sm text-gray-500">
            {hasEnded && isActive
              ? "Auction ended — settling shortly"
              : isActive
              ? `Ends ${new Date(auction.ends_at).toLocaleString()}`
              : auction.status === "sold"
              ? "Sold"
              : auction.status === "unsold"
              ? "Ended with no bids"
              : "Cancelled"}
          </p>

          <div className="mt-4 space-y-2">
            <h3 className="text-sm font-semibold text-brand-charcoal">Bid history</h3>
            {bids.map((b) => (
              <div key={b.id} className="flex items-center justify-between text-sm text-gray-600">
                <span>{b.bidder_name}</span>
                <span>{formatNaira(b.amount_kobo)}</span>
              </div>
            ))}
            {bids.length === 0 && <p className="text-sm text-gray-500">No bids yet.</p>}
          </div>

          {!user && (
            <p className="mt-4 text-sm text-gray-500">
              <Link to="/login" className="text-brand-green hover:underline">Log in</Link> to bid.
            </p>
          )}

          {user && isActive && !hasEnded && (
            <>
              {wallet && (
                <p className="mt-4 text-xs text-gray-500">
                  Wallet available to bid: {formatNaira(wallet.available_kobo)}
                </p>
              )}
              <form onSubmit={submitBid} className="mt-2 flex gap-2">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  placeholder="Your bid (₦)"
                  className="input-field"
                  value={bidAmount}
                  onChange={(e) => setBidAmount(e.target.value)}
                />
                <button type="submit" disabled={submitting} className="btn-primary shrink-0">
                  Place bid
                </button>
              </form>
              {isTopBidder && (
                <p className="mt-2 text-xs text-brand-greenDark">You're currently the highest bidder.</p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
