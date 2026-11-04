
import { useState } from 'react'
import './App.css'
import Sidebar from './components/layout/Sidebar'
import Topbar from './components/layout/Topbar'
import Dashboard from './components/dashboard/Dashboard'
import Projects from './pages/Projects'
import Manufacturers from './pages/Manufacturers';
import AdminDashboard from './pages/AdminDashboard';
import AdminLogin from './pages/AdminLogin';

function App() {
  const [activePage, setActivePage] = useState('Dashboard')

  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(
      Boolean(localStorage.getItem('adminToken'))
  );

  return (
    <div className="app-shell">
      <Sidebar
        activePage={activePage}
        setActivePage={setActivePage}
      />

      <main className="main-area">
        <Topbar title={activePage} />

        {activePage === 'Dashboard' && <Dashboard />}
        {activePage === 'My Projects' && <Projects />}
        {activePage === 'Manufacturers' && <Manufacturers />}
        {activePage === 'Admin Dashboard' && (
          isAdminLoggedIn ? (
            <AdminDashboard />
          ) : (
            <AdminLogin onLoginSuccess={() => setIsAdminLoggedIn(true)} />
          )
        )}

      </main>
    </div>
  )
}

export default App
