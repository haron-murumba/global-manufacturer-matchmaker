
function Dashboard() {
  return (
    <div className="dashboard-content">
      <section className="welcome-section">
        <div>
          <p className="eyebrow">YOUR SOURCING WORKSPACE</p>
          <h2>Find the right manufacturer.</h2>
          <p>
            Turn your product designs into real manufacturing opportunities.
          </p>
        </div>

        <button className="primary-button">+ Create New Project</button>
      </section>

      <section className="stats-grid">
        <div className="stat-card">
          <div className="stat-heading">
            <span>Active Projects</span>
            <span className="stat-icon blue">▤</span>
          </div>
          <h3>0</h3>
          <p>Your ongoing sourcing projects</p>
        </div>

        <div className="stat-card">
          <div className="stat-heading">
            <span>Manufacturers</span>
            <span className="stat-icon cyan">⌕</span>
          </div>
          <h3>0</h3>
          <p>Available in your shortlist</p>
        </div>

        <div className="stat-card">
          <div className="stat-heading">
            <span>RFQs Prepared</span>
            <span className="stat-icon purple">✉</span>
          </div>
          <h3>0</h3>
          <p>Ready for your review</p>
        </div>

        <div className="stat-card">
          <div className="stat-heading">
            <span>Responses</span>
            <span className="stat-icon green">◷</span>
          </div>
          <h3>0</h3>
          <p>Manufacturer replies received</p>
        </div>
      </section>

      <section className="content-grid">
        <div className="panel projects-panel">
          <div className="panel-header">
            <div>
              <h3>Recent Projects</h3>
              <p>Your latest product sourcing activity</p>
            </div>
            <button className="text-button">View all →</button>
          </div>

          <div className="empty-state">
            <div className="empty-icon">▤</div>
            <h3>No projects yet</h3>
            <p>
              Start by creating a project and uploading your product CAD
              file or specification sheet.
            </p>
            <button className="primary-button">
              + Create Your First Project
            </button>
          </div>
        </div>

        <div className="panel activity-panel">
          <div className="panel-header">
            <div>
              <h3>Quick Start</h3>
              <p>How GMM works</p>
            </div>
          </div>

          <div className="activity-list">
            {[
              ['01', 'Upload your design', 'Submit a CAD file or product specifications.'],
              ['02', 'Review your brief', 'Check the manufacturing requirements.'],
              ['03', 'Find manufacturers', 'Discover suitable factory matches.'],
              ['04', 'Prepare your RFQ', 'Create a request for quotation to review.'],
            ].map(([number, title, description]) => (
              <div className="activity-item" key={number}>
                <span className="step-number">{number}</span>
                <div>
                  <strong>{title}</strong>
                  <p>{description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}

export default Dashboard
