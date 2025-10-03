"use client";

import { useSession, signIn, signOut } from "next-auth/react";

export default function Home() {
  const { data: session, status } = useSession();

  return (
    <div
      style={{
        fontFamily: "sans-serif",
        maxWidth: "800px",
        margin: "50px auto",
        padding: "20px",
      }}
    >
      <h1>Next.js OAuth POC Application</h1>

      {status === "loading" && <p>Loading...</p>}

      {status === "authenticated" && session && (
        <div
          style={{
            background: "#e8f5e9",
            padding: "20px",
            borderRadius: "8px",
            margin: "20px 0",
          }}
        >
          <h2>✅ Successfully Authenticated!</h2>
          <p>
            <strong>Name:</strong> {session.user?.name}
          </p>
          <p>
            <strong>Email:</strong> {session.user?.email}
          </p>
          <p>
            <strong>User ID:</strong> {session.user?.id}
          </p>
          {session.user?.department && (
            <p>
              <strong>Department:</strong> {session.user.department}
            </p>
          )}

          <button
            onClick={() => signOut()}
            style={{
              marginTop: "10px",
              padding: "10px 20px",
              background: "#f44336",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            Sign Out
          </button>
        </div>
      )}

      {status === "unauthenticated" && (
        <div
          style={{
            background: "#fff3e0",
            padding: "20px",
            borderRadius: "8px",
            margin: "20px 0",
          }}
        >
          <h2>Not Authenticated</h2>
          <p>
            Click below to sign in through the unified authentication system:
          </p>

          <button
            onClick={() => signIn("dex")}
            style={{
              marginTop: "10px",
              padding: "10px 20px",
              background: "#2196F3",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: "16px",
            }}
          >
            Sign In with Company SSO
          </button>

          <div
            style={{
              marginTop: "30px",
              padding: "15px",
              background: "#f5f5f5",
              borderRadius: "5px",
            }}
          >
            <h3>How this works:</h3>
            <ol>
              <li>Click "Sign In with Company SSO"</li>
              <li>You'll be redirected to Dex (our authentication broker)</li>
              <li>Choose "Company Login (Legacy System)"</li>
              <li>Enter credentials from the legacy PassportJS system</li>
              <li>You'll be authenticated and redirected back here</li>
            </ol>

            <p style={{ marginTop: "15px", color: "#666" }}>
              <strong>Test Credentials:</strong>
              <br />
              • john@company.com / password123
              <br />• jane@company.com / password456
            </p>
          </div>
        </div>
      )}

      <div
        style={{
          marginTop: "40px",
          padding: "20px",
          background: "#f0f0f0",
          borderRadius: "8px",
        }}
      >
        <h3>Authentication Flow:</h3>
        <pre
          style={{
            background: "white",
            padding: "10px",
            borderRadius: "4px",
            overflow: "auto",
          }}
        >
          {`Next.js App (3000) 
    ↓ 
Dex (5556) 
    ↓ 
Legacy PassportJS OAuth (4000) 
    ↓
User Database`}
        </pre>
      </div>
    </div>
  );
}
