"use client";

import { useState } from "react";
import Link from "next/link";
import { requestPasswordReset } from "@/lib/api";

export default function ForgotPasswordForm({ accountType = "customer" }) {
  const isSupplier = accountType === "supplier";
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    setError("");

    try {
      const result = await requestPasswordReset(accountType, email);
      setMessage(
        result.message ||
          "If an account exists for that email, password reset instructions will be sent."
      );
    } catch (err) {
      setError(err.message || "Unable to process your request. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-950 px-4 py-10">
      <section className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-8 shadow-xl">
        <Link
          href={isSupplier ? "/supplier/login" : "/login"}
          className="text-sm text-blue-400 hover:underline"
        >
          ← Back to sign in
        </Link>

        <h1 className="mt-8 text-3xl font-bold text-white">
          Forgot your password?
        </h1>

        <p className="mt-3 text-sm text-slate-400">
          Enter the email address associated with your {isSupplier ? "supplier" : "customer"} account.
          If an eligible account exists, we will send you a password reset link.
        </p>

        {message && (
          <div
            role="status"
            className="mt-6 rounded-lg border border-green-800 bg-green-950 p-3 text-sm text-green-300"
          >
            {message}
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="mt-6 rounded-lg border border-red-800 bg-red-950 p-3 text-sm text-red-300"
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-7 space-y-5">
          <div>
            <label className="mb-2 block text-sm text-slate-300">
              Email address
            </label>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-blue-500"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Sending..." : "Send reset link"}
          </button>
        </form>
      </section>
    </main>
  );
}
