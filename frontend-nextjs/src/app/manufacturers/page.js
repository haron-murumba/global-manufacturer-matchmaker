
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getManufacturers, registerManufacturer } from "@/lib/api";

const initialForm = {
  companyName: "",
  country: "",
  city: "",
  website: "",
  contactEmail: "",
  minimumOrderQuantity: "",
  smallOrderResponsiveness: "Unknown",
  manufacturingProcesses: "",
  materials: "",
  capabilities: "",
  productCategories: "",
  notes: "",
};

export default function ManufacturersPage() {
  const [manufacturers, setManufacturers] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function loadManufacturers() {
    setLoading(true);
    setError("");

    try {
      const data = await getManufacturers();

      if (!data || !Array.isArray(data.manufacturers)) {
        throw new Error("Unexpected response from manufacturers API.");
      }

      setManufacturers(data.manufacturers);
    } catch (err) {
      setError(err.message || "Could not load manufacturers.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadManufacturers();
  }, []);

  function updateField(event) {
    setForm((previous) => ({
      ...previous,
      [event.target.name]: event.target.value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    try {
      setSaving(true);
      setError("");
      setMessage("");

      const payload = {
        ...form,
        minimumOrderQuantity: form.minimumOrderQuantity
          ? Number(form.minimumOrderQuantity)
          : undefined,
        manufacturingProcesses: form.manufacturingProcesses
          .split(",").map((item) => item.trim()).filter(Boolean),
        materials: form.materials
          .split(",").map((item) => item.trim()).filter(Boolean),
        capabilities: form.capabilities
          .split(",").map((item) => item.trim()).filter(Boolean),
        productCategories: form.productCategories
          .split(",").map((item) => item.trim()).filter(Boolean),
      };

      await registerManufacturer(payload);

      setMessage("Manufacturer registered successfully.");
      setForm(initialForm);
      setShowForm(false);
      await loadManufacturers();
    } catch (err) {
      setError(err.message || "Registration failed.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main style={{ padding: "30px", maxWidth: "1200px", margin: "auto" }}>
      <Link href="/" style={{ color: "#70a8ff", textDecoration: "none" }}>
        ← Back to Dashboard
      </Link>

      <div className="welcome-section" style={{ marginTop: "25px" }}>
        <div>
          <p className="eyebrow">SUPPLIER NETWORK</p>
          <h1>Manufacturers</h1>
          <p className="welcome-description">
            Discover and register manufacturing partners.
          </p>
        </div>

        <button
          className="primary-button"
          onClick={() => setShowForm(!showForm)}
        >
          {showForm ? "Cancel" : "+ Register Manufacturer"}
        </button>
      </div>

      {error && (
        <div className="panel" style={{ marginBottom: 15, color: "#ff8b8b" }}>
          {error}
          <button onClick={loadManufacturers} style={{ marginLeft: 12 }}>
            Retry
          </button>
        </div>
      )}

      {message && (
        <div className="panel" style={{ marginBottom: 15, color: "#65d6a5" }}>
          {message}
        </div>
      )}

      {showForm && (
        <form className="panel" onSubmit={handleSubmit} style={{ marginBottom: 25 }}>
          <h3>Register a Manufacturer</h3>
          <p className="welcome-description" style={{ marginBottom: 20 }}>
            Enter the supplier details below.
          </p>

          <div className="manufacturer-form-grid">
            {[
              ["companyName", "Company Name", true],
              ["country", "Country", true],
              ["city", "City", true],
              ["website", "Website", false],
              ["contactEmail", "Contact Email", true],
              ["minimumOrderQuantity", "Minimum Order Quantity", false],
              ["manufacturingProcesses", "Manufacturing Processes (comma separated)", true],
              ["materials", "Materials (comma separated)", true],
              ["capabilities", "Capabilities (comma separated)", false],
              ["productCategories", "Product Categories (comma separated)", false],
            ].map(([name, label, required]) => (
              <label key={name} className="manufacturer-field">
                <span>{label}</span>
                <input
                  name={name}
                  value={form[name]}
                  onChange={updateField}
                  required={required}
                  type={name === "contactEmail" ? "email" : name === "minimumOrderQuantity" ? "number" : "text"}
                  min={name === "minimumOrderQuantity" ? "0" : undefined}
                  placeholder={`Enter ${label.toLowerCase()}`}
                />
              </label>
            ))}

            <label className="manufacturer-field">
              <span>Small Order Responsiveness</span>
              <select
                name="smallOrderResponsiveness"
                value={form.smallOrderResponsiveness}
                onChange={updateField}
              >
                <option>Unknown</option>
                <option>Yes</option>
                <option>No</option>
              </select>
            </label>

            <label className="manufacturer-field">
              <span>Additional Notes</span>
              <textarea
                name="notes"
                value={form.notes}
                onChange={updateField}
                rows="3"
              />
            </label>
          </div>

          <button className="primary-button" disabled={saving} type="submit">
            {saving ? "Registering..." : "Submit Manufacturer"}
          </button>
        </form>
      )}

      <section className="panel">
        <h3 style={{ marginTop: 0 }}>
          Registered Manufacturers ({manufacturers.length})
        </h3>

        {loading ? (
          <p>Loading manufacturers...</p>
        ) : manufacturers.length === 0 ? (
          <p>No manufacturers found.</p>
        ) : (
          <div className="manufacturer-list">
            {manufacturers.map((manufacturer) => (
              <article key={manufacturer._id} className="manufacturer-card">
                <div>
                  <h3>{manufacturer.companyName}</h3>
                  <p>{manufacturer.city}, {manufacturer.country}</p>
                  <p>MOQ: {manufacturer.minimumOrderQuantity ?? "Not specified"}</p>
                  <p>
                    Processes: {(manufacturer.manufacturingProcesses || []).join(", ") || "Not specified"}
                  </p>
                  <p>
                    Materials: {(manufacturer.materials || []).join(", ") || "Not specified"}
                  </p>
                  <p>Email: {manufacturer.contactEmail || "Not provided"}</p>
                </div>

                <span className="status status-under-review">
                  {manufacturer.verificationStatus || "Unverified"}
                </span>
              </article>
            ))}
          </div>
        )}
      </section>

      <style jsx>{`
        .manufacturer-form-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 16px;
          margin-bottom: 22px;
        }

        .manufacturer-field {
          display: flex;
          flex-direction: column;
          gap: 8px;
          color: #aab8ca;
          font-size: 12px;
        }

        .manufacturer-field input,
        .manufacturer-field select,
        .manufacturer-field textarea {
          width: 100%;
          padding: 12px;
          border: 1px solid #344966;
          border-radius: 6px;
          background: #0d1627;
          color: #edf2fa;
          outline: none;
        }

        .manufacturer-card {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 15px;
          padding: 18px 0;
          border-bottom: 1px solid #243249;
        }

        .manufacturer-card h3 {
          margin: 0 0 8px;
          font-size: 14px;
        }

        .manufacturer-card p {
          color: #91a0b7;
          font-size: 12px;
          margin: 6px 0;
        }

        @media (max-width: 650px) {
          .manufacturer-form-grid {
            grid-template-columns: 1fr;
          }

          .manufacturer-card {
            flex-direction: column;
          }
        }
      `}</style>
    </main>
  );
}
