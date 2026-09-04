import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import client from "../api/client.js";

function buildSearchHaystack(concert) {
  const eventDate = new Date(concert.event_date);
  const dateVariants = Number.isNaN(eventDate.getTime())
    ? []
    : [
        eventDate.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" }),
        eventDate.toLocaleDateString(undefined, { weekday: "long" }),
        eventDate.toISOString().slice(0, 10),
      ];

  return [
    concert.title,
    concert.venue,
    concert.description,
    ...(concert.celebrities || []).map((celeb) => celeb.stage_name),
    ...dateVariants,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

export default function Concerts() {
  const [concerts, setConcerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    client
      .get("/concerts")
      .then(({ data }) => setConcerts(data))
      .finally(() => setLoading(false));
  }, []);

  const filteredConcerts = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return concerts;
    return concerts.filter((c) => buildSearchHaystack(c).includes(query));
  }, [concerts, search]);

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <h1 className="text-2xl font-semibold text-brand-charcoal">Get tickets</h1>
      <p className="mt-1 text-sm text-gray-500">Upcoming events brought to you by our agents.</p>

      <input
        type="search"
        className="input-field mt-6"
        placeholder="Search by event name, venue, state, celebrity, or date..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {loading && <p className="mt-8 text-sm text-gray-500">Loading...</p>}

      <div className="mt-8 space-y-4">
        {filteredConcerts.map((c) => (
          <Link key={c.id} to={`/concerts/${c.id}`} className="card block hover:shadow-md">
            <div className="flex items-start gap-4">
              {c.flyer_url && (
                <img
                  src={c.flyer_url}
                  alt={c.title}
                  className="h-20 w-20 shrink-0 rounded-md object-cover"
                />
              )}
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
      {!loading && concerts.length > 0 && filteredConcerts.length === 0 && (
        <p className="mt-8 text-sm text-gray-500">No events match your search.</p>
      )}
    </div>
  );
}
