#!/bin/bash
set -e

echo "🚀 Fabric Automation - Deployment Script"
echo "========================================="

# Pull latest code
echo "📥 Pulling latest code..."
git pull origin main

# Install dependencies
echo "📦 Installing dependencies..."
npm ci --omit=dev

# Generate Prisma client
echo "🔧 Generating Prisma client..."
npx prisma generate

# Run database migrations
echo "🗄️  Running migrations..."
npx prisma migrate deploy

# Seed initial data (only if empty)
echo "🌱 Seeding data..."
npx tsx scripts/seed.ts || true

# Build Next.js
echo "🏗️  Building application..."
npm run build

# Restart PM2 processes
echo "♻️  Restarting services..."
pm2 reload ecosystem.config.js --update-env
pm2 save

echo "✅ Deployment complete!"
pm2 status
