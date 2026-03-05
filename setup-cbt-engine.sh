#!/bin/bash

# CBT Session Engine - Dependencies Installation Script
# Run this after cloning the project

echo "🚀 Installing CBT Session Engine Dependencies..."

cd backend

# Check if package.json exists
if [ ! -f "package.json" ]; then
    echo "❌ package.json not found. Please run from backend directory."
    exit 1
fi

# Install new dependencies
echo "📦 Installing npm packages..."
npm install pdfkit fast-csv date-fns redis @types/pdfkit

# Prisma setup
echo "🗄️  Setting up Prisma..."
npx prisma generate

# Run migrations
echo "🗄️  Running database migrations..."
npx prisma migrate deploy

echo ""
echo "✅ Installation complete!"
echo ""
echo "📝 Next steps:"
echo "1. Update .env file with database URL and export storage path"
echo "2. Run: npm run dev"
echo "3. Test endpoints with: curl -X GET http://localhost:5000/api/health"
echo ""
echo "📚 Documentation files:"
echo "   - CBT_SESSION_ENGINE.md - Complete architecture guide"
echo "   - CBT_SESSION_QUICKSTART.md - Setup and API examples"
echo "   - ARCHITECTURE_DIAGRAMS.md - Visual references"
echo "   - SQL_REFERENCE.md - Database queries"
echo ""
