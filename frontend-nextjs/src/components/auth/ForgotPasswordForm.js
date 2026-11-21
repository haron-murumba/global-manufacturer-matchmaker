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
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#07111f] px-4 py-8 sm:py-12">
      <section className="relative w-full max-w-md rounded-3xl border border-slate-700/70 bg-slate-900/95 p-6 shadow-[0_24px_80px_rgba(0,0,0,0.4)] sm:p-9">
        <Link
          href={isSupplier ? "/supplier/login" : "/login"}
          className="text-sm font-medium text-blue-400 transition hover:text-blue-300 hover:underline"
        >
          ← Back to sign in
        </Link>

        <h1 className="mt-8 text-3xl font-bold tracking-tight text-white sm:text-4xl">
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
            <label className="mb-2 block text-sm font-medium text-slate-200">
              Email address
            </label>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              className="min-h-12 w-full rounded-xl border border-slate-700 bg-slate-950/80 px-4 py-3 text-white outline-none transition placeholder:text-slate-600 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="min-h-12 w-full rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white shadow-lg shadow-blue-950/30 transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Sending..." : "Send reset link"}
          </button>
        </form>
      </section>
    </main>
  );
}
