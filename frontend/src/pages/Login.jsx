import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext.jsx";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await login(email, password);
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.detail || "Login failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-md px-6 py-16">
      <h1 className="text-2xl font-semibold text-brand-charcoal">Log in</h1>
      <p className="mt-1 text-sm text-gray-500">Welcome back to My Autograph.</p>

      <form onSubmit={handleSubmit} className="card mt-6 space-y-4">
        {error && <p className="text-sm text-red-600">{error}</p>}

        <div>
          <label className="label" htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            required
            className="input-field"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div>
          <label className="label" htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            required
            className="input-field"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <button type="submit" disabled={submitting} className="btn-primary w-full">
          {submitting ? "Logging in..." : "Log in"}
        </button>
      </form>
    </div>
  );
}
