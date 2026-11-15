"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
const PRODUCT_CATEGORIES = [
  "Smart Devices",
  "Consumer Electronics",
  "Bottles & Drinkware",
  "Plastic Products",
  "Industrial Components",
  "Automotive Products",
  "Laboratory Equipment",
  "Other",
];

import {
  getMyProjects,
  updateCustomerProject,
  confirmCustomerSpecifications,
} from "@/lib/api";

const initialForm = {
  productName: "",
  productCategories: [],
  description: "",
  quantity: "",
  material: "",
  process: "",
  length: "",
  width: "",
  height: "",
  unit: "mm",
  tolerances: "",
  surfaceFinish: "",
  standards: "",
  certifications: "",
  additionalRequirements: "",
};

const fieldStyle = {
  width: "100%",
  boxSizing: "border-box",
  marginTop: "8px",
  padding: "12px 13px",
  color: "#e5e7eb",
  background: "#0b1220",
  border: "1px solid #334155",
  borderRadius: "8px",
  fontSize: "14px",
};

const labelStyle = {
  display: "block",
  color: "#cbd5e1",
  fontSize: "13px",
  fontWeight: 600,
};

const sectionStyle = {
  padding: "22px",
  background: "#151d2b",
  border: "1px solid #29364a",
  borderRadius: "12px",
  display: "grid",
  gap: "18px",
};

export default function SpecificationReviewPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id;

  const [form, setForm] = useState(initialForm);
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;

    async function loadProject() {
      const token = localStorage.getItem("customerToken");

      if (!token) {
        router.push("/login");
        return;
      }

      try {
        const result = await getMyProjects(token);
        const record = (result.projects || []).find(
          (item) => item._id === projectId
        );

        if (!record) {
          router.replace("/projects");
          return;
        }

        if (!active) return;

        const dimensions = record.dimensions || {};
        const requirements = record.technicalRequirements || {};

        setProject(record);
        setForm({
          productName: record.productName || "",
          productCategories: Array.isArray(record.productCategories) &&
            record.productCategories.length
              ? record.productCategories
              : record.productCategory
                ? [record.productCategory]
                : [],
          description: record.description || "",
          quantity: record.quantity ?? "",
          material: record.material || "",
          process: record.process || "",
          length: dimensions.length ?? "",
          width: dimensions.width ?? "",
          height: dimensions.height ?? "",
          unit: dimensions.unit || "mm",
          tolerances: requirements.tolerances || "",
          surfaceFinish: requirements.surfaceFinish || "",
          standards: requirements.standards || "",
          certifications: requirements.certifications || "",
          additionalRequirements: requirements.additionalRequirements || "",
        });
      } catch (err) {
        if (active) setError(err.message || "Unable to load this project.");
      } finally {
        if (active) setLoading(false);
      }
    }

    loadProject();

    return () => {
      active = false;
    };
  }, [projectId, router]);

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  function toggleCategory(category) {
    setForm((current) => ({
      ...current,
      productCategories: current.productCategories.includes(category)
        ? current.productCategories.filter((item) => item !== category)
        : [...current.productCategories, category],
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!form.productCategories.length) {
      setError("Please select at least one product category.");
      return;
    }

    if (!acknowledged) {
      setError("Please confirm that you have reviewed the product information.");
      return;
    }

    const token = localStorage.getItem("customerToken");

    if (!token) {
      router.push("/login");
      return;
    }

    const data = new FormData();

    data.append("productName", form.productName.trim());
    data.append("productCategories", JSON.stringify(form.productCategories));
    data.append("description", form.description.trim());
    data.append("quantity", form.quantity);
    data.append("material", form.material.trim());
    data.append("process", form.process.trim());

    data.append("dimensions", JSON.stringify({
      length: form.length,
      width: form.width,
      height: form.height,
      unit: form.unit,
    }));

    data.append("technicalRequirements", JSON.stringify({
      tolerances: form.tolerances.trim(),
      surfaceFinish: form.surfaceFinish.trim(),
      standards: form.standards.trim(),
      certifications: form.certifications.trim(),
      additionalRequirements: form.additionalRequirements.trim(),
    }));

    try {
      setSaving(true);

      await updateCustomerProject(projectId, data, token);
      await confirmCustomerSpecifications(projectId, token);

      setMessage("Your specifications have been confirmed. This project is now eligible for manufacturer matching.");
      router.push("/projects?confirmed=1");
      router.refresh();
    } catch (err) {
      setError(
        err.message ||
        "We could not confirm the specifications. Please review the information and try again."
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main style={{ minHeight: "100vh", padding: 32, background: "#0b1120", color: "#e5e7eb" }}>
        Loading project specifications...
      </main>
    );
  }

  if (!project) {
    return (
      <main style={{ minHeight: "100vh", padding: 32, background: "#0b1120", color: "#e5e7eb" }}>
        <p>{error || "Project not found."}</p>
        <Link href="/projects" style={{ color: "#60a5fa" }}>Back to projects</Link>
      </main>
    );
  }

  const input = (name, label, options = {}) => (
    <label style={labelStyle}>
      {label}
      <input
        style={fieldStyle}
        name={name}
        type={options.type || "text"}
        min={options.min}
        step={options.step}
        value={form[name]}
        onChange={handleChange}
        placeholder={options.placeholder || ""}
      />
    </label>
  );

  const textarea = (name, label, placeholder) => (
    <label style={labelStyle}>
      {label}
      <textarea
        style={{ ...fieldStyle, resize: "vertical" }}
        name={name}
        rows={3}
        value={form[name]}
        onChange={handleChange}
        placeholder={placeholder}
      />
    </label>
  );

  return (
    <main style={{
      minHeight: "100vh",
      padding: "36px 18px 60px",
      boxSizing: "border-box",
      background: "#0b1120",
      color: "#e5e7eb",
    }}>
      <div style={{ maxWidth: 940, margin: "0 auto", display: "grid", gap: 22 }}>
        <div>
          <Link href="/projects" style={{ color: "#60a5fa", textDecoration: "none" }}>
            ← Back to projects
          </Link>
          <p style={{ color: "#60a5fa", fontSize: 12, fontWeight: 700, letterSpacing: 1.4, marginTop: 24 }}>
            PRODUCT SOURCING · SPECIFICATION REVIEW
          </p>
          <h1 style={{ fontSize: 30, margin: "8px 0" }}>
            Review your product specifications
          </h1>
          <p style={{ color: "#94a3b8", lineHeight: 1.7, margin: 0 }}>
            Check the information below and add any manufacturing details you know.
            Leave uncertain technical values blank.
          </p>
        </div>

        <div style={{
          padding: 18,
          borderRadius: 10,
          border: "1px solid #854d0e",
          background: "#2a2115",
          color: "#fde68a",
          lineHeight: 1.65,
          fontSize: 13,
        }}>
          <strong>Important about your uploaded file</strong>
          <p style={{ margin: "6px 0 0" }}>
            GMM stores your CAD file or specification sheet for the sourcing process.
            Automatic CAD geometry extraction is not currently available, so the
            technical values below must be entered or checked by you. Do not treat
            blank fields as extracted measurements.
          </p>
          <p style={{ margin: "8px 0 0" }}>
            Uploaded file: <strong>{project.cadFile?.originalName || "No file name available"}</strong>
          </p>
        </div>

        {project.specificationStatus === "Confirmed" && (
          <div style={{
            padding: 14,
            borderRadius: 9,
            border: "1px solid #166534",
            background: "#10251c",
            color: "#86efac",
            fontSize: 13,
          }}>
            These specifications are currently confirmed. Saving changes below will require confirmation again.
          </div>
        )}

        {error && (
          <div role="alert" style={{
            padding: 13,
            borderRadius: 8,
            background: "#351b22",
            border: "1px solid #7f1d1d",
            color: "#fca5a5",
          }}>
            {error}
          </div>
        )}

        {message && (
          <div role="status" style={{
            padding: 13,
            borderRadius: 8,
            background: "#10251c",
            border: "1px solid #166534",
            color: "#86efac",
          }}>
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: "grid", gap: 18 }}>
          <section style={sectionStyle}>
            <div>
              <h2 style={{ margin: 0, fontSize: 18 }}>Product information</h2>
              <p style={{ color: "#94a3b8", fontSize: 13, marginBottom: 0 }}>
                Core information used to identify suitable manufacturers.
              </p>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
              {input("productName", "Product name *")}
              <fieldset style={{
                ...sectionStyle,
                padding: 14,
                gap: 12,
                border: "1px solid #334155",
              }}>
                <legend style={labelStyle}>
                  Product categories * (select all that apply)
                </legend>
                <div style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
                  gap: 12,
                }}>
                  {PRODUCT_CATEGORIES.map((category) => (
                    <label key={category} style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 9,
                      color: "#cbd5e1",
                      fontSize: 13,
                      cursor: "pointer",
                    }}>
                      <input
                        type="checkbox"
                        checked={form.productCategories.includes(category)}
                        onChange={() => toggleCategory(category)}
                      />
                      {category}
                    </label>
                  ))}
                </div>
              </fieldset>
              {input("quantity", "Estimated quantity *", { type: "number", min: "1", step: "1" })}
              {input("material", "Preferred material", { placeholder: "If known, e.g. ABS plastic" })}
              <label style={labelStyle}>
                Manufacturing process
                <select name="process" value={form.process} onChange={handleChange} style={fieldStyle}>
                  <option value="">Not specified</option>
                  <option value="Injection Molding">Injection Molding</option>
                  <option value="CNC Machining">CNC Machining</option>
                  <option value="Sheet Metal Fabrication">Sheet Metal Fabrication</option>
                  <option value="3D Printing">3D Printing</option>
                  <option value="Die Casting">Die Casting</option>
                  <option value="Not Sure">Not Sure</option>
                </select>
              </label>
            </div>

            {textarea("description", "Product description *", "Describe the product, its intended use and any important features.")}
          </section>

          <section style={sectionStyle}>
            <div>
              <h2 style={{ margin: 0, fontSize: 18 }}>Product dimensions</h2>
              <p style={{ color: "#94a3b8", fontSize: 13, marginBottom: 0 }}>
                Optional. Enter verified dimensions only.
              </p>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 16 }}>
              {input("length", "Length", { type: "number", min: "0", step: "any" })}
              {input("width", "Width", { type: "number", min: "0", step: "any" })}
              {input("height", "Height", { type: "number", min: "0", step: "any" })}
              <label style={labelStyle}>
                Measurement unit
                <select name="unit" value={form.unit} onChange={handleChange} style={fieldStyle}>
                  <option value="mm">Millimetres (mm)</option>
                  <option value="cm">Centimetres (cm)</option>
                  <option value="in">Inches (in)</option>
                </select>
              </label>
            </div>
          </section>

          <section style={sectionStyle}>
            <div>
              <h2 style={{ margin: 0, fontSize: 18 }}>Technical and quality requirements</h2>
              <p style={{ color: "#94a3b8", fontSize: 13, marginBottom: 0 }}>
                Optional sourcing details. Leave blank if unknown or not applicable.
              </p>
            </div>

            {textarea("tolerances", "Dimensional tolerances", "e.g. ±0.1 mm, if specified")}
            {textarea("surfaceFinish", "Surface finish", "e.g. polished, matte, Ra value, if specified")}
            {textarea("standards", "Applicable standards", "e.g. ISO, ASTM or other required standards")}
            {textarea("certifications", "Required certifications", "e.g. material, safety or industry certifications")}
            {textarea("additionalRequirements", "Additional manufacturing requirements", "Packaging, colour, testing, assembly or other requirements")}
          </section>

          <section style={sectionStyle}>
            <label style={{
              display: "flex",
              gap: 12,
              alignItems: "flex-start",
              color: "#e2e8f0",
              lineHeight: 1.6,
              fontSize: 14,
            }}>
              <input
                type="checkbox"
                checked={acknowledged}
                onChange={(event) => setAcknowledged(event.target.checked)}
                style={{ marginTop: 4 }}
              />
              <span>
                I have reviewed the product information, corrected anything I know
                to be inaccurate, and left unknown technical values blank. I understand
                that these specifications will be used for manufacturer sourcing.
              </span>
            </label>

            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <button
                type="submit"
                disabled={saving || !acknowledged}
                style={{
                  padding: "13px 20px",
                  border: 0,
                  borderRadius: 8,
                  color: "#fff",
                  background: saving || !acknowledged ? "#475569" : "#2563eb",
                  fontWeight: 700,
                  cursor: saving || !acknowledged ? "not-allowed" : "pointer",
                }}
              >
                {saving ? "Saving and confirming..." : "Confirm specifications"}
              </button>

              <Link href="/projects" style={{
                display: "inline-flex",
                alignItems: "center",
                padding: "12px 16px",
                border: "1px solid #475569",
                borderRadius: 8,
                color: "#cbd5e1",
                textDecoration: "none",
                fontSize: 14,
              }}>
                Back to projects
              </Link>
            </div>
          </section>
        </form>
      </div>
    </main>
  );
}
