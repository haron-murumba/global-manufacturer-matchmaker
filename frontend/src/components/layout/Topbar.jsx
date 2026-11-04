
function Topbar({ title = 'Dashboard' }) {
  return (
    <header className="topbar">
      <div>
        <p className="breadcrumb">Workspace / Overview</p>
        <h1>{title}</h1>
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
