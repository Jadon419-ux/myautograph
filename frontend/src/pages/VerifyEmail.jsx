import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import client from "../api/client.js";
import { useAuth } from "../auth/AuthContext.jsx";

export default function VerifyEmail() {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [resendStatus, setResendStatus] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);

  if (user?.is_email_verified) {
    return <Navigate to="/dashboard" replace />;
  }

  async function submitCode(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await client.post("/auth/verify-email", { code });
      await refreshUser();
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.detail || "Could not verify this code.");
    } finally {
      setSubmitting(false);
    }
  }

  async function resendCode() {
    setError("");
    setResendStatus("");
    setResending(true);
    try {
      await client.post("/auth/resend-verification");
      setResendStatus("A new code has been sent to your email.");
    } catch (err) {
      setError(err.response?.data?.detail || "Could not resend a code.");
    } finally {
      setResending(false);
    }
  }

  return (
    <div className="mx-auto max-w-md px-6 py-16">
      <h1 className="text-2xl font-semibold text-brand-charcoal">Verify your email</h1>
      <p className="mt-1 text-sm text-gray-500">
        We sent a 6-digit code to <span className="font-medium text-brand-charcoal">{user?.email}</span>.
        Enter it below to activate your account.
      </p>

      <form onSubmit={submitCode} className="card mt-6 space-y-4">
        {error && <p className="text-sm text-red-600">{error}</p>}
        {resendStatus && <p className="text-sm text-brand-greenDark">{resendStatus}</p>}

        <div>
          <label className="label" htmlFor="code">Verification code</label>
          <input
            id="code"
            required
            maxLength={6}
            inputMode="numeric"
            className="input-field"
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
        </div>

        <button type="submit" disabled={submitting} className="btn-primary w-full">
          {submitting ? "Verifying..." : "Verify"}
        </button>

        <button
          type="button"
          disabled={resending}
          onClick={resendCode}
          className="w-full text-center text-sm text-brand-green hover:underline"
        >
          {resending ? "Sending..." : "Resend code"}
        </button>
      </form>
    </div>
  );
}
