# OAuth/OIDC Integration POC

This proof-of-concept demonstrates OAuth 2.0 / OIDC authentication flow between a legacy Express/PassportJS application and a modern Next.js application using Dex as an identity broker.

## Architecture

```
Next.js App (3000) → Dex (5556) → Express/PassportJS OAuth Server (4000) → User Database
```

- **Express App**: Legacy authentication system with PassportJS, extended with OAuth 2.0 / OIDC endpoints
- **Dex**: Identity broker that federates authentication to the Express app
- **Next.js App**: Modern client application using NextAuth.js

## Prerequisites

- Docker and Docker Compose
- macOS/Linux (Docker Desktop on macOS)

## Setup

### 1. Add host.docker.internal to /etc/hosts (macOS/Linux)

This is required for containers to communicate via localhost on macOS:

```bash
echo "127.0.0.1 host.docker.internal" | sudo tee -a /etc/hosts
```

### 2. Start all services

```bash
docker-compose up --build
```

Services will start in this order:
1. Express app (immediate)
2. Dex (15 second delay)
3. Next.js app (20 second delay)

## Testing the Authentication Flow

1. Open http://localhost:3000 in your browser
2. Click "Sign In with Company SSO"
3. Select "Company Login (Legacy System)"
4. Enter test credentials:
   - Email: `john@company.com` / Password: `password123`
   - Email: `jane@company.com` / Password: `password456`
5. Click "Authorize"
6. You should be redirected back to Next.js with user information displayed

## Service Endpoints

- Next.js App: http://localhost:3000
- Dex: http://localhost:5556
- Express OAuth Server: http://localhost:4000

## Stopping Services

```bash
docker-compose down
```

## Key Implementation Details

- Express OAuth server generates RS256-signed JWT id_tokens for OIDC compatibility
- JWKS endpoint exposes public keys for JWT verification
- Authorization codes are exchanged for access tokens and id_tokens
- Dex validates id_tokens using the Express JWKS endpoint
- All services use `host.docker.internal` for container-to-container communication
- Browser redirects are automatically converted from `host.docker.internal` to `localhost`

## Troubleshooting

If authentication fails:
1. Verify all containers are running: `docker ps`
2. Check logs: `docker-compose logs`
3. Ensure `host.docker.internal` is in your `/etc/hosts` file
4. Restart services: `docker-compose restart`
