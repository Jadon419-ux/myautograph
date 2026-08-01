import { useState } from "react";

export default function ShareProfileLink({ celebrityId }) {
  const [copied, setCopied] = useState(false);
  const url = `${window.location.origin}/celebrities/${celebrityId}`;

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore — clipboard access may be unavailable in this context
    }
  }

  return (
    <div className="flex gap-2">
      <input readOnly className="input-field" value={url} onFocus={(e) => e.target.select()} />
      <button type="button" className="btn-secondary shrink-0" onClick={copyLink}>
        {copied ? "Copied!" : "Copy link"}
      </button>
    </div>
  );
}
