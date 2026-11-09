
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  getProjects,
  getManufacturers,
  getManufacturerMatches,
  getRFQs,
} from "@/lib/api";

const navigation = [
  {
    section: "WORKSPACE",
    items: [
      "Dashboard",
      "My Projects",
      "Manufacturers",
      "RFQ Manager",
      "Response Tracking",
    ],
  },
  {
    section: "MANAGEMENT",
    items: ["Admin Dashboard", "Settings"],
  },
];

const icons = ["▦", "▤", "◈", "↗", "◷", "♙", "⚙"];

const routes = {
  Dashboard: "/",
  "My Projects": "/projects",
  Manufacturers: "/manufacturers",
  "RFQ Manager": "/rfq",
  "Response Tracking": "/response-tracking",
  "Admin Dashboard": "/admin",
  Settings: "/",
  "Help Center": "/",
};

function formatQuantity(quantity) {
  return `${Number(quantity || 0).toLocaleString()} units`;
}

function formatDate(date) {
  if (!date) return "Date unavailable";

  return new Date(date).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function Home() {
  const [active, setActive] = useState("Dashboard");
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [showProfile, setShowProfile] = useState(false);

  const [projects, setProjects] = useState([]);
  const [manufacturers, setManufacturers] = useState([]);
  const [matches, setMatches] = useState([]);
  const [rfqs, setRfqs] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [matchError, setMatchError] = useState("");

  useEffect(() => {
    async function loadDashboard() {
      try {
        setLoading(true);
        setError("");

        const [projectsResult, manufacturersResult, rfqResult] =
          await Promise.all([
            getProjects(),
            getManufacturers(),
            getRFQs(),
          ]);

        const projectRecords = projectsResult.projects || [];
        const manufacturerRecords =
          manufacturersResult.manufacturers || [];

        setProjects(projectRecords);
        setManufacturers(manufacturerRecords);
        setRfqs(rfqResult.rfqs || []);

        if (projectRecords.length > 0) {
          try {
            const matchingResult = await getManufacturerMatches(
              projectRecords[0]._id
            );

            setMatches(matchingResult.matches || []);
          } catch (matchErr) {
            setMatchError(matchErr.message);
          }
        }
      } catch (err) {
        setError(err.message || "Unable to load dashboard data.");
      } finally {
        setLoading(false);
      }
    }

    loadDashboard();
  }, []);

  const latestProject = projects[0];

  const verifiedManufacturers = manufacturers.filter(
    (manufacturer) => manufacturer.verificationStatus === "Verified"
  );

  const pendingRFQs = rfqs.filter(
    (rfq) => rfq.status === "Sent"
  );

  const bestMatch = matches.reduce(
    (best, current) =>
      !best || current.matchScore > best.matchScore
        ? current
        : best,
    null
  );

  const stats = [
  {
    label: "Total Projects",
    value: loading ? "—" : projects.length,
    detail: "Projects in your database",
    icon: "▦",
    href: "/projects",
  },
  {
    label: "Verified Manufacturers",
    value: loading ? "—" : verifiedManufacturers.length,
    detail: "Approved suppliers",
    icon: "◈",
    href: "/manufacturers",
  },
  {
    label: "Latest Project Matches",
    value: loading ? "—" : matches.length,
    detail: "Manufacturers matched",
    icon: "✓",
    href: "/projects",
  },
  {
    label: "Pending RFQs",
    value: loading ? "—" : pendingRFQs.length,
    detail: "RFQs awaiting supplier responses",
    icon: "↗",
    href: "/rfq",
  },
];

  return (
    <div className="gmm-layout">
      <aside className={`sidebar ${menuOpen ? "sidebar-open" : ""}`}>
        <div className="brand">
          <div className="brand-logo">G</div>
          <div>
            <h2>GMM</h2>
            <span>MANUFACTURER MATCHMAKER</span>
          </div>
        </div>

        <div className="workspace-label">WORKSPACE</div>

        <div className="workspace-switch">
          <span className="workspace-icon">G</span>
          <span>Global Manufacturing</span>
          <span className="switch-arrow">⌄</span>
        </div>

        <nav className="navigation">
          {navigation.map((group, groupIndex) => (
            <div key={group.section}>
              <p className="nav-section">{group.section}</p>

              {group.items.map((item, index) => {
                const iconIndex =
                  navigation
                    .slice(0, groupIndex)
                    .reduce(
                      (total, current) =>
                        total + current.items.length,
                      0
                    ) + index;

                return (
                  <Link
                    key={item}
                    href={routes[item]}
                    className={`nav-item ${
                      active === item ? "active" : ""
                    }`}
                    onClick={() => {
                      setActive(item);
                      setMenuOpen(false);
                    }}
                  >
                    <span className="nav-icon">
                      {icons[iconIndex]}
                    </span>
                    {item}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="help-card">
            <div className="help-icon">?</div>
            <strong>Need assistance?</strong>
            <p>Get help with your manufacturing journey.</p>
            <button onClick={() => setActive("Help Center")}>
              Visit Help Center ↗
            </button>
          </div>

          <div className="user-profile">
            <div className="avatar">HM</div>
            <div className="user-details">
              <strong>Project Administrator</strong>
              <span>Administrator</span>
            </div>

            <div className="profile-menu-wrapper">
          <button
            className="profile-menu"
            aria-label="Open account menu"
            aria-expanded={profileMenuOpen}
            onClick={() => setProfileMenuOpen(!profileMenuOpen)}
          >
            •••
          </button>

          {profileMenuOpen && (
            <div className="profile-dropdown">
              <div className="dropdown-heading">
                <strong>Project Administrator</strong>
                <span>Administrator account</span>
              </div>

              <button
                onClick={() => {
                  setShowProfile(!showProfile);
                  setProfileMenuOpen(false);
                }}
              >
                <span>♙</span> My Profile
              </button>

              <button
                onClick={() => {
                  setProfileMenuOpen(false);
                  window.location.href = "/settings";
                }}
              >
                <span>⚙</span> Settings
                <small>Coming soon</small>
              </button>

              <div className="dropdown-divider" />

              <button
                className="logout-option"
                onClick={() => {
                  localStorage.removeItem("adminToken");
                  window.location.href = "/admin";
                }}
              >
                <span>↪</span> Logout
              </button>
            </div>
          )}
        </div>

          </div>
        </div>
      </aside>

      {menuOpen && (
        <button
          className="mobile-overlay"
          aria-label="Close navigation"
          onClick={() => setMenuOpen(false)}
        />
      )}

      <main className="main-content">
        <header className="topbar">
          <div className="topbar-left">
            <button
              className="mobile-menu"
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label="Toggle navigation"
            >
              ☰
            </button>

            <div className="breadcrumb">
              Workspace <span>/</span> <strong>{active}</strong>
            </div>
          </div>

          <div className="topbar-right">
            <span className="system-status">
              <i /> System operational
            </span>
            <button
              className="notification-button"
              aria-label="Notifications"
            >
              ♧
              <span />
            </button>
            <div className="top-avatar">HM</div>
          </div>
        </header>

        <div className="page-container">
          <section className="welcome-section">
            <div>
              <p className="eyebrow">
                GLOBAL MANUFACTURER MATCHMAKER
              </p>

              <h1>
                {active === "Dashboard"
                  ? "Welcome to GMM"
                  : active}
              </h1>

              <p className="welcome-description">
                Your manufacturing sourcing operations, all in one place.
              </p>
            </div>

            <Link
              href="/projects/new"
              className="primary-button"
            >
              <span>＋</span> Create New Project
            </Link>
          </section>

          {error && (
            <div className="panel">
              <strong>Dashboard data could not be loaded.</strong>
              <p>{error}</p>
              <p>Check your API connection and try refreshing the page.</p>
            </div>
          )}

          <section className="stats-grid">
            {stats.map((stat) => (
              <Link
                href={stat.href}
                className="stat-card stat-card-link"
                key={stat.label}
              >
                <div className="stat-top">
                  <span>{stat.label}</span>
                  <span className="stat-icon">{stat.icon}</span>
                </div>

                <h2>{stat.value}</h2>
                <p>{stat.detail}</p>

                <span className="stat-arrow">→</span>
              </Link>
            ))}
          </section>

          <section className="dashboard-grid">
            <article className="panel projects-panel">
              <div className="panel-heading">
                <div>
                  <h3>Recent Projects</h3>
                  <p>
                    Latest projects retrieved from your database.
                  </p>
                </div>

                <Link
                  href="/projects"
                  className="text-button"
                >
                  View all →
                </Link>
              </div>

              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>PROJECT</th>
                      <th>PROCESS</th>
                      <th>QUANTITY</th>
                      <th>STATUS</th>
                    </tr>
                  </thead>

                  <tbody>
                    {!loading && projects.length === 0 && (
                      <tr>
                        <td colSpan="4">No projects found.</td>
                      </tr>
                    )}

                    {projects.slice(0, 5).map((project) => (
                      <tr key={project._id}>
                        <td>
                          <strong>{project.productName}</strong>
                          <span className="table-subtitle">
                            {project.material ||
                              "Material not specified"}
                          </span>
                        </td>

                        <td>{project.process || "Not specified"}</td>

                        <td>{formatQuantity(project.quantity)}</td>

                        <td>
                          <span
                            className={`status status-${(
                              project.status || "draft"
                            )
                              .toLowerCase()
                              .replaceAll(" ", "-")}`}
                          >
                            {project.status || "Draft"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </article>

            <article className="panel matching-panel">
              <div className="panel-heading">
                <div>
                  <h3>Matching Overview</h3>
                  <p>
                    Live manufacturer compatibility results
                  </p>
                </div>
                <span className="overview-icon">◈</span>
              </div>

              {!loading && latestProject && (
                <>
                  <div className="match-score">
                    <div className="score-number">
                      {bestMatch ? bestMatch.matchScore : 0}
                      <span>%</span>
                    </div>

                    <div>
                      <strong>Best project match</strong>
                      <p>{latestProject.productName}</p>
                    </div>
                  </div>

                  <div className="progress-track">
                    <div
                      className="progress-fill"
                      style={{
                        width: `${
                          bestMatch ? bestMatch.matchScore : 0
                        }%`,
                      }}
                    />
                  </div>

                  {matches.length === 0 && (
                    <p>
                      No matching manufacturers found for this project.
                    </p>
                  )}

                  {matches.slice(0, 3).map((match) => (
                    <div
                      className="match-details"
                      key={match.manufacturerId}
                    >
                      <span>{match.companyName}</span>
                      <strong>{match.matchScore}% match</strong>
                    </div>
                  ))}

                  {matchError && <p>{matchError}</p>}
                </>
              )}

              {!loading && !latestProject && (
                <p>
                  Create a project to see manufacturer matches.
                </p>
              )}

              {loading && <p>Loading matching results...</p>}

              <Link
                href="/manufacturers"
                className="outline-button"
              >
                Explore manufacturers →
              </Link>
            </article>
          </section>

          <section className="bottom-grid">
            
            <article className="panel activity-panel">
              <div className="panel-heading">
                <div>
                  <h3>Workspace Summary</h3>
                  <p>Explore your live sourcing activities.</p>
                </div>
              </div>

              <Link
                href="/manufacturers"
                className="activity-item activity-link"
              >
                <div className="activity-dot green">✓</div>
                <div className="activity-content">
                  <strong>Verified manufacturers</strong>
                  <p>{manufacturers.length} approved suppliers available</p>
                </div>
                <span className="activity-arrow">→</span>
              </Link>

              <Link
                href="/projects"
                className="activity-item activity-link"
              >
                <div className="activity-dot blue">▤</div>
                <div className="activity-content">
                  <strong>Latest project</strong>
                  <p>
                    {latestProject
                      ? latestProject.productName
                      : "No projects available"}
                  </p>
                  {latestProject && (
                    <span className="activity-date">
                      {formatDate(latestProject.createdAt)}
                    </span>
                  )}
                </div>
                <span className="activity-arrow">→</span>
              </Link>

              <Link
                href="/manufacturers"
                className="activity-item activity-link"
              >
                <div className="activity-dot purple">◈</div>
                <div className="activity-content">
                  <strong>Latest matching results</strong>
                  <p>
                    {matches.length} manufacturers returned by matching API
                  </p>
                </div>
                <span className="activity-arrow">→</span>
              </Link>
            </article>


            <article className="panel quick-panel">
              <h3>Quick Actions</h3>
              <p>Move your sourcing process forward.</p>

              <Link
                href="/projects/new"
                className="quick-action-link"
              >
                ＋ <span>Create a project</span> →
              </Link>

              <Link
                href="/manufacturers"
                className="quick-action-link"
              >
                ◈ <span>Find manufacturers</span> →
              </Link>

              <Link
                href="/rfq"
                className="quick-action-link"
              >
                ↗ <span>Manage RFQs</span> →
              </Link>
            </article>
          </section>

          <footer className="footer">
            <span>© 2026 Global Manufacturer Matchmaker</span>
            <span>
              Connecting products to the right manufacturers.
            </span>
          </footer>
        </div>
      </main>
    </div>
  );
}
