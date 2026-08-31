import smtplib
from email.mime.application import MIMEApplication
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.utils import formataddr

from app.config import settings

SENDER_DISPLAY_NAME = "My Autograph"


def _deliver(message, to_email: str, dev_label: str, dev_detail: str) -> None:
    if not settings.smtp_password:
        print(f"[DEV] {dev_label} for {to_email}: {dev_detail}")
        return

    try:
        with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=20) as server:
            server.starttls()
            server.login(settings.smtp_username, settings.smtp_password)
            server.sendmail(settings.smtp_username, [to_email], message.as_string())
    except (smtplib.SMTPException, OSError) as exc:
        print(f"Failed to send email to {to_email}: {exc}")


def _send_code_email(to_email: str, subject: str, body: str, code: str, dev_label: str) -> None:
    message = MIMEText(body)
    message["Subject"] = subject
    message["From"] = formataddr((SENDER_DISPLAY_NAME, settings.smtp_username))
    message["To"] = to_email
    _deliver(message, to_email, dev_label, code)


def send_verification_email(to_email: str, code: str) -> None:
    _send_code_email(
        to_email,
        subject="Verify your My Autograph account",
        body=(
            f"Your My Autograph verification code is: {code}\n\n"
            "This code expires in 15 minutes. If you didn't request this, you can ignore this email."
        ),
        code=code,
        dev_label="Verification code",
    )


def send_password_reset_email(to_email: str, code: str) -> None:
    _send_code_email(
        to_email,
        subject="Reset your My Autograph password",
        body=(
            f"Your My Autograph password reset code is: {code}\n\n"
            "This code expires in 15 minutes. If you didn't request this, you can ignore this email "
            "— your password will not be changed."
        ),
        code=code,
        dev_label="Password reset code",
    )


def send_ticket_purchase_email(
    to_email: str,
    account_name: str,
    concert_title: str,
    venue: str,
    event_time_text: str,
    purchase_time_text: str,
    ticket_lines: list[str],
    ticket_pdf: bytes,
    receipt_pdf: bytes,
) -> None:
    body = "\n".join(
        [
            f"Hi {account_name},",
            "",
            f"Your My Autograph ticket purchase for {concert_title} is confirmed.",
            "",
            f"Account name: {account_name}",
            f"Event: {concert_title}",
            f"Venue: {venue}",
            f"Event time: {event_time_text}",
            f"Purchased: {purchase_time_text}",
            "",
            "Tickets:",
            *[f"  - {line}" for line in ticket_lines],
            "",
            "Your ticket(s) and purchase receipt are attached as PDFs. Present the ticket QR "
            "code at the venue for entry.",
            "",
            "- My Autograph",
        ]
    )

    message = MIMEMultipart()
    message["Subject"] = f"Your My Autograph ticket - {concert_title}"
    message["From"] = formataddr((SENDER_DISPLAY_NAME, settings.smtp_username))
    message["To"] = to_email
    message.attach(MIMEText(body, "plain"))

    for filename, data in (("ticket.pdf", ticket_pdf), ("receipt.pdf", receipt_pdf)):
        part = MIMEApplication(data, _subtype="pdf")
        part.add_header("Content-Disposition", "attachment", filename=filename)
        message.attach(part)

    _deliver(message, to_email, "Ticket purchase email", concert_title)
