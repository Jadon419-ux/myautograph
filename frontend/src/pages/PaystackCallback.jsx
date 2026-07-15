import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import client from "../api/client.js";

export default function PaystackCallback() {
  const [searchParams] = useSearchParams();
  const reference = searchParams.get("reference") || searchParams.get("trxref");
  const [status, setStatus] = useState("checking");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!reference) {
      setStatus("error");
      setError("No payment reference found.");
      return;
    }
    client
      .get("/payments/verify", { params: { reference } })
      .then(({ data }) => {
        setStatus(data.status === "paid" ? "success" : "failed");
      })
      .catch((err) => {
        setStatus("error");
        setError(err.response?.data?.detail || "Could not verify payment.");
      });
  }, [reference]);

  return (
    <div className="mx-auto max-w-md px-6 py-16 text-center">
      <div className="card">
        {status === "checking" && <p className="text-sm text-gray-500">Verifying your payment...</p>}
        {status === "success" && (
          <>
            <h1 className="text-xl font-semibold text-brand-charcoal">Payment successful</h1>
            <p className="mt-2 text-sm text-gray-600">
              Your ticket is confirmed. You'll find it in your ticket vault.
            </p>
            <Link to="/dashboard" className="btn-primary mt-4 inline-block">
              Go to dashboard
            </Link>
          </>
        )}
        {status === "failed" && (
          <>
            <h1 className="text-xl font-semibold text-brand-charcoal">Payment not completed</h1>
            <p className="mt-2 text-sm text-gray-600">Your payment could not be confirmed.</p>
          </>
        )}
        {status === "error" && (
          <>
            <h1 className="text-xl font-semibold text-brand-charcoal">Something went wrong</h1>
            <p className="mt-2 text-sm text-red-600">{error}</p>
          </>
        )}
      </div>
    </div>
  );
}
