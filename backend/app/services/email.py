import smtplib
from email.mime.text import MIMEText
from email.utils import formataddr

from app.config import settings

SENDER_DISPLAY_NAME = "My Autograph"


def _send_code_email(to_email: str, subject: str, body: str, code: str, dev_label: str) -> None:
    if not settings.smtp_password:
        print(f"[DEV] {dev_label} for {to_email}: {code}")
        return

    message = MIMEText(body)
    message["Subject"] = subject
    message["From"] = formataddr((SENDER_DISPLAY_NAME, settings.smtp_username))
    message["To"] = to_email

    try:
        with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=10) as server:
            server.starttls()
            server.login(settings.smtp_username, settings.smtp_password)
            server.sendmail(settings.smtp_username, [to_email], message.as_string())
    except (smtplib.SMTPException, OSError) as exc:
        print(f"Failed to send email to {to_email}: {exc}")


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
