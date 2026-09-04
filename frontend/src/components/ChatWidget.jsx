import { useEffect, useRef, useState } from "react";
import client from "../api/client.js";
import { BRAND } from "../brand.js";

const SUPPORT_MAILTO = `mailto:${BRAND.email}?subject=${encodeURIComponent(
  "My Autograph Support Request"
)}`;

const GREETING = {
  role: "assistant",
  content:
    "Hi! I'm the My Autograph assistant. Ask me anything about buying tickets, following celebrities, your wallet, becoming an agent or manager, or anything else on the platform.",
};

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([GREETING]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, open]);

  async function sendMessage(e) {
    e.preventDefault();
    const text = input.trim();
    if (!text || sending) return;

    const history = messages;
    const nextMessages = [...messages, { role: "user", content: text }];
    setMessages(nextMessages);
    setInput("");
    setError("");
    setSending(true);
    try {
      const { data } = await client.post("/chatbot/message", {
        message: text,
        history: history.map(({ role, content }) => ({ role, content })),
      });
      setMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);
    } catch (err) {
      setError(err.response?.data?.detail || "Could not reach the assistant. Please try again.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="fixed bottom-5 right-5 z-50">
      {open && (
        <div className="mb-3 flex h-[28rem] w-80 flex-col overflow-hidden rounded-2xl border border-brand-border bg-white shadow-xl sm:w-96">
          <div className="flex items-center justify-between bg-brand-charcoal px-4 py-3">
            <p className="text-sm font-semibold text-white">My Autograph Assistant</p>
            <button
              onClick={() => setOpen(false)}
              aria-label="Close chat"
              className="text-gray-300 hover:text-white"
            >
              ✕
            </button>
          </div>

          <a
            href={SUPPORT_MAILTO}
            className="flex items-center justify-center gap-1.5 border-b border-brand-border bg-brand-greenLight px-4 py-2 text-xs font-medium text-brand-greenDark hover:opacity-80"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16v12H4z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="m4 7 8 6 8-6" />
            </svg>
            Having a technical issue? Email {BRAND.email}
          </a>

          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                    m.role === "user"
                      ? "bg-brand-green text-white"
                      : "bg-brand-gray text-brand-charcoal"
                  }`}
                >
                  {m.content}
                </div>
              </div>
            ))}
            {sending && (
              <div className="flex justify-start">
                <div className="max-w-[85%] rounded-lg bg-brand-gray px-3 py-2 text-sm text-gray-500">
                  Typing...
                </div>
              </div>
            )}
          </div>

          {error && (
            <div className="px-4 pb-2">
              <p className="text-xs text-red-600">{error}</p>
              <a
                href={SUPPORT_MAILTO}
                className="btn-secondary mt-2 inline-block w-full text-center text-xs"
              >
                Email customer support instead
              </a>
            </div>
          )}

          <form onSubmit={sendMessage} className="flex gap-2 border-t border-brand-border p-3">
            <input
              className="input-field"
              placeholder="Ask a question..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={sending}
            />
            <button type="submit" className="btn-primary shrink-0" disabled={sending}>
              Send
            </button>
          </form>
        </div>
      )}

      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Close assistant" : "Open assistant"}
        className="ml-auto flex h-14 w-14 items-center justify-center rounded-full bg-brand-green text-white shadow-lg transition hover:opacity-90"
      >
        {open ? (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-6 w-6">
            <path strokeLinecap="round" d="M6 6l12 12M18 6L6 18" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6">
            <path d="M4 4h16a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H9l-4 4v-4H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Z" />
          </svg>
        )}
      </button>
    </div>
  );
}
