import { useEffect, useState } from "react";

export default function Typewriter({
  text,
  typingSpeedMs = 60,
  deletingSpeedMs = 30,
  pauseMs = 1800,
  className = "",
}) {
  const [displayed, setDisplayed] = useState("");
  const [phase, setPhase] = useState("typing");

  useEffect(() => {
    let timeout;

    if (phase === "typing") {
      if (displayed.length < text.length) {
        timeout = setTimeout(() => {
          setDisplayed(text.slice(0, displayed.length + 1));
        }, typingSpeedMs);
      } else {
        timeout = setTimeout(() => setPhase("deleting"), pauseMs);
      }
    } else {
      if (displayed.length > 0) {
        timeout = setTimeout(() => {
          setDisplayed(text.slice(0, displayed.length - 1));
        }, deletingSpeedMs);
      } else {
        setPhase("typing");
      }
    }

    return () => clearTimeout(timeout);
  }, [displayed, phase, text, typingSpeedMs, deletingSpeedMs, pauseMs]);

  return (
    <span className={className}>
      {displayed}
      <span className="animate-pulse">|</span>
    </span>
  );
}
