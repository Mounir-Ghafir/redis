#!/bin/bash

set -e

IMAGE_NAME="redis-server"
VERSION=${1:-latest}
REGISTRY=${REGISTRY:-docker.io}

echo "Building Docker image..."
docker build -t $IMAGE_NAME:$VERSION .

echo "Tagging for registry..."
docker tag $IMAGE_NAME:$VERSION $REGISTRY/$IMAGE_NAME:$VERSION

echo "Image ready:"
docker images | grep $IMAGE_NAME

echo ""
echo "To push to registry:"
echo "  docker push $REGISTRY/$IMAGE_NAME:$VERSION"
echo ""
echo "To run locally:"
echo "  docker run -p 6379:6379 $IMAGE_NAME:$VERSION"