import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import logo from '../assets/images/logo1.png';
import UserAvatar from './UserAvatar';
import { useAuth } from '../hooks/useAuth';

export default function Navbar() {
  const [activeSection, setActiveSection] = useState('hero');
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const { user } = useAuth();

  const navItems = [
    { id: 'hero', label: 'Home' },
    { id: 'about', label: 'About Us' },
    { id: 'events', label: 'Events' },
    { id: 'services', label: 'Services' },
    { id: 'contact', label: 'Contact' },
  ];

  const toggleMenu = () => setMenuOpen(!menuOpen);
  const closeMenu = () => setMenuOpen(false);

  useEffect(() => {
    const sections = document.querySelectorAll('section');
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActiveSection(entry.target.id);
        });
      },
      { rootMargin: '-80px 0px 0px 0px', threshold: 0.3 },
    );
    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 0);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav className={`custom-navbar ${scrolled ? 'navbar-solid' : 'navbar-transparent'}`}>
      <div className="container">
        <a className="navbar-brand" href="#hero" onClick={closeMenu}>
          <img src={logo} alt="Logo" className="nav-logo" />
        </a>

        <button className={`menu-toggle ${menuOpen ? 'open' : ''}`} onClick={toggleMenu}>
          <span></span>
          <span></span>
          <span></span>
        </button>

        <div className={`menu-shell ${menuOpen ? 'show' : ''}`}>
          <ul className={`menu-bar ${menuOpen ? 'show' : ''}`}>
            {navItems.map((item) => (
              <li
                key={item.id}
                className={activeSection === item.id ? 'active-link' : ''}
              >
                <a href={`#${item.id}`} onClick={closeMenu}>
                  {item.label}
                </a>
              </li>
            ))}
          </ul>

          <div className="nav-auth-actions">
            {user ? (
              <>
                <span className="nav-user-badge nav-user-badge--rich">
                  <UserAvatar src={user.avatarUrl} name={user.fullName} size="xs" />
                  <span>{user.firstName}</span>
                </span>
                <Link
                  to={user.role === 'admin' ? '/admin' : '/dashboard'}
                  className="nav-auth-link primary"
                >
                  {user.role === 'admin' ? 'Admin Dashboard' : 'Dashboard'}
                </Link>
              </>
            ) : (
              <>
                <Link to="/auth?mode=login" className="nav-auth-link">
                  Log In
                </Link>
                <Link to="/auth?mode=register" className="nav-auth-link primary">
                  Create Account
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
