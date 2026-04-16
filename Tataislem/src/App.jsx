import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import Navbar from './components/Navbar';
import Hero from './sections/Hero';
import Events from './sections/Events';
import Services from './sections/Services';
import About from './sections/About';
import Contact from './sections/Contact';
import Footer from './components/Footer';
import Testimonials from './sections/Testimonials';
import ChatbotWidget from './components/ChatbotWidget';
import Success from './components/Success';
import Cancel from './components/Cancel';
import ProtectedRoute from './components/ProtectedRoute';
import AuthPage from './pages/AuthPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import VerifyEmailPage from './pages/VerifyEmailPage';
import UserDashboard from './pages/UserDashboard';
import AdminDashboard from './pages/AdminDashboard';
import { useAuth } from './hooks/useAuth';

function Home() {
  return (
    <>
      <Navbar />
      <Hero />

      <div className="main-container">
        <div data-aos="fade-up">
          <About />
        </div>

        <div data-aos="slide-up">
          <Events />
        </div>

        <div data-aos="fade-up">
          <Services />
        </div>

        <div data-aos="fade-up" className="no-gap-bottom">
          <Testimonials />
        </div>

        <div data-aos="fade-up">
          <Contact />
        </div>
      </div>

      <div id="container-floating">
        <button id="floating-button" type="button">
          <p className="plus">+</p>
        </button>

        <button
          type="button"
          className="nds nd1"
          onClick={() => {
            const eventSection = document.getElementById('events');
            if (eventSection) eventSection.scrollIntoView({ behavior: 'smooth' });
          }}
        >
          <img
            src="https://img.icons8.com/ios-filled/50/ffffff/calendar.png"
            alt="Event"
          />
        </button>

        <button
          type="button"
          className="nds nd2"
          onClick={() => {
            const contactSection = document.getElementById('contact');
            if (contactSection) contactSection.scrollIntoView({ behavior: 'smooth' });
          }}
        >
          <img
            src="https://img.icons8.com/ios-filled/50/ffffff/contacts.png"
            alt="Contact"
          />
        </button>
      </div>

      <ChatbotWidget />
      <Footer />
    </>
  );
}

function DashboardSwitch() {
  const { user } = useAuth();

  if (user?.role === 'admin') {
    return <AdminDashboard />;
  }

  return <UserDashboard />;
}

function App() {
  return (
    <Router>
      <ToastContainer
        containerId="app-toast"
        position="top-right"
        autoClose={2000}
        hideProgressBar
        newestOnTop
        closeOnClick
        pauseOnHover={false}
        pauseOnFocusLoss={false}
        draggable={false}
        theme="dark"
        closeButton
        limit={3}
        style={{ zIndex: 999999 }}
      />

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/verify-email" element={<VerifyEmailPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardSwitch />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <ProtectedRoute requiredRole="admin">
              <AdminDashboard />
            </ProtectedRoute>
          }
        />
        <Route path="/payment/success" element={<Success />} />
        <Route path="/payment/cancel" element={<Cancel />} />
      </Routes>
    </Router>
  );
}

export default App;
