import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import client from "../api/client.js";

export default function Celebrities() {
  const [celebrities, setCelebrities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    client
      .get("/celebrities")
      .then(({ data }) => setCelebrities(data))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <h1 className="text-2xl font-semibold text-brand-charcoal">Celebrities</h1>
      <p className="mt-1 text-sm text-gray-500">Browse profiles and request an autograph.</p>

      {loading && <p className="mt-8 text-sm text-gray-500">Loading...</p>}

      <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {celebrities.map((c) => (
          <Link key={c.id} to={`/celebrities/${c.id}`} className="card block hover:shadow-md">
            <div className="flex items-center gap-3">
              <span className="h-12 w-12 shrink-0 overflow-hidden rounded-full bg-brand-gray">
                {c.avatar_url || c.profile_image_url ? (
                  <img
                    src={c.avatar_url || c.profile_image_url}
                    alt={c.stage_name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="flex h-full w-full items-center justify-center font-semibold text-gray-400">
                    {c.stage_name?.[0]?.toUpperCase() || "?"}
                  </span>
                )}
              </span>
              <h2 className="text-lg font-semibold text-brand-charcoal">{c.stage_name}</h2>
            </div>
            {c.category && (
              <span className="mt-2 inline-block rounded-full bg-brand-greenLight px-2 py-0.5 text-xs font-medium text-brand-greenDark">
                {c.category}
              </span>
            )}
            <p className="mt-3 text-sm text-gray-600 line-clamp-3">{c.bio || "No bio yet."}</p>
          </Link>
        ))}
      </div>

      {!loading && celebrities.length === 0 && (
        <p className="mt-8 text-sm text-gray-500">No celebrities yet.</p>
      )}
    </div>
  );
}
