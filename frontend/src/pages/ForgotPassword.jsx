import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import client from "../api/client.js";
import PasswordField from "../components/PasswordField.jsx";

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [step, setStep] = useState("request");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function requestCode(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await client.post("/auth/forgot-password", { email });
      setInfo("If an account exists for that email, a reset code has been sent.");
      setStep("reset");
    } catch (err) {
      setError(err.response?.data?.detail || "Could not send a reset code.");
    } finally {
      setSubmitting(false);
    }
  }

  async function resetPassword(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await client.post("/auth/reset-password", { email, code, new_password: newPassword });
      navigate("/login");
    } catch (err) {
      setError(err.response?.data?.detail || "Could not reset your password.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-md px-6 py-16">
      <h1 className="text-2xl font-semibold text-brand-charcoal">Reset your password</h1>
      <p className="mt-1 text-sm text-gray-500">
        {step === "request"
          ? "Enter your account email and we'll send you a reset code."
          : `Enter the code sent to ${email} and choose a new password.`}
      </p>

      {step === "request" ? (
        <form onSubmit={requestCode} className="card mt-6 space-y-4">
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

          <button type="submit" disabled={submitting} className="btn-primary w-full">
            {submitting ? "Sending..." : "Send reset code"}
          </button>

          <Link to="/login" className="block text-center text-sm text-brand-green hover:underline">
            Back to log in
          </Link>
        </form>
      ) : (
        <form onSubmit={resetPassword} className="card mt-6 space-y-4">
          {info && <p className="text-sm text-brand-greenDark">{info}</p>}
          {error && <p className="text-sm text-red-600">{error}</p>}

          <div>
            <label className="label" htmlFor="code">Reset code</label>
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

          <PasswordField
            id="new_password"
            label="New password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />

          <button type="submit" disabled={submitting} className="btn-primary w-full">
            {submitting ? "Resetting..." : "Reset password"}
          </button>

          <button
            type="button"
            onClick={() => setStep("request")}
            className="w-full text-center text-sm text-brand-green hover:underline"
          >
            Resend code
          </button>
        </form>
      )}
    </div>
  );
}
