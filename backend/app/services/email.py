import smtplib
from email.mime.text import MIMEText
from email.utils import formataddr

from app.config import settings

SENDER_DISPLAY_NAME = "My Autograph"


def send_verification_email(to_email: str, code: str) -> None:
    if not settings.smtp_password:
        print(f"[DEV] Verification code for {to_email}: {code}")
        return

    message = MIMEText(
        f"Your My Autograph verification code is: {code}\n\n"
        "This code expires in 15 minutes. If you didn't request this, you can ignore this email."
    )
    message["Subject"] = "Verify your My Autograph account"
    message["From"] = formataddr((SENDER_DISPLAY_NAME, settings.smtp_username))
    message["To"] = to_email

    try:
        with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=10) as server:
            server.starttls()
            server.login(settings.smtp_username, settings.smtp_password)
            server.sendmail(settings.smtp_username, [to_email], message.as_string())
    except (smtplib.SMTPException, OSError) as exc:
        print(f"Failed to send verification email to {to_email}: {exc}")
