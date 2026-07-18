import { useState } from "react";
import client from "../api/client.js";

export default function FollowButton({ kind, targetId, initialFollowing, className = "" }) {
  const [following, setFollowing] = useState(!!initialFollowing);
  const [busy, setBusy] = useState(false);

  async function toggle() {
    setBusy(true);
    try {
      const { data } = await client.post(`/social/follow/${kind}/${targetId}`);
      setFollowing(data.following);
    } catch {
      // ignore — button just stays in its current state
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      onClick={toggle}
      disabled={busy}
      className={`${following ? "btn-secondary" : "btn-primary"} ${className}`}
    >
      {following ? "Following" : "Follow"}
    </button>
  );
}
