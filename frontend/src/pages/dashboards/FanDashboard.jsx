import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import client from "../../api/client.js";

const STATUS_STYLES = {
  pending: "bg-yellow-100 text-yellow-800",
  fulfilled: "bg-brand-greenLight text-brand-greenDark",
  declined: "bg-red-100 text-red-700",
};

export default function FanDashboard() {
  const [requests, setRequests] = useState([]);
  const [autographs, setAutographs] = useState([]);
  const [streams, setStreams] = useState([]);
  const [celebrities, setCelebrities] = useState({});

  useEffect(() => {
    client.get("/autographs/requests/mine").then(({ data }) => setRequests(data));
    client.get("/autographs/mine").then(({ data }) => setAutographs(data));
    client.get("/streams/upcoming").then(({ data }) => setStreams(data));
    client.get("/celebrities").then(({ data }) => {
      const map = {};
      data.forEach((c) => (map[c.id] = c.stage_name));
      setCelebrities(map);
    });
  }, []);

  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      <h1 className="text-2xl font-semibold text-brand-charcoal">Fan dashboard</h1>

      <section className="mt-8">
        <h2 className="text-lg font-semibold text-brand-charcoal">My autograph requests</h2>
        <div className="mt-3 space-y-3">
          {requests.map((r) => (
            <div key={r.id} className="card flex items-center justify-between">
              <div>
                <p className="font-medium text-brand-charcoal">
                  {celebrities[r.celebrity_id] || `Celebrity #${r.celebrity_id}`}
                </p>
                {r.message && <p className="text-sm text-gray-500">{r.message}</p>}
              </div>
              <span className={`rounded-full px-3 py-1 text-xs font-medium ${STATUS_STYLES[r.status]}`}>
                {r.status}
              </span>
            </div>
          ))}
          {requests.length === 0 && <p className="text-sm text-gray-500">No requests yet.</p>}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold text-brand-charcoal">My collected autographs</h2>
        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {autographs.map((a) => (
            <div key={a.id} className="card">
              <img src={a.content_url} alt={a.caption} className="w-full rounded-md object-cover" />
              {a.caption && <p className="mt-2 text-sm text-gray-600">{a.caption}</p>}
            </div>
          ))}
        </div>
        {autographs.length === 0 && <p className="mt-3 text-sm text-gray-500">Nothing collected yet.</p>}
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold text-brand-charcoal">Streams</h2>
        <div className="mt-3 space-y-2">
          {streams.map((s) => (
            <Link
              key={s.id}
              to={`/celebrities/${s.celebrity_id}`}
              className="card flex items-center justify-between hover:shadow-md"
            >
              <div>
                <p className="font-medium text-brand-charcoal">{s.title}</p>
                <p className="text-sm text-gray-500">
                  {celebrities[s.celebrity_id] || `Celebrity #${s.celebrity_id}`}
                </p>
              </div>
              {s.is_live && (
                <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700">
                  LIVE
                </span>
              )}
            </Link>
          ))}
          {streams.length === 0 && <p className="text-sm text-gray-500">No streams scheduled.</p>}
        </div>
      </section>
    </div>
  );
}
