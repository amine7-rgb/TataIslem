import { useEffect, useState } from 'react';
import { FiCalendar, FiMessageSquare, FiSettings } from 'react-icons/fi';
import DashboardLayout from '../components/DashboardLayout';
import ProfileEditorPanel from '../components/ProfileEditorPanel';
import ServiceCalendarSection from '../components/ServiceCalendarSection';
import UserReviewPanel from '../components/UserReviewPanel';
import { useAuth } from '../hooks/useAuth';
import { requestJson } from '../utils/api';
import { errorToast, successToast } from '../utils/toast';

const navigationItems = [
  { id: 'calendar', label: 'Calendar', icon: FiCalendar },
  { id: 'reviews', label: 'Reviews', icon: FiMessageSquare },
  { id: 'profile', label: 'Edit Profile', icon: FiSettings },
];

const normalizePhoneNumber = (value) => {
  if (!value) {
    return '';
  }

  return value.startsWith('+') ? value : `+${value}`;
};

export default function UserDashboard() {
  const { user, updateProfile, logout } = useAuth();
  const [activeSection, setActiveSection] = useState('calendar');
  const [saving, setSaving] = useState(false);
  const [calendarLoading, setCalendarLoading] = useState(true);
  const [calendarBusyOrderId, setCalendarBusyOrderId] = useState('');
  const [accountOverview, setAccountOverview] = useState(null);
  const [formData, setFormData] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    phoneNumber: user?.phoneNumber || '',
    address: user?.address || '',
    avatarUrl: user?.avatarUrl || null,
  });

  useEffect(() => {
    setFormData({
      firstName: user?.firstName || '',
      lastName: user?.lastName || '',
      phoneNumber: user?.phoneNumber || '',
      address: user?.address || '',
      avatarUrl: user?.avatarUrl || null,
    });
  }, [user]);

  useEffect(() => {
    requestJson('/api/account/overview')
      .then((data) => setAccountOverview(data))
      .catch((error) => errorToast(error.message))
      .finally(() => setCalendarLoading(false));
  }, []);

  const reloadAccountOverview = async () => {
    setCalendarLoading(true);

    try {
      const data = await requestJson('/api/account/overview');
      setAccountOverview(data);
    } catch (error) {
      errorToast(error.message);
    } finally {
      setCalendarLoading(false);
    }
  };

  const handleProfileSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);

    try {
      await updateProfile({
        ...formData,
        phoneNumber: normalizePhoneNumber(formData.phoneNumber),
      });
      successToast('Profile updated');
    } catch (error) {
      errorToast(error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSelectAlternative = async (orderId, selectedStartAt) => {
    setCalendarBusyOrderId(orderId);

    try {
      const response = await requestJson(
        `/api/account/service-orders/${orderId}/select-slot`,
        {
          method: 'PATCH',
          body: JSON.stringify({ selectedStartAt }),
        },
      );

      successToast(response.message || 'New date sent to the admin');
      await reloadAccountOverview();
    } catch (error) {
      errorToast(error.message);
    } finally {
      setCalendarBusyOrderId('');
    }
  };

  const serviceAppointments = (accountOverview?.serviceOrders || []).filter(
    (order) => order.paymentStatus === 'paid',
  );

  return (
    <DashboardLayout
      eyebrow="Client Dashboard"
      title={`Welcome, ${user?.firstName || 'Client'}`}
      description="Your private dashboard now includes service scheduling, live testimonials, and profile management in one calm space."
      user={user}
      navItems={navigationItems}
      activeSection={activeSection}
      onSectionChange={setActiveSection}
      onLogout={logout}
    >
      {activeSection === 'calendar' ? (
        calendarLoading ? (
          <div className="dashboard-card dashboard-analytics-loading">
            <p className="dashboard-section-label">Loading Calendar</p>
            <h2>Preparing your service meeting timeline...</h2>
            <p>Your requested and confirmed appointments will appear here.</p>
          </div>
        ) : (
          <ServiceCalendarSection
            mode="user"
            appointments={serviceAppointments}
            busyOrderId={calendarBusyOrderId}
            onSelectAlternative={handleSelectAlternative}
          />
        )
      ) : null}

      {activeSection === 'profile' ? (
        <ProfileEditorPanel
          user={user}
          formData={formData}
          setFormData={setFormData}
          onSubmit={handleProfileSubmit}
          saving={saving}
          submitLabel="Save Profile"
        />
      ) : null}

      {activeSection === 'reviews' ? (
        <UserReviewPanel
          user={user}
          currentReview={accountOverview?.review}
          onReviewSaved={(review) =>
            setAccountOverview((current) => ({
              ...(current || {}),
              review,
            }))
          }
        />
      ) : null}
    </DashboardLayout>
  );
}
