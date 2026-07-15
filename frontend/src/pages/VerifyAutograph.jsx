import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import client from "../api/client.js";

export default function VerifyAutograph() {
  const [searchParams] = useSearchParams();
  const [code, setCode] = useState(searchParams.get("code") || "");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSearch(e) {
    e.preventDefault();
    if (!code.trim()) return;
    setError("");
    setResult(null);
    setLoading(true);
    try {
      const { data } = await client.get(`/autographs/verify/${code.trim()}`);
      setResult(data);
    } catch (err) {
      setError(err.response?.data?.detail || "Could not verify this code.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-md px-6 py-16">
      <h1 className="text-2xl font-semibold text-brand-charcoal">Verify an autograph</h1>
      <p className="mt-1 text-sm text-gray-500">
        Enter a verification code to confirm an autograph's authenticity and ownership history.
      </p>

      <form onSubmit={handleSearch} className="card mt-6 space-y-3">
        <div>
          <label className="label" htmlFor="code">Verification code</label>
          <input
            id="code"
            required
            className="input-field"
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
        </div>
        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? "Checking..." : "Verify"}
        </button>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </form>

      {result && (
        <div className="card mt-6">
          <img src={result.content_url} alt={result.caption} className="w-full rounded-md object-cover" />
          <div className="mt-4 flex items-center gap-2">
            <span className="rounded-full bg-brand-greenLight px-3 py-1 text-xs font-semibold text-brand-greenDark">
              Authenticated ✓
            </span>
            <span className="rounded-full bg-brand-gray px-3 py-1 text-xs font-medium text-gray-600 capitalize">
              {result.medium}
            </span>
          </div>
          <p className="mt-3 text-sm text-gray-600">
            Issued by <span className="font-medium text-brand-charcoal">{result.celebrity_stage_name}</span> on{" "}
            {new Date(result.issued_at).toLocaleDateString()}
          </p>
          {result.caption && <p className="mt-1 text-sm text-gray-600">{result.caption}</p>}
          {result.recipient_name && (
            <p className="mt-1 text-sm text-gray-600">Originally given to {result.recipient_name}</p>
          )}
          {result.owner_name && (
            <p className="mt-1 text-sm text-gray-600">Currently held by {result.owner_name}</p>
          )}
          {!result.owner_name && !result.recipient_name && (
            <p className="mt-1 text-sm text-gray-400">Ownership details are private.</p>
          )}
          <p className="mt-3 text-xs text-gray-400">
            Ownership history: {result.transfer_count} recorded transfer{result.transfer_count === 1 ? "" : "s"}
          </p>
        </div>
      )}
    </div>
  );
}
