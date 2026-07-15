import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../auth/AuthContext.jsx";

const ROLES = [
  { value: "fan", label: "Fan" },
  { value: "celebrity", label: "Celebrity" },
  { value: "agent", label: "Agent" },
  { value: "manager", label: "Manager" },
  { value: "sales_agent", label: "Ticket Sales Agent" },
];

export default function Signup() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const requestedRole = searchParams.get("role");
  const initialRole = ROLES.some((r) => r.value === requestedRole) ? requestedRole : "fan";
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    password: "",
    role: initialRole,
    stage_name: "",
    category: "",
    referral_code: searchParams.get("ref") || "",
  });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await register(form);
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.detail || "Sign up failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-md px-6 py-16">
      <h1 className="text-2xl font-semibold text-brand-charcoal">Create an account</h1>
      <p className="mt-1 text-sm text-gray-500">Join My Autograph as a fan, celebrity, agent, or manager.</p>

      <form onSubmit={handleSubmit} className="card mt-6 space-y-4">
        {error && <p className="text-sm text-red-600">{error}</p>}

        <div>
          <label className="label" htmlFor="full_name">Full name</label>
          <input
            id="full_name"
            required
            className="input-field"
            value={form.full_name}
            onChange={(e) => update("full_name", e.target.value)}
          />
        </div>

        <div>
          <label className="label" htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            required
            className="input-field"
            value={form.email}
            onChange={(e) => update("email", e.target.value)}
          />
        </div>

        <div>
          <label className="label" htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            required
            className="input-field"
            value={form.password}
            onChange={(e) => update("password", e.target.value)}
          />
        </div>

        <div>
          <label className="label" htmlFor="role">I am a...</label>
          <select
            id="role"
            className="input-field"
            value={form.role}
            onChange={(e) => update("role", e.target.value)}
          >
            {ROLES.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </div>

        {form.role === "sales_agent" && (
          <div>
            <label className="label" htmlFor="referral_code">Invite code</label>
            <input
              id="referral_code"
              required
              className="input-field"
              value={form.referral_code}
              onChange={(e) => update("referral_code", e.target.value)}
            />
            <p className="mt-1 text-xs text-gray-500">
              You need an invite code from a celebrity to register as a Ticket Sales Agent.
            </p>
          </div>
        )}

        {form.role === "celebrity" && (
          <>
            <div>
              <label className="label" htmlFor="stage_name">Stage name</label>
              <input
                id="stage_name"
                required
                className="input-field"
                value={form.stage_name}
                onChange={(e) => update("stage_name", e.target.value)}
              />
            </div>
            <div>
              <label className="label" htmlFor="category">Category</label>
              <input
                id="category"
                placeholder="Music, Film, Sports..."
                className="input-field"
                value={form.category}
                onChange={(e) => update("category", e.target.value)}
              />
            </div>
          </>
        )}

        <button type="submit" disabled={submitting} className="btn-primary w-full">
          {submitting ? "Creating account..." : "Sign up"}
        </button>
      </form>
    </div>
  );
}
