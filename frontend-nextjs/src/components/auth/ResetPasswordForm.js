"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { resetAccountPassword } from "@/lib/api";

export default function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const token = searchParams.get("token") || "";
  const accountType =
    searchParams.get("type") === "supplier" ? "supplier" : "customer";
  const isSupplier = accountType === "supplier";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const loginPath = isSupplier ? "/supplier/login" : "/login";


  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!token) {
      setError("This reset link is invalid or incomplete. Request a new one.");
      return;
    }

    const minimumLength = isSupplier ? 12 : 8;

    if (password.length < minimumLength) {
      setError(`Your password must contain at least ${minimumLength} characters.`);
      return;
    }

    if (password !== confirmPassword) {
      setError("The passwords do not match.");
      return;
    }

    try {
      setLoading(true);
      const result = await resetAccountPassword(accountType, token, password);
      setMessage(result.message || "Your password has been reset successfully.");
      setPassword("");
      setConfirmPassword("");
    } catch (err) {
      setError(err.message || "Unable to reset your password. Request a new link.");
    } finally {
      setLoading(false);
    }
  }


  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#07111f] px-4 py-8 text-white sm:py-12">
      <section className="relative w-full max-w-md rounded-3xl border border-slate-700/70 bg-slate-900/95 p-6 shadow-[0_24px_80px_rgba(0,0,0,0.4)] sm:p-9">
        <h1 className="text-2xl font-bold">Reset your password</h1>

        <p className="mt-3 text-sm leading-7 text-slate-400">
          Choose a new password for your {isSupplier ? "supplier" : "customer"} account.
          Minimum {isSupplier ? 12 : 8} characters.
        </p>

        {error && (
          <div role="alert" className="mt-6 rounded-lg border border-red-800 bg-red-950 p-3 text-sm text-red-300">
            {error}
          </div>
        )}

        {message && (
          <div role="status" className="mt-6 rounded-lg border border-green-800 bg-green-950 p-3 text-sm text-green-300">
            {message}
            <div className="mt-3">
              <Link href={loginPath} className="font-semibold text-green-200 underline">
                Continue to login
              </Link>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-7 space-y-5">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-200">New password</label>
            <input
              type="password"
              required
              minLength={isSupplier ? 12 : 8}
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="min-h-12 w-full rounded-xl border border-slate-700 bg-slate-950/80 px-4 py-3 text-white outline-none transition placeholder:text-slate-600 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
              placeholder="Enter new password"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-200">Confirm new password</label>
            <input
              type="password"
              required
              minLength={isSupplier ? 12 : 8}
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              className="min-h-12 w-full rounded-xl border border-slate-700 bg-slate-950/80 px-4 py-3 text-white outline-none transition placeholder:text-slate-600 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
              placeholder="Confirm new password"
            />
          </div>

          <button
            type="submit"
            disabled={loading || !!message}
            className="min-h-12 w-full rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white shadow-lg shadow-blue-950/30 transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Updating..." : "Reset password"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-400">
          <Link href={loginPath} className="text-blue-400 hover:underline">
            Back to login
          </Link>
        </p>
      </section>
    </main>
  );
}
