
"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  getSupplierRFQs,
  submitSupplierQuotation,
} from "@/lib/api";

export default function SupplierRFQPage() {
  const router = useRouter();

  const [rfqs, setRfqs] = useState([]);
  const [manufacturer, setManufacturer] = useState(null);
  const [selectedRFQ, setSelectedRFQ] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [form, setForm] = useState({
    unitPrice: "",
    totalPrice: "",
    currency: "USD",
    leadTime: "",
    paymentTerms: "",
    notes: "",
  });

  const loadRFQs = useCallback(async (token) => {
    setLoading(true);
    setError("");

    try {
      const result = await getSupplierRFQs(token);
      setRfqs(result.rfqs || []);
    } catch (err) {
      setError(err.message || "Unable to load your RFQs.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
  const token = localStorage.getItem("manufacturerToken");

    if (!token) {
      router.replace("/supplier/login");
      return;
    }

    try {
      const savedManufacturer = localStorage.getItem("manufacturer");
      if (savedManufacturer) {
        setManufacturer(JSON.parse(savedManufacturer));
      }
    } catch {
      localStorage.removeItem("manufacturer");
    }

    loadRFQs(token);
  }, [router, loadRFQs]);

  function logout() {
    localStorage.removeItem("manufacturerToken");
    localStorage.removeItem("manufacturer");
    router.replace("/supplier/login");
  }

  function openQuotation(rfq) {
    setSelectedRFQ(rfq);
    setSuccess("");
    setError("");

    const quotation = rfq.quotation || {};

    setForm({
      unitPrice: quotation.unitPrice ?? "",
      totalPrice: quotation.totalPrice ?? "",
      currency: quotation.currency || "USD",
      leadTime: quotation.leadTime || "",
      paymentTerms: quotation.paymentTerms || "",
      notes: quotation.notes || "",
    });
  }

  async function handleResponse(event, status) {
    event.preventDefault();

    if (!selectedRFQ) return;

    const token = localStorage.getItem("manufacturerToken");

    const savedManufacturer = localStorage.getItem("manufacturer");

    let manufacturerId = null;

    try {
        manufacturerId = savedManufacturer
          ? JSON.parse(savedManufacturer)?.id
          : null;
    } catch {
        manufacturerId = null;
    }

    if (!token || !manufacturerId) {
      setError("Your supplier session or manufacturer details are missing.");
      return;
    }

    if (
      status === "Submitted" &&
      (
        form.unitPrice === "" ||
        Number(form.unitPrice) < 0 ||
        !Number.isFinite(Number(form.unitPrice))
      )
    ) {
      setError("Enter a valid unit price.");
      return;
    }

    if (
      form.totalPrice !== "" &&
      (
        !Number.isFinite(Number(form.totalPrice)) ||
        Number(form.totalPrice) < 0
      )
    ) {
      setError("Enter a valid total price.");
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const quotationData = {
        status,
        notes: form.notes,
      };

      if (status === "Submitted") {
        quotationData.unitPrice = Number(form.unitPrice);

        if (form.totalPrice !== "") {
          quotationData.totalPrice = Number(form.totalPrice);
        }

        quotationData.currency = form.currency;
        quotationData.leadTime = form.leadTime;
        quotationData.paymentTerms = form.paymentTerms;
      }

      await submitSupplierQuotation(
        selectedRFQ._id,
        manufacturerId,
        quotationData,
        token
      );

      setSuccess(
        status === "Submitted"
          ? "Your quotation has been submitted successfully."
          : "You have declined this RFQ."
      );

      setSelectedRFQ(null);
      await loadRFQs(token);
    } catch (err) {
      setError(err.message || "Unable to update your response.");
    } finally {
      setSaving(false);
    }
  }

  const pendingCount = rfqs.filter(
    (rfq) => rfq.quotation?.status === "Pending"
  ).length;

  const submittedCount = rfqs.filter(
    (rfq) => rfq.quotation?.status === "Submitted"
  ).length;

  const declinedCount = rfqs.filter(
    (rfq) => rfq.quotation?.status === "Declined"
  ).length;

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-white sm:px-6 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <Link
              href="/"
              className="text-sm text-blue-400 hover:underline"
            >
              Global Manufacturer Matchmaker
            </Link>

            <h1 className="mt-3 text-3xl font-bold">
              Supplier Workspace
            </h1>

            <p className="mt-2 text-sm text-slate-400">
              {manufacturer?.companyName || "Manage your sourcing invitations"}
            </p>
          </div>

          <button
            onClick={logout}
            className="rounded-lg border border-slate-700 px-4 py-2 text-sm hover:bg-slate-800"
          >
            Sign Out
          </button>
        </header>

        {error && (
          <div className="mb-5 rounded-lg border border-red-800 bg-red-950 p-4 text-sm text-red-300">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-5 rounded-lg border border-green-800 bg-green-950 p-4 text-sm text-green-300">
            {success}
          </div>
        )}

        <section className="mb-8 grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">Pending responses</p>
            <p className="mt-2 text-3xl font-bold">{pendingCount}</p>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">Submitted quotations</p>
            <p className="mt-2 text-3xl font-bold">{submittedCount}</p>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">Declined invitations</p>
            <p className="mt-2 text-3xl font-bold">{declinedCount}</p>
          </div>
        </section>

        <section className="rounded-xl border border-slate-800 bg-slate-900 p-5 sm:p-6">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold">My RFQ Invitations</h2>
              <p className="mt-1 text-sm text-slate-400">
                Requests assigned to your manufacturer account.
              </p>
            </div>

            <button
              onClick={() => {
                const token = localStorage.getItem("manufacturerToken");
                if (token) loadRFQs(token);
              }}
              disabled={loading}
              className="rounded-lg border border-slate-700 px-4 py-2 text-sm hover:bg-slate-800 disabled:opacity-50"
            >
              {loading ? "Loading..." : "Refresh"}
            </button>
          </div>

          {loading ? (
            <p className="py-10 text-center text-slate-400">
              Loading your RFQ invitations...
            </p>
          ) : rfqs.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-700 py-12 text-center">
              <h3 className="font-medium">No RFQ invitations yet</h3>
              <p className="mt-2 text-sm text-slate-400">
                New requests assigned to your company will appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {rfqs.map((rfq) => {
                const status = rfq.quotation?.status || "Pending";

                return (
                  <article
                    key={rfq._id}
                    className="rounded-lg border border-slate-800 bg-slate-950 p-5"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <h3 className="text-lg font-semibold">
                          {rfq.title}
                        </h3>

                        <p className="mt-1 text-sm text-slate-400">
                          Project: {rfq.project?.productName || "Sourcing project"}
                        </p>
                      </div>

                      <span
                        className={`rounded-full px-3 py-1 text-xs font-medium ${
                          status === "Submitted"
                            ? "bg-green-950 text-green-300"
                            : status === "Declined"
                              ? "bg-red-950 text-red-300"
                              : "bg-amber-950 text-amber-300"
                        }`}
                      >
                        {status}
                      </span>
                    </div>

                    <div className="mt-5 grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
                      <div>
                        <p className="text-slate-500">Quantity</p>
                        <p className="mt-1">{rfq.quantity}</p>
                      </div>

                      <div>
                        <p className="text-slate-500">Material</p>
                        <p className="mt-1">{rfq.material || "Not specified"}</p>
                      </div>

                      <div>
                        <p className="text-slate-500">Process</p>
                        <p className="mt-1">{rfq.process || "Not specified"}</p>
                      </div>

                      <div>
                        <p className="text-slate-500">Quotation deadline</p>
                        <p className="mt-1">
                          {rfq.quotationDeadline
                            ? new Date(rfq.quotationDeadline).toLocaleDateString()
                            : "Not specified"}
                        </p>
                      </div>
                    </div>

                    {rfq.deliveryLocation && (
                      <p className="mt-4 text-sm text-slate-400">
                        Delivery location: {rfq.deliveryLocation}
                      </p>
                    )}

                    {status === "Pending" && (
                      <button
                        onClick={() => openQuotation(rfq)}
                        className="mt-5 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold hover:bg-blue-500"
                      >
                        Respond to RFQ
                      </button>
                    )}

                    {status === "Submitted" && (
                      <p className="mt-4 text-sm text-green-400">
                        Quotation submitted: {rfq.quotation?.currency || "USD"}{" "}
                        {rfq.quotation?.totalPrice ?? "Price not available"}
                      </p>
                    )}

                    {status === "Declined" && (
                      <p className="mt-4 text-sm text-slate-400">
                        You declined this invitation.
                      </p>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </section>

        {selectedRFQ && (
          <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/80 p-4">
            <div className="my-auto w-full max-w-2xl rounded-2xl border border-slate-700 bg-slate-900 p-6">
              <div className="mb-6 flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold">Respond to RFQ</h2>
                  <p className="mt-1 text-sm text-slate-400">
                    {selectedRFQ.title}
                  </p>
                </div>

                <button
                  onClick={() => setSelectedRFQ(null)}
                  disabled={saving}
                  className="text-slate-400 hover:text-white"
                  aria-label="Close quotation form"
                >
                  ✕
                </button>
              </div>

              <form
                onSubmit={(event) => handleResponse(event, "Submitted")}
                className="space-y-4"
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm text-slate-300">
                      Unit price *
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      required
                      value={form.unitPrice}
                      onChange={(e) =>
                        setForm({ ...form, unitPrice: e.target.value })
                      }
                      className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-3 text-white"
                      placeholder="0.00"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm text-slate-300">
                      Total price
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.totalPrice}
                      onChange={(e) =>
                        setForm({ ...form, totalPrice: e.target.value })
                      }
                      className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-3 text-white"
                      placeholder="Leave blank to calculate"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm text-slate-300">
                      Currency
                    </label>
                    <select
                      value={form.currency}
                      onChange={(e) =>
                        setForm({ ...form, currency: e.target.value })
                      }
                      className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-3 text-white"
                    >
                      <option value="USD">USD</option>
                      <option value="EUR">EUR</option>
                      <option value="GBP">GBP</option>
                      <option value="KES">KES</option>
                      <option value="CNY">CNY</option>
                    </select>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm text-slate-300">
                      Lead time
                    </label>
                    <input
                      type="text"
                      value={form.leadTime}
                      onChange={(e) =>
                        setForm({ ...form, leadTime: e.target.value })
                      }
                      className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-3 text-white"
                      placeholder="e.g. 30 days"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm text-slate-300">
                    Payment terms
                  </label>
                  <input
                    type="text"
                    value={form.paymentTerms}
                    onChange={(e) =>
                      setForm({ ...form, paymentTerms: e.target.value })
                    }
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-3 text-white"
                    placeholder="e.g. 30% deposit, 70% before shipment"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm text-slate-300">
                    Additional notes
                  </label>
                  <textarea
                    rows={3}
                    value={form.notes}
                    onChange={(e) =>
                      setForm({ ...form, notes: e.target.value })
                    }
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-3 text-white"
                    placeholder="Add production, packaging or delivery details..."
                  />
                </div>

                <div className="flex flex-wrap justify-between gap-3 border-t border-slate-800 pt-5">
                  <button
                    type="button"
                    disabled={saving}
                    onClick={(event) => handleResponse(event, "Declined")}
                    className="rounded-lg border border-red-800 px-4 py-3 text-sm font-medium text-red-300 hover:bg-red-950 disabled:opacity-50"
                  >
                    Decline RFQ
                  </button>

                  <button
                    type="submit"
                    disabled={saving}
                    className="rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold hover:bg-blue-500 disabled:opacity-50"
                  >
                    {saving ? "Submitting..." : "Submit Quotation"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
