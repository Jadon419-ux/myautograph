import { QRCodeSVG } from "qrcode.react";
import iconMark from "../assets/icon-mark.png";

const STATUS_BANNER = {
  valid: {
    label: "VERIFIED TICKET",
    note: "Valid · Secure · Non-transferable unless transferred through My Autograph",
    bg: "bg-brand-charcoal",
    accent: "text-brand-green",
  },
  checked_in: {
    label: "CHECKED IN",
    note: "This ticket has already been used for entry",
    bg: "bg-blue-950",
    accent: "text-blue-400",
  },
  cancelled: {
    label: "CANCELLED",
    note: "This ticket is no longer valid",
    bg: "bg-red-950",
    accent: "text-red-400",
  },
  pending_payment: {
    label: "PENDING PAYMENT",
    note: "Not active until payment is confirmed",
    bg: "bg-yellow-950",
    accent: "text-yellow-400",
  },
};

function verifyUrl(qrToken) {
  return `${window.location.origin}/tickets/verify/${qrToken}`;
}

function TicketStub({ ticket, banner }) {
  return (
    <div className="w-full shrink-0 sm:w-72">
      <div className="flex items-center justify-center gap-3 py-5">
        <img src={iconMark} alt="My Autograph" className="h-14 w-14 rounded-lg object-cover" />
        <span className="text-2xl font-semibold leading-tight text-brand-charcoal">
          My <span className="font-bold">Autograph</span>
        </span>
      </div>

      <div className="bg-brand-charcoal py-2 text-center text-sm font-semibold tracking-wide text-brand-green">
        ★ EVENT TICKET ★
      </div>

      <div className="px-5 pt-5">
        <div className="overflow-hidden rounded-xl border border-brand-border">
          <div className="bg-brand-greenDark py-1.5 text-center text-xs font-semibold tracking-wide text-white">
            SCAN TO VERIFY
          </div>
          <div className="flex justify-center bg-white p-4">
            <QRCodeSVG value={verifyUrl(ticket.qr_token)} size={160} />
          </div>
        </div>
      </div>

      <div className="mx-5 my-4 border-t border-dashed border-brand-border" />

      <div className="space-y-3 px-5 text-sm">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-greenDark">Ticket holder</p>
          <p className="font-semibold text-brand-charcoal">{ticket.recipient_name || "Guest"}</p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-greenDark">MA unique ID</p>
          <p className="font-semibold text-brand-charcoal">{ticket.ma_unique_id}</p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-greenDark">Ticket ID</p>
          <p className="font-semibold text-brand-charcoal">{ticket.ticket_number}</p>
        </div>
        {ticket.concert_title && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-greenDark">Event</p>
            <p className="font-semibold text-brand-charcoal">{ticket.concert_title}</p>
            <p className="text-xs text-gray-500">
              {ticket.venue} · {new Date(ticket.event_date).toLocaleString()}
            </p>
          </div>
        )}
      </div>

      <div className={`mx-5 mt-4 rounded-lg ${banner.bg} p-3 text-center`}>
        <p className={`text-xs font-bold tracking-wide ${banner.accent}`}>🛡 {banner.label}</p>
        <p className="mt-1 text-[11px] text-gray-300">{banner.note}</p>
      </div>

      <div className="mt-4 bg-brand-green py-2 text-center text-xs font-medium text-white">
        🌐 myautographma.com
      </div>
    </div>
  );
}

export default function TicketCard({ ticket }) {
  const banner = STATUS_BANNER[ticket.status] || STATUS_BANNER.valid;
  const hasFlyer = Boolean(ticket.concert_flyer_url);

  if (!hasFlyer) {
    return (
      <div className="mx-auto w-full max-w-xs overflow-hidden rounded-2xl border border-brand-border bg-white shadow-sm">
        <TicketStub ticket={ticket} banner={banner} />
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-brand-border bg-white shadow-sm sm:flex-row">
      <div className="min-h-[220px] flex-1 bg-brand-gray">
        <img
          src={ticket.concert_flyer_url}
          alt={ticket.concert_title || "Event flyer"}
          className="h-full w-full object-cover"
        />
      </div>
      <div className="border-t-2 border-dashed border-brand-border sm:border-l-2 sm:border-t-0" />
      <TicketStub ticket={ticket} banner={banner} />
    </div>
  );
}
