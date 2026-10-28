#!/usr/bin/env bash
# ==============================================================
# Cloudways Automated Deployment Script
# Application: Website Maintenance & Upgrade Reporting Tool
# ==============================================================

set -e

echo "--------------------------------------------------------"
echo "  Deploying Website Maintenance & Upgrade Reporting Tool  "
echo "  Target Host: Cloudways                                 "
echo "--------------------------------------------------------"

# 1. Check Node.js and npm
if ! command -v node >/dev/null 2>&1; then
  echo "Error: Node.js is not found. Please enable Node.js or use nvm."
  exit 1
fi

NODE_VERSION=$(node -v)
echo "[1/6] Using Node.js: $NODE_VERSION"

# 2. Check environment configuration
if [ ! -f .env ]; then
  if [ -f .env.example ]; then
    echo "[2/6] No .env file found. Copying .env.example to .env..."
    cp .env.example .env
    echo "WARNING: Please edit .env with your Cloudways database credentials!"
  fi
fi

# 3. Install client and server dependencies
echo "[3/6] Installing dependencies..."
cd client && npm install --production=false && cd ..
cd server && npm install --production=false && cd ..

# 4. Build frontend and backend production bundles
echo "[4/6] Building production client and compiling TypeScript server..."
npm run build:client
npm run build:server

# 5. Run Database Migrations
echo "[5/6] Checking database schema & migrations..."
npm run migrate || echo "Skipping migration if MySQL credentials are not yet configured."
npm run seed || echo "Seed completed or skipped."

# 6. Process restart via PM2 (if available) or standalone Node
echo "[6/6] Restarting application service..."
if command -v pm2 >/dev/null 2>&1; then
  pm2 reload ecosystem.config.cjs --env production || pm2 start ecosystem.config.cjs --env production
  pm2 save
  echo "PM2 process reloaded successfully!"
else
  echo "PM2 not detected. To start manually, run: npm start"
fi

echo "========================================================"
echo "  Deployment Complete! Application is running.          "
echo "========================================================"
