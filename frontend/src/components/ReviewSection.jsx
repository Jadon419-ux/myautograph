import { useEffect, useState } from "react";
import client from "../api/client.js";
import { useAuth } from "../auth/AuthContext.jsx";

function Stars({ value }) {
  return (
    <span className="text-brand-green">
      {"★".repeat(value)}
      <span className="text-brand-border">{"★".repeat(5 - value)}</span>
    </span>
  );
}

export default function ReviewSection({ targetType, targetId }) {
  const { user } = useAuth();
  const [data, setData] = useState({ reviews: [], average_rating: 0, review_count: 0 });
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function load() {
    client.get(`/reviews/${targetType}/${targetId}`).then(({ data }) => setData(data));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetType, targetId]);

  async function submitReview(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await client.post(`/reviews/${targetType}/${targetId}`, { rating, comment });
      setComment("");
      setRating(5);
      load();
    } catch (err) {
      setError(err.response?.data?.detail || "Could not submit review.");
    } finally {
      setSubmitting(false);
    }
  }

  async function deleteReview(reviewId) {
    await client.delete(`/reviews/${reviewId}`);
    load();
  }

  const alreadyReviewed = user && data.reviews.some((r) => r.author_user_id === user.id);

  return (
    <div className="card mt-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-brand-charcoal">Reviews</h2>
        {data.review_count > 0 && (
          <p className="text-sm text-gray-500">
            <Stars value={Math.round(data.average_rating)} /> {data.average_rating} ({data.review_count})
          </p>
        )}
      </div>

      <div className="mt-4 space-y-4">
        {data.reviews.map((r) => (
          <div key={r.id} className="border-t border-brand-border pt-4 first:border-t-0 first:pt-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="h-8 w-8 shrink-0 overflow-hidden rounded-full bg-brand-gray">
                  {r.author_avatar_url ? (
                    <img src={r.author_avatar_url} alt={r.author_name} className="h-full w-full object-cover" />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center text-xs font-semibold text-gray-400">
                      {r.author_name?.[0]?.toUpperCase() || "?"}
                    </span>
                  )}
                </span>
                <div>
                  <p className="text-sm font-medium text-brand-charcoal">{r.author_name}</p>
                  <Stars value={r.rating} />
                </div>
              </div>
              {user && user.id === r.author_user_id && (
                <button onClick={() => deleteReview(r.id)} className="text-xs text-red-600 hover:underline">
                  Delete
                </button>
              )}
            </div>
            {r.comment && <p className="mt-2 text-sm text-gray-600">{r.comment}</p>}
          </div>
        ))}
        {data.reviews.length === 0 && <p className="text-sm text-gray-500">No reviews yet.</p>}
      </div>

      {user && !alreadyReviewed && (
        <form onSubmit={submitReview} className="mt-4 space-y-3 border-t border-brand-border pt-4">
          <div>
            <label className="label">Your rating</label>
            <div className="mt-1 flex gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setRating(n)}
                  className={n <= rating ? "text-2xl text-brand-green" : "text-2xl text-brand-border"}
                >
                  ★
                </button>
              ))}
            </div>
          </div>
          <textarea
            className="input-field"
            rows={2}
            placeholder="Write a review (optional)..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button type="submit" disabled={submitting} className="btn-primary">
            {submitting ? "Submitting..." : "Submit review"}
          </button>
        </form>
      )}
    </div>
  );
}
