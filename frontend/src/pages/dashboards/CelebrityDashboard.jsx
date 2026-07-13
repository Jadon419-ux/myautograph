import { useEffect, useState } from "react";
import client from "../../api/client.js";

export default function CelebrityDashboard() {
  const [profile, setProfile] = useState(null);
  const [requests, setRequests] = useState([]);
  const [streams, setStreams] = useState([]);
  const [publishForm, setPublishForm] = useState({ request_id: "", content_url: "", caption: "" });
  const [streamForm, setStreamForm] = useState({ title: "", embed_url: "", scheduled_at: "" });
  const [error, setError] = useState("");

  async function loadAll() {
    const { data: me } = await client.get("/celebrities/me");
    setProfile(me);
    const { data: incoming } = await client.get("/autographs/requests/incoming");
    setRequests(incoming);
    const { data: myStreams } = await client.get(`/streams/celebrity/${me.id}`);
    setStreams(myStreams);
  }

  useEffect(() => {
    loadAll();
  }, []);

  async function updateStatus(id, status) {
    await client.patch(`/autographs/requests/${id}`, { status });
    loadAll();
  }

  async function publishAutograph(e) {
    e.preventDefault();
    setError("");
    try {
      await client.post("/autographs", {
        request_id: publishForm.request_id ? Number(publishForm.request_id) : null,
        content_url: publishForm.content_url,
        caption: publishForm.caption,
      });
      setPublishForm({ request_id: "", content_url: "", caption: "" });
      loadAll();
    } catch (err) {
      setError(err.response?.data?.detail || "Could not publish autograph.");
    }
  }

  async function scheduleStream(e) {
    e.preventDefault();
    setError("");
    try {
      await client.post("/streams", streamForm);
      setStreamForm({ title: "", embed_url: "", scheduled_at: "" });
      loadAll();
    } catch (err) {
      setError(err.response?.data?.detail || "Could not schedule stream.");
    }
  }

  async function toggleLive(id) {
    await client.patch(`/streams/${id}/go-live`);
    loadAll();
  }

  if (!profile) {
    return <div className="mx-auto max-w-4xl px-6 py-16 text-sm text-gray-500">Loading...</div>;
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      <h1 className="text-2xl font-semibold text-brand-charcoal">
        Celebrity dashboard — {profile.stage_name}
      </h1>
      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      <section className="mt-8">
        <h2 className="text-lg font-semibold text-brand-charcoal">Incoming requests</h2>
        <div className="mt-3 space-y-3">
          {requests.map((r) => (
            <div key={r.id} className="card flex items-center justify-between gap-4">
              <div>
                <p className="text-sm text-gray-600">{r.message || "(no message)"}</p>
                <p className="mt-1 text-xs uppercase tracking-wide text-gray-400">{r.status}</p>
              </div>
              {r.status === "pending" && (
                <div className="flex shrink-0 gap-2">
                  <button className="btn-primary" onClick={() => updateStatus(r.id, "fulfilled")}>
                    Fulfill
                  </button>
                  <button className="btn-secondary" onClick={() => updateStatus(r.id, "declined")}>
                    Decline
                  </button>
                </div>
              )}
            </div>
          ))}
          {requests.length === 0 && <p className="text-sm text-gray-500">No requests yet.</p>}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold text-brand-charcoal">Publish an autograph</h2>
        <form onSubmit={publishAutograph} className="card mt-3 space-y-3">
          <div>
            <label className="label">Link to request (optional)</label>
            <select
              className="input-field"
              value={publishForm.request_id}
              onChange={(e) => setPublishForm({ ...publishForm, request_id: e.target.value })}
            >
              <option value="">Not tied to a request</option>
              {requests
                .filter((r) => r.status !== "declined")
                .map((r) => (
                  <option key={r.id} value={r.id}>
                    Request #{r.id} — {r.message?.slice(0, 40) || "(no message)"}
                  </option>
                ))}
            </select>
          </div>
          <div>
            <label className="label">Image URL</label>
            <input
              required
              className="input-field"
              value={publishForm.content_url}
              onChange={(e) => setPublishForm({ ...publishForm, content_url: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Caption</label>
            <input
              className="input-field"
              value={publishForm.caption}
              onChange={(e) => setPublishForm({ ...publishForm, caption: e.target.value })}
            />
          </div>
          <button type="submit" className="btn-primary">Publish</button>
        </form>
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold text-brand-charcoal">Streams</h2>
        <form onSubmit={scheduleStream} className="card mt-3 space-y-3">
          <div>
            <label className="label">Title</label>
            <input
              required
              className="input-field"
              value={streamForm.title}
              onChange={(e) => setStreamForm({ ...streamForm, title: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Embed URL (YouTube, Twitch, Vimeo)</label>
            <input
              required
              className="input-field"
              value={streamForm.embed_url}
              onChange={(e) => setStreamForm({ ...streamForm, embed_url: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Scheduled at</label>
            <input
              type="datetime-local"
              required
              className="input-field"
              value={streamForm.scheduled_at}
              onChange={(e) => setStreamForm({ ...streamForm, scheduled_at: e.target.value })}
            />
          </div>
          <button type="submit" className="btn-primary">Schedule stream</button>
        </form>

        <div className="mt-4 space-y-2">
          {streams.map((s) => (
            <div key={s.id} className="card flex items-center justify-between">
              <div>
                <p className="font-medium text-brand-charcoal">{s.title}</p>
                <p className="text-sm text-gray-500">{new Date(s.scheduled_at).toLocaleString()}</p>
              </div>
              <button
                className={s.is_live ? "btn-secondary" : "btn-primary"}
                onClick={() => toggleLive(s.id)}
              >
                {s.is_live ? "End live" : "Go live"}
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
