import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import client from "../api/client.js";

const STATUS_STYLES = {
  pending_payment: "bg-yellow-100 text-yellow-800",
  valid: "bg-brand-greenLight text-brand-greenDark",
  checked_in: "bg-blue-100 text-blue-700",
  cancelled: "bg-red-100 text-red-700",
};

const STATUS_LABELS = {
  pending_payment: "Pending payment",
  valid: "Valid · Verified ✓",
  checked_in: "Checked in",
  cancelled: "Cancelled",
};

export default function TicketVerify() {
  const { token } = useParams();
  const [ticket, setTicket] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    client
      .get(`/tickets/verify/${token}`)
      .then(({ data }) => setTicket(data))
      .catch((err) => setError(err.response?.data?.detail || "This ticket could not be found."));
  }, [token]);

  return (
    <div className="mx-auto max-w-md px-6 py-16">
      <h1 className="text-center text-2xl font-semibold text-brand-charcoal">Ticket verification</h1>
      <p className="mt-1 text-center text-sm text-gray-500">My Autograph · Official ticket check</p>

      {error && <p className="mt-6 text-center text-sm text-red-600">{error}</p>}
      {!ticket && !error && <p className="mt-6 text-center text-sm text-gray-500">Checking ticket...</p>}

      {ticket && (
        <div className="card mt-6 text-center">
          <div className="mx-auto h-24 w-24 overflow-hidden rounded-full border-4 border-brand-greenLight bg-brand-gray">
            {ticket.holder_avatar_url ? (
              <img
                src={ticket.holder_avatar_url}
                alt={ticket.holder_name}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-3xl text-gray-400">👤</div>
            )}
          </div>
          <p className="mt-3 text-lg font-semibold text-brand-charcoal">{ticket.holder_name}</p>

          <span
            className={`mt-2 inline-block rounded-full px-3 py-1 text-xs font-semibold ${STATUS_STYLES[ticket.status]}`}
          >
            {STATUS_LABELS[ticket.status]}
          </span>

          <div className="mt-5 space-y-2 border-t border-brand-border pt-4 text-left text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">MA Unique ID</span>
              <span className="font-medium text-brand-charcoal">{ticket.ma_unique_id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Ticket ID</span>
              <span className="font-medium text-brand-charcoal">{ticket.ticket_number}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Category</span>
              <span className="font-medium text-brand-charcoal">{ticket.category_name}</span>
            </div>
          </div>

          <div className="mt-4 border-t border-brand-border pt-4 text-left">
            <p className="font-medium text-brand-charcoal">{ticket.concert_title}</p>
            <p className="text-sm text-gray-500">
              {ticket.venue} · {new Date(ticket.event_date).toLocaleString()}
            </p>
          </div>

          {ticket.checked_in_at && (
            <p className="mt-3 text-xs text-gray-400">
              Checked in {new Date(ticket.checked_in_at).toLocaleString()}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
