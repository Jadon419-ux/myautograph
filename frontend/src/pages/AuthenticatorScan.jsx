import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import client from "../api/client.js";
import QrScanner from "../components/QrScanner.jsx";

const STATUS_STYLES = {
  pending_payment: "bg-yellow-100 text-yellow-800",
  valid: "bg-brand-greenLight text-brand-greenDark",
  checked_in: "bg-blue-100 text-blue-700",
  cancelled: "bg-red-100 text-red-700",
};

function extractTicketToken(raw) {
  const trimmed = (raw || "").trim();
  const match = trimmed.match(/\/tickets\/verify\/([^/?#]+)/);
  return match ? match[1] : trimmed;
}

export default function AuthenticatorScan() {
  const { concertId } = useParams();
  const [concert, setConcert] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [manualToken, setManualToken] = useState("");
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    client
      .get(`/concerts/${concertId}`)
      .then(({ data }) => setConcert(data))
      .catch(() => setConcert(null));
  }, [concertId]);

  async function handleScan(rawToken) {
    if (checking) return;
    setChecking(true);
    setError("");
    try {
      const token = extractTicketToken(rawToken);
      const { data } = await client.post(`/tickets/checkin/${token}`);
      setResult(data);
    } catch (err) {
      setError(err.response?.data?.detail || "Could not verify this ticket.");
    } finally {
      setChecking(false);
    }
  }

  async function handleManualCheck(e) {
    e.preventDefault();
    if (!manualToken.trim()) return;
    await handleScan(manualToken);
    setManualToken("");
  }

  function scanNext() {
    setResult(null);
    setError("");
  }

  return (
    <div className="mx-auto max-w-md px-6 py-12">
      <h1 className="text-2xl font-semibold text-brand-charcoal">Authenticate tickets</h1>
      <p className="mt-1 text-sm text-gray-500">
        {concert ? `For ${concert.title}` : "Scan a ticket's QR code to verify and check the holder in."}
      </p>

      {!result && (
        <div className="card mt-6">
          <QrScanner onScan={handleScan} />
          {checking && <p className="mt-3 text-center text-sm text-gray-500">Checking ticket...</p>}
          {error && <p className="mt-3 text-center text-sm text-red-600">{error}</p>}

          <form onSubmit={handleManualCheck} className="mt-4 flex gap-2 border-t border-brand-border pt-4">
            <input
              className="input-field"
              placeholder="Or paste ticket code..."
              value={manualToken}
              onChange={(e) => setManualToken(e.target.value)}
            />
            <button type="submit" className="btn-primary shrink-0">Check</button>
          </form>
        </div>
      )}

      {result && (
        <div className="card mt-6 text-center">
          <div className="mx-auto h-24 w-24 overflow-hidden rounded-full border-4 border-brand-greenLight bg-brand-gray">
            {result.holder_avatar_url ? (
              <img
                src={result.holder_avatar_url}
                alt={result.recipient_name}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-3xl text-gray-400">👤</div>
            )}
          </div>
          <p className="mt-3 text-lg font-semibold text-brand-charcoal">
            {result.recipient_name || "Guest"}
          </p>

          <span
            className={`mt-2 inline-block rounded-full px-3 py-1 text-xs font-semibold ${
              STATUS_STYLES[result.status] || "bg-gray-100 text-gray-700"
            }`}
          >
            {result.status === "checked_in" ? "✓ Checked in" : result.status.replace("_", " ")}
          </span>
          {result.status === "checked_in" && result.checked_in_at && (
            <p className="mt-1 text-xs text-gray-500">
              {new Date(result.checked_in_at).toLocaleString()}
            </p>
          )}

          <div className="mt-5 space-y-2 border-t border-brand-border pt-4 text-left text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">MA Unique ID</span>
              <span className="font-medium text-brand-charcoal">{result.ma_unique_id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Ticket ID</span>
              <span className="font-medium text-brand-charcoal">{result.ticket_number}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Category</span>
              <span className="font-medium text-brand-charcoal">{result.category_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Event</span>
              <span className="font-medium text-brand-charcoal">{result.concert_title}</span>
            </div>
          </div>

          <button onClick={scanNext} className="btn-primary mt-5 w-full">
            Scan next
          </button>
        </div>
      )}
    </div>
  );
}
