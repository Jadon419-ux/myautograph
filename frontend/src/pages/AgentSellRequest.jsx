import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import client from "../api/client.js";

const STATUS_STYLES = {
  pending: "bg-yellow-100 text-yellow-800",
  accepted: "bg-brand-greenLight text-brand-greenDark",
  declined: "bg-red-100 text-red-700",
};

export default function AgentSellRequest() {
  const { code } = useParams();
  const [request, setRequest] = useState(null);
  const [error, setError] = useState("");
  const [responding, setResponding] = useState(false);

  function load() {
    client
      .get(`/tickets/referrals/code/${code}`)
      .then(({ data }) => setRequest(data))
      .catch((err) => setError(err.response?.data?.detail || "This request could not be found."));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  async function respond(action) {
    setError("");
    setResponding(true);
    try {
      const { data } = await client.post(`/tickets/referrals/code/${code}/${action}`);
      setRequest(data);
    } catch (err) {
      setError(err.response?.data?.detail || "Could not process your response.");
    } finally {
      setResponding(false);
    }
  }

  return (
    <div className="mx-auto max-w-md px-6 py-16">
      <h1 className="text-center text-2xl font-semibold text-brand-charcoal">Agent sell request</h1>
      <p className="mt-1 text-center text-sm text-gray-500">My Autograph</p>

      {error && <p className="mt-6 text-center text-sm text-red-600">{error}</p>}
      {!request && !error && <p className="mt-6 text-center text-sm text-gray-500">Loading...</p>}

      {request && (
        <div className="card mt-6">
          <p className="text-sm text-gray-600">
            <span className="font-semibold text-brand-charcoal">{request.agent_name}</span> wants to
            help sell tickets for your event.
          </p>

          <div className="mt-4 space-y-2 border-t border-brand-border pt-4 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Event</span>
              <span className="font-medium text-brand-charcoal">{request.concert_title}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Venue</span>
              <span className="font-medium text-brand-charcoal">{request.venue}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Date</span>
              <span className="font-medium text-brand-charcoal">
                {new Date(request.event_date).toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Commission</span>
              <span className="font-medium text-brand-charcoal">{request.commission_percent}%</span>
            </div>
          </div>

          <div className="mt-4 border-t border-brand-border pt-4 text-center">
            <span
              className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${STATUS_STYLES[request.status]}`}
            >
              {request.status}
            </span>
          </div>

          {request.status === "pending" && (
            <div className="mt-5 flex gap-3">
              <button
                onClick={() => respond("accept")}
                disabled={responding}
                className="btn-primary flex-1"
              >
                Accept
              </button>
              <button
                onClick={() => respond("decline")}
                disabled={responding}
                className="btn-secondary flex-1"
              >
                Decline
              </button>
            </div>
          )}

          {request.status === "accepted" && (
            <p className="mt-4 text-center text-sm text-brand-greenDark">
              You've accepted this request. {request.agent_name} can now sell tickets for this event.
            </p>
          )}
          {request.status === "declined" && (
            <p className="mt-4 text-center text-sm text-gray-500">You've declined this request.</p>
          )}
        </div>
      )}
    </div>
  );
}
