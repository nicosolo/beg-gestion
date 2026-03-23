#!/bin/bash

# Script to build Docker images for multiple architectures and export them
# Usage: ./scripts/build-docker.sh

set -e

echo "🔨 Building Docker images for multiple architectures..."

# Check if docker-bake.json exists
if [ ! -f "docker-bake.json" ]; then
    echo "Error: docker-bake.json not found in current directory"
    exit 1
fi

# Check if compose.prod.yml exists
if [ ! -f "compose.prod.yml" ]; then
    echo "Error: compose.prod.yml not found in current directory"
    exit 1
fi

# Export commit SHA for version embedding
export COMMIT_SHA="${COMMIT_SHA:-$(git rev-parse --short HEAD)}"
echo "Commit SHA: $COMMIT_SHA"

# Build images using buildx bake
echo "Building with docker buildx bake..."
docker buildx bake --file compose.build.yml --file docker-bake.json

# Export images to tar files
echo ""
echo "📦 Exporting images to tar files..."

# Create exports directory if it doesn't exist
mkdir -p exports

# Export API image
echo "Exporting beg/api:latest..."
docker save beg/api:latest -o exports/beg-api.tar

# Export Proxy image
echo "Exporting beg/proxy:latest..."
docker save beg/proxy:latest -o exports/beg-proxy.tar

# Export App image if it exists
if docker image inspect beg/app:latest >/dev/null 2>&1; then
    echo "Exporting beg/app:latest..."
    docker save beg/app:latest -o exports/beg-app.tar
fi

echo ""
echo "✅ Build and export complete!"
echo ""
echo "Exported files:"
ls -lh exports/*.tar
echo ""
echo "To deploy to server, use:"
echo "  scp exports/*.tar user@server:/path/to/destination/"