# Website Maintenance & Upgrade Reporting Tool

A professional, modern, and responsive web application designed for digital agencies, sysadmins, and technical teams to track WordPress maintenance, upgrades, security configurations, and quality assurance (QA) tasks — generating elegant, factual client-facing reports with one click and logging all audits to a Master Excel spreadsheet for monthly retainer reviews.

---

## ⚡ Instant Cloudways Deployment (Single-File `index.php`)

You can run this application live on Cloudways **with zero build steps, zero Node.js / PM2 configuration, and zero database setup**:

1. Log into your **Cloudways Application** (or connect via SFTP / Cloudways File Manager).
2. Upload [`index.php`](file:///C:/Users/SABRI%20LAPTOP/.gemini/antigravity/scratch/website-maintenance-reporter/index.php) directly into your application's `public_html/` root folder.
3. Visit your Cloudways domain or temporary URL (e.g. `https://phpstack-xxxx.cloudwaysapps.com`).

**That's it!**
- The page opens directly to the auditor dashboard (no sign-in required).
- Just enter the **Website URL** at the top, mark tasks **Done** or **Undone**, and click **Create Website Maintenance Report**.
- Every audit is auto-saved and synchronized into the **Master Excel** file (`monthly-website-maintenance-YYYY-MM.csv` with UTF-8 BOM for Microsoft Excel).
- Reports can be exported as professional vector **PDFs**, printed, or copied for client emails.

---

## 🌟 Key Features

### 1. Streamlined Single-Page Workflow
- **Single URL Input at Top:** Clean, prominent URL entry with automatic protocol prefixing (`https://`).
- **Real-Time Progress Tracker:** Live progress calculation $\frac{\text{Completed}}{\text{Total}} \times 100\%$ with animated progress bar.
- **10 Standard Maintenance Tasks:**
  1. **Plugin Upgrade:** Review and update WordPress plugins.
  2. **Theme Upgrade:** Review and update active and child themes.
  3. **WP-Config Code:** Quick tags for `DISALLOW_FILE_EDIT`, `WP_DEBUG`, security keys.
  4. **PHP Version:** Dropdown with latest PHP versions (`PHP 8.4`, `8.3`, `8.2`, `8.1`) + freeform text input. Empty by default.
  5. **Two-Factor Authentication (2FA):** Track 2FA enforcement on administrative accounts.
  6. **User Accounts and Email Addresses:** Audit WordPress accounts, roles, and 2FA status.
  7. **Elastic Email:** SMTP handshake verification, SPF & DKIM validation, test delivery tracking.
  8. **Website QA (Quality Assurance):** Sub-checks for forms, mobile responsiveness, SSL, console errors.
  9. **WordPress Core Upgrade:** Dropdown with latest versions (`6.7.1`, `6.7.0`, `6.6.2`) + freeform input. Empty by default.
  10. **WP-Hide:** Obfuscation of login URLs, masking `wp-content/plugins`, XML-RPC blocking, core footprint hiding.
- **Unlimited Custom Tasks:** Add custom tasks on-the-fly.
- **Master Excel Connectivity:** Live recording of all client website audits into a master monthly Excel spreadsheet.

### 2. Visual Status System
- **Completed Tasks (Done):** Vibrant emerald indicator, green badge (`✓ Done`), subtle green border.
- **Incomplete Tasks (Undone):** Rose indicator, red badge (`✕ Undone`), subtle rose border.
- **User-controlled toggles:** Status is never changed automatically without explicit user action.

### 5. Automated Real-Time Progress Engine
- **Formula:** $\text{Completion Percentage} = (\text{Completed Tasks} / \text{Total Tasks}) \times 100$
- **Live recalculation:** Immediate updates when tasks are toggled, added, or removed.
- **Zero-error guarantee:** Cleanly displays 0% if no tasks exist.
- **Visual Progress Bar:** Dynamic color-coded bar (rose $\rightarrow$ amber $\rightarrow$ blue $\rightarrow$ emerald).

### 6. Dynamic Factual Summaries
- **Executive Summary:** Generates factual operational highlights reflecting only items marked Done.
- **Final Audit Summary:** Summarizes completed vs. incomplete counts and includes clear warnings if items remain incomplete — never claiming full security when tasks are undone.

### 7. Multi-Format Report Actions
- **Preview Report:** Clean, responsive SaaS document view.
- **Download PDF:** Dual-engine PDF export:
  - Server-side PDF generation via PDFKit with professional layout, tables, page numbers, and status colors.
  - Client-side vector PDF generation via jsPDF + autoTable for instant offline or draft exports.
- **Print-Ready Styles:** Dedicated `@media print` CSS cleanly strips navigation bars, action buttons, and applies page breaks.
- **Copy Report Text:** One-click formatted plain-text export tailored for client emails or Slack updates.
- **Duplicate Report:** Clones any prior report with a fresh ID and current date as a starting point.
- **Database Management:** Search by URL or name, sort by creation or modified date, and delete with safety confirmation.

---

## 🛠️ Technology Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18, TypeScript, Tailwind CSS, Lucide Icons |
| **Build Tool** | Vite |
| **Backend** | Node.js, Express, TypeScript |
| **Database** | MySQL / MariaDB (production on Cloudways) with automatic SQLite/JSON local fallback |
| **PDF Generation**| Server-side PDFKit + Client-side jsPDF / jspdf-autotable |
| **Authentication**| JWT (JSON Web Tokens), bcryptjs password hashing |
| **Process Manager**| PM2 / systemd / Cloudways Supervisor |

---

## 🚀 Local Development Setup

### Prerequisites
- Node.js 18+ (tested on Node.js 24)
- npm 9+

### 1. Clone & Install Dependencies
```bash
# Clone or navigate to the project directory
cd website-maintenance-reporter

# Install all dependencies (both client and server)
npm install --prefix client
npm install --prefix server
```

### 2. Environment Configuration
Copy `.env.example` to `server/.env`:
```bash
cp .env.example server/.env
```
*(If MySQL credentials are left blank or omitted, the application runs automatically using the local persistent data store in `server/data/reports-db.json` with zero database setup required!)*

### 3. Build & Seed Initial Data
```bash
# Build both frontend and backend
npm run build

# Seed sample reports & default admin account
npm run seed
```

### 4. Run the Application
```bash
# Option A: Start production unified server (serves API + React SPA on port 5000)
npm start

# Option B: Run concurrent development mode (Vite on :5173 with proxy to Express on :5000)
npm run dev:server
# in a separate terminal:
npm run dev:client
```

Open your browser to: **`http://localhost:5000`**

### Default Administrator Credentials
- **Email:** `admin@maintenance.com`
- **Password:** `admin123456`

---

## ☁️ Cloudways Deployment Guide

Cloudways provides high-performance managed cloud servers on DigitalOcean, Vultr, Linode, AWS, and GCP. The application can be hosted on Cloudways using either of the two standard deployment architectures:

### Architecture Option A: Cloudways Custom App (Node.js with PM2) — Recommended

Cloudways servers allow running Node.js applications alongside Nginx and Apache.

#### Step 1: Create a Custom Application on Cloudways
1. In the Cloudways Console, select your Server $\rightarrow$ **Add Application**.
2. Select **Custom App (PHP/Node)** and give it a name (e.g. `maintenance-reporter`).

#### Step 2: Create a MySQL Database on Cloudways
1. Navigate to the created Application $\rightarrow$ **Application Settings**.
2. Under **Application Credentials**, note down:
   - **DB Host:** `127.0.0.1` or `localhost`
   - **DB Name:** (e.g., `abcxyz_reporter`)
   - **DB User:** (e.g., `abcxyz_user`)
   - **DB Password:** (e.g., `your_secure_password`)

#### Step 3: Upload or Git Deploy the Application
1. Connect via SSH or Git Deployment:
   ```bash
   cd public_html/
   git clone <your-repository-url> .
   ```
2. Create your production `.env` file:
   ```bash
   cp .env.example .env
   nano .env
   ```
   Fill in your Cloudways database credentials:
   ```ini
   NODE_ENV=production
   PORT=5000
   JWT_SECRET=super_secret_production_key_64_characters_long
   ADMIN_EMAIL=admin@youragency.com
   ADMIN_PASSWORD=YourStrongPasswordHere!

   DB_CONNECTION=mysql
   DB_HOST=127.0.0.1
   DB_PORT=3306
   DB_NAME=abcxyz_reporter
   DB_USER=abcxyz_user
   DB_PASSWORD=your_secure_password
   ```

#### Step 4: Run Migrations and Build
```bash
# Run automated setup script
chmod +x cloudways-deploy.sh
./cloudways-deploy.sh
```
Or manually run:
```bash
cd client && npm install && npm run build && cd ..
cd server && npm install && npm run build && npm run migrate && npm run seed && cd ..
```

#### Step 5: Configure Nginx Reverse Proxy
In Cloudways, configure Nginx to proxy incoming traffic on port 80/443 to the Node.js application port (`http://127.0.0.1:5000`):

In your Cloudways application directory or `.htaccess` / Nginx config:
```nginx
location / {
    proxy_pass http://127.0.0.1:5000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_cache_bypass $http_upgrade;
}
```

#### Step 6: Process Management with PM2
To keep the application running continuously in the background and auto-restart on crashes or server reboots:
```bash
# Start via ecosystem configuration
pm2 start ecosystem.config.cjs --env production

# Save PM2 process list
pm2 save
```

#### Step 7: Enable SSL / HTTPS
1. In Cloudways Console $\rightarrow$ **Application Management** $\rightarrow$ **SSL Certificate**.
2. Select **Let's Encrypt**, enter your domain name, and click **Install Certificate**.
3. Cloudways will automatically issue and renew the HTTPS certificate.

---

## 🔒 Security Best Practices

1. **No Sensitive Credentials in Reports:**
   The Elastic Email and User Accounts checklists explicitly instruct users never to record passwords, API keys, or SMTP secret credentials in the reports.
2. **Parameterized Database Queries:**
   All MySQL queries use prepared statements with parameter binding via `mysql2/promise` to prevent SQL injection.
3. **Password Security:**
   All user passwords are encrypted using `bcryptjs` with high salt rounds.
4. **JWT Authentication:**
   All report modification and retrieval endpoints are protected by token authentication.
5. **Data Immutability on Edit:**
   Original report creation dates (`created_at`) are preserved when editing existing reports, maintaining a clear separation from `updated_at`.

---

## 📄 License & Attribution
Enterprise Website Maintenance & Upgrade Reporting System. Designed for WordPress professionals and cloud hosting environments.
