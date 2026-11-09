
import { useEffect, useState } from 'react';

function AdminDashboard() {
  const [manufacturers, setManufacturers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reviewingId, setReviewingId] = useState('');
  const [rejectionReasons, setRejectionReasons] = useState({});
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchPendingManufacturers = async () => {
    try {
      const token = localStorage.getItem('adminToken');

      if (!token) {
        setError('Administrator login required.');
        setLoading(false);
        return;
      }

      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/admin/manufacturers/pending`,
        {
          cache: 'no-store',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to load manufacturers.');
      }

      setManufacturers(data.manufacturers || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingManufacturers();
  }, []);

  const handleReview = async (manufacturerId, decision) => {
    setError('');
    setSuccess('');

    const rejectionReason = rejectionReasons[manufacturerId] || '';

    if (decision === 'Rejected' && !rejectionReason.trim()) {
      setError('Please provide a reason for rejecting this manufacturer.');
      return;
    }

    try {
      setReviewingId(manufacturerId);

      const token = localStorage.getItem('adminToken');

      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/admin/manufacturers/${manufacturerId}/review`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            decision,
            rejectionReason,
            reviewNotes: '',
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Manufacturer review failed.');
      }

      setManufacturers((current) =>
        current.filter((manufacturer) => manufacturer._id !== manufacturerId)
      );

      setSuccess(
        decision === 'Verified'
          ? 'Manufacturer approved successfully.'
          : 'Manufacturer rejected successfully.'
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setReviewingId('');
    }
  };

  if (loading) {
    return (
      <div className="page-container">
        Loading pending manufacturers...
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="admin-dashboard-header">
        <div>
          <h2>Administrator Dashboard</h2>
          <p>Review and verify manufacturer registrations.</p>
        </div>

        <button
          onClick={() => {
            localStorage.removeItem('adminToken');
            window.location.reload();
          }}
        >
          Logout
        </button>
      </div>

      {error && <p className="error-message">{error}</p>}
      {success && <p>{success}</p>}

      {!error && manufacturers.length === 0 && (
        <p>No manufacturers are currently awaiting verification.</p>
      )}

      <div className="manufacturer-list">
        {manufacturers.map((manufacturer) => (
          <div key={manufacturer._id} className="manufacturer-card">
            <h3>{manufacturer.companyName}</h3>

            <p>
              Location: {manufacturer.city}, {manufacturer.country}
            </p>

            <p>
              Email: {manufacturer.contactEmail || 'Not provided'}
            </p>

            <p>Status: {manufacturer.verificationStatus}</p>

            <div className="admin-review-actions">
              <button
                onClick={() =>
                  handleReview(manufacturer._id, 'Verified')
                }
                disabled={reviewingId === manufacturer._id}
              >
                {reviewingId === manufacturer._id
                  ? 'Processing...'
                  : 'Approve Manufacturer'}
              </button>

              <textarea
                placeholder="Enter reason for rejection..."
                value={rejectionReasons[manufacturer._id] || ''}
                onChange={(e) =>
                  setRejectionReasons((current) => ({
                    ...current,
                    [manufacturer._id]: e.target.value,
                  }))
                }
              />

              <button
                onClick={() =>
                  handleReview(manufacturer._id, 'Rejected')
                }
                disabled={reviewingId === manufacturer._id}
              >
                Reject Manufacturer
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default AdminDashboard;
