
import { useState } from 'react';

function CreateProject({ onCancel, onSave, project = null }) {
  const isEditing = Boolean(project);

  const [formData, setFormData] = useState({
    productName: project?.productName || '',
    description: project?.description || '',
    quantity: project?.quantity || '',
    material: project?.material || '',
    process: project?.process || '',
  });

  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function handleChange(event) {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');

    if (!isEditing && !file) {
      setError('Please upload a CAD file or specification sheet.');
      return;
    }

    const submissionData = new FormData();

    Object.entries(formData).forEach(([key, value]) => {
      submissionData.append(key, value);
    });

    if (file) {
      submissionData.append('cadFile', file);
    }

    try {
      setLoading(true);

      const url = isEditing
        ? `${import.meta.env.VITE_API_URL}/api/projects/${project._id}`
        : `${import.meta.env.VITE_API_URL}/api/projects`;

      const response = await fetch(url, {
        method: isEditing ? 'PUT' : 'POST',
        body: submissionData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error ||
          result.message ||
          `Failed to ${isEditing ? 'update' : 'create'} project.`
        );
      }

      onSave(result.project);
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="dashboard-content">
      <section className="welcome-section">
        <div>
          <p className="eyebrow">PRODUCT SOURCING WORKSPACE</p>
          <h2>{isEditing ? 'Edit Project' : 'Create New Project'}</h2>
          <p>
            {isEditing
              ? 'Update your product and manufacturing requirements.'
              : 'Tell us about your product and manufacturing requirements.'}
          </p>
        </div>
      </section>

      <form className="panel project-form" onSubmit={handleSubmit}>
        <div className="form-section">
          <h3>Product Information</h3>
          <p>Start with the basic details of your product.</p>

          <label>
            Product Name *
            <input
              type="text"
              name="productName"
              value={formData.productName}
              onChange={handleChange}
              placeholder="e.g. Smart water bottle"
              required
            />
          </label>

          <label>
            Product Description *
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Describe your product, its purpose and key features..."
              rows="4"
              required
            />
          </label>
        </div>

        <div className="form-section">
          <h3>Manufacturing Requirements</h3>
          <p>Provide the initial requirements for production.</p>

          <div className="form-grid">
            <label>
              Estimated Quantity *
              <input
                type="number"
                name="quantity"
                min="1"
                value={formData.quantity}
                onChange={handleChange}
                placeholder="e.g. 1000"
                required
              />
            </label>

            <label>
              Preferred Material
              <input
                type="text"
                name="material"
                value={formData.material}
                onChange={handleChange}
                placeholder="e.g. Stainless steel"
              />
            </label>

            <label>
              Manufacturing Process
              <select
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
          </div>
        </div>

        <div className="form-section">
          <h3>CAD File / Specification Sheet</h3>
          <p>
            {isEditing
              ? 'Upload a replacement only if you want to change the existing file.'
              : 'Upload your product design or technical specifications.'}
          </p>

          {isEditing && project.cadFile?.originalName && (
            <p>
              Current file: <strong>{project.cadFile.originalName}</strong>
            </p>
          )}

          <label className="upload-area">
            <span className="upload-icon">↑</span>
            <strong>
              {file
                ? file.name
                : isEditing
                  ? 'Choose a replacement file (optional)'
                  : 'Choose a file to upload'}
            </strong>
            <span>STEP, STP, IGES or PDF files (maximum 25 MB)</span>
            <input
              type="file"
              accept=".step,.stp,.iges,.igs,.pdf"
              onChange={(event) => setFile(event.target.files[0] || null)}
              required={!isEditing}
            />
          </label>
        </div>

        {error && (
          <p role="alert" className="error-message">
            {error}
          </p>
        )}

        <div className="form-actions">
          <button
            type="button"
            className="secondary-button"
            onClick={onCancel}
            disabled={loading}
          >
            Cancel
          </button>

          <button
            type="submit"
            className="primary-button"
            disabled={loading}
          >
            {loading
              ? isEditing ? 'Updating...' : 'Uploading...'
              : isEditing ? 'Save Changes' : 'Create Project →'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default CreateProject;
