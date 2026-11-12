
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createProject } from "@/lib/api";

export default function CreateProjectPage() {
  const router = useRouter();

  const [formData, setFormData] = useState({
    productName: "",
    description: "",
    quantity: "",
    material: "",
    process: "",
  });

  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function handleChange(e) {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!file) {
      setError("Please upload a CAD file or specification sheet.");
      return;
    }

    const data = new FormData();

    Object.entries(formData).forEach(([key, value]) => {
      data.append(key, value);
    });

    data.append("cadFile", file);

    try {
      const token = localStorage.getItem("adminToken");

      if (!token) {
        throw new Error("Please log in as an administrator before creating a project.");
      }

      setLoading(true);
      await createProject(data, token);
      router.push("/projects");
      router.refresh();
    } catch (err) {
      setError(err.message || "Project creation failed.");
    } finally {
      setLoading(false);
    }
  }

  const inputStyle = {
    width: "100%",
    padding: "13px 14px",
    marginTop: "9px",
    background: "#0b1220",
    color: "#e5e7eb",
    border: "1px solid #334155",
    borderRadius: "8px",
    fontSize: "14px",
    outline: "none",
    boxSizing: "border-box",
  };

  const labelStyle = {
    display: "block",
    color: "#cbd5e1",
    fontSize: "14px",
    fontWeight: "600",
  };

  return (
    <main style={{
      minHeight: "100vh",
      background: "#0b1120",
      color: "#e5e7eb",
      padding: "40px 20px",
      boxSizing: "border-box",
    }}>
      <div style={{
        maxWidth: "900px",
        margin: "0 auto",
      }}>
        <button
          type="button"
          onClick={() => router.push("/projects")}
          style={{
            background: "transparent",
            color: "#60a5fa",
            border: "none",
            cursor: "pointer",
            fontSize: "14px",
            marginBottom: "25px",
          }}
        >
          ← Back to Projects
        </button>

        <h1 style={{
          fontSize: "28px",
          fontWeight: "700",
          marginBottom: "8px",
        }}>
          Create New Project
        </h1>

        <p style={{ color: "#94a3b8", marginBottom: "28px" }}>
          Enter your product and manufacturing requirements.
        </p>

        <form
          onSubmit={handleSubmit}
          style={{
            display: "grid",
            gap: "22px",
            padding: "30px",
            background: "#151d2b",
            border: "1px solid #29364a",
            borderRadius: "14px",
            boxShadow: "0 10px 30px rgba(0,0,0,0.2)",
          }}
        >
          <label style={labelStyle}>
            Product Name *
            <input
              style={inputStyle}
              name="productName"
              value={formData.productName}
              onChange={handleChange}
              placeholder="e.g. Smart water bottle"
              required
            />
          </label>

          <label style={labelStyle}>
            Product Description *
            <textarea
              style={{ ...inputStyle, resize: "vertical" }}
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Describe your product..."
              rows={4}
              required
            />
          </label>

          <label style={labelStyle}>
            Estimated Quantity *
            <input
              style={inputStyle}
              type="number"
              name="quantity"
              min="1"
              value={formData.quantity}
              onChange={handleChange}
              placeholder="e.g. 1000"
              required
            />
          </label>

          <label style={labelStyle}>
            Preferred Material
            <input
              style={inputStyle}
              name="material"
              value={formData.material}
              onChange={handleChange}
              placeholder="e.g. ABS Plastic"
            />
          </label>

          <label style={labelStyle}>
            Manufacturing Process
            <select
              style={inputStyle}
              name="process"
              value={formData.process}
              onChange={handleChange}
            >
              <option value="">Select a process</option>
              <option value="Injection Molding">Injection Molding</option>
              <option value="CNC Machining">CNC Machining</option>
              <option value="Sheet Metal Fabrication">Sheet Metal Fabrication</option>
              <option value="3D Printing">3D Printing</option>
              <option value="Die Casting">Die Casting</option>
              <option value="Not Sure">Not Sure</option>
            </select>
          </label>

          <label style={labelStyle}>
            CAD File / Specification Sheet *
            <input
              style={{
                ...inputStyle,
                padding: "11px",
              }}
              type="file"
              accept=".step,.stp,.iges,.igs,.pdf"
              onChange={(e) => setFile(e.target.files[0] || null)}
              required
            />
            <small style={{
              display: "block",
              color: "#94a3b8",
              marginTop: "8px",
              fontWeight: "400",
            }}>
              STEP, STP, IGES or PDF. Maximum 25 MB.
            </small>
          </label>

          {error && (
            <p style={{ color: "#f87171" }} role="alert">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              background: loading ? "#475569" : "#2563eb",
              color: "#ffffff",
              border: "none",
              borderRadius: "8px",
              padding: "14px 20px",
              fontSize: "15px",
              fontWeight: "700",
              cursor: loading ? "not-allowed" : "pointer",
            }}
          >
            {loading ? "Uploading..." : "Create Project →"}
          </button>
        </form>
      </div>
    </main>
  );
}
