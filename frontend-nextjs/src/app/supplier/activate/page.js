
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
    <main className="min-h-screen flex items-center justify-center bg-slate-950 px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-8 shadow-xl">
        <Link
          href="/supplier/login"
          className="text-sm text-blue-400 hover:text-blue-300"
        >
          ← Supplier Login
        </Link>

        <div className="mt-8 mb-7">
          <h1 className="text-3xl font-bold text-white">
            Activate Account
          </h1>
          <p className="mt-2 text-sm text-slate-400">
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
            <label className="mb-2 block text-sm text-slate-300">
              Company email
            </label>
            <input
              type="email"
              required
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-blue-500"
              placeholder="company@example.com"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm text-slate-300">
              Activation token
            </label>
            <textarea
              required
              rows={3}
              value={activationToken}
              onChange={(e) => setActivationToken(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-blue-500"
              placeholder="Paste your activation token"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm text-slate-300">
              New password
            </label>
            <input
              type="password"
              required
              minLength={12}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-blue-500"
              placeholder="At least 12 characters"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm text-slate-300">
              Confirm password
            </label>
            <input
              type="password"
              required
              minLength={12}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-blue-500"
              placeholder="Repeat your password"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white transition hover:bg-blue-500 disabled:opacity-60"
          >
            {loading ? "Activating..." : "Activate Account"}
          </button>
        </form>
      </div>
    </main>
  );
}
