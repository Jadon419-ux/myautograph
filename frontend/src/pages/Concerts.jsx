import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import client from "../api/client.js";

export default function Concerts() {
  const [concerts, setConcerts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    client
      .get("/concerts")
      .then(({ data }) => setConcerts(data))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <h1 className="text-2xl font-semibold text-brand-charcoal">Concerts</h1>
      <p className="mt-1 text-sm text-gray-500">Upcoming events brought to you by our agents.</p>

      {loading && <p className="mt-8 text-sm text-gray-500">Loading...</p>}

      <div className="mt-8 space-y-4">
        {concerts.map((c) => (
          <Link key={c.id} to={`/concerts/${c.id}`} className="card block hover:shadow-md">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-lg font-semibold text-brand-charcoal">{c.title}</h2>
                <p className="text-sm text-gray-500">
                  {c.venue} · {new Date(c.event_date).toLocaleString()}
                </p>
              </div>
            </div>
            {c.description && <p className="mt-3 text-sm text-gray-600">{c.description}</p>}
            {c.celebrities.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {c.celebrities.map((celeb) => (
                  <span
                    key={celeb.id}
                    className="rounded-full bg-brand-greenLight px-2 py-0.5 text-xs font-medium text-brand-greenDark"
                  >
                    {celeb.stage_name}
                  </span>
                ))}
              </div>
            )}
          </Link>
        ))}
      </div>

      {!loading && concerts.length === 0 && (
        <p className="mt-8 text-sm text-gray-500">No concerts yet.</p>
      )}
    </div>
  );
}
