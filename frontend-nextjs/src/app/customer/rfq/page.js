"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  getMyProjects,
  getManufacturerMatches,
  getCustomerRFQs,
  createCustomerRFQ,
  awardCustomerRFQ,
  getCustomerNotifications,
  markCustomerNotificationRead,
  markAllCustomerNotificationsRead,
} from "@/lib/api";

const emptyForm = {
  projectId: "",
  title: "",
  quantity: "",
  deliveryLocation: "",
  deliveryDeadline: "",
  quotationDeadline: "",
  specifications: "",
};

function formatDate(value) {
  if (!value) return "Not specified";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not specified";

  return date.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatMoney(value, currency = "USD") {
  const amount = Number(value);

  if (!Number.isFinite(amount)) return "Not provided";

  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: currency || "USD",
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currency || "USD"} ${amount.toLocaleString()}`;
  }
}

function getQuotationTotal(quotation, quantity) {
  if (quotation.totalPrice !== undefined && quotation.totalPrice !== null) {
    return Number(quotation.totalPrice);
  }

  return Number(quotation.unitPrice || 0) * Number(quantity || 0);
}

function isDeadlinePassed(value) {
  if (!value) return false;

  const deadline = new Date(value);
  return !Number.isNaN(deadline.getTime()) && deadline < new Date();
}

export default function CustomerRFQPage() {
  const router = useRouter();

  const [projects, setProjects] = useState([]);
  const [rfqs, setRfqs] = useState([]);
  const [matches, setMatches] = useState([]);
  const [matchDiagnostics, setMatchDiagnostics] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const [form, setForm] = useState(emptyForm);
  const [selectedManufacturers, setSelectedManufacturers] = useState([]);

  const [loading, setLoading] = useState(true);
  const [matchingLoading, setMatchingLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [awardingId, setAwardingId] = useState("");
  const [notificationAction, setNotificationAction] = useState("");

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const confirmedProjects = projects.filter(
    (project) => project.specificationStatus === "Confirmed"
  );

  const loadData = useCallback(async () => {
    const token = localStorage.getItem("customerToken");

    if (!token) {
      setLoading(false);
      router.push("/login");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const [projectData, rfqData, notificationData] = await Promise.all([
        getMyProjects(token),
        getCustomerRFQs(token),
        getCustomerNotifications(token),
      ]);

      setProjects(projectData.projects || []);
      setRfqs(rfqData.rfqs || []);
      setNotifications(notificationData.notifications || []);
      setUnreadCount(notificationData.unreadCount || 0);
    } catch (err) {
      setError(err.message || "Unable to load your RFQ workspace.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleProjectChange(event) {
    const projectId = event.target.value;
    const project = confirmedProjects.find(
      (item) => item._id === projectId
    );

    setForm((current) => ({
      ...current,
      projectId,
      title: project ? `${project.productName} - Supplier RFQ` : "",
      quantity: project ? String(project.quantity || "") : "",
      specifications: project?.description || "",
    }));

    setMatches([]);
    setMatchDiagnostics(null);
    setSelectedManufacturers([]);
    setError("");
    setMessage("");

    if (!projectId) return;

    const token = localStorage.getItem("customerToken");

    if (!token) {
      router.push("/login");
      return;
    }

    try {
      setMatchingLoading(true);

      const result = await getManufacturerMatches(projectId, token);

      setMatches(result.matches || []);
      setMatchDiagnostics({
        project: result.project || project,
        locationPreference: result.locationPreference || {},
        locationExcludedCount: result.locationExcludedCount || 0,
        locationExcluded: result.locationExcluded || [],
        technicallyCompatibleCount: result.technicallyCompatibleCount || 0,
        incompatibleCount: result.incompatibleCount || 0,
      });
    } catch (err) {
      setError(err.message || "Unable to find compatible manufacturers.");
    } finally {
      setMatchingLoading(false);
    }
  }

  function toggleManufacturer(manufacturerId) {
    setSelectedManufacturers((current) =>
      current.includes(manufacturerId)
        ? current.filter((id) => id !== manufacturerId)
        : [...current, manufacturerId]
    );
  }

  async function handleCreateRFQ(event) {
    event.preventDefault();

    setError("");
    setMessage("");

    if (!form.projectId) {
      setError("Please select a confirmed project.");
      return;
    }

    if (!selectedManufacturers.length) {
      setError("Please select at least one compatible manufacturer.");
      return;
    }

    const token = localStorage.getItem("customerToken");

    if (!token) {
      router.push("/login");
      return;
    }

    try {
      setSaving(true);

      await createCustomerRFQ(
        {
          projectId: form.projectId,
          title: form.title.trim(),
          quantity: Number(form.quantity),
          deliveryLocation: form.deliveryLocation.trim(),
          deliveryDeadline: form.deliveryDeadline
            ? new Date(form.deliveryDeadline).toISOString()
            : undefined,
          quotationDeadline: form.quotationDeadline
            ? new Date(form.quotationDeadline).toISOString()
            : undefined,
          specifications: form.specifications.trim(),
          manufacturerIds: selectedManufacturers,
        },
        token
      );

      setMessage("Your RFQ has been created and sent to the selected manufacturers.");
      setForm(emptyForm);
      setMatches([]);
      setMatchDiagnostics(null);
      setSelectedManufacturers([]);

      await loadData();
    } catch (err) {
      setError(err.message || "Could not create your RFQ.");
    } finally {
      setSaving(false);
    }
  }

  async function handleAward(rfqId, manufacturerId) {
    const confirmed = window.confirm(
      "Award this RFQ to the selected manufacturer? This will record the supplier selection."
    );

    if (!confirmed) return;

    const token = localStorage.getItem("customerToken");

    if (!token) {
      router.push("/login");
      return;
    }

    try {
      setAwardingId(`${rfqId}-${manufacturerId}`);
      setError("");
      setMessage("");

      await awardCustomerRFQ(rfqId, manufacturerId, token);

      setMessage("The RFQ has been awarded to the selected manufacturer.");
      await loadData();
    } catch (err) {
      setError(err.message || "Unable to award this RFQ.");
    } finally {
      setAwardingId("");
    }
  }

  async function handleMarkRead(notificationId) {
    const token = localStorage.getItem("customerToken");
    if (!token) {
      router.push("/login");
      return;
    }

    try {
      setNotificationAction(notificationId);
      await markCustomerNotificationRead(notificationId, token);

      setNotifications((current) =>
        current.map((item) =>
          item._id === notificationId
            ? { ...item, isRead: true }
            : item
        )
      );

      setUnreadCount((current) => Math.max(0, current - 1));
    } catch (err) {
      setError(err.message || "Unable to mark notification as read.");
    } finally {
      setNotificationAction("");
    }
  }

  async function handleMarkAllRead() {
    const token = localStorage.getItem("customerToken");
    if (!token) {
      router.push("/login");
      return;
    }

    try {
      setNotificationAction("all");
      await markAllCustomerNotificationsRead(token);

      setNotifications((current) =>
        current.map((item) => ({ ...item, isRead: true }))
      );
      setUnreadCount(0);
    } catch (err) {
      setError(err.message || "Unable to update notifications.");
    } finally {
      setNotificationAction("");
    }
  }

  return (
    <main className="rfq-page">
      <div className="page-header">
        <div>
          <Link href="/dashboard" className="back-link">
            ← Back to Dashboard
          </Link>
          <p className="eyebrow">CUSTOMER WORKSPACE</p>
          <h1>RFQ Manager</h1>
          <p className="subtitle">
            Request quotations from compatible manufacturers, compare offers,
            and select your preferred supplier.
          </p>
        </div>

        <div className="header-actions">
          <span className="notification-count">
            {unreadCount} unread notification{unreadCount === 1 ? "" : "s"}
          </span>
          <button className="secondary-button" onClick={loadData} disabled={loading}>
            Refresh
          </button>
        </div>
      </div>

      {error && <div className="alert error-alert">{error}</div>}
      {message && <div className="alert success-alert">{message}</div>}

      <section className="workspace-grid">
        <div className="main-column">
          <section className="panel create-panel">
            <div className="section-heading">
              <div>
                <p className="eyebrow">NEW SOURCING REQUEST</p>
                <h2>Create a supplier RFQ</h2>
                <p className="muted">
                  Choose a confirmed project and invite manufacturers that meet
                  its technical and location requirements.
                </p>
              </div>
            </div>

            {loading ? (
              <p className="muted">Loading your projects...</p>
            ) : confirmedProjects.length === 0 ? (
              <div className="empty-state">
                <h3>No confirmed projects available</h3>
                <p>
                  Review and confirm your product specifications before
                  requesting manufacturer quotations.
                </p>
                <Link href="/projects" className="primary-link">
                  Go to My Projects →
                </Link>
              </div>
            ) : (
              <form onSubmit={handleCreateRFQ}>
                <div className="form-grid">
                  <label className="field full-field">
                    Confirmed project *
                    <select
                      value={form.projectId}
                      onChange={handleProjectChange}
                      required
                    >
                      <option value="">Select a confirmed project</option>
                      {confirmedProjects.map((project) => (
                        <option key={project._id} value={project._id}>
                          {project.productName} — {project.quantity || 0} units
                        </option>
                      ))}
                    </select>
                  </label>

                  {form.projectId && (
                    <>
                      <label className="field">
                        RFQ title *
                        <input
                          value={form.title}
                          onChange={(event) =>
                            setForm((current) => ({
                              ...current,
                              title: event.target.value,
                            }))
                          }
                          required
                          maxLength={150}
                          placeholder="Enter RFQ title"
                        />
                      </label>

                      <label className="field">
                        Order quantity *
                        <input
                          type="number"
                          min="1"
                          value={form.quantity}
                          onChange={(event) =>
                            setForm((current) => ({
                              ...current,
                              quantity: event.target.value,
                            }))
                          }
                          required
                        />
                      </label>

                      <label className="field">
                        Delivery location
                        <input
                          value={form.deliveryLocation}
                          onChange={(event) =>
                            setForm((current) => ({
                              ...current,
                              deliveryLocation: event.target.value,
                            }))
                          }
                          placeholder="City, country or delivery address"
                        />
                      </label>

                      <label className="field">
                        Delivery deadline
                        <input
                          type="date"
                          value={form.deliveryDeadline}
                          onChange={(event) =>
                            setForm((current) => ({
                              ...current,
                              deliveryDeadline: event.target.value,
                            }))
                          }
                        />
                      </label>

                      <label className="field">
                        Quotation deadline
                        <input
                          type="date"
                          value={form.quotationDeadline}
                          onChange={(event) =>
                            setForm((current) => ({
                              ...current,
                              quotationDeadline: event.target.value,
                            }))
                          }
                        />
                      </label>

                      <label className="field full-field">
                        Additional specifications
                        <textarea
                          rows="4"
                          value={form.specifications}
                          onChange={(event) =>
                            setForm((current) => ({
                              ...current,
                              specifications: event.target.value,
                            }))
                          }
                          placeholder="Add any extra requirements for suppliers..."
                        />
                      </label>
                    </>
                  )}
                </div>

                {form.projectId && (
                  <div className="matching-section">
                    <div className="matching-heading">
                      <div>
                        <h3>Compatible manufacturers</h3>
                        <p className="muted">
                          Select the suppliers you want to invite.
                        </p>
                      </div>
                      {matches.length > 0 && (
                        <span className="count-pill">
                          {matches.length} available
                        </span>
                      )}
                    </div>

                    {matchingLoading ? (
                      <p className="muted">Finding compatible manufacturers...</p>
                    ) : (
                      <>
                        {matchDiagnostics?.locationPreference?.active && (
                          <div className="preference-note">
                            <strong>Location preference applied:</strong>{" "}
                            {matchDiagnostics.locationPreference.countryTakesPrecedence
                              ? matchDiagnostics.locationPreference.preferredCountry
                              : matchDiagnostics.locationPreference.preferredRegion}
                            {matchDiagnostics.locationExcludedCount > 0 &&
                              ` · ${matchDiagnostics.locationExcludedCount} compatible manufacturer(s) outside this preference excluded`}
                          </div>
                        )}

                        {matches.length === 0 ? (
                          <div className="empty-state compact">
                            <h3>No eligible manufacturers found</h3>
                            <p>
                              {matchDiagnostics?.locationExcludedCount > 0
                                ? "Technically compatible manufacturers were found, but none matched your preferred location. You can change the location preference in your project."
                                : "No verified manufacturers currently meet the required process and material compatibility for this project."}
                            </p>
                            {matchDiagnostics?.locationExcludedCount > 0 && (
                              <Link href="/projects" className="text-link">
                                Review project location preference →
                              </Link>
                            )}
                          </div>
                        ) : (
                          <div className="manufacturer-list">
                            {matches.map((manufacturer) => {
                              const id = String(manufacturer.manufacturerId);

                              return (
                                <label
                                  className={`manufacturer-option ${
                                    selectedManufacturers.includes(id)
                                      ? "selected"
                                      : ""
                                  }`}
                                  key={id}
                                >
                                  <input
                                    type="checkbox"
                                    checked={selectedManufacturers.includes(id)}
                                    onChange={() => toggleManufacturer(id)}
                                  />

                                  <div className="manufacturer-info">
                                    <div className="manufacturer-title">
                                      <strong>{manufacturer.companyName}</strong>
                                      <span className="score">
                                        {manufacturer.matchScore}% match
                                      </span>
                                    </div>

                                    <p className="muted">
                                      {[
                                        manufacturer.city,
                                        manufacturer.country,
                                      ]
                                        .filter(Boolean)
                                        .join(", ") || "Location not provided"}
                                    </p>

                                    <div className="tag-row">
                                      <span className="tag">
                                        Verified
                                      </span>
                                      {manufacturer.minimumOrderQuantity ? (
                                        <span className="tag">
                                          MOQ: {Number(
                                            manufacturer.minimumOrderQuantity
                                          ).toLocaleString()}
                                        </span>
                                      ) : (
                                        <span className="tag warning-tag">
                                          MOQ unknown
                                        </span>
                                      )}
                                    </div>

                                    <p className="match-reasons">
                                      {(manufacturer.reasons || []).join(" · ")}
                                    </p>
                                  </div>
                                </label>
                              );
                            })}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}

                <div className="form-footer">
                  <span className="muted">
                    {selectedManufacturers.length} manufacturer(s) selected
                  </span>
                  <button
                    type="submit"
                    className="primary-button"
                    disabled={
                      saving ||
                      matchingLoading ||
                      !form.projectId ||
                      !selectedManufacturers.length
                    }
                  >
                    {saving ? "Creating RFQ..." : "Send RFQ to selected suppliers"}
                  </button>
                </div>
              </form>
            )}
          </section>

          <section className="panel">
            <div className="section-heading">
              <div>
                <p className="eyebrow">SOURCING ACTIVITY</p>
                <h2>Your RFQ history</h2>
                <p className="muted">
                  Track supplier responses and compare submitted quotations.
                </p>
              </div>
              <span className="count-pill">{rfqs.length} RFQs</span>
            </div>

            {loading ? (
              <p className="muted">Loading RFQ history...</p>
            ) : rfqs.length === 0 ? (
              <div className="empty-state">
                <h3>No RFQs yet</h3>
                <p>
                  Your supplier requests and quotations will appear here after
                  you create your first RFQ.
                </p>
              </div>
            ) : (
              <div className="rfq-list">
                {rfqs.map((rfq) => {
                  const quotations = rfq.quotations || [];
                  const submitted = quotations.filter(
                    (quotation) => quotation.status === "Submitted"
                  );
                  const pending = quotations.filter(
                    (quotation) => quotation.status === "Pending"
                  );
                  const declined = quotations.filter(
                    (quotation) => quotation.status === "Declined"
                  );
                  const deadlinePassed = isDeadlinePassed(
                    rfq.quotationDeadline
                  );
                  const canAward =
                    submitted.length > 0 &&
                    (pending.length === 0 || deadlinePassed) &&
                    !rfq.selectedManufacturer &&
                    rfq.status !== "Cancelled";

                  const rankedQuotes = [...submitted].sort(
                    (a, b) =>
                      getQuotationTotal(a, rfq.quantity) -
                      getQuotationTotal(b, rfq.quantity)
                  );

                  return (
                    <article className="rfq-card" key={rfq._id}>
                      <div className="rfq-card-header">
                        <div>
                          <h3>{rfq.title}</h3>
                          <p className="muted">
                            {rfq.project?.productName || "Project"} ·{" "}
                            {Number(rfq.quantity || 0).toLocaleString()} units
                          </p>
                        </div>
                        <span
                          className={`status status-${String(
                            rfq.status || "sent"
                          ).toLowerCase()}`}
                        >
                          {rfq.status || "Sent"}
                        </span>
                      </div>

                      <div className="rfq-meta">
                        <span>
                          <strong>Material:</strong>{" "}
                          {rfq.material || rfq.project?.material || "Not specified"}
                        </span>
                        <span>
                          <strong>Process:</strong>{" "}
                          {rfq.process || rfq.project?.process || "Not specified"}
                        </span>
                        <span>
                          <strong>Quotation deadline:</strong>{" "}
                          {formatDate(rfq.quotationDeadline)}
                        </span>
                        <span>
                          <strong>Delivery deadline:</strong>{" "}
                          {formatDate(rfq.deliveryDeadline)}
                        </span>
                      </div>

                      <div className="response-summary">
                        <span className="response-submitted">
                          {submitted.length} submitted
                        </span>
                        <span className="response-pending">
                          {pending.length} pending
                        </span>
                        <span className="response-declined">
                          {declined.length} declined
                        </span>
                      </div>

                      {rfq.selectedManufacturer && (
                        <div className="award-banner">
                          <strong>RFQ awarded:</strong>{" "}
                          {rfq.selectedManufacturer.companyName}
                          {rfq.selectedManufacturer.country
                            ? ` · ${rfq.selectedManufacturer.country}`
                            : ""}
                        </div>
                      )}

                      {submitted.length > 0 && (
                        <div className="comparison-section">
                          <div className="comparison-heading">
                            <h4>Quotation comparison</h4>
                            <span className="muted">
                              Lowest total price shown first
                            </span>
                          </div>

                          <div className="table-scroll">
                            <table>
                              <thead>
                                <tr>
                                  <th>Supplier</th>
                                  <th>Unit price</th>
                                  <th>Total price</th>
                                  <th>Lead time</th>
                                  <th>Payment terms</th>
                                  <th>Decision</th>
                                </tr>
                              </thead>
                              <tbody>
                                {rankedQuotes.map((quotation, index) => {
                                  const manufacturer = quotation.manufacturer || {};
                                  const currency = quotation.currency || "USD";
                                  const quoteKey = `${rfq._id}-${manufacturer._id || quotation._id}`;

                                  return (
                                    <tr key={quotation._id || quoteKey}>
                                      <td>
                                        <strong>
                                          {manufacturer.companyName || "Manufacturer"}
                                        </strong>
                                        <small>
                                          {[manufacturer.city, manufacturer.country]
                                            .filter(Boolean)
                                            .join(", ")}
                                        </small>
                                        {index === 0 && (
                                          <span className="lowest-label">
                                            Lowest total
                                          </span>
                                        )}
                                      </td>
                                      <td>
                                        {formatMoney(quotation.unitPrice, currency)}
                                      </td>
                                      <td>
                                        <strong>
                                          {formatMoney(
                                            getQuotationTotal(quotation, rfq.quantity),
                                            currency
                                          )}
                                        </strong>
                                      </td>
                                      <td>{quotation.leadTime || "Not provided"}</td>
                                      <td>{quotation.paymentTerms || "Not provided"}</td>
                                      <td>
                                        {rfq.selectedManufacturer ? (
                                          String(rfq.selectedManufacturer._id) ===
                                          String(manufacturer._id) ? (
                                            <span className="awarded-label">Awarded</span>
                                          ) : (
                                            <span className="muted">Not selected</span>
                                          )
                                        ) : canAward ? (
                                          <button
                                            className="small-primary-button"
                                            onClick={() =>
                                              handleAward(
                                                rfq._id,
                                                manufacturer._id
                                              )
                                            }
                                            disabled={
                                              awardingId ===
                                              `${rfq._id}-${manufacturer._id}`
                                            }
                                          >
                                            {awardingId ===
                                            `${rfq._id}-${manufacturer._id}`
                                              ? "Awarding..."
                                              : "Award supplier"}
                                          </button>
                                        ) : (
                                          <span className="muted">
                                            {pending.length > 0 && !deadlinePassed
                                              ? "Awaiting responses"
                                              : "Unavailable"}
                                          </span>
                                        )}
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}

                      {quotations.length === 0 && (
                        <p className="muted no-quotes">
                          No supplier responses are available yet.
                        </p>
                      )}

                      {pending.length > 0 && (
                        <p className="response-note">
                          Waiting for {pending.length} supplier response
                          {pending.length === 1 ? "" : "s"}.
                          {rfq.quotationDeadline &&
                            ` Quotation deadline: ${formatDate(rfq.quotationDeadline)}.`}
                        </p>
                      )}
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        </div>

        <aside className="side-column">
          <section className="panel notification-panel">
            <div className="section-heading notification-heading">
              <div>
                <p className="eyebrow">UPDATES</p>
                <h2>Notifications</h2>
              </div>
              {unreadCount > 0 && (
                <button
                  className="text-button"
                  onClick={handleMarkAllRead}
                  disabled={notificationAction === "all"}
                >
                  Mark all read
                </button>
              )}
            </div>

            {notifications.length === 0 ? (
              <p className="muted empty-notifications">
                No notifications yet. Supplier updates will appear here.
              </p>
            ) : (
              <div className="notification-list">
                {notifications.map((notification) => (
                  <article
                    className={`notification-item ${
                      notification.isRead ? "" : "unread"
                    }`}
                    key={notification._id}
                  >
                    <div className="notification-top">
                      <strong>{notification.title || "GMM update"}</strong>
                      {!notification.isRead && <span className="unread-dot" />}
                    </div>
                    <p>{notification.message}</p>
                    <div className="notification-bottom">
                      <small>{formatDate(notification.createdAt)}</small>
                      {!notification.isRead && (
                        <button
                          className="text-button"
                          onClick={() => handleMarkRead(notification._id)}
                          disabled={notificationAction === notification._id}
                        >
                          Mark read
                        </button>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          <section className="help-panel">
            <p className="eyebrow">HOW IT WORKS</p>
            <h3>From request to supplier selection</h3>
            <ol>
              <li>Select a confirmed product project.</li>
              <li>Invite technically compatible manufacturers.</li>
              <li>Review submitted supplier quotations.</li>
              <li>Compare offers and award your preferred supplier.</li>
            </ol>
            <Link href="/projects" className="text-link">
              Review your projects →
            </Link>
          </section>
        </aside>
      </section>

      <style jsx>{`
        .rfq-page {
          max-width: 1500px;
          margin: 0 auto;
          padding: 34px;
          color: var(--text);
        }

        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          gap: 24px;
          margin-bottom: 28px;
        }

        .back-link,
        .text-link {
          color: #79adff;
          text-decoration: none;
          font-size: 12px;
        }

        .back-link {
          display: inline-block;
          margin-bottom: 20px;
        }

        .eyebrow {
          color: #78aaff;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 1.3px;
          margin: 0 0 8px;
        }

        h1 {
          font-size: clamp(27px, 3vw, 36px);
          margin: 0 0 8px;
        }

        h2 {
          font-size: 19px;
          margin: 0 0 7px;
        }

        h3 {
          font-size: 15px;
          margin: 0 0 6px;
        }

        h4 {
          font-size: 13px;
          margin: 0;
        }

        .subtitle,
        .muted {
          color: var(--muted);
          line-height: 1.6;
        }

        .subtitle {
          max-width: 680px;
          margin: 0;
        }

        .header-actions {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
        }

        .notification-count,
        .count-pill {
          border: 1px solid var(--border);
          background: var(--panel-light);
          color: #b7c8e2;
          border-radius: 20px;
          padding: 7px 11px;
          font-size: 11px;
        }

        .workspace-grid {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 310px;
          gap: 22px;
          align-items: start;
        }

        .main-column,
        .side-column {
          display: grid;
          gap: 22px;
          min-width: 0;
        }

        .panel {
          background: var(--panel);
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 23px;
          min-width: 0;
        }

        .section-heading {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 16px;
          margin-bottom: 22px;
        }

        .section-heading .muted {
          margin: 0;
          font-size: 12px;
        }

        .form-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 16px;
        }

        .field {
          display: flex;
          flex-direction: column;
          gap: 8px;
          color: #cbd6e7;
          font-size: 12px;
          font-weight: 600;
        }

        .full-field {
          grid-column: 1 / -1;
        }

        input,
        select,
        textarea {
          width: 100%;
          min-width: 0;
          color: var(--text);
          background: #0c1628;
          border: 1px solid var(--border);
          border-radius: 7px;
          padding: 11px 12px;
          font: inherit;
          font-weight: 400;
          outline: none;
        }

        input:focus,
        select:focus,
        textarea:focus {
          border-color: var(--blue);
        }

        textarea {
          resize: vertical;
        }

        input[type="date"] {
          color-scheme: dark;
        }

        .matching-section {
          border-top: 1px solid var(--border);
          margin-top: 24px;
          padding-top: 22px;
        }

        .matching-heading,
        .comparison-heading {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 14px;
        }

        .matching-heading h3 {
          margin-bottom: 4px;
        }

        .matching-heading .muted {
          margin: 0;
          font-size: 12px;
        }

        .preference-note {
          padding: 11px 13px;
          background: #142a43;
          border: 1px solid #29496d;
          color: #bcd5f5;
          border-radius: 7px;
          font-size: 11px;
          line-height: 1.6;
          margin-bottom: 14px;
        }

        .manufacturer-list {
          display: grid;
          gap: 10px;
        }

        .manufacturer-option {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          padding: 14px;
          border: 1px solid var(--border);
          border-radius: 9px;
          background: #0e192b;
          cursor: pointer;
          transition: border-color 0.2s, background 0.2s;
        }

        .manufacturer-option:hover,
        .manufacturer-option.selected {
          border-color: #4388f5;
          background: #14243b;
        }

        .manufacturer-option input {
          width: 16px;
          height: 16px;
          margin: 3px 0 0;
          accent-color: #4388f5;
          flex: 0 0 auto;
        }

        .manufacturer-info {
          min-width: 0;
          flex: 1;
        }

        .manufacturer-title {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          flex-wrap: wrap;
        }

        .manufacturer-title strong {
          font-size: 13px;
        }

        .score {
          color: #8fc0ff;
          font-size: 11px;
          font-weight: 700;
        }

        .manufacturer-info .muted {
          font-size: 11px;
          margin: 5px 0 9px;
        }

        .tag-row {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }

        .tag {
          background: #1b344e;
          color: #a9d1ff;
          padding: 4px 7px;
          border-radius: 5px;
          font-size: 10px;
        }

        .warning-tag {
          background: #493a20;
          color: #f1cd82;
        }

        .match-reasons {
          color: #91a0b7;
          font-size: 10px;
          line-height: 1.5;
          margin: 9px 0 0;
        }

        .form-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 14px;
          border-top: 1px solid var(--border);
          margin-top: 22px;
          padding-top: 18px;
        }

        .form-footer .muted {
          font-size: 11px;
        }

        .primary-button,
        .small-primary-button {
          background: #347ce8;
          color: white;
          border: 1px solid #4388f5;
          border-radius: 7px;
          font-weight: 700;
          transition: background 0.2s;
        }

        .primary-button {
          padding: 12px 17px;
          font-size: 12px;
        }

        .small-primary-button {
          padding: 7px 9px;
          font-size: 10px;
          white-space: nowrap;
        }

        .primary-button:hover,
        .small-primary-button:hover {
          background: #2466c9;
        }

        button:disabled {
          opacity: 0.55;
          cursor: not-allowed;
        }

        .secondary-button {
          color: #c8d7eb;
          background: var(--panel-light);
          border: 1px solid var(--border);
          border-radius: 7px;
          padding: 9px 13px;
          font-size: 11px;
        }

        .rfq-list {
          display: grid;
          gap: 16px;
        }

        .rfq-card {
          border: 1px solid var(--border);
          background: #0e192b;
          border-radius: 10px;
          padding: 17px;
          min-width: 0;
        }

        .rfq-card-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 12px;
        }

        .rfq-card-header h3 {
          font-size: 14px;
        }

        .rfq-card-header .muted {
          font-size: 11px;
          margin: 0;
        }

        .status {
          padding: 5px 9px;
          border-radius: 20px;
          font-size: 10px;
          font-weight: 700;
          background: #26374e;
          color: #c0d2e9;
          white-space: nowrap;
        }

        .status-sent {
          background: #18385c;
          color: #8fc0ff;
        }

        .status-completed {
          background: #183e35;
          color: #8ce0bd;
        }

        .status-cancelled {
          background: #482b32;
          color: #f0a7b1;
        }

        .rfq-meta {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 9px 16px;
          padding: 14px 0;
          margin-top: 12px;
          border-top: 1px solid var(--border);
          border-bottom: 1px solid var(--border);
          color: #9cacc2;
          font-size: 10px;
        }

        .rfq-meta strong {
          color: #d0dced;
        }

        .response-summary {
          display: flex;
          flex-wrap: wrap;
          gap: 14px;
          margin: 13px 0;
          font-size: 10px;
          font-weight: 700;
        }

        .response-submitted {
          color: #85d6b5;
        }

        .response-pending {
          color: #e8c477;
        }

        .response-declined {
          color: #e99ca6;
        }

        .comparison-section {
          margin-top: 15px;
        }

        .comparison-heading .muted {
          font-size: 10px;
        }

        .table-scroll {
          overflow-x: auto;
          border: 1px solid var(--border);
          border-radius: 7px;
        }

        table {
          width: 100%;
          min-width: 720px;
          border-collapse: collapse;
          font-size: 10px;
          text-align: left;
        }

        th,
        td {
          padding: 11px 9px;
          border-bottom: 1px solid var(--border);
          vertical-align: middle;
        }

        th {
          background: #17263b;
          color: #aebed3;
          font-weight: 700;
          white-space: nowrap;
        }

        td {
          color: #d0dced;
        }

        tbody tr:last-child td {
          border-bottom: none;
        }

        td small {
          display: block;
          color: var(--muted);
          margin-top: 4px;
        }

        .lowest-label,
        .awarded-label {
          display: inline-block;
          color: #8ce0bd;
          font-size: 9px;
          margin-top: 5px;
          font-weight: 700;
        }

        .award-banner {
          padding: 11px 13px;
          border: 1px solid #285b4b;
          background: #15372f;
          color: #a4e6cb;
          border-radius: 7px;
          font-size: 11px;
          margin: 13px 0;
        }

        .response-note,
        .no-quotes {
          font-size: 11px;
          margin: 12px 0 0;
        }

        .notification-heading {
          align-items: center;
          margin-bottom: 14px;
        }

        .notification-heading h2 {
          margin-bottom: 0;
        }

        .text-button {
          background: transparent;
          color: #80b4ff;
          border: 0;
          padding: 3px;
          font-size: 10px;
          white-space: nowrap;
        }

        .notification-list {
          display: grid;
        }

        .notification-item {
          padding: 13px 0;
          border-bottom: 1px solid var(--border);
        }

        .notification-item:last-child {
          border-bottom: 0;
        }

        .notification-item.unread {
          border-left: 2px solid #4388f5;
          padding-left: 10px;
        }

        .notification-top,
        .notification-bottom {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 8px;
        }

        .notification-top strong {
          font-size: 11px;
        }

        .notification-item p {
          color: #a5b3c7;
          font-size: 11px;
          line-height: 1.55;
          margin: 7px 0;
        }

        .notification-bottom small {
          color: var(--muted);
          font-size: 9px;
        }

        .unread-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #4388f5;
          flex: 0 0 auto;
        }

        .empty-notifications {
          font-size: 11px;
        }

        .help-panel {
          background: #14243c;
          border: 1px solid #294365;
          border-radius: 10px;
          padding: 20px;
        }

        .help-panel h3 {
          font-size: 15px;
          line-height: 1.4;
        }

        .help-panel ol {
          padding-left: 18px;
          color: #aabbd1;
          font-size: 11px;
          line-height: 1.8;
          margin: 14px 0;
        }

        .empty-state {
          border: 1px dashed #34465f;
          border-radius: 9px;
          padding: 24px;
          text-align: center;
        }

        .empty-state h3 {
          margin-bottom: 8px;
        }

        .empty-state p {
          color: var(--muted);
          font-size: 12px;
          line-height: 1.6;
          margin: 0 0 14px;
        }

        .empty-state.compact {
          padding: 18px;
        }

        .primary-link {
          display: inline-block;
          background: #347ce8;
          color: white;
          border-radius: 6px;
          padding: 9px 13px;
          text-decoration: none;
          font-size: 11px;
          font-weight: 700;
        }

        .alert {
          padding: 12px 15px;
          border-radius: 8px;
          margin-bottom: 18px;
          font-size: 12px;
          line-height: 1.5;
        }

        .error-alert {
          background: #44252d;
          border: 1px solid #75404b;
          color: #ffc0c8;
        }

        .success-alert {
          background: #17392f;
          border: 1px solid #2c6954;
          color: #a5e8c9;
        }

        @media (max-width: 1050px) {
          .workspace-grid {
            grid-template-columns: minmax(0, 1fr);
          }

          .side-column {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 700px) {
          .rfq-page {
            padding: 22px 14px;
          }

          .page-header {
            align-items: flex-start;
            flex-direction: column;
          }

          .header-actions {
            width: 100%;
            justify-content: space-between;
          }

          .panel {
            padding: 16px;
          }

          .form-grid,
          .rfq-meta,
          .side-column {
            grid-template-columns: minmax(0, 1fr);
          }

          .form-footer {
            align-items: stretch;
            flex-direction: column;
          }

          .primary-button {
            width: 100%;
          }

          .section-heading {
            flex-direction: column;
          }

          .matching-heading,
          .comparison-heading {
            align-items: flex-start;
            flex-direction: column;
          }
        }
      `}</style>
    </main>
  );
}
