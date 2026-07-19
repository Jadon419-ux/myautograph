import { useEffect, useState } from "react";
import client from "../../api/client.js";
import ImageUploadField from "../../components/ImageUploadField.jsx";

export default function CelebrityDashboard() {
  const [profile, setProfile] = useState(null);
  const [requests, setRequests] = useState([]);
  const [streams, setStreams] = useState([]);
  const [publishForm, setPublishForm] = useState({ request_id: "", content_url: "", caption: "" });
  const [streamForm, setStreamForm] = useState({ title: "", embed_url: "", scheduled_at: "" });
  const [error, setError] = useState("");

  const [referrals, setReferrals] = useState([]);
  const [salesAgentForms, setSalesAgentForms] = useState({});

  const [issuedAutographs, setIssuedAutographs] = useState([]);
  const [physicalForm, setPhysicalForm] = useState({
    recipient_name: "",
    recipient_email: "",
    content_url: "",
    caption: "",
    is_publicly_visible: true,
  });

  async function loadAll() {
    const { data: me } = await client.get("/celebrities/me");
    setProfile(me);
    const { data: incoming } = await client.get("/autographs/requests/incoming");
    setRequests(incoming);
    const { data: myStreams } = await client.get(`/streams/celebrity/${me.id}`);
    setStreams(myStreams);
    const { data: myReferrals } = await client.get("/tickets/referrals/mine");
    setReferrals(myReferrals);
    const { data: issued } = await client.get("/autographs/issued");
    setIssuedAutographs(issued);
  }

  useEffect(() => {
    loadAll();
  }, []);

  async function updateStatus(id, status) {
    await client.patch(`/autographs/requests/${id}`, { status });
    loadAll();
  }

  async function publishAutograph(e) {
    e.preventDefault();
    setError("");
    try {
      await client.post("/autographs", {
        request_id: publishForm.request_id ? Number(publishForm.request_id) : null,
        content_url: publishForm.content_url,
        caption: publishForm.caption,
      });
      setPublishForm({ request_id: "", content_url: "", caption: "" });
      loadAll();
    } catch (err) {
      setError(err.response?.data?.detail || "Could not publish autograph.");
    }
  }

  async function logPhysicalAutograph(e) {
    e.preventDefault();
    setError("");
    try {
      await client.post("/autographs/physical", physicalForm);
      setPhysicalForm({
        recipient_name: "",
        recipient_email: "",
        content_url: "",
        caption: "",
        is_publicly_visible: true,
      });
      loadAll();
    } catch (err) {
      setError(err.response?.data?.detail || "Could not log this autograph.");
    }
  }

  async function scheduleStream(e) {
    e.preventDefault();
    setError("");
    try {
      await client.post("/streams", streamForm);
      setStreamForm({ title: "", embed_url: "", scheduled_at: "" });
      loadAll();
    } catch (err) {
      setError(err.response?.data?.detail || "Could not schedule stream.");
    }
  }

  async function toggleLive(id) {
    await client.patch(`/streams/${id}/go-live`);
    loadAll();
  }

  async function respondToReferral(id, action) {
    setError("");
    try {
      await client.post(`/tickets/referrals/${id}/${action}`);
      loadAll();
    } catch (err) {
      setError(err.response?.data?.detail || "Could not respond to invite.");
    }
  }

  async function inviteSalesAgent(e, concertId) {
    e.preventDefault();
    setError("");
    const commission = salesAgentForms[concertId]?.commission_percent;
    try {
      await client.post(`/tickets/concerts/${concertId}/referrals/sales-agents`, {
        commission_percent: Number(commission),
      });
      setSalesAgentForms({ ...salesAgentForms, [concertId]: { commission_percent: "" } });
      loadAll();
    } catch (err) {
      setError(err.response?.data?.detail || "Could not create sales agent invite.");
    }
  }

  if (!profile) {
    return <div className="mx-auto max-w-4xl px-6 py-16 text-sm text-gray-500">Loading...</div>;
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      <h1 className="text-2xl font-semibold text-brand-charcoal">
        Celebrity dashboard — {profile.stage_name}
      </h1>
      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      {profile.verification_status === "pending" && (
        <div className="card mt-4 border-l-4 border-yellow-400 bg-yellow-50">
          <p className="text-sm font-medium text-yellow-800">Your account is pending verification</p>
          <p className="mt-1 text-sm text-yellow-700">
            You'll be able to publish autographs once an admin approves your profile.
          </p>
        </div>
      )}
      {profile.verification_status === "rejected" && (
        <div className="card mt-4 border-l-4 border-red-400 bg-red-50">
          <p className="text-sm font-medium text-red-800">Your verification was not approved</p>
          {profile.rejection_reason && (
            <p className="mt-1 text-sm text-red-700">Reason: {profile.rejection_reason}</p>
          )}
        </div>
      )}

      <section className="mt-8">
        <h2 className="text-lg font-semibold text-brand-charcoal">Incoming requests</h2>
        <div className="mt-3 space-y-3">
          {requests.map((r) => (
            <div key={r.id} className="card flex items-center justify-between gap-4">
              <div>
                <p className="text-sm text-gray-600">{r.message || "(no message)"}</p>
                <p className="mt-1 text-xs uppercase tracking-wide text-gray-400">{r.status}</p>
              </div>
              {r.status === "pending" && (
                <div className="flex shrink-0 gap-2">
                  <button className="btn-primary" onClick={() => updateStatus(r.id, "fulfilled")}>
                    Fulfill
                  </button>
                  <button className="btn-secondary" onClick={() => updateStatus(r.id, "declined")}>
                    Decline
                  </button>
                </div>
              )}
            </div>
          ))}
          {requests.length === 0 && <p className="text-sm text-gray-500">No requests yet.</p>}
        </div>
      </section>

      {profile.verification_status === "approved" && (
        <>
          <section className="mt-10">
            <h2 className="text-lg font-semibold text-brand-charcoal">Publish an autograph</h2>
            <form onSubmit={publishAutograph} className="card mt-3 space-y-3">
              <div>
                <label className="label">Link to request (optional)</label>
                <select
                  className="input-field"
                  value={publishForm.request_id}
                  onChange={(e) => setPublishForm({ ...publishForm, request_id: e.target.value })}
                >
                  <option value="">Not tied to a request</option>
                  {requests
                    .filter((r) => r.status !== "declined")
                    .map((r) => (
                      <option key={r.id} value={r.id}>
                        Request #{r.id} — {r.message?.slice(0, 40) || "(no message)"}
                      </option>
                    ))}
                </select>
              </div>
              <div>
                <label className="label">Image URL</label>
                <input
                  required
                  className="input-field"
                  value={publishForm.content_url}
                  onChange={(e) => setPublishForm({ ...publishForm, content_url: e.target.value })}
                />
              </div>
              <div>
                <label className="label">Caption</label>
                <input
                  className="input-field"
                  value={publishForm.caption}
                  onChange={(e) => setPublishForm({ ...publishForm, caption: e.target.value })}
                />
              </div>
              <button type="submit" className="btn-primary">Publish</button>
            </form>
          </section>

          <section className="mt-10">
            <h2 className="text-lg font-semibold text-brand-charcoal">Log a physical autograph</h2>
            <p className="mt-1 text-sm text-gray-500">
              Authenticate an autograph you gave out in person and add it to the fan's vault.
            </p>
            <form onSubmit={logPhysicalAutograph} className="card mt-3 space-y-3">
              <div>
                <label className="label">Recipient name</label>
                <input
                  required
                  className="input-field"
                  value={physicalForm.recipient_name}
                  onChange={(e) => setPhysicalForm({ ...physicalForm, recipient_name: e.target.value })}
                />
              </div>
              <div>
                <label className="label">Recipient email (optional — links it to their account if they have one)</label>
                <input
                  type="email"
                  className="input-field"
                  value={physicalForm.recipient_email}
                  onChange={(e) => setPhysicalForm({ ...physicalForm, recipient_email: e.target.value })}
                />
              </div>
              <ImageUploadField
                label="Photo of the autograph"
                value={physicalForm.content_url}
                onUploaded={(url) => setPhysicalForm({ ...physicalForm, content_url: url })}
              />
              <div>
                <label className="label">Caption</label>
                <input
                  className="input-field"
                  value={physicalForm.caption}
                  onChange={(e) => setPhysicalForm({ ...physicalForm, caption: e.target.value })}
                />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={physicalForm.is_publicly_visible}
                  onChange={(e) => setPhysicalForm({ ...physicalForm, is_publicly_visible: e.target.checked })}
                />
                Show recipient name publicly when this autograph is verified
              </label>
              <button type="submit" disabled={!physicalForm.content_url} className="btn-primary">
                Log autograph
              </button>
            </form>
          </section>
        </>
      )}

      <section className="mt-10">
        <h2 className="text-lg font-semibold text-brand-charcoal">My autograph history</h2>
        <div className="mt-3 space-y-2">
          {issuedAutographs.map((a) => (
            <div key={a.id} className="card flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-brand-charcoal capitalize">
                  {a.medium} {a.recipient_name && `— ${a.recipient_name}`}
                </p>
                <p className="text-xs text-gray-500">
                  {new Date(a.issued_at).toLocaleDateString()} · code: {a.verification_code}
                  {!a.owner_user_id && a.medium === "physical" && " · unclaimed"}
                </p>
              </div>
            </div>
          ))}
          {issuedAutographs.length === 0 && <p className="text-sm text-gray-500">No autographs issued yet.</p>}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold text-brand-charcoal">Streams</h2>
        <form onSubmit={scheduleStream} className="card mt-3 space-y-3">
          <div>
            <label className="label">Title</label>
            <input
              required
              className="input-field"
              value={streamForm.title}
              onChange={(e) => setStreamForm({ ...streamForm, title: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Embed URL (YouTube, Twitch, Vimeo)</label>
            <input
              required
              className="input-field"
              value={streamForm.embed_url}
              onChange={(e) => setStreamForm({ ...streamForm, embed_url: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Scheduled at</label>
            <input
              type="datetime-local"
              required
              className="input-field"
              value={streamForm.scheduled_at}
              onChange={(e) => setStreamForm({ ...streamForm, scheduled_at: e.target.value })}
            />
          </div>
          <button type="submit" className="btn-primary">Schedule stream</button>
        </form>

        <div className="mt-4 space-y-2">
          {streams.map((s) => (
            <div key={s.id} className="card flex items-center justify-between">
              <div>
                <p className="font-medium text-brand-charcoal">{s.title}</p>
                <p className="text-sm text-gray-500">{new Date(s.scheduled_at).toLocaleString()}</p>
              </div>
              <button
                className={s.is_live ? "btn-secondary" : "btn-primary"}
                onClick={() => toggleLive(s.id)}
              >
                {s.is_live ? "End live" : "Go live"}
              </button>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold text-brand-charcoal">Ticket sales</h2>

        <div className="mt-3 space-y-3">
          {referrals
            .filter((r) => r.invitee_role === "celebrity" && r.status === "pending")
            .map((r) => (
              <div key={r.id} className="card flex items-center justify-between gap-4">
                <p className="text-sm text-gray-600">
                  Invite to sell tickets for concert #{r.concert_id} — {r.commission_percent}% commission
                </p>
                <div className="flex shrink-0 gap-2">
                  <button className="btn-primary" onClick={() => respondToReferral(r.id, "accept")}>
                    Accept
                  </button>
                  <button className="btn-secondary" onClick={() => respondToReferral(r.id, "decline")}>
                    Decline
                  </button>
                </div>
              </div>
            ))}

          {referrals
            .filter((r) => r.invitee_role === "celebrity" && r.status === "accepted")
            .map((r) => {
              const purchaseLink = `${window.location.origin}/concerts/${r.concert_id}?ref=${r.code}`;
              const subAgents = referrals.filter((s) => s.parent_referral_link_id === r.id);
              return (
                <div key={r.id} className="card">
                  <p className="text-sm text-gray-600">
                    Concert #{r.concert_id} — {r.commission_percent}% commission
                  </p>
                  <p className="mt-2 break-all text-xs text-gray-500">{purchaseLink}</p>

                  {subAgents.length > 0 && (
                    <div className="mt-3 space-y-1">
                      {subAgents.map((s) => (
                        <p key={s.id} className="text-xs text-gray-500">
                          Sales agent invite ({s.commission_percent}% commission) — {s.status}
                          {s.status === "pending" && (
                            <>
                              {" — "}
                              <span className="break-all">
                                {`${window.location.origin}/signup?role=sales_agent&ref=${s.code}`}
                              </span>
                            </>
                          )}
                        </p>
                      ))}
                    </div>
                  )}

                  <form
                    onSubmit={(e) => inviteSalesAgent(e, r.concert_id)}
                    className="mt-3 flex items-end gap-2 border-t border-brand-border pt-3"
                  >
                    <div className="flex-1">
                      <label className="label">Invite a sales agent — commission %</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        required
                        className="input-field"
                        value={salesAgentForms[r.concert_id]?.commission_percent || ""}
                        onChange={(e) =>
                          setSalesAgentForms({
                            ...salesAgentForms,
                            [r.concert_id]: { commission_percent: e.target.value },
                          })
                        }
                      />
                    </div>
                    <button type="submit" className="btn-secondary">Invite</button>
                  </form>
                </div>
              );
            })}

          {referrals.filter((r) => r.invitee_role === "celebrity").length === 0 && (
            <p className="text-sm text-gray-500">No ticket sales invites yet.</p>
          )}
        </div>
      </section>
    </div>
  );
}
