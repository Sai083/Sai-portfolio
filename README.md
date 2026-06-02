# Bhukya Sai - Premium AI-Inspired Portfolio Website

A futuristic, highly polished, and responsive full-stack portfolio for Bhukya Sai. Features a glassmorphic dashboard interface, a customized recruiter message database, and an AI Assistant equipped with a dual-mode semantic search engine.

---

## Technical Stack
* **Frontend**: Vanilla HTML5, CSS3 (using custom HSL tokens, transitions, and gradients), and Vanilla ES6 JavaScript. High-frame-rate constellation particle canvas background.
* **Backend**: Python Flask API server with CORS enabled.
* **Database**: Dual-mode engine (SQLite for zero-config local development, MySQL for production).
* **AI Search**: Hybrid retrieval system (Custom TF-IDF & Cosine Similarity search using NumPy, with automatic transition to OpenAI RAG if an API key is configured).

---

## Folder Structure
```
Cnf/
├── frontend/                     # Static Client Files (Deployable to Vercel)
│   ├── index.html                # Main SPA Layout
│   ├── css/                      # Custom Styling Sheets
│   │   ├── variables.css         # Typography, Colors, Spacing variables
│   │   ├── global.css            # Base resets and animations
│   │   ├── components.css        # Buttons, cards, and input fields
│   │   └── sections.css          # Layout grids for sections and dashboard
│   ├── js/                       # Page Logic Modules
│   │   ├── api.js                # HTTP Client wrapper
│   │   ├── theme.js              # Canvas node animation
│   │   ├── animations.js         # Scroll triggers and typewriter
│   │   ├── chat.js               # Assistant dialogue window
│   │   └── dashboard.js          # Admin login and exporter
│   └── assets/                   # Copied PDF resume and icon files
├── backend/                      # Python Flask Server (Deployable to Render)
│   ├── app.py                    # REST Controller routes
│   ├── db.py                     # SQLite & MySQL Connector
│   ├── ai.py                     # Custom NumPy TF-IDF Search Engine
│   ├── data.py                   # Resume Knowledge Base dictionary
│   └── requirements.txt          # Python packages
├── .env.example                  # Environment template config
├── run.py                        # Concurrency Server Launcher
└── README.md                     # Documentation
```

---

## Local Quick Start

### 1. Set Up Virtual Environment (Recommended)
Open a terminal in the project directory and run:
```bash
python -m venv venv
venv\Scripts\activate
```

### 2. Install Dependencies
Install the required packages list:
```bash
pip install -r backend/requirements.txt
```

### 3. Run Development Servers
Start both the Flask API server and the static file server simultaneously:
```bash
python run.py
```
This script will automatically open your default browser to `http://localhost:8000`.

### 4. Admin Portal Login
To view the recruiter messages log inside the **Recruiter Dashboard** section, log in with the default password:
```
admin123
```
You can change this password by creating a `.env` file from the `.env.example` template and defining the `ADMIN_PASSWORD` variable.

---

## Production Deployment

### 1. Database (Railway)
1. Provision a **MySQL Database** on Railway.
2. Under the Variables tab, copy the connection details.

### 2. Backend Web Service (Render)
1. Link your repository to Render.
2. Select **Web Service** and choose **Python** as the runtime.
3. Set the **Build Command** to: `pip install -r backend/requirements.txt`
4. Set the **Start Command** to: `gunicorn backend.app:app` (Note: You may need to add `gunicorn` to `requirements.txt` for production deployment, e.g., `pip install gunicorn`).
5. In the Environment tab, paste your database variables:
   * `DATABASE_URL` (Railway Connection URL)
   * `ADMIN_PASSWORD` (Your private dashboard password)
   * `OPENAI_API_KEY` (Optional: If provided, the AI Assistant will upgrade to ChatGPT responses)

### 3. Frontend Static Hosting (Vercel)
1. Update the production API endpoint in `frontend/js/api.js`:
   Replace the placeholder URL inside `PortfolioAPI` (`https://cnf-backend.onrender.com`) with your actual live Render Web Service URL.
2. Push your code to GitHub.
3. Import the repository into Vercel.
4. Select the root directory, and Vercel will automatically host the static files in the `frontend/` directory. Vercel routes are automatically SSL enabled!
