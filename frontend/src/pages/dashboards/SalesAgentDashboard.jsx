import { useEffect, useState } from "react";
import client from "../../api/client.js";

export default function SalesAgentDashboard() {
  const [referrals, setReferrals] = useState([]);

  useEffect(() => {
    client.get("/tickets/referrals/mine").then(({ data }) => setReferrals(data));
  }, []);

  const myLinks = referrals.filter((r) => r.invitee_role === "sales_agent" && r.status === "accepted");

  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      <h1 className="text-2xl font-semibold text-brand-charcoal">Sales agent dashboard</h1>

      <section className="mt-8">
        <h2 className="text-lg font-semibold text-brand-charcoal">My referral links</h2>
        <div className="mt-3 space-y-3">
          {myLinks.map((r) => {
            const link = `${window.location.origin}/concerts/${r.concert_id}?ref=${r.code}`;
            return (
              <div key={r.id} className="card">
                <p className="text-sm text-gray-600">
                  Concert #{r.concert_id} — {r.commission_percent}% commission
                </p>
                <p className="mt-2 break-all text-xs text-gray-500">{link}</p>
              </div>
            );
          })}
          {myLinks.length === 0 && (
            <p className="text-sm text-gray-500">
              You don't have any active referral links yet. A celebrity needs to invite you first.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
