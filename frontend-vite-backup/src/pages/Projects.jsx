
import { useState, useEffect } from 'react';
import CreateProject from '../components/projects/CreateProject';

function Projects() {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [downloadingProjectId, setDownloadingProjectId] = useState(null);
  const [matchingProjectId, setMatchingProjectId] = useState(null);
  const [matchResults, setMatchResults] = useState({});
  const [matchErrors, setMatchErrors] = useState({});

  async function fetchProjects() {
    try {
      setLoading(true);
      setError('');

      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/projects`
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to load projects.');
      }

      setProjects(result.projects || []);
    } catch (err) {
      setError(err.message || 'Unable to load projects.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchProjects();
  }, []);

  const handleSaveProject = (savedProject) => {
    setProjects((previousProjects) => {
      const alreadyExists = previousProjects.some(
        (project) => project._id === savedProject._id
      );

      if (alreadyExists) {
        return previousProjects.map((project) =>
          project._id === savedProject._id ? savedProject : project
        );
      }

      return [savedProject, ...previousProjects];
    });

    // Clear old match results because project requirements may have changed.
    setMatchResults((previous) => {
      const updated = { ...previous };
      delete updated[savedProject._id];
      return updated;
    });

    setMatchErrors((previous) => {
      const updated = { ...previous };
      delete updated[savedProject._id];
      return updated;
    });

    setShowCreateForm(false);
    setEditingProject(null);
  };

  async function handleDownloadCad(projectId) {
    const downloadWindow = window.open('about:blank', '_blank');

    try {
      setDownloadingProjectId(projectId);

      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/projects/${projectId}/cad-file`
      );

      const result = await response.json();

      if (!response.ok || !result.success || !result.url) {
        throw new Error(
          result.message || 'Unable to generate CAD download link.'
        );
      }

      if (downloadWindow) {
        downloadWindow.location.href = result.url;
      } else {
        window.location.href = result.url;
      }
    } catch (err) {
      if (downloadWindow) {
        downloadWindow.close();
      }

      alert(err.message || 'CAD download failed.');
    } finally {
      setDownloadingProjectId(null);
    }
  }

  async function handleFindManufacturers(projectId) {
    try {
      setMatchingProjectId(projectId);

      setMatchErrors((previous) => ({
        ...previous,
        [projectId]: '',
      }));

      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/manufacturers/match/${projectId}`
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || 'Unable to find manufacturers.'
        );
      }

      setMatchResults((previous) => ({
        ...previous,
        [projectId]: result,
      }));
    } catch (err) {
      setMatchErrors((previous) => ({
        ...previous,
        [projectId]: err.message || 'Manufacturer matching failed.',
      }));
    } finally {
      setMatchingProjectId(null);
    }
  }

  function openCreateForm() {
    setEditingProject(null);
    setShowCreateForm(true);
  }

  function openEditForm(project) {
    setShowCreateForm(false);
    setEditingProject(project);
  }

  function closeForm() {
    setShowCreateForm(false);
    setEditingProject(null);
  }

  return (
    <section className="page-content">
      <div className="section-heading">
        <div>
          <h2>My Projects</h2>
          <p>Manage your product sourcing projects.</p>
        </div>

        {!showCreateForm && !editingProject && (
          <button
            className="primary-button"
            onClick={openCreateForm}
          >
            + Create Project
          </button>
        )}
      </div>

      {showCreateForm ? (
        <CreateProject
          onCancel={closeForm}
          onSave={handleSaveProject}
        />
      ) : editingProject ? (
        <CreateProject
          project={editingProject}
          onCancel={closeForm}
          onSave={handleSaveProject}
        />
      ) : loading ? (
        <div className="empty-state">
          <p>Loading your projects...</p>
        </div>
      ) : error ? (
        <div className="empty-state">
          <p>{error}</p>

          <button
            className="primary-button"
            onClick={fetchProjects}
          >
            Try Again
          </button>
        </div>
      ) : projects.length === 0 ? (
        <div className="empty-state">
          <h3>No projects yet</h3>
          <p>
            Create your first project to start finding manufacturers.
          </p>

          <button
            className="primary-button"
            onClick={openCreateForm}
          >
            Create Your First Project
          </button>
        </div>
      ) : (
        <div className="project-list">
          {projects.map((project) => {
            const matches = matchResults[project._id];

            return (
              <div className="stat-card" key={project._id}>
                <h3>{project.productName}</h3>

                <p>{project.description}</p>

                <p>Quantity: {project.quantity}</p>

                <p>
                  Material: {project.material || 'Not specified'}
                </p>

                <p>
                  Process: {project.process || 'Not specified'}
                </p>

                <p>
                  Created: {new Date(project.createdAt).toLocaleDateString()}
                </p>

                {project.cadFile?.publicId ? (
                  <div>
                    <button
                      className="primary-button"
                      onClick={() => handleDownloadCad(project._id)}
                      disabled={downloadingProjectId === project._id}
                    >
                      {downloadingProjectId === project._id
                        ? 'Preparing CAD file...'
                        : 'Download CAD File'}
                    </button>
                  </div>
                ) : (
                  <p>No CAD file uploaded.</p>
                )}

                <p>Status: {project.status || 'Draft'}</p>

                <div className="form-actions">
                  <button
                    className="secondary-button"
                    onClick={() => openEditForm(project)}
                  >
                    Edit Project
                  </button>

                  <button
                    className="primary-button"
                    onClick={() => handleFindManufacturers(project._id)}
                    disabled={matchingProjectId === project._id}
                  >
                    {matchingProjectId === project._id
                      ? 'Finding Matches...'
                      : 'Find Manufacturers'}
                  </button>
                </div>

                {matchErrors[project._id] && (
                  <p className="error-message" role="alert">
                    {matchErrors[project._id]}
                  </p>
                )}

                {matches && (
                  <div className="manufacturer-matches">
                    <h3>Manufacturer Matches</h3>

                    <p>
                      {matches.count} manufacturer(s) evaluated for this project.
                    </p>

                    {matches.matches?.length === 0 ? (
                      <p>No manufacturers found for this project.</p>
                    ) : (
                      matches.matches?.map((manufacturer) => (
                        <div
                          className="manufacturer-match-card"
                          key={manufacturer.manufacturerId}
                        >
                          <div className="manufacturer-card-header">
                            <h4>{manufacturer.companyName}</h4>

                            <strong>
                              {manufacturer.matchScore}% Match
                            </strong>
                          </div>

                          <p>
                            {manufacturer.city
                              ? `${manufacturer.city}, `
                              : ''}
                            {manufacturer.country}
                          </p>

                          <p>
                            Verification: {manufacturer.verificationStatus}
                          </p>

                          <div className="match-score-breakdown">
                            <strong>Match Score Breakdown</strong>

                            {[
                              {
                                label: 'Manufacturing process',
                                score: manufacturer.scoreBreakdown?.manufacturingProcess ?? 0,
                                max: 30,
                              },
                              {
                                label: 'Material compatibility',
                                score: manufacturer.scoreBreakdown?.materialCompatibility ?? 0,
                                max: 25,
                              },
                              {
                                label: 'Product capability',
                                score: manufacturer.scoreBreakdown?.productCapability ?? 0,
                                max: 20,
                              },
                              {
                                label: 'Order quantity',
                                score: manufacturer.scoreBreakdown?.orderQuantity ?? 0,
                                max: 15,
                              },
                              {
                                label: 'Verification status',
                                score: manufacturer.scoreBreakdown?.verificationStatus ?? 0,
                                max: 10,
                              },
                            ].map((item) => (
                              <div className="match-score-item" key={item.label}>
                                <div className="match-score-label">
                                  <span>{item.label}</span>
                                  <span>{item.score}/{item.max}</span>
                                </div>

                                <div className="match-score-track">
                                  <div
                                    className="match-score-fill"
                                    style={{
                                      width: `${(item.score / item.max) * 100}%`,
                                    }}
                                  />
                                </div>
                              </div>
                            ))}
                          </div>

                          {manufacturer.reasons?.length > 0 && (
                            <div>
                              <strong>Compatibility confirmed</strong>
                              <ul>
                                {manufacturer.reasons.map((reason, index) => (
                                  <li key={index}>{reason}</li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {manufacturer.missing?.length > 0 && (
                            <div>
                              <strong>Requirements to review</strong>
                              <ul>
                                {manufacturer.missing.map((item, index) => (
                                  <li key={index}>{item}</li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {manufacturer.contactEmail && (
                            <p>
                              Contact: {manufacturer.contactEmail}
                            </p>
                          )}

                          {manufacturer.website && (
                            <a
                              href={manufacturer.website}
                              target="_blank"
                              rel="noreferrer"
                            >
                              Visit website ↗
                            </a>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

export default Projects;
