import smtplib
from email.mime.text import MIMEText

from app.config import settings


def send_verification_email(to_email: str, code: str) -> None:
    if not settings.smtp_password:
        print(f"[DEV] Verification code for {to_email}: {code}")
        return

    message = MIMEText(
        f"Your My Autograph verification code is: {code}\n\n"
        "This code expires in 15 minutes. If you didn't request this, you can ignore this email."
    )
    message["Subject"] = "Verify your My Autograph account"
    message["From"] = settings.smtp_from_email or settings.smtp_username
    message["To"] = to_email

    try:
        with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=10) as server:
            server.starttls()
            server.login(settings.smtp_username, settings.smtp_password)
            server.sendmail(message["From"], [to_email], message.as_string())
    except (smtplib.SMTPException, OSError) as exc:
        print(f"Failed to send verification email to {to_email}: {exc}")
