
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { activateManufacturer } from "@/lib/api";

export default function SupplierActivationPage() {
  const router = useRouter();

  const [contactEmail, setContactEmail] = useState("");
  const [activationToken, setActivationToken] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (password.length < 12) {
      setError("Password must contain at least 12 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      await activateManufacturer(
        contactEmail,
        activationToken.trim(),
        password
      );

      setSuccess(
        "Account activated successfully. Redirecting to supplier login..."
      );

      setTimeout(() => {
        router.push("/supplier/login");
      }, 1800);
    } catch (err) {
      setError(err.message || "Account activation failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#07111f] px-4 py-8 sm:py-12">
      <div className="relative w-full max-w-lg rounded-3xl border border-slate-700/70 bg-slate-900/95 p-6 shadow-[0_24px_80px_rgba(0,0,0,0.4)] sm:p-9">
        <Link
          href="/supplier/login"
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-400 transition hover:text-white"
        >
          ← Supplier Login
        </Link>

        <div className="mb-7 mt-8">
          <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Activate Account
          </h1>
          <p className="mt-3 text-sm leading-7 text-slate-400">
            Set up your supplier portal password using the activation token provided by the administrator.
          </p>
        </div>

        {error && (
          <div className="mb-5 rounded-lg border border-red-800 bg-red-950 p-3 text-sm text-red-300">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-5 rounded-lg border border-green-800 bg-green-950 p-3 text-sm text-green-300">
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-200">
              Company email
            </label>
            <input
              type="email"
              required
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              className="min-h-12 w-full rounded-xl border border-slate-700 bg-slate-950/80 px-4 py-3 text-white outline-none transition placeholder:text-slate-600 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
              placeholder="company@example.com"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-200">
              Activation token
            </label>
            <textarea
              required
              rows={3}
              value={activationToken}
              onChange={(e) => setActivationToken(e.target.value)}
              className="min-h-12 w-full rounded-xl border border-slate-700 bg-slate-950/80 px-4 py-3 text-white outline-none transition placeholder:text-slate-600 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
              placeholder="Paste your activation token"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-200">
              New password
            </label>
            <input
              type="password"
              required
              minLength={12}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="min-h-12 w-full rounded-xl border border-slate-700 bg-slate-950/80 px-4 py-3 text-white outline-none transition placeholder:text-slate-600 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
              placeholder="At least 12 characters"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-200">
              Confirm password
            </label>
            <input
              type="password"
              required
              minLength={12}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="min-h-12 w-full rounded-xl border border-slate-700 bg-slate-950/80 px-4 py-3 text-white outline-none transition placeholder:text-slate-600 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
              placeholder="Repeat your password"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="min-h-12 w-full rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white shadow-lg shadow-blue-950/30 transition hover:bg-blue-500 disabled:opacity-60"
          >
            {loading ? "Activating..." : "Activate Account"}
          </button>
        </form>
      </div>
    </main>
  );
}
