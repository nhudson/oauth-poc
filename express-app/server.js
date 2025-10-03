const express = require("express");
const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;
const OAuthServer = require("@node-oauth/express-oauth-server");
const OAuth2Server = require("@node-oauth/oauth2-server");
const { Request, Response } = OAuth2Server;
const session = require("express-session");
const bcrypt = require("bcrypt");
const cors = require("cors");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");

const app = express();

// Generate RSA key pair for signing JWTs (in production, load from secure storage)
// For this POC, we'll use a simple RSA key pair
const { generateKeyPairSync } = require('crypto');
const { privateKey, publicKey } = generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: {
    type: 'spki',
    format: 'pem'
  },
  privateKeyEncoding: {
    type: 'pkcs8',
    format: 'pem'
  }
});

// Helper function to generate OIDC id_token
function generateIdToken(user, clientId, issuer = "http://host.docker.internal:4000") {
  const now = Math.floor(Date.now() / 1000);
  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
      name: user.name,
      department: user.department,
      email_verified: true,
      aud: clientId,
      iss: issuer,
      iat: now,
      exp: now + 3600, // 1 hour
    },
    privateKey,
    { algorithm: "RS256", keyid: "key-1" }
  );
}

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
  session({
    secret: "express-app-secret",
    resave: false,
    saveUninitialized: false,
  }),
);

// Mock user database
const users = [
  {
    id: "1",
    email: "john@company.com",
    password: bcrypt.hashSync("password123", 10),
    name: "John Doe",
    department: "Engineering",
  },
  {
    id: "2",
    email: "jane@company.com",
    password: bcrypt.hashSync("password456", 10),
    name: "Jane Smith",
    department: "Marketing",
  },
];

// OAuth clients (Dex will connect as a client)
const clients = [
  {
    id: "dex-client",
    secret: "dex-secret-key",
    grants: ["authorization_code", "refresh_token"],
    redirectUris: [
      "http://localhost:5556/dex/callback", // Add both URLs
    ],
  },
];

// Token storage (in production, use Redis or database)
const tokens = [];
const codes = [];

// PassportJS Local Strategy (existing auth)
passport.use(
  new LocalStrategy(
    {
      usernameField: "email",
    },
    async (email, password, done) => {
      const user = users.find((u) => u.email === email);
      if (!user) return done(null, false);

      const valid = await bcrypt.compare(password, user.password);
      if (!valid) return done(null, false);

      return done(null, user);
    },
  ),
);

passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser((id, done) => {
  const user = users.find((u) => u.id === id);
  done(null, user);
});

app.use(passport.initialize());
app.use(passport.session());

// OAuth2 Server Model
const model = {
  getClient: async (clientId, clientSecret) => {
    const client = clients.find(
      (c) => c.id === clientId && c.secret === clientSecret,
    );
    return client || false;
  },

  saveAuthorizationCode: async (code, client, user) => {
    const authCode = {
      authorizationCode: code.authorizationCode,
      expiresAt: code.expiresAt,
      redirectUri: code.redirectUri,
      scope: code.scope,
      client: { id: client.id },
      user: { id: user.id },
    };
    codes.push(authCode);
    return authCode;
  },

  getAuthorizationCode: async (authorizationCode) => {
    console.log('Looking for authorization code:', authorizationCode);
    console.log('Available codes:', codes);
    const code = codes.find((c) => c.authorizationCode === authorizationCode);
    if (!code) {
      console.log('Code not found!');
      return false;
    }

    console.log('Code found:', code);
    code.user = users.find((u) => u.id === code.user.id);
    code.client = clients.find((c) => c.id === code.client.id);
    return code;
  },

  revokeAuthorizationCode: async (code) => {
    const index = codes.findIndex(
      (c) => c.authorizationCode === code.authorizationCode,
    );
    if (index > -1) codes.splice(index, 1);
    return true;
  },

  saveToken: async (token, client, user) => {
    // Generate OIDC id_token
    const idToken = generateIdToken(user, client.id);

    const tokenData = {
      accessToken: token.accessToken,
      accessTokenExpiresAt: token.accessTokenExpiresAt,
      refreshToken: token.refreshToken,
      refreshTokenExpiresAt: token.refreshTokenExpiresAt,
      scope: token.scope,
      idToken: idToken, // Add id_token for OIDC
      client: { id: client.id },
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        department: user.department,
      },
    };
    tokens.push(tokenData);
    return tokenData;
  },

  getAccessToken: async (accessToken) => {
    const token = tokens.find((t) => t.accessToken === accessToken);
    if (!token) return false;

    token.user = users.find((u) => u.id === token.user.id);
    token.client = clients.find((c) => c.id === token.client.id);
    return token;
  },

  getRefreshToken: async (refreshToken) => {
    return tokens.find((t) => t.refreshToken === refreshToken) || false;
  },

  revokeToken: async (token) => {
    const index = tokens.findIndex(
      (t) => t.refreshToken === token.refreshToken,
    );
    if (index > -1) tokens.splice(index, 1);
    return true;
  },

  verifyScope: async (token, scope) => {
    return true; // For POC, accept all scopes
  },
};

// Initialize OAuth2 server (underlying server)
const oauth2Server = new OAuth2Server({
  model,
  allowBearerTokensInQueryString: true,
  accessTokenLifetime: 60 * 60,
  refreshTokenLifetime: 60 * 60 * 24 * 14,
});

// Initialize Express OAuth wrapper
const oauth = new OAuthServer({
  model,
  allowBearerTokensInQueryString: true,
  accessTokenLifetime: 60 * 60,
  refreshTokenLifetime: 60 * 60 * 24 * 14,
});

// Routes

// Home page
app.get("/", (req, res) => {
  res.send(`
    <html>
    <body style="font-family: sans-serif; max-width: 800px; margin: 50px auto;">
      <h1>Legacy Express + PassportJS App</h1>
      <p>This simulates the existing application with PassportJS authentication.</p>
      
      ${
        req.user
          ? `
        <div style="background: #e8f5e9; padding: 20px; border-radius: 5px; margin: 20px 0;">
          <h3>Logged in as: ${req.user.name}</h3>
          <p>Email: ${req.user.email}</p>
          <p>Department: ${req.user.department}</p>
          <a href="/logout">Logout</a>
        </div>
      `
          : `
        <div style="background: #fff3e0; padding: 20px; border-radius: 5px; margin: 20px 0;">
          <h3>Not logged in</h3>
          <form action="/login" method="post">
            <input type="email" name="email" placeholder="Email" required><br><br>
            <input type="password" name="password" placeholder="Password" required><br><br>
            <button type="submit">Login</button>
          </form>
          <p style="margin-top: 10px; color: #666;">
            Test users:<br>
            john@company.com / password123<br>
            jane@company.com / password456
          </p>
        </div>
      `
      }
    </body>
    </html>
  `);
});

// Traditional login endpoint
app.post(
  "/login",
  passport.authenticate("local", {
    successRedirect: "/",
    failureRedirect: "/",
  }),
);

// OAuth Authorization endpoint
app.get("/oauth/authorize", (req, res) => {
  let { client_id, redirect_uri, response_type, state, scope } = req.query;

  // Convert Docker internal URLs to localhost for display
  const display_redirect = redirect_uri
    ?.replace("dex:5556", "localhost:5556")
    .replace("host.docker.internal:5556", "localhost:5556");

  res.send(`
    <html>
    <body style="font-family: sans-serif; max-width: 500px; margin: 100px auto; padding: 20px;">
      <h2>Authorize Application</h2>
      <p>The application <strong>${client_id}</strong> would like to access your account.</p>
      
      <form method="post" action="/oauth/authorize">
        <input type="hidden" name="client_id" value="${client_id}" />
        <input type="hidden" name="redirect_uri" value="${redirect_uri}" />
        <input type="hidden" name="response_type" value="${response_type}" />
        <input type="hidden" name="state" value="${state}" />
        <input type="hidden" name="scope" value="${scope || ""}" />
        
        <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <input type="email" name="email" placeholder="Email" required style="width: 100%; padding: 8px; margin: 5px 0;"><br/>
          <input type="password" name="password" placeholder="Password" required style="width: 100%; padding: 8px; margin: 5px 0;"><br/>
        </div>
        
        <button type="submit" style="background: #4CAF50; color: white; padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer;">
          Authorize
        </button>
        <a href="${display_redirect}?error=access_denied&state=${state}" style="margin-left: 10px;">Cancel</a>
      </form>
      
      <p style="margin-top: 20px; color: #666; font-size: 14px;">
        Test credentials:<br>
        john@company.com / password123<br>
        jane@company.com / password456
      </p>
    </body>
    </html>
  `);
});

// OAuth Authorization POST handler
app.post("/oauth/authorize", async (req, res) => {
  const { email, password, client_id, redirect_uri, response_type, state, scope } = req.body;

  // Authenticate user
  const user = users.find((u) => u.email === email);
  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.redirect(`${redirect_uri}?error=access_denied&state=${state}`);
  }

  try {
    // Find the client
    const client = clients.find((c) => c.id === client_id);
    if (!client) {
      throw new Error('Client not found');
    }

    // Generate authorization code
    const authorizationCode = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Convert scope string to array if needed
    const scopeArray = typeof scope === 'string' ? scope.split(' ') : scope;

    // Save the authorization code using the model
    const codeObject = {
      authorizationCode,
      expiresAt,
      redirectUri: redirect_uri,
      scope: scopeArray,
    };

    await model.saveAuthorizationCode(codeObject, client, user);

    console.log('Authorization code generated:', authorizationCode);
    console.log('Stored codes:', codes);

    // IMPORTANT: Convert Docker internal URLs to localhost for browser redirect
    let callbackUrl = redirect_uri
      .replace("dex:5556", "localhost:5556")
      .replace("host.docker.internal:5556", "localhost:5556");

    // Redirect with authorization code
    res.redirect(
      `${callbackUrl}?code=${authorizationCode}&state=${state}`,
    );
  } catch (err) {
    console.error("OAuth authorize error:", err);

    // Same URL conversion for errors
    let errorUrl = redirect_uri
      .replace("dex:5556", "localhost:5556")
      .replace("host.docker.internal:5556", "localhost:5556");
    res.redirect(`${errorUrl}?error=server_error&state=${state}`);
  }
});

// Token endpoint - custom handler to include id_token
app.post("/oauth/token", async (req, res, next) => {
  const request = new Request(req);
  const response = new Response(res);

  try {
    // Get the token from the OAuth2 server
    const token = await oauth2Server.token(request, response);

    console.log('Token generated:', token);

    // Build response with id_token
    const tokenResponse = {
      access_token: token.accessToken,
      token_type: "Bearer",
      expires_in: 3600,
      refresh_token: token.refreshToken,
      scope: token.scope,
    };

    // Add id_token if it exists (OIDC)
    if (token.idToken) {
      tokenResponse.id_token = token.idToken;
    }

    res.json(tokenResponse);
  } catch (err) {
    console.error("Token endpoint error:", err);
    res.status(err.code || 500).json({
      error: err.name || "server_error",
      error_description: err.message,
    });
  }
});

// UserInfo endpoint (for OIDC compatibility)
app.get("/oauth/userinfo", oauth.authenticate(), (req, res) => {
  const user = res.locals.oauth.token.user;
  res.json({
    sub: user.id,
    email: user.email,
    name: user.name,
    department: user.department,
    email_verified: true,
  });
});

// JWKS endpoint - expose public key for JWT verification
app.get("/oauth/jwks", (req, res) => {
  // Convert PEM public key to JWK format
  const keyObject = crypto.createPublicKey(publicKey);
  const jwk = keyObject.export({ format: 'jwk' });

  res.json({
    keys: [
      {
        ...jwk,
        kid: "key-1",
        use: "sig",
        alg: "RS256",
      }
    ]
  });
});

// OIDC Discovery endpoint
app.get("/.well-known/openid-configuration", (req, res) => {
  // Use host.docker.internal for container-to-container calls
  // The authorization endpoint will be converted to localhost when redirecting browser
  const publicUrl = "http://host.docker.internal:4000";

  res.json({
    issuer: publicUrl,
    authorization_endpoint: `${publicUrl}/oauth/authorize`,
    token_endpoint: `${publicUrl}/oauth/token`,
    userinfo_endpoint: `${publicUrl}/oauth/userinfo`,
    jwks_uri: `${publicUrl}/oauth/jwks`,
    response_types_supported: ["code"],
    subject_types_supported: ["public"],
    id_token_signing_alg_values_supported: ["RS256"],
    scopes_supported: ["openid", "email", "profile"],
  });
});

// Logout
app.get("/logout", (req, res) => {
  req.logout(() => {
    res.redirect("/");
  });
});

const PORT = 4000;
app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════╗
║   Express + PassportJS + OAuth Server                  ║
║   Running on http://localhost:${PORT}                     ║
╠════════════════════════════════════════════════════════╣
║   Test Users:                                          ║
║   • john@company.com / password123                     ║
║   • jane@company.com / password456                     ║
╠════════════════════════════════════════════════════════╣
║   OAuth Client Credentials (for Dex):                  ║
║   • Client ID: dex-client                              ║
║   • Client Secret: dex-secret-key                      ║
╚════════════════════════════════════════════════════════╝
  `);
});
