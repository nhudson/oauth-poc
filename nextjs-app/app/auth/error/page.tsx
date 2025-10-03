"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";

export default function AuthError() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");

  const errorMessages: Record<string, string> = {
    Configuration: "There is a problem with the server configuration.",
    AccessDenied: "Access was denied.",
    Verification:
      "The verification token has expired or has already been used.",
    OAuthSignin:
      "Error during OAuth sign in. Could not connect to the authentication provider.",
    OAuthCallback: "Error during OAuth callback.",
    OAuthCreateAccount: "Could not create OAuth provider user.",
    EmailCreateAccount: "Could not create email provider user.",
    Callback: "Error in the OAuth callback handler.",
    Default: "An unexpected error occurred.",
  };

  const message = errorMessages[error || "Default"] || errorMessages.Default;

  return (
    <div
      style={{
        fontFamily: "sans-serif",
        maxWidth: "500px",
        margin: "100px auto",
        padding: "20px",
        textAlign: "center",
      }}
    >
      <h1>Authentication Error</h1>

      <div
        style={{
          background: "#ffebee",
          padding: "20px",
          borderRadius: "8px",
          marginTop: "20px",
        }}
      >
        <p style={{ color: "#c62828", fontWeight: "bold" }}>{message}</p>
        {error && (
          <p style={{ color: "#666", fontSize: "14px", marginTop: "10px" }}>
            Error code: {error}
          </p>
        )}
      </div>

      <div style={{ marginTop: "30px" }}>
        <Link
          href="/"
          style={{
            padding: "10px 20px",
            background: "#2196F3",
            color: "white",
            textDecoration: "none",
            borderRadius: "4px",
            display: "inline-block",
          }}
        >
          Back to Home
        </Link>
      </div>
    </div>
  );
}
