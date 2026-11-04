
function Sidebar({ activePage, setActivePage }) {
  const navigation = [
  { label: 'Dashboard', icon: '▦' },
  { label: 'My Projects', icon: '▤' },
  { label: 'Manufacturers', icon: '⌕' },
  { label: 'RFQ Manager', icon: '✉' },
  { label: 'Response Tracking', icon: '◷' },
  { label: 'Admin Dashboard', icon: '⚙' },
]

  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-icon">G</div>
        <div>
          <h2>GMM</h2>
          <span>Manufacturer Matchmaker</span>
        </div>
      </div>

      <div className="sidebar-section">
        <p className="nav-label">WORKSPACE</p>

        <nav className="nav-menu">
          {navigation.map((item) => (
            <button
              key={item.label}
              type="button"
              className={`nav-link ${activePage === item.label ? 'active' : ''}`}
              onClick={() => setActivePage(item.label)}
            >
              <span>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>
      </div>

      <div className="sidebar-bottom">
        <button
          type="button"
          className="nav-link"
          onClick={() => setActivePage('Settings')}
        >
          <span>⚙</span>
          Settings
        </button>

        <div className="profile">
          <div className="avatar">H</div>
          <div>
            <strong>My Workspace</strong>
            <span>Product Founder</span>
          </div>
        </div>
      </div>
    </aside>
  )
}

export default Sidebar
