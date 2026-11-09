
function Topbar({ title = 'Dashboard', onMenuClick }) {
  return (
    <header className="topbar">
      <div className="topbar-heading">
        <button
          type="button"
          className="mobile-menu-button"
          onClick={onMenuClick}
          aria-label="Open navigation menu"
        >
          ☰
        </button>

        <div>
          <p className="breadcrumb">Workspace / Overview</p>
          <h1>{title}</h1>
        </div>
      </div>

      <div className="topbar-actions">
        <button className="icon-button" aria-label="Notifications">
          ♧
        </button>
        <div className="topbar-avatar">H</div>
      </div>
    </header>
  )
}

export default Topbar
