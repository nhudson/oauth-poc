"use client";

import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";

export default function LoginPage() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");

  return (
    <div
      style={{
        fontFamily: "sans-serif",
        maxWidth: "500px",
        margin: "100px auto",
        padding: "20px",
      }}
    >
      <h1>Sign In</h1>

      {error && (
        <div
          style={{
            background: "#ffebee",
            color: "#c62828",
            padding: "10px",
            borderRadius: "4px",
            marginBottom: "20px",
          }}
        >
          Authentication failed. Please try again.
        </div>
      )}

      <button
        onClick={() => signIn("dex", { callbackUrl: "/" })}
        style={{
          width: "100%",
          padding: "12px",
          background: "#2196F3",
          color: "white",
          border: "none",
          borderRadius: "4px",
          fontSize: "16px",
          cursor: "pointer",
        }}
      >
        Sign in with Company SSO
      </button>
    </div>
  );
}
