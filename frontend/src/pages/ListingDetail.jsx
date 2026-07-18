import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import client from "../api/client.js";
import { useAuth } from "../auth/AuthContext.jsx";

function formatNaira(kobo) {
  return `₦${(kobo / 100).toLocaleString()}`;
}

export default function ListingDetail() {
  const { id } = useParams();
  const { user } = useAuth();

  const [listing, setListing] = useState(null);
  const [bids, setBids] = useState([]);
  const [bidAmount, setBidAmount] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function loadAll() {
    client.get(`/marketplace/listings/${id}`).then(({ data }) => setListing(data));
    client.get(`/marketplace/listings/${id}/bids`).then(({ data }) => setBids(data));
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const hasEnded = listing?.auction_ends_at && new Date(listing.auction_ends_at) <= new Date();
  const isTopBidder = bids.length > 0 && user && bids[0].bidder_user_id === user.id;

  async function submitBid(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await client.post(`/marketplace/listings/${id}/bids`, { amount_kobo: Math.round(bidAmount * 100) });
      setBidAmount("");
      loadAll();
    } catch (err) {
      setError(err.response?.data?.detail || "Could not place bid.");
    } finally {
      setSubmitting(false);
    }
  }

  async function buyNow() {
    setError("");
    setSuccess("");
    setSubmitting(true);
    try {
      const { data } = await client.post(`/marketplace/listings/${id}/buy`);
      if (data.authorization_url) {
        window.location.href = data.authorization_url;
      } else {
        setSuccess("Purchase confirmed! Check your autograph vault.");
      }
    } catch (err) {
      setError(err.response?.data?.detail || "Could not complete purchase.");
    } finally {
      setSubmitting(false);
    }
  }

  async function claimAuction() {
    setError("");
    setSuccess("");
    setSubmitting(true);
    try {
      const { data } = await client.post(`/marketplace/listings/${id}/claim`);
      if (data.authorization_url) {
        window.location.href = data.authorization_url;
      } else {
        setSuccess("Purchase confirmed! Check your autograph vault.");
      }
    } catch (err) {
      setError(err.response?.data?.detail || "Could not complete purchase.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!listing) {
    return <div className="mx-auto max-w-3xl px-6 py-16 text-sm text-gray-500">Loading...</div>;
  }

  const isSeller = user && user.id === listing.seller_user_id;
  const isActive = listing.status === "active";

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <div className="card">
        <img src={listing.content_url} alt={listing.caption} className="w-full rounded-md object-cover" />
        <h1 className="mt-4 text-xl font-semibold text-brand-charcoal">{listing.celebrity_stage_name}</h1>
        {listing.caption && <p className="mt-1 text-sm text-gray-600">{listing.caption}</p>}

        <p className="mt-3 text-sm text-gray-500">
          Status: <span className="font-medium text-brand-charcoal">{listing.status.replace("_", " ")}</span>
        </p>

        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
        {success && <p className="mt-3 text-sm text-brand-greenDark">{success}</p>}

        {listing.listing_type === "fixed_price" ? (
          <div className="mt-6 border-t border-brand-border pt-6">
            <p className="text-2xl font-semibold text-brand-greenDark">{formatNaira(listing.price_kobo)}</p>
            {!user && (
              <p className="mt-3 text-sm text-gray-500">
                <Link to="/login" className="text-brand-green hover:underline">Log in</Link> to buy this autograph.
              </p>
            )}
            {user && !isSeller && isActive && (
              <button onClick={buyNow} disabled={submitting} className="btn-primary mt-3 w-full">
                {submitting ? "Processing..." : "Buy now"}
              </button>
            )}
            {isSeller && <p className="mt-3 text-sm text-gray-500">This is your listing.</p>}
          </div>
        ) : (
          <div className="mt-6 border-t border-brand-border pt-6">
            <p className="text-2xl font-semibold text-brand-greenDark">
              {formatNaira(listing.current_highest_bid_kobo ?? listing.price_kobo)}
            </p>
            <p className="text-sm text-gray-500">
              {hasEnded ? "Auction ended" : `Ends ${new Date(listing.auction_ends_at).toLocaleString()}`}
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

            {user && !isSeller && isActive && !hasEnded && (
              <form onSubmit={submitBid} className="mt-4 flex gap-2">
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
            )}

            {user && !isSeller && isActive && hasEnded && isTopBidder && (
              <button onClick={claimAuction} disabled={submitting} className="btn-primary mt-4 w-full">
                {submitting ? "Processing..." : "Pay now — you won this auction"}
              </button>
            )}

            {isSeller && <p className="mt-4 text-sm text-gray-500">This is your listing.</p>}
          </div>
        )}
      </div>
    </div>
  );
}
