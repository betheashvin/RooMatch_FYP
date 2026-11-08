"""SMTP OTP delivery, with an explicitly enabled local console mode."""

from email.message import EmailMessage
import logging
import os
import smtplib


def send_verification_email(email: str, otp: str) -> None:
    _send_code(email, otp, "verification", "Verify your RooMatch email")


def send_password_reset_email(email: str, otp: str) -> None:
    _send_code(email, otp, "password reset", "Reset your RooMatch password")


def _send_code(email: str, otp: str, purpose: str, subject: str) -> None:
    if os.getenv("EMAIL_DELIVERY", "smtp") == "console":
        logging.getLogger(__name__).warning("LOCAL DEVELOPMENT ONLY: %s code for %s: %s", purpose, email, otp)
        return
    host = os.getenv("SMTP_HOST")
    sender = os.getenv("SMTP_FROM")
    if not host or not sender:
        logging.getLogger(__name__).warning("Email delivery is not configured: set SMTP_HOST and SMTP_FROM.")
        raise RuntimeError("SMTP is not configured.")
    if "://" in host or "/" in host or any(character.isspace() for character in host):
        logging.getLogger(__name__).warning("SMTP_HOST must be a mail-server hostname, such as smtp.gmail.com, without a URL scheme or path.")
        raise RuntimeError("SMTP_HOST must be a hostname.")
    message = EmailMessage()
    message["Subject"] = subject
    message["From"] = sender
    message["To"] = email
    message.set_content(f"Your RooMatch {purpose} code is {otp}.\n\n"
                        "It expires in 10 minutes. If you did not request it, ignore this email.")
    port = int(os.getenv("SMTP_PORT", "587"))
    use_ssl = os.getenv("SMTP_SSL", "false").lower() == "true"
    transport = smtplib.SMTP_SSL if use_ssl else smtplib.SMTP
    try:
        with transport(host, port, timeout=15) as smtp:
            if not use_ssl and os.getenv("SMTP_STARTTLS", "true").lower() == "true":
                smtp.starttls()
            username = os.getenv("SMTP_USERNAME")
            if username:
                smtp.login(username, os.getenv("SMTP_PASSWORD", ""))
            smtp.send_message(message)
    except smtplib.SMTPAuthenticationError:
        logging.getLogger(__name__).warning("SMTP authentication failed. Check the username and app password; Gmail requires 2-Step Verification and an app password.")
        raise
    except (OSError, smtplib.SMTPException):
        logging.getLogger(__name__).warning("SMTP delivery failed. Check the mail-server hostname, port, TLS settings, and network connection.")
        raise
