import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
from backend.db import (
    init_db,
    save_recruiter_message,
    get_recruiter_messages,
    update_recruiter_status,
    delete_recruiter_message
)
from backend.ai import ask_ai
from backend.data import PORTFOLIO_DATA

load_dotenv()

app = Flask(__name__)
# Enable CORS for all routes (important for static frontend integration)
CORS(app, resources={r"/api/*": {"origins": "*"}})

# Configuration variables
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "admin123")
AUTH_TOKEN = "bearer-sai-portfolio-token-2026"  # Secure mock token for dashboard authentication

def check_auth(req):
    """Checks if the request contains the valid authorization header token."""
    auth_header = req.headers.get("Authorization")
    if not auth_header:
        return False
    # Format expected: Bearer token-string
    parts = auth_header.split(" ")
    if len(parts) != 2 or parts[0].lower() != "bearer":
        return False
    return parts[1] == AUTH_TOKEN

def send_email_notification(name, company, email, position, message):
    """Sends a real-time email notification to Bhukya Sai's inbox using Gmail SMTP."""
    sender_email = os.getenv("SMTP_USER")
    sender_password = os.getenv("SMTP_PASSWORD")
    recipient_email = os.getenv("NOTIFICATION_EMAIL", "bhukyasai003@gmail.com")
    smtp_host = os.getenv("SMTP_HOST", "smtp.gmail.com")
    smtp_port = os.getenv("SMTP_PORT", "587")

    if not sender_email or not sender_password:
        print("[Email Notification] SMTP_USER and SMTP_PASSWORD not set in env variables. Mock log notification printed.")
        return False

    subject = f"🚨 New Recruiter Contact: {name} from {company}"
    body = f"""Hello Bhukya Sai,

You have received a new recruiter inquiry from your portfolio website!

DETAILS:
--------------------------------------------------
Recruiter Name:  {name}
Company Name:    {company}
Recruiter Email: {email}
Job Position:    {position}

MESSAGE CONTENT:
{message}
--------------------------------------------------

This contact entry has been stored in your Railway/SQLite database. You can log in to your Recruiter Dashboard to schedule interviews.

Best regards,
Bhukya Sai Portfolio Automation
"""

    msg = MIMEMultipart()
    msg['From'] = sender_email
    msg['To'] = recipient_email
    msg['Subject'] = subject
    msg.attach(MIMEText(body, 'plain'))

    try:
        server = smtplib.SMTP(smtp_host, int(smtp_port))
        server.starttls()  # Secure connection
        server.login(sender_email, sender_password)
        server.sendmail(sender_email, recipient_email, msg.as_string())
        server.quit()
        print(f"[Email Notification] Real email alert dispatched successfully to {recipient_email}.")
        return True
    except Exception as e:
        print(f"[Email Notification] Failed to dispatch SMTP email: {e}")
        return False

# Initialize Database Schema on app startup
with app.app_context():
    try:
        init_db()
    except Exception as e:
        print(f"[App] Warning: Failed to initialize DB on startup. Will retry on demand: {e}")

# --- API ENDPOINTS ---

@app.route("/api/portfolio", methods=["GET"])
def get_portfolio_data():
    """Returns the complete structured portfolio JSON data for dynamic rendering."""
    return jsonify(PORTFOLIO_DATA)

@app.route("/api/contact", methods=["POST"])
def submit_contact_form():
    """Handles recruiter form submission, stores in DB, and generates automated response."""
    data = request.get_json() or {}
    
    name = data.get("name", "").strip()
    company = data.get("company", "").strip()
    email = data.get("email", "").strip()
    position = data.get("position", "").strip()
    message = data.get("message", "").strip()
    
    # Validation
    if not all([name, company, email, position, message]):
        return jsonify({"error": "All fields are required."}), 400
        
    try:
        # Save to Database
        msg_id = save_recruiter_message(name, company, email, position, message)
        
        # Simulating Email Notification
        print("\n" + "="*50)
        print("  NEW RECRUITER CONTACT NOTIFICATION")
        print("="*50)
        print(f"ID: {msg_id}")
        print(f"Name: {name}")
        print(f"Company: {company}")
        print(f"Email: {email}")
        print(f"Position: {position}")
        print(f"Message: {message}")
        print("="*50 + "\n")
        
        # Trigger real-time email notification to bhukyasai003@gmail.com
        send_email_notification(name, company, email, position, message)
        
        # Generate automated response
        auto_reply = (
            f"Hi {name},\n\n"
            f"Thank you for reaching out regarding the {position} position at {company}!\n\n"
            "An instant notification has been dispatched to my personal email (bhukyasai003@gmail.com) so that I can get in touch with you right away. "
            "I have received your message and will review it shortly. I usually respond within "
            "24 hours. You can also view my live calendar and schedule interviews directly in the "
            "Recruiter Dashboard on this site.\n\n"
            "Best regards,\nBhukya Sai"
        )
        
        return jsonify({
            "success": True,
            "message_id": msg_id,
            "auto_reply": auto_reply,
            "message": "Message submitted successfully. Notification generated."
        }), 201
        
    except Exception as e:
        print(f"[API] Error saving contact message: {e}")
        return jsonify({"error": "Failed to process message due to a database error."}), 500

@app.route("/api/auth/login", methods=["POST"])
def admin_login():
    """Authenticates the administrator for dashboard access."""
    data = request.get_json() or {}
    password = data.get("password", "")
    
    if password == ADMIN_PASSWORD:
        return jsonify({
            "success": True,
            "token": AUTH_TOKEN,
            "message": "Authentication successful."
        }), 200
    else:
        return jsonify({"success": False, "error": "Invalid password."}), 401

@app.route("/api/recruiter/messages", methods=["GET"])
def list_messages():
    """Retrieves all recruiter messages. Protected API."""
    if not check_auth(request):
        return jsonify({"error": "Unauthorized access."}), 401
        
    search_query = request.args.get("search", "").strip()
    
    try:
        messages = get_recruiter_messages(search_query if search_query else None)
        return jsonify({"success": True, "messages": messages}), 200
    except Exception as e:
        print(f"[API] Error fetching messages: {e}")
        return jsonify({"error": "Database error while fetching messages."}), 500

@app.route("/api/recruiter/messages/<int:msg_id>", methods=["PUT"])
def update_message(msg_id):
    """Updates the status or scheduled interview date of a recruiter message. Protected API."""
    if not check_auth(request):
        return jsonify({"error": "Unauthorized access."}), 401
        
    data = request.get_json() or {}
    status = data.get("status")
    interview_date = data.get("interview_date")
    
    if not status:
        return jsonify({"error": "Status is required."}), 400
        
    try:
        update_recruiter_status(msg_id, status, interview_date)
        return jsonify({"success": True, "message": "Status updated successfully."}), 200
    except Exception as e:
        print(f"[API] Error updating message {msg_id}: {e}")
        return jsonify({"error": "Database error while updating message status."}), 500

@app.route("/api/recruiter/messages/<int:msg_id>", methods=["DELETE"])
def delete_message(msg_id):
    """Deletes a recruiter message log. Protected API."""
    if not check_auth(request):
        return jsonify({"error": "Unauthorized access."}), 401
        
    try:
        delete_recruiter_message(msg_id)
        return jsonify({"success": True, "message": "Message deleted successfully."}), 200
    except Exception as e:
        print(f"[API] Error deleting message {msg_id}: {e}")
        return jsonify({"error": "Database error while deleting message."}), 500

@app.route("/api/ai/chat", methods=["POST"])
def ai_chat():
    """Queries the AI Assistant with recruiter questions."""
    data = request.get_json() or {}
    message = data.get("message", "").strip()
    
    if not message:
        return jsonify({"error": "Message is required."}), 400
        
    try:
        response = ask_ai(message)
        return jsonify({"success": True, "response": response}), 200
    except Exception as e:
        print(f"[API] AI Chat error: {e}")
        return jsonify({"error": "AI Assistant failed to formulate a response."}), 500

if __name__ == "__main__":
    # Start server
    app.run(host="0.0.0.0", port=5000, debug=True)
