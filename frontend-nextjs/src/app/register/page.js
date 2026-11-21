
"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { customerRegister } from "@/lib/api";

export default function CustomerRegisterPage() {
  const router = useRouter();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleRegister(event) {
    event.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("Password must contain at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const data = await customerRegister({
        fullName,
        email,
        password,
      });

      localStorage.setItem("customerToken", data.token);
      router.push("/dashboard");
    } catch (err) {
      setError(err.message || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={pageStyle}>
      <section style={panelStyle}>
        <Link href="/" style={backLinkStyle}>
          ← Back to Home
        </Link>

        <h1 style={{ marginTop: 28 }}>Create Your Customer Account</h1>

        <p style={{ color: "#a7b5c9", lineHeight: 1.7 }}>
          Create a customer account to manage sourcing projects, discover
          manufacturing partners, request quotations and compare supplier offers.
        </p>

        <div style={{
          marginTop: 18,
          padding: 13,
          borderRadius: 8,
          background: "#172942",
          border: "1px solid #304967",
          color: "#c5d5e9",
          fontSize: 13,
          lineHeight: 1.6
        }}>
          <strong style={{ color: "#ffffff" }}>Creating a customer account?</strong>
          <br />
          This registration is for businesses sourcing products. Manufacturers
          must submit a separate company application for verification.
        </div>

        {error && (
          <p role="alert" style={{ color: "#ff8585" }}>
            {error}
          </p>
        )}

        <form onSubmit={handleRegister}>
          <label style={labelStyle}>
            Full Name
            <input
              type="text"
              required
              autoComplete="name"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              style={inputStyle}
            />
          </label>

          <label style={labelStyle}>
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

          <label style={labelStyle}>
            Password
            <input
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              style={inputStyle}
            />
          </label>

          <label style={labelStyle}>
            Confirm Password
            <input
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              style={inputStyle}
            />
          </label>

          <button type="submit" disabled={loading} style={buttonStyle}>
            {loading ? "Creating Account..." : "Create Account"}
          </button>
        </form>

        <p style={{ color: "#a7b5c9", marginTop: 24 }}>
          Already have a customer account?{" "}
          <Link href="/login" style={{ color: "#73b7ff" }}>
            Sign In
          </Link>
        </p>

        <div style={{
          marginTop: 20,
          paddingTop: 18,
          borderTop: "1px solid #263750",
          color: "#a7b5c9",
          fontSize: 13,
          lineHeight: 1.7
        }}>
          Are you a manufacturer?
          <br />
          <Link href="/manufacturers" style={{
            color: "#73b7ff",
            fontWeight: 700,
            textDecoration: "none"
          }}>
            Apply as a Manufacturing Partner →
          </Link>
        </div>
      </section>
    </main>
  );
}

const pageStyle = {
  minHeight: "100vh",
  display: "grid",
  placeItems: "center",
  background: "#081321",
  color: "#ffffff",
  padding: 20,
};

const panelStyle = {
  width: "100%",
  maxWidth: 460,
  boxSizing: "border-box",
  background: "#111d30",
  border: "1px solid #263750",
  borderRadius: 14,
  padding: 32,
};

const backLinkStyle = {
  color: "#8da9ca",
  textDecoration: "none",
};

const labelStyle = {
  display: "block",
  marginTop: 18,
};

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
