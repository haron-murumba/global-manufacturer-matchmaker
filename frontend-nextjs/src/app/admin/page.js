
"use client";

import { useEffect, useState } from "react";
import {
  adminLogin,
  getPendingManufacturers,
  reviewManufacturer,
} from "@/lib/api";

export default function AdminPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [token, setToken] = useState("");
  const [manufacturers, setManufacturers] = useState([]);
  const [reasons, setReasons] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function loadPending(currentToken) {
    setLoading(true);
    setError("");

    try {
      const data = await getPendingManufacturers(currentToken);
      setManufacturers(data.manufacturers || []);
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

  async function handleReview(id, decision) {
    setError("");
    setMessage("");

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

      setMessage(data.message || "Manufacturer reviewed successfully.");

      await loadPending(token);
    } catch (err) {
      setError(err.message || "Manufacturer review failed.");
    } finally {
      setLoading(false);
    }
  }

  function handleLogout() {
    localStorage.removeItem("adminToken");
    setToken("");
    setManufacturers([]);
    setMessage("You have logged out.");
  }

  return (
    <main style={{
      maxWidth: "1100px",
      margin: "auto",
      padding: "30px",
      color: "#e5e7eb"
    }}>
      <a href="/" style={{ color: "#70a8ff", textDecoration: "none" }}>
        ← Back to Dashboard
      </a>

      <div style={{ margin: "25px 0" }}>
        <p style={{ color: "#4389ff", fontSize: "12px", letterSpacing: "2px" }}>
          ADMINISTRATION
        </p>
        <h1>Admin Dashboard</h1>
        <p style={{ color: "#91a0b7" }}>
          Review and verify manufacturer registrations.
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

      {!token ? (
        <form
          onSubmit={handleLogin}
          style={{
            background: "#111d30",
            padding: 25,
            borderRadius: 10,
            maxWidth: 450
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
          <div style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 15,
            marginBottom: 20
          }}>
            <h2>Pending Manufacturers ({manufacturers.length})</h2>

            <button onClick={handleLogout} style={buttonStyle}>
              Logout
            </button>
          </div>

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
              <p>MOQ: {manufacturer.minimumOrderQuantity ?? "Not specified"}</p>
              <p>
                Processes: {(manufacturer.manufacturingProcesses || []).join(", ")}
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
                      [manufacturer._id]: e.target.value
                    })
                  }
                  placeholder="Enter reason if rejecting"
                  style={inputStyle}
                />
              </label>

              <div style={{ display: "flex", gap: 12, marginTop: 15 }}>
                <button
                  onClick={() => handleReview(manufacturer._id, "Verified")}
                  disabled={loading}
                  style={buttonStyle}
                >
                  Approve
                </button>

                <button
                  onClick={() => handleReview(manufacturer._id, "Rejected")}
                  disabled={loading}
                  style={{
                    ...buttonStyle,
                    background: "#8b3038"
                  }}
                >
                  Reject
                </button>
              </div>
            </article>
          ))}
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
  color: "#ffffff"
};

const buttonStyle = {
  padding: "11px 18px",
  border: "none",
  borderRadius: 6,
  background: "#2563eb",
  color: "#ffffff",
  cursor: "pointer"
};

const panelStyle = {
  background: "#111d30",
  border: "1px solid #263750",
  borderRadius: 10,
  padding: 22,
  marginBottom: 18
};

