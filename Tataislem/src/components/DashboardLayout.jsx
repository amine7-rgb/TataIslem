import { Link } from 'react-router-dom';
import { FiArrowUpRight, FiCheckCircle, FiLogOut } from 'react-icons/fi';
import UserAvatar from './UserAvatar';

export default function DashboardLayout({
  eyebrow,
  title,
  description,
  user,
  navItems,
  activeSection,
  onSectionChange,
  onLogout,
  children,
}) {
  return (
    <div className="dashboard-shell dashboard-shell--premium">
      <aside className="dashboard-sidebar">
        <div className="dashboard-sidebar-brand">
          <span className="dashboard-sidebar-kicker">Tata Islem</span>
          <h2>{user?.role === 'admin' ? 'Admin Space' : 'Client Portal'}</h2>
          <p>
            {user?.role === 'admin'
              ? 'Monitor the platform and keep the brand operations in one place.'
              : 'Access your appointments, account details, and testimonial settings from one secure space.'}
          </p>
        </div>

        <nav className="dashboard-sidebar-nav">
          {navItems.map((item) => {
            const Icon = item.icon;

            return (
              <button
                key={item.id}
                type="button"
                className={`dashboard-nav-item ${
                  activeSection === item.id ? 'is-active' : ''
                }`}
                onClick={() => onSectionChange(item.id)}
              >
                <Icon />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="dashboard-sidebar-footer">
          <Link
            to="/"
            className="dashboard-secondary-button dashboard-secondary-button--full"
          >
            <FiArrowUpRight />
            <span>Back To Website</span>
          </Link>
        </div>
      </aside>

      <div className="dashboard-content-shell">
        <header className="dashboard-topbar">
          <div>
            <p className="auth-eyebrow">{eyebrow}</p>
            <h1>{title}</h1>
            <p>{description}</p>
          </div>

          <div className="dashboard-topbar-actions">
            <button
              type="button"
              className="dashboard-user-pill"
              onClick={() => onSectionChange('profile')}
            >
              <UserAvatar src={user?.avatarUrl} name={user?.fullName} size="sm" />
              <span className="dashboard-user-pill__copy">
                <strong>{user?.fullName}</strong>
                {user?.role === 'admin' ? (
                  <small>Administrator</small>
                ) : (
                  <small
                    className={`dashboard-user-pill__status ${
                      user?.emailVerified ? 'is-verified' : 'is-pending'
                    }`}
                  >
                    <FiCheckCircle />
                    <span>
                      {user?.emailVerified ? 'Verified account' : 'Verification pending'}
                    </span>
                  </small>
                )}
              </span>
            </button>

            <button
              type="button"
              className="dashboard-secondary-button dashboard-topbar-signout"
              onClick={onLogout}
            >
              <FiLogOut />
              <span>Sign out</span>
            </button>
          </div>
        </header>

        <div className="dashboard-content">{children}</div>
      </div>
    </div>
  );
}
