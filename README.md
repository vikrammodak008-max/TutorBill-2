# TutorBill — Deployment Guide (For Non-Coders)

## What You Have

This folder is a complete web app. To make it live on the internet
(so you can open it on your phone and use it like an app), follow
ONE of the options below.

---

## OPTION 1: Deploy on Vercel (Recommended — Easiest)

**Time needed: ~10 minutes | Cost: FREE**

### Step 1 — Get a GitHub Account (one-time)

1. Go to **https://github.com** and click **Sign Up**
2. Create a free account (just email + password)

### Step 2 — Upload Your Code to GitHub

1. After signing in to GitHub, click the **+** button (top-right) → **New repository**
2. Name it: `tutor-billing`
3. Keep it **Public** (free hosting needs this)
4. Click **Create repository**
5. On the next page, click **"uploading an existing file"**
6. **Drag and drop ALL files and folders** from the unzipped project folder
   - Make sure you upload: `package.json`, `vite.config.js`, `index.html`, `src/` folder, `public/` folder
7. Click **Commit changes**

### Step 3 — Deploy on Vercel

1. Go to **https://vercel.com** and click **Sign Up**
2. Choose **"Continue with GitHub"** (use the account you just made)
3. Click **"Add New Project"**
4. You'll see your `tutor-billing` repository — click **Import**
5. Leave all settings as default. Vercel auto-detects it's a Vite project.
6. Click **Deploy**
7. Wait 1–2 minutes. Done!

### Step 4 — Your App is Live!

- Vercel gives you a link like: `https://tutor-billing-abc123.vercel.app`
- Open this link on your **phone's browser**
- You'll see a popup: **"Add to Home Screen"** — tap it
- Now TutorBill is on your phone like a real app!

### How to Update Later

If you want to make changes, just edit files on GitHub. Vercel
automatically re-deploys whenever you update.

---

## OPTION 2: Deploy on Netlify (Also Easy)

**Time needed: ~5 minutes | Cost: FREE**

### Step 1 — Build the App on Your Computer

You need Node.js installed. Download it from: **https://nodejs.org** (choose LTS version).

Then open Terminal (Mac) or Command Prompt (Windows) and run:

```
cd tutor-billing-pwa
npm install
npm run build
```

This creates a `dist` folder with your ready-to-deploy app.

### Step 2 — Deploy on Netlify

1. Go to **https://app.netlify.com**
2. Sign up (free)
3. Drag and drop the **`dist`** folder onto the Netlify dashboard
4. Done! You get a live link.

---

## OPTION 3: Run Locally on Your Computer

### Step 1 — Install Node.js

Download from **https://nodejs.org** (choose LTS version).

### Step 2 — Open Terminal

- **Windows**: Open Command Prompt or PowerShell
- **Mac**: Open Terminal

### Step 3 — Navigate to the Project

```
cd path/to/tutor-billing-pwa
```

### Step 4 — Install & Run

```
npm install
npm run dev
```

Your app opens at **http://localhost:5173** in your browser.

---

## How the App Works (Quick Start)

1. **Settings** → Add your Centers (e.g., "Academy A", "Coaching B")
2. **Settings** → Add Subjects (e.g., "Math", "Science")
3. **Settings** → Add Standards (e.g., "Std 8", "Std 10", "Std 12")
4. **Settings → Rate Rules** → Set your rate per hour for each combination
5. **Dashboard** → Click "Add Session" to log a class you taught
6. **Reports** → Select date range → View billing → Export PDF

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| "npm not found" | Install Node.js from https://nodejs.org |
| Blank page after deploy | Make sure all files were uploaded to GitHub |
| Can't install as app on phone | Open in Chrome (not Safari), look for "Install" in browser menu |
| Lost data after clearing browser | Use Settings → Data → Export Backup regularly |

---

## Your Data is Safe

- All data is stored **on your device** (browser storage)
- Nothing is sent to any server
- **Important**: Regularly use the **Backup** feature in Settings → Data to save a JSON file. This protects against accidental data loss.

---

## Need Help?

If you're stuck, paste this entire README into ChatGPT or Claude and
describe your problem. They can guide you step-by-step.
