import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import client from "../api/client.js";
import { useAuth } from "../auth/AuthContext.jsx";
import StreamEmbed from "../components/StreamEmbed.jsx";

export default function CelebrityProfile() {
  const { id } = useParams();
  const { user } = useAuth();

  const [celebrity, setCelebrity] = useState(null);
  const [autographs, setAutographs] = useState([]);
  const [streams, setStreams] = useState([]);
  const [message, setMessage] = useState("");
  const [requestStatus, setRequestStatus] = useState("");

  useEffect(() => {
    client.get(`/celebrities/${id}`).then(({ data }) => setCelebrity(data));
    client.get(`/autographs/celebrity/${id}`).then(({ data }) => setAutographs(data));
    client.get(`/streams/celebrity/${id}`).then(({ data }) => setStreams(data));
  }, [id]);

  const liveStream = streams.find((s) => s.is_live);
  const nextStream = [...streams]
    .filter((s) => !s.is_live)
    .sort((a, b) => new Date(a.scheduled_at) - new Date(b.scheduled_at))[0];

  async function submitRequest(e) {
    e.preventDefault();
    setRequestStatus("");
    try {
      await client.post("/autographs/requests", {
        celebrity_id: Number(id),
        message,
      });
      setMessage("");
      setRequestStatus("Your request has been sent!");
    } catch (err) {
      setRequestStatus(err.response?.data?.detail || "Could not send request.");
    }
  }

  if (!celebrity) {
    return <div className="mx-auto max-w-4xl px-6 py-16 text-sm text-gray-500">Loading...</div>;
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      <div className="card">
        <h1 className="text-2xl font-semibold text-brand-charcoal">{celebrity.stage_name}</h1>
        {celebrity.category && (
          <span className="mt-2 inline-block rounded-full bg-brand-greenLight px-2 py-0.5 text-xs font-medium text-brand-greenDark">
            {celebrity.category}
          </span>
        )}
        <p className="mt-3 text-sm text-gray-600">{celebrity.bio || "No bio yet."}</p>
      </div>

      {(liveStream || nextStream) && (
        <div className="card mt-6">
          <h2 className="text-lg font-semibold text-brand-charcoal">
            {liveStream ? "Live now" : "Upcoming stream"}
          </h2>
          <p className="mt-1 text-sm text-gray-500">{(liveStream || nextStream).title}</p>
          <div className="mt-4">
            <StreamEmbed url={(liveStream || nextStream).embed_url} title={(liveStream || nextStream).title} />
          </div>
        </div>
      )}

      {user?.role === "fan" && (
        <div className="card mt-6">
          <h2 className="text-lg font-semibold text-brand-charcoal">Request an autograph</h2>
          <form onSubmit={submitRequest} className="mt-3 space-y-3">
            <textarea
              className="input-field"
              rows={3}
              placeholder="Say a few words..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
            <button type="submit" className="btn-primary">
              Send request
            </button>
            {requestStatus && <p className="text-sm text-gray-600">{requestStatus}</p>}
          </form>
        </div>
      )}

      <div className="mt-6">
        <h2 className="text-lg font-semibold text-brand-charcoal">Autographs shared</h2>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {autographs.map((a) => (
            <div key={a.id} className="card">
              <img src={a.content_url} alt={a.caption} className="w-full rounded-md object-cover" />
              {a.caption && <p className="mt-2 text-sm text-gray-600">{a.caption}</p>}
            </div>
          ))}
        </div>
        {autographs.length === 0 && (
          <p className="mt-4 text-sm text-gray-500">No autographs shared yet.</p>
        )}
      </div>
    </div>
  );
}
