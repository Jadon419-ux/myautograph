import { useEffect, useState } from "react";
import client from "../../api/client.js";
import { useAuth } from "../../auth/AuthContext.jsx";

export default function AgentDashboard() {
  const { user } = useAuth();
  const [concerts, setConcerts] = useState([]);
  const [celebrities, setCelebrities] = useState([]);
  const [form, setForm] = useState({ title: "", venue: "", event_date: "", description: "" });
  const [linkSelections, setLinkSelections] = useState({});
  const [error, setError] = useState("");

  async function loadAll() {
    const { data } = await client.get("/concerts");
    setConcerts(data.filter((c) => c.agent_id === user.id));
    const { data: allCelebrities } = await client.get("/celebrities");
    setCelebrities(allCelebrities);
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function createConcert(e) {
    e.preventDefault();
    setError("");
    try {
      await client.post("/concerts", form);
      setForm({ title: "", venue: "", event_date: "", description: "" });
      loadAll();
    } catch (err) {
      setError(err.response?.data?.detail || "Could not create concert.");
    }
  }

  async function linkCelebrity(concertId) {
    const celebrityId = linkSelections[concertId];
    if (!celebrityId) return;
    await client.post(`/concerts/${concertId}/celebrities/${celebrityId}`);
    loadAll();
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      <h1 className="text-2xl font-semibold text-brand-charcoal">Agent dashboard</h1>
      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      <section className="mt-8">
        <h2 className="text-lg font-semibold text-brand-charcoal">Create a concert</h2>
        <form onSubmit={createConcert} className="card mt-3 space-y-3">
          <div>
            <label className="label">Title</label>
            <input
              required
              className="input-field"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Venue</label>
            <input
              required
              className="input-field"
              value={form.venue}
              onChange={(e) => setForm({ ...form, venue: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Event date</label>
            <input
              type="datetime-local"
              required
              className="input-field"
              value={form.event_date}
              onChange={(e) => setForm({ ...form, event_date: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Description</label>
            <textarea
              className="input-field"
              rows={3}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
          <button type="submit" className="btn-primary">Create concert</button>
        </form>
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold text-brand-charcoal">My concerts</h2>
        <div className="mt-3 space-y-4">
          {concerts.map((c) => (
            <div key={c.id} className="card">
              <h3 className="font-semibold text-brand-charcoal">{c.title}</h3>
              <p className="text-sm text-gray-500">
                {c.venue} · {new Date(c.event_date).toLocaleString()}
              </p>
              {c.celebrities.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
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
              <div className="mt-3 flex gap-2">
                <select
                  className="input-field"
                  value={linkSelections[c.id] || ""}
                  onChange={(e) => setLinkSelections({ ...linkSelections, [c.id]: e.target.value })}
                >
                  <option value="">Link a celebrity...</option>
                  {celebrities.map((celeb) => (
                    <option key={celeb.id} value={celeb.id}>
                      {celeb.stage_name}
                    </option>
                  ))}
                </select>
                <button className="btn-secondary" onClick={() => linkCelebrity(c.id)}>
                  Link
                </button>
              </div>
            </div>
          ))}
          {concerts.length === 0 && <p className="text-sm text-gray-500">No concerts yet.</p>}
        </div>
      </section>
    </div>
  );
}
