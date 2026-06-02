# Portfolio Deployment Guide

Follow these steps to deploy your portfolio website live on the internet for free.

---

## 1. Push Code to GitHub
Your Git repository is already initialized and the initial commit has been made locally.

1. Go to [GitHub](https://github.com/) and create a new **public** repository named `sai-portfolio`.
2. Run the following commands in your terminal at `c:\Users\bhuky\Downloads\Cnf` to link and push your code:
   ```bash
   git remote add origin https://github.com/YOUR_GITHUB_USERNAME/sai-portfolio.git
   git branch -M main
   git push -u origin main
   ```

---

## 2. Create a Free MySQL Database
To ensure persistent recruiter dashboard logs (since Render resets local SQLite database changes upon server restarts):

1. Register at **[Aiven.io](https://aiven.io/)** (which provides a free MySQL database tier).
2. Create a new **MySQL** database instance.
3. Save the **Connection URI** (usually formatted like `mysql://avnadmin:password@hostname:port/defaultdb?ssl-mode=REQUIRED`).

---

## 3. Deploy Backend on Render (Free)
Render will host your Flask API.

1. Log in to **[Render.com](https://render.com/)** and click **New +** -> **Web Service**.
2. Connect your `sai-portfolio` GitHub repository.
3. Enter these configurations:
   - **Name**: `sai-portfolio-backend`
   - **Language**: `Python 3`
   - **Root Directory**: *Leave blank*
   - **Build Command**: `pip install -r backend/requirements.txt`
   - **Start Command**: `gunicorn backend.app:app`
   - **Instance Type**: Select the **Free** tier.
4. Expand **Advanced** and click **Add Environment Variable** to add the variables:
   - `ADMIN_PASSWORD` = `your_secure_password`
   - `DATABASE_URL` = `your_aiven_mysql_connection_uri`
   - `SMTP_USER` = `bhukyasai003@gmail.com`
   - `SMTP_PASSWORD` = `your_16_character_gmail_app_password`
   - `NOTIFICATION_EMAIL` = `bhukyasai003@gmail.com`
   - `SMTP_HOST` = `smtp.gmail.com`
   - `SMTP_PORT` = `587`
5. Click **Deploy Web Service** and copy your backend URL once it completes building (e.g., `https://sai-portfolio-backend.onrender.com`).

---

## 4. Link Frontend to Render URL
Before deploying your frontend, point the JavaScript API client to your live backend:

1. Open `frontend/js/api.js` on your computer.
2. Replace the placeholder Render URL with your actual URL:
   ```javascript
   const API_BASE = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
     ? "http://127.0.0.1:5000"
     : "https://sai-portfolio-backend.onrender.com"; // 👈 Paste your actual URL here
   ```
3. Save, commit, and push this change to GitHub:
   ```bash
   git commit -am "Link API client to live Render backend URL"
   git push origin main
   ```

---

## 5. Deploy Frontend on Vercel (Free)
Vercel hosts the static HTML/CSS/JS frontend.

1. Log in to **[Vercel.com](https://vercel.com/)** and choose **Add New** -> **Project**.
2. Select your `sai-portfolio` repository.
3. Configure the Project:
   - **Root Directory**: Click *Edit* and select **`frontend`**.
4. Click **Deploy**. Vercel will generate your live domain!
