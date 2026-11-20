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
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-12 text-white">
      <section className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-8 shadow-xl">
        <h1 className="text-2xl font-bold">Reset your password</h1>

        <p className="mt-2 text-sm text-slate-400">
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
            <label className="mb-2 block text-sm text-slate-300">New password</label>
            <input
              type="password"
              required
              minLength={isSupplier ? 12 : 8}
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-blue-500"
              placeholder="Enter new password"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm text-slate-300">Confirm new password</label>
            <input
              type="password"
              required
              minLength={isSupplier ? 12 : 8}
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-blue-500"
              placeholder="Confirm new password"
            />
          </div>

          <button
            type="submit"
            disabled={loading || !!message}
            className="w-full rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
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
