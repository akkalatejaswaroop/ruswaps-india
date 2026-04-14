#!/bin/bash

# Ruswaps Web - Deployment Script for Linux/Mac
# Run this script to deploy the application

echo "============================================"
echo "  Ruswaps Web - Deployment Script"
echo "============================================"
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "ERROR: Node.js is not installed!"
    echo "Please install Node.js 18+ from https://nodejs.org"
    exit 1
fi

echo "Node.js found:"
node --version
echo ""

# Install dependencies
echo "Installing dependencies..."
npm install
if [ $? -ne 0 ]; then
    echo "ERROR: Failed to install dependencies"
    exit 1
fi
echo ""

# Generate Prisma Client
echo "Generating Prisma Client..."
npx prisma generate
echo ""

# Deploy Database Migrations
echo "Deploying database migrations..."
npx prisma migrate deploy
if [ $? -ne 0 ]; then
    echo "ERROR: Database migration failed"
    exit 1
fi
echo ""

# Build the application
echo "Building the application..."
npm run build
if [ $? -ne 0 ]; then
    echo "ERROR: Build failed"
    exit 1
fi
echo ""

echo "============================================"
echo "  Build completed successfully!"
echo "============================================"
echo ""
echo "To start the production server, run:"
echo "  npm start"
echo ""
echo "Or to start the development server, run:"
echo "  npm run dev"
echo ""
