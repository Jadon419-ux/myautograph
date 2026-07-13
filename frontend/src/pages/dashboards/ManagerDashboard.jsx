import { useEffect, useState } from "react";
import client from "../../api/client.js";

export default function ManagerDashboard() {
  const [roster, setRoster] = useState([]);
  const [form, setForm] = useState({
    email: "",
    password: "",
    full_name: "",
    stage_name: "",
    category: "",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function loadRoster() {
    const { data } = await client.get("/managers/roster");
    setRoster(data);
  }

  useEffect(() => {
    loadRoster();
  }, []);

  async function onboardCelebrity(e) {
    e.preventDefault();
    setError("");
    setSuccess("");
    try {
      await client.post("/managers/roster", form);
      setForm({ email: "", password: "", full_name: "", stage_name: "", category: "" });
      setSuccess("Celebrity onboarded successfully.");
      loadRoster();
    } catch (err) {
      setError(err.response?.data?.detail || "Could not onboard celebrity.");
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      <h1 className="text-2xl font-semibold text-brand-charcoal">Manager dashboard</h1>

      <section className="mt-8">
        <h2 className="text-lg font-semibold text-brand-charcoal">My roster</h2>
        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {roster.map((c) => (
            <div key={c.id} className="card">
              <h3 className="font-semibold text-brand-charcoal">{c.stage_name}</h3>
              {c.category && <p className="text-sm text-gray-500">{c.category}</p>}
            </div>
          ))}
        </div>
        {roster.length === 0 && <p className="mt-3 text-sm text-gray-500">No celebrities onboarded yet.</p>}
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold text-brand-charcoal">Onboard a new celebrity</h2>
        <form onSubmit={onboardCelebrity} className="card mt-3 space-y-3">
          {error && <p className="text-sm text-red-600">{error}</p>}
          {success && <p className="text-sm text-brand-greenDark">{success}</p>}

          <div>
            <label className="label">Full name</label>
            <input
              required
              className="input-field"
              value={form.full_name}
              onChange={(e) => setForm({ ...form, full_name: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Stage name</label>
            <input
              required
              className="input-field"
              value={form.stage_name}
              onChange={(e) => setForm({ ...form, stage_name: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Category</label>
            <input
              placeholder="Music, Film, Sports..."
              className="input-field"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Email</label>
            <input
              type="email"
              required
              className="input-field"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Temporary password</label>
            <input
              type="password"
              required
              className="input-field"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
          </div>
          <button type="submit" className="btn-primary">Onboard celebrity</button>
        </form>
      </section>
    </div>
  );
}
