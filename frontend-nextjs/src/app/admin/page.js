
"use client";

import { useEffect, useState } from "react";
import {
  adminLogin,
  getPendingManufacturers,
  reviewManufacturer,
  generateManufacturerActivationToken,
  getManufacturersAwaitingActivation,
  getProjects,
  getManufacturers,
  getRFQs,
} from "@/lib/api";


export default function AdminPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [token, setToken] = useState("");
  const [manufacturers, setManufacturers] = useState([]);
  const [awaitingActivation, setAwaitingActivation] = useState([]);

  const [projects, setProjects] = useState([]);
  const [verifiedManufacturers, setVerifiedManufacturers] = useState([]);
  const [rfqs, setRfqs] = useState([]);



  const [reasons, setReasons] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [activationToken, setActivationToken] = useState("");
  const [activationEmail, setActivationEmail] = useState("");

  async function loadPending(currentToken) {
    setLoading(true);
    setError("");

    try {


      const [pendingData, activationData] = await Promise.all([
  getPendingManufacturers(currentToken),
  getManufacturersAwaitingActivation(currentToken),
]);

setManufacturers(pendingData.manufacturers || []);
setAwaitingActivation(activationData.manufacturers || []);

try {
  const [projectsData, manufacturersData, rfqData] =
        await Promise.all([
          getProjects(),
          getManufacturers(),
          getRFQs(currentToken),
        ]);

      setProjects(projectsData.projects || []);
      setVerifiedManufacturers(manufacturersData.manufacturers || []);
      setRfqs(rfqData.rfqs || []);
    } catch (dashboardError) {
      console.error("Dashboard statistics could not load:", dashboardError);
    }

      setManufacturers(pendingData.manufacturers || []);
      setAwaitingActivation(activationData.manufacturers || []);
    } catch (err) {
      setError(err.message || "Could not load pending manufacturers.");

      if (err.message?.includes("401") || err.message?.includes("403")) {
        localStorage.removeItem("adminToken");
        setToken("");
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const savedToken = localStorage.getItem("adminToken");

    if (savedToken) {
      setToken(savedToken);
      loadPending(savedToken);
    }
  }, []);

  async function handleLogin(event) {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const data = await adminLogin(email, password);

      localStorage.setItem("adminToken", data.token);
      setToken(data.token);
      setMessage("Administrator login successful.");
      setPassword("");

      await loadPending(data.token);
    } catch (err) {
      setError(err.message || "Login failed.");
    } finally {
      setLoading(false);
    }
  }

  async function handleReview(id, decision, manufacturerEmail) {
    setError("");
    setMessage("");
    setActivationToken("");
    setActivationEmail("");

    const additionalDetails = {};

    if (decision === "Rejected") {
      const reason = reasons[id]?.trim();

      if (!reason) {
        setError("Please enter a rejection reason.");
        return;
      }

      additionalDetails.rejectionReason = reason;
    }

    try {
      setLoading(true);

      const data = await reviewManufacturer(
        id,
        decision,
        token,
        additionalDetails
      );

      if (decision === "Verified") {
        try {
          const activation = await generateManufacturerActivationToken(
            id,
            token
          );

          setActivationToken(activation.activationToken);
          setActivationEmail(manufacturerEmail);

          setMessage(
            "Manufacturer verified. Activation token generated successfully."
          );
        } catch (activationError) {
          setMessage(
            "Manufacturer verified, but activation token generation failed: " +
              activationError.message
          );
        }
      } else {
        setMessage(data.message || "Manufacturer rejected successfully.");
      }

      await loadPending(token);
    } catch (err) {
      setError(err.message || "Manufacturer review failed.");
    } finally {
      setLoading(false);
    }
  }

  async function handleGenerateActivation(manufacturerId, manufacturerEmail) {
  setLoading(true);
  setError("");
  setMessage("");
  setActivationToken("");
  setActivationEmail("");

  try {
    const data = await generateManufacturerActivationToken(
      manufacturerId,
      token
    );

      setActivationToken(data.activationToken);
      setActivationEmail(manufacturerEmail);
      setMessage(data.message || "Activation token generated successfully.");

      await loadPending(token);
    } catch (err) {
      setError(err.message || "Could not generate activation token.");
    } finally {
      setLoading(false);
    }
  }

  async function copyActivationToken() {
    try {
      await navigator.clipboard.writeText(activationToken);
      setMessage("Activation token copied to clipboard.");
    } catch {
      setError("Could not copy token. Please select and copy it manually.");
    }
  }

  function handleLogout() {
    localStorage.removeItem("adminToken");
    setToken("");
    setManufacturers([]);
    setAwaitingActivation([]);
    setActivationToken("");
    setActivationEmail("");
    setMessage("You have logged out.");
  }

  return (
    <main
      style={{
        maxWidth: "1100px",
        margin: "auto",
        padding: "30px",
        color: "#e5e7eb",
      }}
    >
      <a href="/" style={{ color: "#70a8ff", textDecoration: "none" }}>
        ← Back to Dashboard
      </a>

      <div style={{ margin: "25px 0" }}>
        <p style={{ color: "#4389ff", fontSize: "12px", letterSpacing: "2px" }}>
          ADMINISTRATION
        </p>

        <h1>Admin Dashboard</h1>

        <p style={{ color: "#91a0b7" }}>
          Review manufacturer registrations and activate verified supplier
          accounts.
        </p>
      </div>

      {error && (
        <p style={{ color: "#ff8585", background: "#321c25", padding: 12 }}>
          {error}
        </p>
      )}

      {message && (
        <p style={{ color: "#65d6a5" }}>{message}</p>
      )}

      {activationToken && (
        <section style={panelStyle}>
          <h2 style={{ color: "#65d6a5" }}>
            Manufacturer Account Activation
          </h2>

          <p>
            Share this one-time token securely with:
          </p>

          <p style={{ color: "#70a8ff" }}>{activationEmail}</p>

          <input
            readOnly
            value={activationToken}
            style={{
              ...inputStyle,
              fontFamily: "monospace",
              fontSize: 12,
            }}
          />

          <button
            type="button"
            onClick={copyActivationToken}
            style={buttonStyle}
          >
            Copy Activation Token
          </button>

          <p style={{ color: "#f5bd63", marginTop: 15 }}>
            This token expires in 30 minutes and can only be used once.
          </p>

          <a
            href="/supplier/activate"
            style={{ color: "#70a8ff" }}
          >
            Supplier activation page
          </a>
        </section>
      )}

      {!token ? (
        <form
          onSubmit={handleLogin}
          style={{
            background: "#111d30",
            padding: 25,
            borderRadius: 10,
            maxWidth: 450,
          }}
        >
          <h2>Administrator Login</h2>

          <label style={{ display: "block", marginTop: 20 }}>
            Email
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={inputStyle}
            />
          </label>

          <label style={{ display: "block", marginTop: 15 }}>
            Password
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={inputStyle}
            />
          </label>

          <button type="submit" disabled={loading} style={buttonStyle}>
            {loading ? "Signing in..." : "Login"}
          </button>
        </form>
      ) : (
        <>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 15,
              marginBottom: 20,
              flexWrap: "wrap",
            }}
          >

            <section style={panelStyle}>
              <h2>Verified Manufacturers Awaiting Activation ({awaitingActivation.length})</h2>

              {awaitingActivation.length === 0 ? (
                <p>No verified manufacturers are awaiting account activation.</p>
              ) : (
                awaitingActivation.map((manufacturer) => (
                  <div
                    key={manufacturer._id}
                    style={{
                      borderBottom: "1px solid #ddd",
                      padding: "16px 0",
                    }}
                  >
                    <h3>{manufacturer.companyName}</h3>

                    <p>
                      {manufacturer.city}, {manufacturer.country}
                    </p>

                    <p>{manufacturer.contactEmail}</p>

                    <button
                      style={buttonStyle}
                      onClick={() =>
                        handleGenerateActivation(
                          manufacturer._id,
                          manufacturer.contactEmail
                        )
                      }
                      disabled={loading}
                    >
                      Generate Activation Token
                    </button>
                  </div>
                ))
              )}
            </section>
            <h2>Pending Manufacturers ({manufacturers.length})</h2>

            <button onClick={handleLogout} style={buttonStyle}>
              Logout
            </button>
          </div>


          <section
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: 16,
              marginBottom: 25,
            }}
          >
            {[
              { label: "Total Projects", value: projects.length },
              { label: "Verified Manufacturers", value: verifiedManufacturers.length },
              { label: "Pending Approvals", value: manufacturers.length },
              { label: "Awaiting Activation", value: awaitingActivation.length },
              { label: "Total RFQs", value: rfqs.length },
            ].map((item) => (
              <div
                key={item.label}
                style={{
                  background: "#111d30",
                  border: "1px solid #263750",
                  borderRadius: 10,
                  padding: 20,
                }}
              >
                <p style={{ color: "#91a0b7", margin: 0 }}>
                  {item.label}
                </p>
                <h2 style={{ fontSize: 28, margin: "12px 0 0" }}>
                  {item.value}
                </h2>
              </div>
            ))}
          </section>


          {loading && <p>Loading manufacturers...</p>}

          {!loading && manufacturers.length === 0 && (
            <div style={panelStyle}>
              No manufacturers are awaiting verification.
            </div>
          )}

          {manufacturers.map((manufacturer) => (
            <article key={manufacturer._id} style={panelStyle}>
              <h3>{manufacturer.companyName}</h3>

              <p style={{ color: "#aab8ca" }}>
                {manufacturer.city}, {manufacturer.country}
              </p>

              <p>Email: {manufacturer.contactEmail}</p>

              <p>
                MOQ:{" "}
                {manufacturer.minimumOrderQuantity ?? "Not specified"}
              </p>

              <p>
                Processes:{" "}
                {(manufacturer.manufacturingProcesses || []).join(", ")}
              </p>

              <p>
                Materials: {(manufacturer.materials || []).join(", ")}
              </p>

              <p style={{ color: "#f5bd63" }}>
                Status: {manufacturer.verificationStatus}
              </p>

              <label style={{ display: "block", marginTop: 15 }}>
                Rejection reason (required only when rejecting)
                <input
                  value={reasons[manufacturer._id] || ""}
                  onChange={(e) =>
                    setReasons({
                      ...reasons,
                      [manufacturer._id]: e.target.value,
                    })
                  }
                  placeholder="Enter reason if rejecting"
                  style={inputStyle}
                />
              </label>

              <div
                style={{
                  display: "flex",
                  gap: 12,
                  marginTop: 15,
                  flexWrap: "wrap",
                }}
              >
                <button
                  onClick={() =>
                    handleReview(
                      manufacturer._id,
                      "Verified",
                      manufacturer.contactEmail
                    )
                  }
                  disabled={loading}
                  style={buttonStyle}
                >
                  Approve & Generate Activation
                </button>

                <button
                  onClick={() =>
                    handleReview(
                      manufacturer._id,
                      "Rejected",
                      manufacturer.contactEmail
                    )
                  }
                  disabled={loading}
                  style={{
                    ...buttonStyle,
                    background: "#8b3038",
                  }}
                >
                  Reject
                </button>
              </div>
            </article>
          ))}


          {/* RFQ Management Overview */}
          <section style={{ marginTop: 35 }}>
            <h2 style={{ marginBottom: 18 }}>RFQ Management</h2>

            {rfqs.length === 0 ? (
              <div style={panelStyle}>
                No RFQs have been created yet.
              </div>
            ) : (
              rfqs.map((rfq) => {
                const quotations = rfq.quotations || [];
                const submitted = quotations.filter(
                  (q) => q.status === "Submitted"
                ).length;
                const pending = quotations.filter(
                  (q) => q.status === "Pending"
                ).length;
                const declined = quotations.filter(
                  (q) => q.status === "Declined"
                ).length;

                return (
                  <article key={rfq._id} style={panelStyle}>
                    <h3>{rfq.title}</h3>

                    <p style={{ color: "#aab8ca" }}>
                      Project: {rfq.project?.productName || "Project unavailable"}
                    </p>

                    <p>
                      Quantity: {Number(rfq.quantity || 0).toLocaleString()}
                    </p>

                    <p>Material: {rfq.material || "Not specified"}</p>
                    <p>Process: {rfq.process || "Not specified"}</p>

                    <p>
                      Status: <strong>{rfq.status}</strong>
                    </p>

                    <div
                      style={{
                        display: "flex",
                        gap: 18,
                        flexWrap: "wrap",
                        marginTop: 12,
                      }}
                    >
                      <span>Submitted: {submitted}</span>
                      <span>Pending: {pending}</span>
                      <span>Declined: {declined}</span>
                    </div>

                    <p>
                      Selected manufacturer:{" "}
                      {rfq.selectedManufacturer?.companyName || "Not awarded"}
                    </p>

                    <p style={{ color: "#91a0b7", fontSize: 13 }}>
                      Created:{" "}
                      {rfq.createdAt
                        ? new Date(rfq.createdAt).toLocaleDateString()
                        : "Date unavailable"}
                    </p>
                  </article>
                );
              })
            )}
          </section>

        </>
      )}
    </main>
  );
}

const inputStyle = {
  display: "block",
  width: "100%",
  boxSizing: "border-box",
  marginTop: 8,
  padding: 12,
  borderRadius: 6,
  border: "1px solid #344966",
  background: "#0d1627",
  color: "#ffffff",
};

const buttonStyle = {
  padding: "11px 18px",
  border: "none",
  borderRadius: 6,
  background: "#2563eb",
  color: "#ffffff",
  cursor: "pointer",
};

const panelStyle = {
  background: "#111d30",
  border: "1px solid #263750",
  borderRadius: 10,
  padding: 22,
  marginBottom: 18,
};
