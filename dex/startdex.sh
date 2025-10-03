#!/usr/bin/env bash
# Download and run Dex
docker run -d \
  --name dex \
  -p 5556:5556 \
  -v "$(pwd)/config.yaml:/etc/dex/config.yaml" \
  ghcr.io/dexidp/dex:v2.44.0 \
  dex serve /etc/dex/config.yaml
