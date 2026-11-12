
"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  getProjects,
  getManufacturers,
  getRFQs,
  createRFQ,
  awardRFQ,
} from "@/lib/api";

const emptyForm = {
  projectId: "",
  title: "",
  quantity: "",
  material: "",
  process: "",
  deliveryLocation: "",
  quotationDeadline: "",
  specifications: "",
};

function RFQContent() {
  const searchParams = useSearchParams();
  const selectedRfqId = searchParams.get("rfqId");
  const [projects, setProjects] = useState([]);
  const [manufacturers, setManufacturers] = useState([]);

  const verifiedManufacturers = manufacturers.filter(
  (manufacturer) => manufacturer.verificationStatus === "Verified"
);
  const [rfqs, setRfqs] = useState([]);
  const [selectedManufacturers, setSelectedManufacturers] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

    useEffect(() => {
    if (!selectedRfqId || loading) return;

    const timer = setTimeout(() => {
      document
        .getElementById(`rfq-${selectedRfqId}`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 200);

    return () => clearTimeout(timer);
  }, [selectedRfqId, loading, rfqs]);


  async function loadData() {
    try {
      setLoading(true);
      setError("");

      const token = localStorage.getItem("adminToken");

      if (!token) {
        setError("Administrator login required. Please sign in through the Admin Dashboard.");
        return;
      }

      const [projectData, manufacturerData, rfqData] = await Promise.all([
        getProjects(),
        getManufacturers(),
        getRFQs(token),
      ]);

      setProjects(projectData.projects || []);
      setManufacturers(manufacturerData.manufacturers || []);
      setRfqs(rfqData.rfqs || []);
    } catch (err) {
      setError(err.message || "Unable to load RFQ information.");
    } finally {
      setLoading(false);
    }
  }


    useEffect(() => {
      loadData();
    }, []);

    function handleProjectChange(event) {
      const project = projects.find(
        (item) => item._id === event.target.value
      );

      setForm((current) => ({
        ...current,
        projectId: event.target.value,
        title: project ? `${project.productName} - Supplier RFQ` : "",
        quantity: project ? String(project.quantity || "") : "",
        material: project?.material || "",
        process: project?.process || "",
      }));
    }

    function toggleManufacturer(id) {
      setSelectedManufacturers((current) =>
        current.includes(id)
          ? current.filter((item) => item !== id)
          : [...current, id]
      );
  }


  async function handleCreateRFQ(event) {
    event.preventDefault();

    try {
      setSaving(true);
      setError("");
      setMessage("");

      const token = localStorage.getItem("adminToken");

      if (!token) {
        setError("Administrator login required. Please sign in first.");
        return;
      }

      await createRFQ(
        {
          ...form,
          quantity: Number(form.quantity),
          quotationDeadline: form.quotationDeadline
            ? new Date(form.quotationDeadline).toISOString()
            : undefined,
          manufacturerIds: selectedManufacturers,
        },
        token
      );

      setMessage("RFQ created and assigned to selected manufacturers.");
      setForm(emptyForm);
      setSelectedManufacturers([]);
      await loadData();
    } catch (err) {
      setError(err.message || "Could not create RFQ.");
    } finally {
      setSaving(false);
    }
  }

  async function handleAwardRFQ(rfqId, manufacturerId) {
  const token = localStorage.getItem("adminToken");

  if (!token) {
    setError("Administrator login is required to award an RFQ.");
    return;
  }

  const confirmed = window.confirm(
    "Are you sure you want to award this RFQ to this manufacturer?"
  );

  if (!confirmed) return;

  try {
    setSaving(true);
    setError("");
    setMessage("");

    await awardRFQ(rfqId, manufacturerId, token);

    setMessage("RFQ successfully awarded to the selected manufacturer.");
    await loadData();
  } catch (err) {
    setError(err.message || "Could not award this RFQ.");
  } finally {
    setSaving(false);
  }
}

  const totalResponses = rfqs.reduce(
    (sum, rfq) => sum + rfq.quotations.filter(
      (item) => item.status === "Submitted"
    ).length,
    0
  );

  return (
    <main className="rfq-page">
      <Link href="/" className="back-link">
        ← Back to Dashboard
      </Link>

      <header className="page-heading">
        <div>
          <p className="eyebrow">PROCUREMENT WORKSPACE</p>
          <h1>RFQ Manager</h1>
          <p className="muted">
            Request supplier quotations and manage sourcing responses.
          </p>
        </div>

        <button className="refresh-button" onClick={loadData}>
          ↻ Refresh
        </button>
      </header>

      <section className="summary-grid">
        <article className="summary-card">
          <span>Total RFQs</span>
          <strong>{rfqs.length}</strong>
        </article>
        <article className="summary-card">
          <span>Verified Suppliers</span>
          <strong>{verifiedManufacturers.length}</strong>
        </article>
        <article className="summary-card">
          <span>Quotations Received</span>
          <strong>{totalResponses}</strong>
        </article>
      </section>

      {error && <div className="notice error">{error}</div>}
      {message && <div className="notice success">{message}</div>}

      <section className="panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">NEW REQUEST</p>
            <h2>Create a Request for Quotation</h2>
            <p className="muted">
              Select a project and invite verified manufacturers.
            </p>
          </div>
        </div>

        {loading ? (
          <p className="muted">Loading your sourcing information...</p>
        ) : (
          <form onSubmit={handleCreateRFQ}>
            <div className="form-grid">
              <label>
                Project *
                <select
                  value={form.projectId}
                  onChange={handleProjectChange}
                  required
                >
                  <option value="">Select a project</option>
                  {projects.map((project) => (
                    <option key={project._id} value={project._id}>
                      {project.productName}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                RFQ Title *
                <input
                  value={form.title}
                  onChange={(e) =>
                    setForm({ ...form, title: e.target.value })
                  }
                  placeholder="Enter RFQ title"
                  required
                />
              </label>

              <label>
                Order Quantity *
                <input
                  type="number"
                  min="1"
                  value={form.quantity}
                  onChange={(e) =>
                    setForm({ ...form, quantity: e.target.value })
                  }
                  required
                />
              </label>

              <label>
                Material
                <input
                  value={form.material}
                  onChange={(e) =>
                    setForm({ ...form, material: e.target.value })
                  }
                />
              </label>

              <label>
                Manufacturing Process
                <input
                  value={form.process}
                  onChange={(e) =>
                    setForm({ ...form, process: e.target.value })
                  }
                />
              </label>

              <label>
                Delivery Location
                <input
                  value={form.deliveryLocation}
                  onChange={(e) =>
                    setForm({ ...form, deliveryLocation: e.target.value })
                  }
                  placeholder="e.g. Nairobi, Kenya"
                />
              </label>

              <label>
                Quotation Deadline
                <input
                    type="date"
                    value={form.quotationDeadline}
                    min={new Date().toISOString().split("T")[0]}
                    onChange={(e) =>
                    setForm({ ...form, quotationDeadline: e.target.value })
                    }
                />
                </label>

              <label className="full-width">
                Additional Specifications
                <textarea
                  rows="3"
                  value={form.specifications}
                  onChange={(e) =>
                    setForm({ ...form, specifications: e.target.value })
                  }
                  placeholder="Enter product requirements, packaging, quality standards, etc."
                />
              </label>
            </div>

            <div className="supplier-selection">
              <h3>Select Verified Manufacturers *</h3>
              <p className="muted">
                Choose the suppliers who should receive this RFQ.
              </p>

              {manufacturers.length === 0 ? (
                <p className="muted">
                  No verified manufacturers available. Approve suppliers in
                  the Admin Dashboard first.
                </p>
              ) : (
                <div className="supplier-grid">
                  {verifiedManufacturers.map((manufacturer) => (
                    <label className="supplier-option" key={manufacturer._id}>
                      <input
                        type="checkbox"
                        checked={selectedManufacturers.includes(manufacturer._id)}
                        onChange={() => toggleManufacturer(manufacturer._id)}
                      />
                      <span>
                        <strong>{manufacturer.companyName}</strong>
                        <small>
                          {manufacturer.city}, {manufacturer.country}
                        </small>
                        <small>
                          Processes: {(manufacturer.manufacturingProcesses || []).join(", ")}
                        </small>
                      </span>
                    </label>
                  ))}
                </div>
              )}

              <p className="muted">
                {selectedManufacturers.length} manufacturer(s) selected.
              </p>
            </div>

            <button
              className="primary-button"
              type="submit"
              disabled={
                saving ||
                !form.projectId ||
                selectedManufacturers.length === 0
              }
            >
              {saving ? "Creating RFQ..." : "Create & Assign RFQ"}
            </button>
          </form>
        )}
      </section>

      <section className="panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">QUOTATION WORKSPACE</p>
            <h2>RFQ History & Supplier Responses</h2>
          </div>
        </div>

        {loading ? (
          <p className="muted">Loading RFQs...</p>
        ) : rfqs.length === 0 ? (
          <p className="muted">No RFQs created yet.</p>
        ) : (
          <div className="rfq-list">
            {rfqs.map((rfq) => (
              <article
                  id={`rfq-${rfq._id}`}
                  className={`rfq-card ${
                    selectedRfqId === rfq._id ? "selected-rfq" : ""
                  }`}
                  key={rfq._id}
                >
                <div className="rfq-heading">
                  <div>
                    <h3>{rfq.title}</h3>
                    <p className="muted">
                      Project: {rfq.project?.productName || "Unknown"} ·
                      Quantity: {rfq.quantity}
                    </p>
                    <p className="muted">
                      Material: {rfq.material || "—"} ·
                      Process: {rfq.process || "—"}
                    </p>
                  </div>
                  <span className="status">{rfq.status}</span>
                </div>

                <h4>Supplier Quotations</h4>

                {rfq.quotations.map((quotation) => {
                  const manufacturer = quotation.manufacturer;

                  if (!manufacturer) return null;

                  const isSelected =
                    rfq.selectedManufacturer?._id === manufacturer._id ||
                    rfq.selectedManufacturer === manufacturer._id;

                  return (
                    <div className="quotation-row" key={manufacturer._id}>
                      <div className="quotation-info">
                        <strong>{manufacturer.companyName}</strong>

                        <small>
                          {manufacturer.city}, {manufacturer.country}
                        </small>

                        <span className={`response-status ${quotation.status.toLowerCase()}`}>
                          {quotation.status}
                        </span>

                        {isSelected && (
                          <span className="recommendation">
                            Selected Supplier
                          </span>
                        )}
                      </div>

                      {quotation.status === "Submitted" && (
                        <div className="quotation-details">
                          <strong>
                            {quotation.currency || "USD"}{" "}
                            {Number(quotation.unitPrice).toLocaleString()} / unit
                          </strong>

                          <small>
                            Total: {quotation.currency || "USD"}{" "}
                            {Number(
                              quotation.totalPrice ??
                              quotation.unitPrice * rfq.quantity
                            ).toLocaleString()}
                          </small>

                          <small>
                            Lead time: {quotation.leadTime || "Not specified"}
                          </small>

                          <small>
                            Payment: {quotation.paymentTerms || "Not specified"}
                          </small>

                          {quotation.notes && <small>Notes: {quotation.notes}</small>}

                          {!rfq.selectedManufacturer && rfq.status !== "Cancelled" && (
                            <button
                              className="primary-button"
                              disabled={saving}
                              onClick={() =>
                                handleAwardRFQ(rfq._id, manufacturer._id)
                              }
                            >
                              Select Supplier
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
                {(() => {
            const submitted = rfq.quotations
              .filter((item) => item.status === "Submitted")
              .sort((a, b) => Number(a.totalPrice ?? a.unitPrice * rfq.quantity) -
                              Number(b.totalPrice ?? b.unitPrice * rfq.quantity));

            const lowest = submitted[0];

            return (
              <div className="comparison">
                <h4>Supplier Quotation Comparison</h4>

                {submitted.length === 0 ? (
                  <p>No supplier quotations have been submitted yet.</p>
                ) : (
                  <>
                    {submitted.length === 1 && (
                      <p>
                        One quotation received. Awaiting additional supplier quotations
                        before making a comparison.
                      </p>
                    )}

                    <div className="comparison-table">
                      <div className="comparison-row comparison-header">
                        <span>Supplier</span>
                        <span>Unit Price</span>
                        <span>Total Price</span>
                        <span>Lead Time</span>
                        <span>Payment Terms</span>
                      </div>

                      {submitted.map((item) => {
                        const isLowest = submitted.length > 1 && item._id === lowest._id;

                        return (
                          <div
                            className={`comparison-row ${isLowest ? "lowest-quotation" : ""}`}
                            key={item._id}
                          >
                            <span>
                              <strong>{item.manufacturer?.companyName || "Supplier"}</strong>
                              {submitted.length === 1 ? (
                                  <small className="recommendation">
                                    Only quotation received
                                  </small>
                                ) : isLowest ? (
                                  <small className="recommendation">
                                    Lowest total price
                                  </small>
                                ) : null}

                            </span>

                            <span>
                              {item.currency || "USD"}{" "}
                              {Number(item.unitPrice).toLocaleString()}
                            </span>

                            <span>
                              {item.currency || "USD"}{" "}
                              {Number(
                                item.totalPrice ?? item.unitPrice * rfq.quantity
                              ).toLocaleString()}
                            </span>

                            <span>{item.leadTime || "Not specified"}</span>

                            <span>{item.paymentTerms || "Not specified"}</span>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            );
          })()}
              </article>
            ))}
          </div>
        )}
      </section>

      <style jsx>{`
        .rfq-page {
          max-width: 1250px;
          margin: auto;
          padding: 30px;
          color: #e5edf8;
        }

        .back-link {
          color: #70a8ff;
          text-decoration: none;
          font-size: 13px;
        }

        .page-heading, .section-heading, .rfq-heading {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 18px;
        }

        .page-heading {
          margin: 25px 0;
        }

        h1 {
          font-size: 30px;
          margin: 5px 0;
        }

        h2 {
          font-size: 19px;
          margin: 5px 0;
        }

        h3 {
          font-size: 15px;
        }

        h4 {
          font-size: 13px;
          margin: 20px 0 12px;
        }

        .eyebrow {
          color: #5795ff;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 1.5px;
        }

        .muted, small {
          color: #93a4ba;
          font-size: 12px;
        }

        .summary-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
          margin-bottom: 22px;
        }

        .summary-card, .panel, .rfq-card {
          background: #111e31;
          border: 1px solid #263851;
          border-radius: 9px;
        }

        .selected-rfq {
          border: 2px solid #5795ff;
          box-shadow: 0 0 15px rgba(87, 149, 255, 0.2);
          background: #152944;
          transition: all 0.3s ease;
        }

        .summary-card {
          padding: 19px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .summary-card span {
          color: #9cacc1;
          font-size: 12px;
        }

        .summary-card strong {
          font-size: 25px;
        }

        .panel {
          padding: 23px;
          margin-bottom: 23px;
        }

        .form-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 16px;
          margin: 20px 0;
        }

        label {
          display: flex;
          flex-direction: column;
          gap: 8px;
          color: #adbed2;
          font-size: 12px;
        }

        input, select, textarea {
          width: 100%;
          padding: 12px;
          color: #e5edf8;
          background: #0b1525;
          border: 1px solid #344966;
          border-radius: 6px;
          outline: none;
        }

        input:focus, select:focus, textarea:focus {
          border-color: #5795ff;
        }

        .full-width {
          grid-column: 1 / -1;
        }

        .supplier-selection {
          border-top: 1px solid #263851;
          padding: 18px 0;
          margin-top: 10px;
        }

        .supplier-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px;
          margin: 16px 0;
        }

        .supplier-option {
          flex-direction: row;
          align-items: flex-start;
          padding: 14px;
          background: #0b1525;
          border: 1px solid #263851;
          border-radius: 7px;
          cursor: pointer;
        }

        .supplier-option input {
          width: auto;
          margin-top: 3px;
        }

        .supplier-option span {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .primary-button, .secondary-button, .decline-button, .refresh-button {
          padding: 11px 17px;
          border: 0;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 700;
          font-size: 12px;
        }

        .primary-button {
          color: white;
          background: #2563eb;
        }

        .primary-button:disabled, button:disabled {
          opacity: .55;
          cursor: not-allowed;
        }

        .refresh-button, .secondary-button {
          background: #263c5b;
          color: #dce9fa;
        }

        .decline-button {
          background: #48252d;
          color: #ff9ca5;
        }

        .notice {
          padding: 13px;
          margin-bottom: 15px;
          border-radius: 6px;
          font-size: 13px;
        }

        .error {
          background: #421f2a;
          color: #ffabb3;
        }

        .success {
          background: #14382f;
          color: #77e1b8;
        }

        .rfq-card {
          padding: 20px;
          margin-top: 15px;
        }

        .rfq-heading {
          border-bottom: 1px solid #263851;
          padding-bottom: 14px;
        }

        .status, .response-status {
          display: inline-block;
          padding: 6px 10px;
          border-radius: 20px;
          background: #253b5a;
          color: #bcd4fa;
          font-size: 10px;
        }

        .quotation-row {
          display: grid;
          grid-template-columns: 1fr auto;
          gap: 15px;
          align-items: center;
          padding: 15px 0;
          border-bottom: 1px solid #263851;
        }

        .quotation-info, .quotation-details {
          display: flex;
          flex-direction: column;
          gap: 7px;
        }

        .quotation-actions {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .response-status.submitted {
          background: #164b3b;
          color: #8de4bd;
          width: fit-content;
        }

        .response-status.pending {
          width: fit-content;
        }

        .response-status.declined {
          background: #48252d;
          color: #ffabb3;
          width: fit-content;
        }

        .quotation-form, .comparison {
          grid-column: 1 / -1;
          background: #0b1525;
          border: 1px solid #263851;
          border-radius: 7px;
          padding: 16px;
          margin-top: 10px;
        }

                .comparison-row {
              display: grid;
              grid-template-columns: 1.5fr 1fr 1fr 1fr 1.5fr;
              align-items: center;
              gap: 15px;
              padding: 10px 0;
              border-bottom: 1px solid #263851;
              font-size: 12px;
              min-width: 700px;
            }

            .comparison-table {
              overflow-x: auto;
            }

            .comparison-header {
              color: #93a4ba;
              font-weight: 700;
              border-bottom: 1px solid #5795ff;
            }

            .lowest-quotation {
              background: #12372e;
              border-radius: 6px;
              padding-left: 8px;
              padding-right: 8px;
            }

            .recommendation {
              display: block;
              color: #8de4bd;
              font-weight: 700;
              margin-top: 5px;
            }

            @media (max-width: 700px) {
              .rfq-page {
                padding: 17px;
              }

          .page-heading {
            align-items: flex-start;
          }

          .summary-grid {
            grid-template-columns: 1fr;
          }

          .form-grid, .supplier-grid {
            grid-template-columns: 1fr;
          }

          .quotation-row {
            grid-template-columns: 1fr;
          }

          .rfq-heading {
            align-items: flex-start;
          }
        }
      `}</style>
    </main>

  );
}

export default function RFQPage() {
  return (
    <Suspense fallback={<p>Loading RFQ Manager...</p>}>
      <RFQContent />
    </Suspense>
  );
}