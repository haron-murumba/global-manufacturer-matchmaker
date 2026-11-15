
"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { customerLogin } from "@/lib/api";

export default function CustomerLoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin(event) {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const data = await customerLogin(email, password);

      localStorage.setItem("customerToken", data.token);
      router.push("/dashboard");
    } catch (err) {
      setError(err.message || "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{
      minHeight: "100vh",
      display: "grid",
      placeItems: "center",
      background: "#081321",
      color: "#ffffff",
      padding: 20,
    }}>
      <section style={{
        width: "100%",
        maxWidth: 430,
        background: "#111d30",
        border: "1px solid #263750",
        borderRadius: 14,
        padding: 32,
      }}>
        <Link href="/" style={{ color: "#8da9ca", textDecoration: "none" }}>
          ← Back to Home
        </Link>

        <h1 style={{ marginTop: 28 }}>Welcome Back</h1>
        <p style={{ color: "#a7b5c9" }}>
          Sign in to access your manufacturing workspace.
        </p>

        {error && (
          <p role="alert" style={{ color: "#ff8585" }}>
            {error}
          </p>
        )}

        <form onSubmit={handleLogin}>
          <label style={{ display: "block", marginTop: 22 }}>
            Email Address
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              style={inputStyle}
            />
          </label>

          <label style={{ display: "block", marginTop: 18 }}>
            Password
            <input
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              style={inputStyle}
            />
          </label>

          <button type="submit" disabled={loading} style={buttonStyle}>
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <p style={{ color: "#a7b5c9", marginTop: 24 }}>
          Don&apos;t have an account?{" "}
          <Link href="/register" style={{ color: "#73b7ff" }}>
            Create an account
          </Link>
        </p>
      </section>
    </main>
  );
}

const inputStyle = {
  display: "block",
  width: "100%",
  boxSizing: "border-box",
  marginTop: 8,
  padding: 13,
  borderRadius: 7,
  border: "1px solid #344760",
  background: "#081321",
  color: "#ffffff",
};

const buttonStyle = {
  width: "100%",
  marginTop: 25,
  padding: 14,
  border: "none",
  borderRadius: 7,
  background: "#2878d0",
  color: "#ffffff",
  fontWeight: 600,
  cursor: "pointer",
};
