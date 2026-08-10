import smtplib
import secrets
import os
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

# === CONFIGURAZIONE EMAIL da variabili d'ambiente ===
SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_EMAIL = os.getenv("SMTP_EMAIL", "")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")

def generate_code() -> str:
    """Genera un codice OTP a 6 cifre crittograficamente sicuro (MED-05 fix)"""
    # secrets.randbelow usa il generatore del SO — sicuro per token di sicurezza
    return f"{secrets.randbelow(1_000_000):06d}"


def send_verification_email(to_email: str, code: str, user_name: str = "") -> bool:
    """Invia email con codice di verifica"""
    
    # Se SMTP non configurato, stampa il codice in console (per sviluppo)
    if not SMTP_EMAIL or not SMTP_PASSWORD:
        print(f"\n{'='*60}")
        print(f"📧 CODICE VERIFICA EMAIL")
        print(f"{'='*60}")
        print(f"👤 Destinatario: {to_email}")
        print(f"👤 Nome: {user_name}")  
        print(f"🔑 CODICE: {code}")
        print(f"⏰ Scade tra 10 minuti")
        print(f"{'='*60}\n")
        print(f"⚠️  SMTP non configurato! Crea un file .env con:")
        print(f"   SMTP_EMAIL=tuaemail@gmail.com")
        print(f"   SMTP_PASSWORD=password_app_gmail")
        print(f"{'='*60}\n")
        return True
    
    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = f"HyperGym - Il tuo codice di verifica: {code}"
        msg["From"] = f"HyperGym App <{SMTP_EMAIL}>"
        msg["To"] = to_email

        html = f"""
        <html>
        <body style="font-family: Arial, sans-serif; background: #0b0e14; color: white; padding: 40px;">
            <div style="max-width: 400px; margin: 0 auto; background: #161c24; border-radius: 16px; padding: 32px; border: 1px solid #232b38;">
                <div style="text-align: center; margin-bottom: 24px;">
                    <h1 style="color: #ffffff; font-size: 28px; font-weight: 900; letter-spacing: 2px;">HYPER</h1>
                    <p style="color: #94a3b8; font-size: 11px; text-transform: uppercase; letter-spacing: 1px;">Gym &bull; Sport &bull; Conditioning</p>
                </div>
                
                <p style="color: #e2e8f0; font-size: 14px;">Ciao <strong>{user_name}</strong>,</p>
                <p style="color: #94a3b8; font-size: 14px;">Ecco il tuo codice di verifica per completare la registrazione:</p>
                
                <div style="text-align: center; margin: 32px 0;">
                    <div style="background: #0b0e14; border: 2px solid #ffffff; border-radius: 12px; padding: 20px; display: inline-block;">
                        <span style="font-size: 36px; font-weight: 900; letter-spacing: 12px; color: #ffffff;">{code}</span>
                    </div>
                </div>
                
                <p style="color: #64748b; font-size: 12px; text-align: center; margin-top: 24px;">
                    ⏰ Il codice scade tra <strong>10 minuti</strong>.<br>
                    Se non hai richiesto questo codice, ignora questa email.
                </p>
                
                <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #232b38; text-align: center;">
                    <p style="color: #64748b; font-size: 11px;">
                        © 2026 HyperGym<br>
                        Questo è un messaggio automatico, non rispondere a questa email.
                    </p>
                </div>
            </div>
        </body>
        </html>
        """

        msg.attach(MIMEText(html, "html"))

        print(f"📧 Invio email a {to_email}...")
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
            server.starttls()
            server.login(SMTP_EMAIL, SMTP_PASSWORD)
            server.sendmail(SMTP_EMAIL, to_email, msg.as_string())
        
        print(f"✅ Email inviata con successo a {to_email}")
        return True
        
    except Exception as e:
        print(f"❌ Errore invio email: {e}")
        # Fallback: stampa il codice in console per non bloccare la registrazione
        print(f"\n{'='*60}")
        print(f"🔑 FALLBACK - Codice per {to_email}: {code}")
        print(f"{'='*60}\n")
        return True  # Ritorna True per non bloccare la registrazione
