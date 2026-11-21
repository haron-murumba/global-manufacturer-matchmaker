
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  getMyProjects,
  getCustomerProfile,
  getManufacturers,
  getManufacturerMatches,
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
  Dashboard: "/dashboard",
  "My Projects": "/projects",
  Manufacturers: "/manufacturers",
  "RFQ Manager": "/customer/rfq",
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
  const router = useRouter();
  const [projects, setProjects] = useState([]);
  const [customer, setCustomer] = useState(null);
  const [manufacturers, setManufacturers] = useState([]);
  const [matches, setMatches] = useState([]);
  const [incompatibleMatches, setIncompatibleMatches] = useState([]);
  const [locationExcluded, setLocationExcluded] = useState([]);
  const [locationPreference, setLocationPreference] = useState(null);
  const [technicallyCompatibleCount, setTechnicallyCompatibleCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [matchError, setMatchError] = useState("");

  useEffect(() => {
  async function loadDashboard() {
    const token = localStorage.getItem("customerToken");

    if (!token) {
      router.push("/login");
      return;
    }

    try {
      setLoading(true);
      setError("");
      setMatchError("");

      const [profileResult, projectsResult, manufacturersResult] =
        await Promise.all([
          getCustomerProfile(token),
          getMyProjects(token),
          getManufacturers(),
        ]);

      setCustomer(profileResult.customer);

      const projectRecords = projectsResult.projects || [];
      const manufacturerRecords =
        manufacturersResult.manufacturers || [];

      setProjects(projectRecords);
      setManufacturers(manufacturerRecords);

      const confirmedProject =
        projectRecords.find(
          (project) =>
            project.specificationStatus === "Confirmed" &&
            (project.preferredCountry?.trim() ||
              project.preferredRegion?.trim())
        ) ||
        projectRecords.find(
          (project) => project.specificationStatus === "Confirmed"
        );

      if (confirmedProject) {
        try {
          const matchingResult = await getManufacturerMatches(
            confirmedProject._id,
            token
          );

          setMatches(matchingResult.matches || []);
          setIncompatibleMatches(matchingResult.incompatible || []);
          setLocationExcluded(matchingResult.locationExcluded || []);
          setLocationPreference(matchingResult.locationPreference || null);
          setTechnicallyCompatibleCount(
            matchingResult.technicallyCompatibleCount ??
            (matchingResult.matches || []).length
          );
        } catch (matchErr) {
          setMatchError(matchErr.message);
        }
      } else {
        setMatches([]);
        setIncompatibleMatches([]);
        setLocationExcluded([]);
        setLocationPreference(null);
        setTechnicallyCompatibleCount(0);
      }
    } catch (err) {
      setError(err.message || "Unable to load dashboard data.");

      if (
        err.message?.toLowerCase().includes("authentication") ||
        err.message?.toLowerCase().includes("token") ||
        err.message?.toLowerCase().includes("unauthorized")
      ) {
        localStorage.removeItem("customerToken");
        router.push("/login");
      }
    } finally {
      setLoading(false);
    }
  }

  loadDashboard();
}, [router]);

  const latestProject = projects[0];
  const matchingProject =
    projects.find(
      (project) =>
        project.specificationStatus === "Confirmed" &&
        (project.preferredCountry?.trim() ||
          project.preferredRegion?.trim())
    ) ||
    projects.find(
      (project) => project.specificationStatus === "Confirmed"
    );

  const verifiedManufacturers = manufacturers.filter(
    (manufacturer) => manufacturer.verificationStatus === "Verified"
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
  label: "Projects In Progress",
  value: loading
    ? "—"
    : projects.filter(
        (project) => project.status !== "Completed"
      ).length,
  detail: "Projects not yet completed",
  icon: "◷",
  href: "/projects",
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
            <div className="avatar">
              {customer?.fullName
                ? customer.fullName
                    .split(" ")
                    .map((part) => part[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase()
                : "CU"}
            </div>

            <div className="user-details">
              <strong>{customer?.fullName || "Customer"}</strong>
              <span>Customer Account</span>
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
                    <strong>{customer?.fullName || "Customer"}</strong>
                    <span>{customer?.email || ""}</span>
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
                      router.push("/settings");
                    }}
                  >
                    <span>⚙</span> Settings
                    <small>Coming soon</small>
                  </button>

                  <div className="dropdown-divider" />

                  <button
                    className="logout-option"
                    onClick={() => {
                      localStorage.removeItem("customerToken");
                      router.push("/login");
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

          <section className="partner-invite">
            <div className="partner-invite-content">
              <span className="partner-invite-kicker">
                GMM MANUFACTURING NETWORK
              </span>
              <h2>Become a Manufacturing Partner</h2>
              <p>
                Does your company manufacture products for other businesses?
                Apply to join the GMM verified supplier network and connect
                with businesses seeking manufacturing expertise.
              </p>

              <div className="partner-invite-steps">
                <div className="partner-invite-step">
                  <span>01</span>
                  <div>
                    <strong>Submit your company profile</strong>
                    <small>Share your processes, materials and capabilities.</small>
                  </div>
                </div>
                <div className="partner-invite-step">
                  <span>02</span>
                  <div>
                    <strong>Complete verification</strong>
                    <small>GMM reviews your application and supporting evidence.</small>
                  </div>
                </div>
                <div className="partner-invite-step">
                  <span>03</span>
                  <div>
                    <strong>Activate supplier access</strong>
                    <small>Approved manufacturers receive account activation instructions.</small>
                  </div>
                </div>
              </div>
            </div>

            <div className="partner-invite-action">
              <div className="partner-invite-icon">◈</div>
              <strong>A separate manufacturer account</strong>
              <p>
                Your customer workspace remains unchanged. Supplier access
                requires a separate application and approval.
              </p>
              <Link href="/manufacturers" className="partner-invite-button">
                Apply as a Manufacturing Partner →
              </Link>
              <small>Applications are reviewed before supplier access is granted.</small>
            </div>
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

              {!loading && matchingProject && (
                <>
                  <div className="location-match-summary">
                    <h4>Geographic preference</h4>

                    <p>
                      <strong>Preferred location:</strong>{" "}
                      {locationPreference?.preferredCountry ||
                        locationPreference?.preferredRegion ||
                        "No geographic restriction"}
                    </p>

                    {locationPreference?.active ? (
                      <>
                        <p>
                          <strong>Technically compatible:</strong>{" "}
                          {technicallyCompatibleCount}
                        </p>
                        <p>
                          <strong>Matches within preferred location:</strong>{" "}
                          {matches.length}
                        </p>
                        <p>
                          <strong>Excluded by location:</strong>{" "}
                          {locationExcluded.length}
                        </p>
                        <small>
                          Geographic preferences filter technically compatible
                          manufacturers; they do not change the manufacturing
                          suitability score.
                        </small>
                      </>
                    ) : (
                      <p>
                        All technically compatible manufacturers are considered
                        regardless of location.
                      </p>
                    )}
                  </div>

                  {matches.length > 0 ? (
                    <>
                      <div className="match-score">
                        <div className="score-number">
                          {bestMatch ? bestMatch.matchScore : 0}
                          <span>%</span>
                        </div>

                        <div>
                          <strong>Best compatible match</strong>
                          <p>{matchingProject.productName}</p>
                        </div>
                      </div>

                      <div className="progress-track">
                        <div
                          className="progress-fill"
                          style={{
                            width: `${bestMatch ? bestMatch.matchScore : 0}%`,
                          }}
                        />
                      </div>

                      {matches.slice(0, 3).map((match) => (
                        <div
                          className="match-details"
                          key={match.manufacturerId}
                        >
                          <span>{match.companyName}</span>
                          <strong>{match.matchScore}% match</strong>
                        </div>
                      ))}
                    </>
                  ) : (
                    <div className="matching-empty-state">
                      {technicallyCompatibleCount > 0 && locationPreference?.active ? (
                        <>
                          <strong>
                            No technically compatible manufacturers match your preferred location
                          </strong>
                          <p>
                            {technicallyCompatibleCount} technically compatible
                            manufacturer(s) were found, but none are located in
                            your preferred manufacturing location:
                            {` ${locationPreference.preferredCountry || locationPreference.preferredRegion}`}.
                          </p>
                          <p>
                            Review your geographic preference to consider
                            manufacturers in other locations.
                          </p>
                        </>
                      ) : (
                        <>
                          <strong>No compatible manufacturers found</strong>
                          <p>
                            No verified manufacturer currently supports both
                            {` ${matchingProject.material || "the required material"}`}
                            {` and ${matchingProject.process || "the required manufacturing process"}`}.
                          </p>
                          <p>
                            A suitable manufacturer must be registered and verified
                            before GMM can recommend them for this project.
                          </p>
                        </>
                      )}
                    </div>
                  )}


                  {matches.slice(0, 3).map((match) => (
                    <details
                      className="match-diagnostic"
                      key={match.manufacturerId}
                    >
                      <summary>
                        {match.companyName} — {match.matchScore}% details
                      </summary>

                      <p>
                        <strong>Location:</strong>{" "}
                        {[match.city, match.country].filter(Boolean).join(", ") || "Not specified"}
                      </p>
                      <p>
                        <strong>Verification:</strong>{" "}
                        {match.verificationStatus || "Unknown"}
                      </p>
                      <p>
                        <strong>Manufacturing processes:</strong>{" "}
                        {(match.manufacturingProcesses || []).join(", ") || "Not specified"}
                      </p>
                      <p>
                        <strong>Materials:</strong>{" "}
                        {(match.materials || []).join(", ") || "Not specified"}
                      </p>
                      <p>
                        <strong>Product categories:</strong>{" "}
                        {(match.productCategories || []).join(", ") || "Not specified"}
                      </p>
                      <p>
                        <strong>Additional capabilities:</strong>{" "}
                        {(match.capabilities || []).join(", ") || "Not specified"}
                      </p>
                      <p>
                        <strong>Minimum order quantity:</strong>{" "}
                        {match.minimumOrderQuantity ?? "Unknown"}
                      </p>
                      <p>
                        <strong>Small-order responsiveness:</strong>{" "}
                        {match.smallOrderResponsiveness || "Unknown"}
                      </p>

                      <strong>Score breakdown</strong>
                      <ul>
                        {Object.entries(match.scoreBreakdown || {}).map(
                          ([criterion, points]) => (
                            <li key={criterion}>
                              {criterion.replace(/([A-Z])/g, " $1")}: {points} points
                            </li>
                          )
                        )}
                      </ul>

                      <strong>Reasons for matching</strong>
                      <ul>
                        {(match.reasons || []).map((reason, index) => (
                          <li key={index}>{reason}</li>
                        ))}
                      </ul>

                      {match.missing?.length > 0 && (
                        <>
                          <strong>Remaining gaps</strong>
                          <ul>
                            {match.missing.map((item, index) => (
                              <li key={index}>{item}</li>
                            ))}
                          </ul>
                        </>
                      )}
                    </details>
                  ))}

                  {locationExcluded.length > 0 && (
                    <div className="incompatible-diagnostics">
                      <h4>Technically compatible — outside preferred location</h4>
                      <p>
                        These manufacturers meet the required manufacturing
                        process and material criteria, but were excluded by
                        your geographic preference.
                      </p>

                      {locationExcluded.map((match) => (
                        <details
                          className="match-diagnostic"
                          key={match.manufacturerId}
                        >
                          <summary>{match.companyName}</summary>
                          <p>
                            <strong>Location:</strong>{" "}
                            {[match.city, match.country]
                              .filter(Boolean)
                              .join(", ") || "Not specified"}
                          </p>
                          <p>
                            <strong>Reason:</strong>{" "}
                            {match.locationExclusionReason ||
                              "Outside the preferred location"}
                          </p>
                          <p>
                            <strong>Technical suitability:</strong>{" "}
                            {match.matchScore}% match
                          </p>
                        </details>
                      ))}
                    </div>
                  )}

                  {incompatibleMatches.length > 0 && (
                    <div className="incompatible-diagnostics">
                      <h4>Other verified manufacturers — not recommended</h4>
                      <p>
                        These manufacturers were assessed but failed at least
                        one mandatory material or manufacturing-process requirement.
                      </p>

                      {incompatibleMatches.map((match) => (
                        <details
                          className="match-diagnostic"
                          key={match.manufacturerId}
                        >
                          <summary>
                            {match.companyName} — Not eligible
                          </summary>

                          <p>
                            <strong>Location:</strong>{" "}
                            {[match.city, match.country].filter(Boolean).join(", ") || "Not specified"}
                          </p>
                          <p>
                            <strong>Manufacturing processes:</strong>{" "}
                            {(match.manufacturingProcesses || []).join(", ") || "Not specified"}
                          </p>
                          <p>
                            <strong>Materials:</strong>{" "}
                            {(match.materials || []).join(", ") || "Not specified"}
                          </p>
                          <p>
                            <strong>Minimum order quantity:</strong>{" "}
                            {match.minimumOrderQuantity ?? "Unknown"}
                          </p>

                          <strong>Why this manufacturer was excluded</strong>
                          <ul>
                            {(match.missing || []).map((reason, index) => (
                              <li key={index}>{reason}</li>
                            ))}
                          </ul>
                        </details>
                      ))}
                    </div>
                  )}

                  {matchError && <p>{matchError}</p>}
                </>
              )}

              {!loading && !projects.length && (
                <p>
                  Create a project and confirm its specifications to see manufacturer matches.
                </p>
              )}

              {!loading && projects.length > 0 && !matchingProject && (
                <p>
                  Your project specifications need review and confirmation before manufacturer matching can begin.
                  {" "}
                  <Link href="/projects" className="text-button">
                    Review your projects →
                  </Link>
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
                href="/customer/rfq"
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
