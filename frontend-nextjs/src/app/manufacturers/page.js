
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getManufacturers, registerManufacturer } from "@/lib/api";

const productCategoryOptions = [
  "Smart Devices",
  "Consumer Electronics",
  "Bottles & Drinkware",
  "Plastic Products",
  "Industrial Components",
  "Automotive Products",
  "Laboratory Equipment",
  "Other",
];

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
    Promise.resolve().then(() => {
      loadManufacturers();
    });
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

      const payload = new FormData(event.currentTarget);

      [
        "manufacturingProcesses",
        "materials",
        "capabilities",
        "productCategories",
      ].forEach((field) => {
        const values = form[field]
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean);

        payload.set(field, JSON.stringify(values));
      });

      await registerManufacturer(payload);

      setMessage("Application submitted successfully. Your manufacturer profile is now Under Review. Our team must approve your application before you can activate your supplier account and access the supplier workspace.");
      setForm(initialForm);
      setShowForm(false);
      setLoading(true);
      setError("");
      await loadManufacturers();
    } catch (err) {
      setError(err.message || "Registration failed.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main style={{ padding: "30px 3%", width: "100%", minHeight: "100vh" }}>
      <Link href="/dashboard" style={{ color: "#70a8ff", textDecoration: "none" }}>
        ← Back to Dashboard
      </Link>

      <div className="welcome-section" style={{ marginTop: "25px" }}>
        <div>
          <p className="eyebrow">SUPPLIER NETWORK</p>
          <h1>Manufacturing Partner Applications</h1>
          <p className="welcome-description">
            Explore verified manufacturing partners or submit your company for review to join the GMM supplier network.
          </p>
        </div>

        <button
          className="primary-button"
          onClick={() => setShowForm(!showForm)}
        >
          {showForm ? "Cancel Application" : "+ Apply as a Manufacturing Partner"}
        </button>
      </div>

      <section
        className="panel"
        style={{
          marginTop: 20,
          marginBottom: 20,
          border: "1px solid #344966",
          background: "#101b2e",
        }}
      >
        <h3 style={{ marginTop: 0 }}>How supplier approval works</h3>
        <p className="welcome-description">
          All new manufacturing partner applications are reviewed by the GMM
          team. Submitting an application does not automatically create an
          active supplier account.
        </p>
        <ol style={{ color: "#aab8ca", lineHeight: 1.9, paddingLeft: 22 }}>
          <li>Submit your company profile and supporting evidence.</li>
          <li>Our team reviews your manufacturing information and documents.</li>
          <li>Approved companies receive instructions to activate supplier access.</li>
        </ol>
      </section>

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
          <h3>Apply to Become a GMM Manufacturing Partner</h3>
          <p className="welcome-description" style={{ marginBottom: 20 }}>
            Provide accurate company, location and production information. Your application will be reviewed before supplier access is granted.
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

            <div className="manufacturer-field">
              <span>Product Categories</span>
              <small>Select all categories the manufacturer genuinely supports.</small>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                {productCategoryOptions.map((category) => (
                  <label key={category} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.productCategories.split(",").filter(Boolean).includes(category)}
                      onChange={(event) =>
                        setForm((previous) => {
                          const selected = previous.productCategories.split(",").filter(Boolean);
                          const updated = event.target.checked
                            ? [...selected, category]
                            : selected.filter((item) => item !== category);

                          return {
                            ...previous,
                            productCategories: updated.join(","),
                          };
                        })
                      }
                      className="h-4 w-4 accent-blue-500"
                    />
                    <span>{category}</span>
                  </label>
                ))}
              </div>
            </div>

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

          <div className="manufacturer-evidence">
            <h3>Verification Documents</h3>
            <p>
              Upload at least one supporting document. Accepted formats:
              PDF, JPG, JPEG and PNG. Maximum file size: 10 MB per document.
            </p>

            <div className="manufacturer-form-grid">
              {[
                ["companyRegistration", "Company Registration"],
                ["businessLicense", "Business License"],
                ["capabilityEvidence", "Manufacturing Capability Evidence"],
                ["otherEvidence", "Other Supporting Evidence"],
              ].map(([name, label]) => (
                <label key={name} className="manufacturer-field">
                  <span>{label}</span>
                  <input
                    type="file"
                    name={name}
                    accept=".pdf,.jpg,.jpeg,.png"
                  />
                </label>
              ))}
            </div>
          </div>

          <button className="primary-button" disabled={saving} type="submit">
            {saving ? "Registering..." : "Submit Manufacturer"}
          </button>
        </form>
      )}

      <section className="panel">
        <h3 style={{ marginTop: 0 }}>
          Verified Manufacturing Partners ({manufacturers.length})
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

        .manufacturer-evidence {
          margin: 10px 0 22px;
          padding: 18px;
          border: 1px solid #344966;
          border-radius: 8px;
          background: #0d1627;
        }

        .manufacturer-evidence h3 {
          margin: 0 0 8px;
          color: #edf2fa;
          font-size: 15px;
        }

        .manufacturer-evidence p {
          margin: 0 0 16px;
          color: #aab8ca;
          font-size: 12px;
          line-height: 1.6;
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

        .manufacturer-field select[multiple] {
          min-height: 150px;
        }

        .manufacturer-list {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 18px;
}

        .manufacturer-card {
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          gap: 14px;
          padding: 20px;
          min-width: 0;
          background: #101b2e;
          border: 1px solid #243249;
          border-radius: 10px;
        }

        .manufacturer-card h3 {
          margin: 0 0 10px;
          font-size: 15px;
        }

        .manufacturer-card p {
          color: #91a0b7;
          font-size: 12px;
          line-height: 1.6;
          margin: 7px 0;
        }

        @media (max-width: 1000px) {
          .manufacturer-list {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 650px) {
          .manufacturer-form-grid,
          .manufacturer-list {
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
