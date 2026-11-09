
"use client";

import { useEffect, useState } from "react";
import {
  getProjects,
  createProject,
  updateProject,
  getCadDownloadLink,
} from "@/lib/api";
import styles from "./projects.module.css";
import Link from "next/link";

const emptyForm = {
  productName: "",
  description: "",
  quantity: "",
  material: "",
  process: "",
  status: "Draft",
};

export default function ProjectsPage() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [cadFile, setCadFile] = useState(null);
  const [downloadingId, setDownloadingId] = useState(null);

  async function loadProjects() {
    try {
      setLoading(true);
      setError("");
      const result = await getProjects();
      setProjects(result.projects || []);
    } catch (err) {
      setError(err.message || "Could not load projects.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProjects();
  }, []);

  function openCreateForm() {
    alert("Create button is working!");
    setForm(emptyForm);
    setCadFile(null);
    setEditingId(null);
    setError("");
    setSuccess("");
    setShowForm(true);
  }

  function openEditForm(project) {
    setForm({
      productName: project.productName || "",
      description: project.description || "",
      quantity: project.quantity || "",
      material: project.material || "",
      process: project.process || "",
      status: project.status || "Draft",
    });
    setCadFile(null);
    setEditingId(project._id);
    setError("");
    setSuccess("");
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditingId(null);
    setCadFile(null);
    setForm(emptyForm);
  }

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!editingId && !cadFile) {
      setError("Please select a CAD or specification file.");
      return;
    }

    const data = new FormData();

        data.append("productName", formData.productName.trim());
        data.append("description", formData.description.trim());
        data.append("quantity", String(formData.quantity));
        data.append("material", formData.material.trim());
        data.append("process", formData.process.trim());

        if (file) {
        data.append("cadFile", file);
        }

    if (cadFile) {
      formData.append("cadFile", cadFile);
    }

    try {
      setSaving(true);

      if (editingId) {
        await updateProject(editingId, formData);
        setSuccess("Project updated successfully.");
      } else {
        await createProject(formData);
        setSuccess("Project created successfully.");
      }

      closeForm();
      await loadProjects();
      setSuccess(
        editingId
          ? "Project updated successfully."
          : "Project created successfully."
      );
    } catch (err) {
      setError(err.message || "Unable to save this project.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDownload(project) {
    try {
      setError("");
      setDownloadingId(project._id);

      const result = await getCadDownloadLink(project._id);

      if (!result.url) {
        throw new Error("The server did not return a download link.");
      }

      window.open(result.url, "_blank", "noopener,noreferrer");
    } catch (err) {
      setError(err.message || "Unable to download the project file.");
    } finally {
      setDownloadingId(null);
    }
  }

  return (
    <main className={styles.page}>
      <div className={styles.heading}>
        <div>
          <p className={styles.eyebrow}>WORKSPACE</p>
          <h1>My Projects</h1>
          <p className={styles.description}>
            Create and manage product sourcing projects and their CAD files.
          </p>
        </div>

        <button
            className={styles.primaryButton}
            onClick={() => { window.location.href = "/projects/new"; }}
        >
          + Create New Project
        </button>
      </div>

      <div className={styles.summary}>
        <div className={styles.summaryCard}>
          <span>Total projects</span>
          <strong>{projects.length}</strong>
        </div>
        <div className={styles.summaryCard}>
          <span>Draft projects</span>
          <strong>
            {projects.filter((project) => project.status === "Draft").length}
          </strong>
        </div>
        <div className={styles.summaryCard}>
          <span>Projects with files</span>
          <strong>
            {projects.filter((project) => project.cadFile?.originalName).length}
          </strong>
        </div>
      </div>

      {error && <div className={styles.error}>{error}</div>}
      {success && <div className={styles.success}>{success}</div>}

      <section className={styles.panel}>
        <div className={styles.panelHeading}>
          <div>
            <h2>All Projects</h2>
            <p>Projects retrieved from your GMM database.</p>
          </div>
          <button className={styles.refreshButton} onClick={loadProjects}>
            Refresh
          </button>
        </div>

        {loading ? (
          <p className={styles.message}>Loading your projects...</p>
        ) : projects.length === 0 ? (
          <div className={styles.empty}>
            <h3>No projects yet</h3>
            <p>Create your first project to begin manufacturer matching.</p>
            <button className={styles.primaryButton} onClick={openCreateForm}>
              Create a project
            </button>
          </div>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>PRODUCT</th>
                  <th>MATERIAL</th>
                  <th>PROCESS</th>
                  <th>QUANTITY</th>
                  <th>STATUS</th>
                  <th>CAD FILE</th>
                  <th>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {projects.map((project) => (
                  <tr key={project._id}>
                    <td>
                      <strong>{project.productName}</strong>
                      <span className={styles.subtext}>
                        {project.description || "No description"}
                      </span>
                    </td>
                    <td>{project.material || "—"}</td>
                    <td>{project.process || "—"}</td>
                    <td>{Number(project.quantity || 0).toLocaleString()}</td>
                    <td>
                      <span className={styles.status}>
                        {project.status || "Draft"}
                      </span>
                    </td>
                    <td>
                      {project.cadFile?.originalName || "No file"}
                    </td>
                    <td>
                      <div className={styles.actions}>
                        <button
                          className={styles.actionButton}
                          onClick={() => openEditForm(project)}
                        >
                          Edit
                        </button>
                        {project.cadFile?.publicId && (
                          <button
                            className={styles.actionButton}
                            onClick={() => handleDownload(project)}
                            disabled={downloadingId === project._id}
                          >
                            {downloadingId === project._id
                              ? "Opening..."
                              : "Download"}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {showForm && (
        <div className={styles.modalBackdrop}>
          <section
            className={styles.modal}
            role="dialog"
            aria-modal="true"
            aria-labelledby="project-form-title"
          >
            <div className={styles.modalHeading}>
              <div>
                <p className={styles.eyebrow}>
                  {editingId ? "UPDATE PROJECT" : "NEW SOURCING PROJECT"}
                </p>
                <h2 id="project-form-title">
                  {editingId ? "Edit Project" : "Create Project"}
                </h2>
              </div>
              <button
                className={styles.closeButton}
                onClick={closeForm}
                aria-label="Close form"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit} className={styles.form}>
              <label>
                Product name *
                <input
                  name="productName"
                  value={form.productName}
                  onChange={handleChange}
                  placeholder="e.g. Smart Water Bottle"
                  required
                />
              </label>

              <label>
                Product description
                <textarea
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  placeholder="Describe the product and its requirements"
                  rows={3}
                />
              </label>

              <div className={styles.formRow}>
                <label>
                  Order quantity *
                  <input
                    type="number"
                    name="quantity"
                    min="1"
                    value={form.quantity}
                    onChange={handleChange}
                    placeholder="e.g. 1000"
                    required
                  />
                </label>

                <label>
                  Material *
                  <input
                    name="material"
                    value={form.material}
                    onChange={handleChange}
                    placeholder="e.g. ABS Plastic"
                    required
                  />
                </label>
              </div>

              <label>
                Manufacturing process *
                <input
                  name="process"
                  value={form.process}
                  onChange={handleChange}
                  placeholder="e.g. Injection Moulding"
                  required
                />
              </label>

              {editingId && (
                <label>
                  Project status
                  <select
                    name="status"
                    value={form.status}
                    onChange={handleChange}
                  >
                    <option value="Draft">Draft</option>
                    <option value="Matching">Matching</option>
                    <option value="Under Review">Under Review</option>
                    <option value="Completed">Completed</option>
                  </select>
                </label>
              )}

              <label>
                CAD / specification file {editingId ? "(optional)" : "*"}
                <input
                  type="file"
                  accept=".step,.stp,.iges,.igs,.pdf"
                  onChange={(event) =>
                    setCadFile(event.target.files?.[0] || null)
                  }
                  required={!editingId}
                />
                <small>
                  Accepted formats: STEP, STP, IGES, IGS and PDF. Maximum
                  file size: 25 MB.
                </small>
                {cadFile && (
                  <small>Selected file: {cadFile.name}</small>
                )}
              </label>

              {error && <div className={styles.error}>{error}</div>}

              <div className={styles.formActions}>
                <button
                  type="button"
                  className={styles.cancelButton}
                  onClick={closeForm}
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={styles.primaryButton}
                  disabled={saving}
                >
                  {saving
                    ? "Saving..."
                    : editingId
                      ? "Save Changes"
                      : "Create Project"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </main>
  );
}
