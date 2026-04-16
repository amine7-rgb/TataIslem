import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { FiEye, FiEyeOff, FiHome } from 'react-icons/fi';
import PhoneInput from 'react-phone-input-2';
import 'react-phone-input-2/lib/style.css';
import logo from '../assets/images/logo.jpeg';
import authMainImage from '../assets/images/islemabout.jpg';
import { useAuth } from '../hooks/useAuth';
import { errorToast, successToast } from '../utils/toast';

const initialRegisterForm = {
  firstName: '',
  lastName: '',
  email: '',
  password: '',
  phoneNumber: '',
};

const initialLoginForm = {
  email: '',
  password: '',
};

const initialForgotForm = {
  email: '',
};

const AUTH_MODES = new Set(['login', 'register', 'forgot']);

const authContent = {
  login: {
    eyebrow: 'Verified access',
    title: 'Client Access',
    description: 'Sign in to continue securely.',
    panelDescription: 'Use your verified email to continue.',
    note: 'Your bookings and private access stay protected.',
  },
  register: {
    eyebrow: 'Verified profile',
    title: 'Create Profile',
    description: 'Open your account and book with confidence.',
    panelDescription: 'Complete your details to activate secure booking.',
    note: 'Email activation keeps every reservation flow clean and secure.',
  },
  forgot: {
    eyebrow: 'Account recovery',
    title: 'Reset Access',
    description: 'Request a secure link and recover your account quickly.',
    panelDescription: 'Use the email linked to your account.',
    note: 'Only the verified account owner can restore access.',
  },
};

const normalizePhoneNumber = (value) => {
  if (!value) {
    return '';
  }

  return value.startsWith('+') ? value : `+${value}`;
};

const resolveMode = (searchParams) => {
  const mode = searchParams.get('mode');
  return AUTH_MODES.has(mode) ? mode : 'login';
};

const getDefaultDestination = (authenticatedUser) =>
  authenticatedUser?.role === 'admin' ? '/admin' : '/dashboard';

const resolveDestination = (returnTo, authenticatedUser) => {
  if (returnTo && returnTo.startsWith('/')) {
    return returnTo;
  }

  return getDefaultDestination(authenticatedUser);
};

export default function AuthPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, login, register, resendVerification, forgotPassword, isLoading } =
    useAuth();

  const [mode, setMode] = useState(resolveMode(searchParams));
  const [loginForm, setLoginForm] = useState(initialLoginForm);
  const [registerForm, setRegisterForm] = useState(initialRegisterForm);
  const [forgotForm, setForgotForm] = useState(initialForgotForm);
  const [submitting, setSubmitting] = useState('');
  const [pendingVerificationEmail, setPendingVerificationEmail] = useState('');
  const [forgotSuccessMessage, setForgotSuccessMessage] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);

  const returnTo = searchParams.get('returnTo') || location.state?.from || '';
  const content = authContent[mode];

  useEffect(() => {
    setMode(resolveMode(searchParams));
  }, [searchParams]);

  useEffect(() => {
    if (!isLoading && user) {
      navigate(resolveDestination(returnTo, user), { replace: true });
    }
  }, [user, isLoading, navigate, returnTo]);

  const updateMode = (nextMode) => {
    setMode(nextMode);
    setForgotSuccessMessage('');
    setSearchParams((current) => {
      const params = new URLSearchParams(current);
      params.set('mode', nextMode);
      return params;
    });
  };

  const handleLoginSubmit = async (event) => {
    event.preventDefault();
    setSubmitting('login');

    try {
      const data = await login(loginForm);
      successToast('Welcome back');
      navigate(resolveDestination(returnTo, data.user), { replace: true });
    } catch (error) {
      if (error?.data?.requiresVerification) {
        setPendingVerificationEmail(loginForm.email);
      }

      errorToast(error.message);
    } finally {
      setSubmitting('');
    }
  };

  const handleRegisterSubmit = async (event) => {
    event.preventDefault();
    setSubmitting('register');

    try {
      await register({
        ...registerForm,
        phoneNumber: normalizePhoneNumber(registerForm.phoneNumber),
      });
      setPendingVerificationEmail(registerForm.email);
      setLoginForm((current) => ({ ...current, email: registerForm.email }));
      successToast('Account created. Check your inbox to verify your email.');
      setRegisterForm(initialRegisterForm);
      updateMode('login');
    } catch (error) {
      const errors = error?.data?.errors;
      errorToast(Array.isArray(errors) ? errors[0] : error.message);
    } finally {
      setSubmitting('');
    }
  };

  const handleForgotPasswordSubmit = async (event) => {
    event.preventDefault();
    setSubmitting('forgot');

    try {
      const data = await forgotPassword(forgotForm.email);
      setForgotSuccessMessage(
        data.message ||
          'If an account matches this email, a password reset link has been sent.',
      );
      setLoginForm((current) => ({ ...current, email: forgotForm.email }));
      successToast('If the account exists, the reset link is on its way.');
    } catch (error) {
      errorToast(error.message);
    } finally {
      setSubmitting('');
    }
  };

  const handleResendVerification = async () => {
    const email = pendingVerificationEmail || loginForm.email || registerForm.email;

    if (!email) {
      errorToast('Enter your email first');
      return;
    }

    try {
      await resendVerification(email);
      successToast('Verification email sent again');
    } catch (error) {
      errorToast(error.message);
    }
  };

  return (
    <div className="auth-shell auth-shell--premium">
      <div className="auth-backdrop"></div>
      <div className="auth-orb auth-orb-left"></div>
      <div className="auth-orb auth-orb-right"></div>

      <div className="auth-card auth-card--enhanced">
        <div className="auth-copy auth-copy--compact">
          <div className="auth-copy-background">
            <img src={authMainImage} alt="Islem Tounsi" />
          </div>
          <div className="auth-copy-overlay"></div>

          <div className="auth-copy-content">
            <div className="auth-brand-bar">
              <Link to="/" className="auth-logo-chip" aria-label="Tata Islem website">
                <img src={logo} alt="Tata Islem" className="auth-logo-chip-image" />
              </Link>
              <Link
                to="/"
                className="auth-home-icon-link auth-home-icon-link--pill"
                aria-label="Back to website"
              >
                <FiHome />
                <span>Website</span>
              </Link>
            </div>

            <div className="auth-copy-main">
              <span className="auth-copy-kicker">{content.eyebrow}</span>
              <h1 className="auth-copy-title-inline">{content.title}</h1>
              <p>{content.description}</p>
              <small className="auth-copy-note">{content.note}</small>
            </div>
          </div>
        </div>

        <div className="auth-form-panel auth-form-panel--premium">
          {mode === 'forgot' ? (
            <button
              type="button"
              className="auth-return-pill"
              onClick={() => updateMode('login')}
            >
              Back to login
            </button>
          ) : (
            <div className="auth-tabs">
              <button
                type="button"
                className={mode === 'login' ? 'active' : ''}
                onClick={() => updateMode('login')}
              >
                Log In
              </button>
              <button
                type="button"
                className={mode === 'register' ? 'active' : ''}
                onClick={() => updateMode('register')}
              >
                Create Account
              </button>
            </div>
          )}

          <p className="auth-panel-note">{content.panelDescription}</p>

          {mode === 'login' ? (
            <form className="auth-form auth-form--rich" onSubmit={handleLoginSubmit}>
              <label className="auth-field">
                <span>Email address</span>
                <input
                  type="email"
                  placeholder="name@example.com"
                  autoComplete="email"
                  value={loginForm.email}
                  onChange={(event) =>
                    setLoginForm((current) => ({ ...current, email: event.target.value }))
                  }
                  required
                />
              </label>

              <label className="auth-field">
                <span>Password</span>
                <div className="auth-password-wrap">
                  <input
                    type={showLoginPassword ? 'text' : 'password'}
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    value={loginForm.password}
                    onChange={(event) =>
                      setLoginForm((current) => ({
                        ...current,
                        password: event.target.value,
                      }))
                    }
                    required
                  />
                  <button
                    type="button"
                    className="auth-password-toggle"
                    onClick={() => setShowLoginPassword((current) => !current)}
                    aria-label={showLoginPassword ? 'Hide password' : 'Show password'}
                  >
                    {showLoginPassword ? <FiEyeOff /> : <FiEye />}
                  </button>
                </div>
              </label>

              <button
                type="submit"
                className="auth-submit auth-submit--centered"
                disabled={submitting === 'login'}
              >
                {submitting === 'login' ? 'Signing in...' : 'Access Dashboard'}
              </button>

              <div className="auth-secondary-actions auth-secondary-actions--split">
                <button
                  type="button"
                  className="auth-link-button auth-link-button--soft"
                  onClick={() => updateMode('forgot')}
                >
                  Forgot password?
                </button>
                <button
                  type="button"
                  className="auth-link-button auth-link-button--soft"
                  onClick={handleResendVerification}
                >
                  Resend verification
                </button>
              </div>

              {pendingVerificationEmail ? (
                <div className="auth-inline-note auth-inline-note--warning">
                  <strong>Email not activated yet.</strong>
                  <p>Verify your email first, then sign in again.</p>
                </div>
              ) : null}
            </form>
          ) : null}

          {mode === 'register' ? (
            <form
              className="auth-form auth-form--rich auth-form--register"
              onSubmit={handleRegisterSubmit}
            >
              <div className="auth-grid-two auth-grid-two--register">
                <label className="auth-field">
                  <span>First name</span>
                  <input
                    type="text"
                    placeholder="First name"
                    autoComplete="given-name"
                    value={registerForm.firstName}
                    onChange={(event) =>
                      setRegisterForm((current) => ({
                        ...current,
                        firstName: event.target.value,
                      }))
                    }
                    required
                  />
                </label>

                <label className="auth-field">
                  <span>Last name</span>
                  <input
                    type="text"
                    placeholder="Last name"
                    autoComplete="family-name"
                    value={registerForm.lastName}
                    onChange={(event) =>
                      setRegisterForm((current) => ({
                        ...current,
                        lastName: event.target.value,
                      }))
                    }
                    required
                  />
                </label>

                <label className="auth-field">
                  <span>Email</span>
                  <input
                    type="email"
                    placeholder="name@example.com"
                    autoComplete="email"
                    value={registerForm.email}
                    onChange={(event) =>
                      setRegisterForm((current) => ({
                        ...current,
                        email: event.target.value,
                      }))
                    }
                    required
                  />
                </label>

                <div className="auth-field">
                  <span>Phone number</span>
                  <PhoneInput
                    country="tn"
                    preferredCountries={['tn', 'fr', 'dz', 'ma', 'ae']}
                    value={registerForm.phoneNumber}
                    onChange={(value) =>
                      setRegisterForm((current) => ({ ...current, phoneNumber: value }))
                    }
                    enableSearch
                    countryCodeEditable={false}
                    placeholder="Enter your phone number"
                    inputProps={{
                      required: true,
                      name: 'phoneNumber',
                      autoComplete: 'tel',
                    }}
                    specialLabel=""
                    containerClass="phone-input-container"
                    inputClass="phone-input-field"
                    buttonClass="phone-input-button"
                    dropdownClass="phone-input-dropdown"
                    searchClass="phone-search-field"
                  />
                </div>

                <label className="auth-field auth-field--stacked auth-field--full">
                  <span>Password</span>
                  <div className="auth-password-wrap">
                    <input
                      type={showRegisterPassword ? 'text' : 'password'}
                      placeholder="At least 12 characters"
                      autoComplete="new-password"
                      value={registerForm.password}
                      onChange={(event) =>
                        setRegisterForm((current) => ({
                          ...current,
                          password: event.target.value,
                        }))
                      }
                      required
                    />
                    <button
                      type="button"
                      className="auth-password-toggle"
                      onClick={() => setShowRegisterPassword((current) => !current)}
                      aria-label={
                        showRegisterPassword ? 'Hide password' : 'Show password'
                      }
                    >
                      {showRegisterPassword ? <FiEyeOff /> : <FiEye />}
                    </button>
                  </div>
                  <small className="auth-password-hint">
                    Use uppercase, lowercase, a number, and a symbol.
                  </small>
                </label>
              </div>

              <button
                type="submit"
                className="auth-submit auth-submit--centered"
                disabled={submitting === 'register'}
              >
                {submitting === 'register' ? 'Creating account...' : 'Create Account'}
              </button>
            </form>
          ) : null}

          {mode === 'forgot' ? (
            <form
              className="auth-form auth-form--rich"
              onSubmit={handleForgotPasswordSubmit}
            >
              <label className="auth-field">
                <span>Account email</span>
                <input
                  type="email"
                  placeholder="name@example.com"
                  autoComplete="email"
                  value={forgotForm.email}
                  onChange={(event) =>
                    setForgotForm((current) => ({
                      ...current,
                      email: event.target.value,
                    }))
                  }
                  required
                />
              </label>

              {forgotSuccessMessage ? (
                <div className="auth-inline-note auth-inline-note--success">
                  <strong>Check your inbox.</strong>
                  <p>{forgotSuccessMessage}</p>
                </div>
              ) : (
                <div className="auth-inline-note">
                  <strong>Reset link</strong>
                  <p>If the account exists, the secure link will arrive by email.</p>
                </div>
              )}

              <button
                type="submit"
                className="auth-submit auth-submit--centered"
                disabled={submitting === 'forgot'}
              >
                {submitting === 'forgot' ? 'Sending link...' : 'Send Reset Link'}
              </button>

              <button
                type="button"
                className="auth-link-button"
                onClick={() => updateMode('login')}
              >
                Back to login
              </button>
            </form>
          ) : null}
        </div>
      </div>
    </div>
  );
}
