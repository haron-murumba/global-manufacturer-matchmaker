
import { useEffect, useState } from 'react';

const initialForm = {
  companyName: '',
  country: '',
  city: '',
  website: '',
  contactEmail: '',
  minimumOrderQuantity: '',
  smallOrderResponsiveness: 'Unknown',
  manufacturingProcesses: '',
  materials: '',
  capabilities: '',
  productCategories: '',
  notes: '',
};

function Manufacturers() {
  const [manufacturers, setManufacturers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState(initialForm);

  const fetchManufacturers = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/manufacturers`);

      if (!response.ok) {
        throw new Error('Failed to load manufacturers');
      }

      const data = await response.json();
      setManufacturers(data.manufacturers || []);
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchManufacturers();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    const splitValues = (value) =>
      value.split(',').map((item) => item.trim()).filter(Boolean);

    const manufacturerData = {
      ...formData,
      minimumOrderQuantity: formData.minimumOrderQuantity
        ? Number(formData.minimumOrderQuantity)
        : undefined,
      manufacturingProcesses: splitValues(formData.manufacturingProcesses),
      materials: splitValues(formData.materials),
      capabilities: splitValues(formData.capabilities),
      productCategories: splitValues(formData.productCategories),
    };

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/manufacturers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(manufacturerData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Could not save manufacturer');
      }

      setFormData(initialForm);
      setShowForm(false);
      await fetchManufacturers();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="page-content">
      <div className="section-heading">
        <div>
          <h2>Manufacturers</h2>
          <p>Explore factories and their manufacturing capabilities.</p>
        </div>

        <div className="manufacturer-actions">
          <span className="manufacturer-count">
            {manufacturers.length} Manufacturers
          </span>

          <button
            className="primary-button"
            onClick={() => setShowForm(!showForm)}
          >
            {showForm ? 'Cancel' : '+ Add Manufacturer'}
          </button>
        </div>
      </div>

      {showForm && (
        <form className="manufacturer-form" onSubmit={handleSubmit}>
          <h3>Register a Manufacturer</h3>
          <p>Enter the factory's details and manufacturing capabilities.</p>

          <div className="form-grid">
            <label>
              Company Name *
              <input name="companyName" value={formData.companyName}
                onChange={handleChange} required />
            </label>

            <label>
              Country *
              <input name="country" value={formData.country}
                onChange={handleChange} required />
            </label>

            <label>
              City
              <input name="city" value={formData.city}
                onChange={handleChange} />
            </label>

            <label>
              Website
              <input name="website" type="url" value={formData.website}
                onChange={handleChange} placeholder="https://example.com" />
            </label>

            <label>
              Contact Email
              <input name="contactEmail" type="email" value={formData.contactEmail}
                onChange={handleChange} />
            </label>

            <label>
              Minimum Order Quantity (MOQ)
              <input name="minimumOrderQuantity" type="number" min="1"
                value={formData.minimumOrderQuantity} onChange={handleChange} />
            </label>

            <label>
              Small-order Responsiveness
              <select name="smallOrderResponsiveness"
                value={formData.smallOrderResponsiveness} onChange={handleChange}>
                <option value="Unknown">Unknown</option>
                <option value="Yes">Yes</option>
                <option value="No">No</option>
              </select>
            </label>

            <label>
              Manufacturing Processes
              <input name="manufacturingProcesses"
                value={formData.manufacturingProcesses} onChange={handleChange}
                placeholder="CNC Machining, Injection Moulding" />
            </label>

            <label>
              Materials
              <input name="materials" value={formData.materials}
                onChange={handleChange} placeholder="Aluminium, ABS Plastic" />
            </label>

            <label>
              Capabilities
              <input name="capabilities" value={formData.capabilities}
                onChange={handleChange} placeholder="Metal parts, Plastic components" />
            </label>

            <label>
              Product Categories
              <input name="productCategories" value={formData.productCategories}
                onChange={handleChange} placeholder="Consumer Electronics, Automotive" />
            </label>
          </div>

          <label>
            Notes
            <textarea name="notes" value={formData.notes}
              onChange={handleChange} rows="3" />
          </label>

          <button className="primary-button" type="submit" disabled={saving}>
            {saving ? 'Saving...' : 'Save Manufacturer'}
          </button>
        </form>
      )}

      {error && <p className="error-message">{error}</p>}

      {loading && <p>Loading manufacturers...</p>}

      {!loading && !error && manufacturers.length === 0 && (
        <div className="empty-state">
          <h3>No manufacturers found</h3>
          <p>Manufacturer records will appear here when added.</p>
        </div>
      )}

      {!loading && manufacturers.length > 0 && (
        <div className="manufacturer-grid">
          {manufacturers.map((manufacturer) => (
            <div className="stat-card manufacturer-card" key={manufacturer._id}>
              <div className="manufacturer-card-header">
                <h3>{manufacturer.companyName}</h3>
                <span className={`verification-status ${manufacturer.verificationStatus?.toLowerCase().replace(' ', '-')}`}>
                  {manufacturer.verificationStatus}
                </span>
              </div>

              <p className="manufacturer-location">
                {manufacturer.city ? `${manufacturer.city}, ` : ''}
                {manufacturer.country}
              </p>

              <div className="manufacturer-details">
                <p>
                  <strong>MOQ:</strong>{' '}
                  {manufacturer.minimumOrderQuantity || 'Not specified'}
                </p>
                <p>
                  <strong>Small orders:</strong>{' '}
                  {manufacturer.smallOrderResponsiveness}
                </p>
              </div>

              <div className="manufacturer-tags">
                {manufacturer.manufacturingProcesses?.map((process) => (
                  <span key={process}>{process}</span>
                ))}
              </div>

              <p className="manufacturer-materials">
                <strong>Materials:</strong>{' '}
                {manufacturer.materials?.join(', ') || 'Not specified'}
              </p>

              {manufacturer.website && (
                <a href={manufacturer.website} target="_blank" rel="noreferrer">
                  Visit website ↗
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export default Manufacturers;
