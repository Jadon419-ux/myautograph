import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import client from "../api/client.js";
import QrScanner from "../components/QrScanner.jsx";

export default function VerifyAutograph() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [code, setCode] = useState(searchParams.get("code") || "");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showScanner, setShowScanner] = useState(false);

  async function verifyCode(rawCode) {
    const trimmed = rawCode.trim();
    if (!trimmed) return;

    // A scanned ticket QR encodes a full /tickets/verify/<token> link - hand off to that page
    // instead of treating it as an autograph code.
    const ticketMatch = trimmed.match(/\/tickets\/verify\/([^/?#]+)/);
    if (ticketMatch) {
      navigate(`/tickets/verify/${ticketMatch[1]}`);
      return;
    }

    setError("");
    setResult(null);
    setLoading(true);
    try {
      const { data } = await client.get(`/autographs/verify/${trimmed}`);
      setResult(data);
    } catch (err) {
      setError(err.response?.data?.detail || "Could not verify this code.");
    } finally {
      setLoading(false);
    }
  }

  function handleSearch(e) {
    e.preventDefault();
    verifyCode(code);
  }

  function handleScan(decodedText) {
    setShowScanner(false);
    setCode(decodedText);
    verifyCode(decodedText);
  }

  return (
    <div className="mx-auto max-w-md px-6 py-16">
      <h1 className="text-2xl font-semibold text-brand-charcoal">Verify</h1>
      <p className="mt-1 text-sm text-gray-500">
        Scan a ticket or autograph QR code, paste a verification link, or type a code to confirm
        it's authentic.
      </p>

      <div className="card mt-6">
        <button type="button" onClick={() => setShowScanner((s) => !s)} className="btn-secondary w-full">
          {showScanner ? "Stop camera" : "Scan a QR code"}
        </button>
        {showScanner && (
          <div className="mt-4">
            <QrScanner onScan={handleScan} />
          </div>
        )}

        <form onSubmit={handleSearch} className="mt-4 space-y-3 border-t border-brand-border pt-4">
          <div>
            <label className="label" htmlFor="code">
              Verification code or link
            </label>
            <input
              id="code"
              required
              className="input-field"
              placeholder="Paste a code or a myautographma.com verification link..."
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
          </div>
          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? "Checking..." : "Verify"}
          </button>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </form>
      </div>

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
