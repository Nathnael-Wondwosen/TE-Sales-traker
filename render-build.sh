#!/bin/bash
# Render build script

echo "Starting Render build process..."

# Install dependencies
npm ci

# Build the Next.js application
npm run build

echo "Build completed successfully!"