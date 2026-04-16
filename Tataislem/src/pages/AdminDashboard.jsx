import { useEffect, useState } from 'react';
import CountUp from 'react-countup';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  FiActivity,
  FiBarChart2,
  FiBriefcase,
  FiCalendar,
  FiCheckCircle,
  FiDollarSign,
  FiMessageSquare,
  FiPlusCircle,
  FiPieChart,
  FiSettings,
  FiTrendingUp,
  FiUsers,
} from 'react-icons/fi';
import AdminEventStudio from '../components/AdminEventStudio';
import AdminReviewsPanel from '../components/AdminReviewsPanel';
import AdminServiceStudio from '../components/AdminServiceStudio';
import DashboardLayout from '../components/DashboardLayout';
import ProfileEditorPanel from '../components/ProfileEditorPanel';
import ServiceCalendarSection from '../components/ServiceCalendarSection';
import { useAuth } from '../hooks/useAuth';
import { requestJson } from '../utils/api';
import { errorToast, successToast } from '../utils/toast';

const navigationItems = [
  { id: 'overview', label: 'Analytics', icon: FiBarChart2 },
  { id: 'events', label: 'Events', icon: FiPlusCircle },
  { id: 'services', label: 'Services', icon: FiBriefcase },
  { id: 'reviews', label: 'Reviews', icon: FiMessageSquare },
  { id: 'calendar', label: 'Calendar', icon: FiCalendar },
  { id: 'activity', label: 'Operations Feed', icon: FiActivity },
  { id: 'profile', label: 'Edit Profile', icon: FiSettings },
];

const integerFormatter = new Intl.NumberFormat('en-US');
const compactNumberFormatter = new Intl.NumberFormat('en-US', {
  notation: 'compact',
  maximumFractionDigits: 1,
});
const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
});
const compactCurrencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'EUR',
  notation: 'compact',
  maximumFractionDigits: 1,
});
const shortDateFormatter = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit',
  month: 'short',
});

const chartSeries = [
  { key: 'reservations', label: 'Event bookings', color: '#d7b46f' },
  { key: 'serviceOrders', label: 'Service orders', color: '#66b6e3' },
  { key: 'contacts', label: 'Contact leads', color: '#6ad4be' },
];

const donutPalette = ['#d7b46f', '#66b6e3', '#6ad4be', '#f07f78'];
const buildDefaultAvailabilityDraft = () => ({
  timezone: 'Africa/Lagos',
  slotIntervalMinutes: 30,
  meetingBufferMinutes: 15,
  weeklyHours: [
    { day: 'monday', enabled: true, startTime: '09:00', endTime: '17:00' },
    { day: 'tuesday', enabled: true, startTime: '09:00', endTime: '17:00' },
    { day: 'wednesday', enabled: true, startTime: '09:00', endTime: '17:00' },
    { day: 'thursday', enabled: true, startTime: '09:00', endTime: '17:00' },
    { day: 'friday', enabled: true, startTime: '09:00', endTime: '17:00' },
    { day: 'saturday', enabled: true, startTime: '10:00', endTime: '14:00' },
    { day: 'sunday', enabled: false, startTime: '10:00', endTime: '14:00' },
  ],
});

const normalizePhoneNumber = (value) => {
  if (!value) {
    return '';
  }

  return value.startsWith('+') ? value : `+${value}`;
};

const formatMetricValue = (value, format = 'number') => {
  const safeValue = Number.isFinite(Number(value)) ? Number(value) : 0;

  if (format === 'currency') {
    return currencyFormatter.format(safeValue);
  }

  if (format === 'currencyCompact') {
    return compactCurrencyFormatter.format(safeValue);
  }

  if (format === 'percent') {
    return `${safeValue.toFixed(1)}%`;
  }

  if (format === 'compact') {
    return compactNumberFormatter.format(safeValue);
  }

  return integerFormatter.format(Math.round(safeValue));
};

const formatShortDate = (value) => {
  if (!value) {
    return 'Now';
  }

  return shortDateFormatter.format(new Date(value));
};

const buildSmoothPath = (points) => {
  if (points.length === 0) {
    return '';
  }

  if (points.length === 1) {
    return `M ${points[0].x} ${points[0].y}`;
  }

  let path = `M ${points[0].x} ${points[0].y}`;

  for (let index = 0; index < points.length - 1; index += 1) {
    const currentPoint = points[index];
    const nextPoint = points[index + 1];
    const controlPointX = (currentPoint.x + nextPoint.x) / 2;

    path += ` C ${controlPointX} ${currentPoint.y}, ${controlPointX} ${nextPoint.y}, ${nextPoint.x} ${nextPoint.y}`;
  }

  return path;
};

const buildAreaPath = (points, bottomY) => {
  if (points.length === 0) {
    return '';
  }

  return `${buildSmoothPath(points)} L ${points[points.length - 1].x} ${bottomY} L ${points[0].x} ${bottomY} Z`;
};

function AnimatedMetricValue({ value, format = 'number' }) {
  return (
    <CountUp
      end={Number(value) || 0}
      duration={1.4}
      formattingFn={(currentValue) => formatMetricValue(currentValue, format)}
    />
  );
}

function MetricCard({ icon: Icon, label, value, format, detail, accent }) {
  return (
    <article className="dashboard-metric-card" style={{ '--metric-accent': accent }}>
      <div className="dashboard-metric-icon">
        <Icon />
      </div>
      <div className="dashboard-metric-copy">
        <span>{label}</span>
        <strong>
          <AnimatedMetricValue value={value} format={format} />
        </strong>
        <p>{detail}</p>
      </div>
    </article>
  );
}

function TrendChart({ data }) {
  if (!data?.length) {
    return (
      <p className="dashboard-chart-empty">
        Analytics will appear as soon as activity lands.
      </p>
    );
  }

  const width = 680;
  const height = 320;
  const padding = { top: 28, right: 22, bottom: 44, left: 18 };
  const bottomY = height - padding.bottom;
  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;
  const maxValue = Math.max(
    1,
    ...data.flatMap((item) => [item.reservations, item.serviceOrders, item.contacts]),
  );
  const stepX = data.length > 1 ? innerWidth / (data.length - 1) : innerWidth;

  const seriesPoints = chartSeries.map((series) => ({
    ...series,
    points: data.map((item, index) => ({
      x: padding.left + stepX * index,
      y: bottomY - ((item[series.key] || 0) / maxValue) * innerHeight,
      value: item[series.key] || 0,
      label: item.label,
    })),
  }));

  return (
    <div className="dashboard-chart-shell">
      <div className="dashboard-chart-legend">
        {chartSeries.map((series) => (
          <div key={series.key} className="dashboard-chart-legend-item">
            <span
              className="dashboard-chart-legend-dot"
              style={{ '--legend-color': series.color }}
            />
            <span>{series.label}</span>
          </div>
        ))}
      </div>

      <svg
        className="dashboard-trend-chart"
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label="Site activity trend across recent months"
      >
        <defs>
          <linearGradient id="dashboardTrendArea" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="rgba(215, 180, 111, 0.26)" />
            <stop offset="100%" stopColor="rgba(215, 180, 111, 0)" />
          </linearGradient>
        </defs>

        {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
          const y = padding.top + innerHeight * ratio;

          return (
            <line
              key={ratio}
              x1={padding.left}
              x2={width - padding.right}
              y1={y}
              y2={y}
              className="dashboard-trend-grid-line"
            />
          );
        })}

        <path
          d={buildAreaPath(seriesPoints[0].points, bottomY)}
          className="dashboard-trend-area"
        />

        {seriesPoints.map((series, index) => (
          <path
            key={series.key}
            d={buildSmoothPath(series.points)}
            className="dashboard-trend-line"
            style={{
              '--line-color': series.color,
              '--line-delay': `${index * 120}ms`,
            }}
          />
        ))}

        {seriesPoints.map((series, seriesIndex) =>
          series.points.map((point, pointIndex) => (
            <g
              key={`${series.key}-${point.label}`}
              className="dashboard-trend-dot"
              style={{ '--line-delay': `${seriesIndex * 120 + pointIndex * 55}ms` }}
            >
              <circle
                cx={point.x}
                cy={point.y}
                r="4.6"
                fill={series.color}
                stroke="rgba(12, 32, 48, 0.88)"
                strokeWidth="2"
              />
            </g>
          )),
        )}

        {data.map((item, index) => {
          const x = padding.left + stepX * index;

          return (
            <text
              key={item.label}
              x={x}
              y={height - 12}
              className="dashboard-trend-axis-label"
            >
              {item.label}
            </text>
          );
        })}
      </svg>
    </div>
  );
}

function DonutChart({
  data,
  centerLabel,
  centerValue,
  centerFormat = 'number',
  title,
  subtitle,
  legendFormat = 'number',
}) {
  const safeData = (data || [])
    .filter((item) => Number(item?.value) > 0)
    .map((item, index) => ({
      ...item,
      color: item.color || donutPalette[index % donutPalette.length],
    }));
  const total = safeData.reduce((sum, item) => sum + (Number(item.value) || 0), 0);
  const radius = 74;
  const strokeWidth = 18;
  const circumference = 2 * Math.PI * radius;
  const segments = safeData.reduce((collection, item, index) => {
    const previousSegment = collection[index - 1];
    const segmentLength = total > 0 ? (item.value / total) * circumference : 0;
    const segmentOffset = previousSegment
      ? previousSegment.segmentOffset + previousSegment.segmentLength
      : 0;

    return [
      ...collection,
      {
        ...item,
        segmentLength,
        segmentOffset,
        segmentDelay: `${index * 120}ms`,
      },
    ];
  }, []);

  return (
    <article className="dashboard-card dashboard-card--chart dashboard-card--donut">
      <div className="dashboard-card-head">
        <div>
          <p className="dashboard-section-label">{title}</p>
          <h2>{subtitle}</h2>
        </div>
      </div>

      <div className="dashboard-donut-layout">
        <svg
          viewBox="0 0 220 220"
          className="dashboard-donut-chart"
          role="img"
          aria-label={subtitle}
        >
          <circle
            cx="110"
            cy="110"
            r={radius}
            stroke="rgba(255, 255, 255, 0.08)"
            strokeWidth={strokeWidth}
            fill="none"
          />

          <g transform="rotate(-90 110 110)">
            {segments.map((segment) => (
              <circle
                key={segment.label}
                cx="110"
                cy="110"
                r={radius}
                fill="none"
                stroke={segment.color}
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                strokeDasharray={`${segment.segmentLength} ${circumference - segment.segmentLength}`}
                strokeDashoffset={-segment.segmentOffset}
                className="dashboard-donut-segment"
                style={{ '--segment-delay': segment.segmentDelay }}
              />
            ))}
          </g>

          <foreignObject x="46" y="58" width="128" height="104">
            <div className="dashboard-donut-center">
              <span>{centerLabel}</span>
              <strong>
                <AnimatedMetricValue value={centerValue ?? total} format={centerFormat} />
              </strong>
            </div>
          </foreignObject>
        </svg>

        <div className="dashboard-donut-legend">
          {safeData.map((item) => {
            const share = total > 0 ? Math.round((item.value / total) * 100) : 0;

            return (
              <div key={item.label} className="dashboard-donut-legend-item">
                <div className="dashboard-donut-legend-copy">
                  <span
                    className="dashboard-chart-legend-dot"
                    style={{ '--legend-color': item.color }}
                  />
                  <div>
                    <strong>{item.label}</strong>
                    <small>{share}% share</small>
                  </div>
                </div>
                <p>{formatMetricValue(item.value, legendFormat)}</p>
              </div>
            );
          })}
        </div>
      </div>
    </article>
  );
}

function RevenueBars({ data }) {
  if (!data?.length) {
    return (
      <p className="dashboard-chart-empty">Revenue bars need booking data to appear.</p>
    );
  }

  const maxRevenue = Math.max(1, ...data.map((item) => item.revenue || 0));

  return (
    <div className="dashboard-bars">
      {data.map((item, index) => (
        <div key={item.label} className="dashboard-bar-column">
          <span className="dashboard-bar-value">
            {formatMetricValue(item.revenue || 0, 'currencyCompact')}
          </span>
          <div className="dashboard-bar-track">
            <div
              className="dashboard-bar-fill"
              style={{
                '--bar-scale': `${(item.revenue || 0) / maxRevenue}`,
                '--bar-delay': `${index * 90}ms`,
              }}
            />
          </div>
          <strong>{item.label}</strong>
        </div>
      ))}
    </div>
  );
}

function RankingCard({ title, subtitle, items, accentClass }) {
  const safeItems = items || [];
  const maxValue = Math.max(1, ...safeItems.map((item) => item.value || 0));

  return (
    <article
      className={`dashboard-card dashboard-card--chart dashboard-card--ranking ${accentClass}`}
    >
      <div className="dashboard-card-head">
        <div>
          <p className="dashboard-section-label">{title}</p>
          <h2>{subtitle}</h2>
        </div>
      </div>

      <div className="dashboard-ranking-list">
        {safeItems.length === 0 ? (
          <p className="dashboard-chart-empty">
            Performance rankings will appear after the first confirmed activity.
          </p>
        ) : (
          safeItems.map((item, index) => (
            <article key={item.label} className="dashboard-ranking-item">
              <div className="dashboard-ranking-copy">
                <span className="dashboard-ranking-index">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <div>
                  <strong>{item.label}</strong>
                  <small>
                    {formatMetricValue(item.revenue || 0, 'currencyCompact')} revenue
                  </small>
                </div>
              </div>

              <div className="dashboard-ranking-meter">
                <div className="dashboard-ranking-track">
                  <div
                    className="dashboard-ranking-fill"
                    style={{
                      '--fill-width': `${((item.value || 0) / maxValue) * 100}%`,
                      '--fill-delay': `${index * 120}ms`,
                    }}
                  />
                </div>
                <p>{formatMetricValue(item.value || 0, 'number')}</p>
              </div>
            </article>
          ))
        )}
      </div>
    </article>
  );
}

function ActivityFeedCard({ title, items, valueLabel, emptyLabel }) {
  return (
    <div className="dashboard-card dashboard-card--feed">
      <h2>{title}</h2>
      <div className="dashboard-list dashboard-list--detailed">
        {items?.length ? (
          items.map((entry) => (
            <article
              key={entry._id}
              className="dashboard-list-item dashboard-list-item--stacked"
            >
              <div>
                <strong>{entry.title}</strong>
                <span>{entry.subtitle}</span>
              </div>
              <div className="dashboard-feed-meta">
                <p>{entry.valueText || valueLabel}</p>
                <small>{formatShortDate(entry.createdAt)}</small>
              </div>
            </article>
          ))
        ) : (
          <p className="dashboard-chart-empty">{emptyLabel}</p>
        )}
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const { user, updateProfile, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [calendarBusyOrderId, setCalendarBusyOrderId] = useState('');
  const [googleCalendarBusy, setGoogleCalendarBusy] = useState(false);
  const [availabilitySaving, setAvailabilitySaving] = useState(false);
  const [activeSection, setActiveSection] = useState('overview');
  const [availabilityDraft, setAvailabilityDraft] = useState(
    buildDefaultAvailabilityDraft,
  );
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
    requestJson('/api/admin/overview')
      .then((data) => {
        setOverview(data);
        setAvailabilityDraft(data.adminAvailability || buildDefaultAvailabilityDraft());
      })
      .catch((error) => errorToast(error.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const googleStatus = params.get('google');
    const message = params.get('message');

    if (!googleStatus) {
      return;
    }

    if (googleStatus === 'connected') {
      successToast(message || 'Google Calendar connected successfully');
    } else {
      errorToast(message || 'Google Calendar connection failed');
    }

    params.delete('google');
    params.delete('message');

    navigate(
      {
        pathname: location.pathname,
        search: params.toString() ? `?${params.toString()}` : '',
      },
      { replace: true },
    );
  }, [location.pathname, location.search, navigate]);

  const reloadOverview = async () => {
    setLoading(true);

    try {
      const data = await requestJson('/api/admin/overview');
      setOverview(data);
      setAvailabilityDraft(data.adminAvailability || buildDefaultAvailabilityDraft());
    } catch (error) {
      errorToast(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleConnectGoogleCalendar = () => {
    setGoogleCalendarBusy(true);
    window.location.assign(
      `/api/admin/google/connect?returnTo=${encodeURIComponent(window.location.origin)}`,
    );
  };

  const handleDisconnectGoogleCalendar = async () => {
    setGoogleCalendarBusy(true);

    try {
      const response = await requestJson('/api/admin/google/disconnect', {
        method: 'DELETE',
      });

      successToast(response.message || 'Google Calendar disconnected');
      await reloadOverview();
    } catch (error) {
      errorToast(error.message);
    } finally {
      setGoogleCalendarBusy(false);
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

  const analytics = overview?.analytics || {};
  const kpis = analytics.kpis || {};
  const stats = overview?.stats || {};
  const serviceScheduleOrders = overview?.serviceScheduleOrders || [];
  const googleCalendarStatus = overview?.googleCalendarStatus || {
    configured: false,
    connected: false,
    email: null,
    calendarId: 'primary',
    connectedAt: null,
  };

  const handleSaveAvailability = async () => {
    setAvailabilitySaving(true);

    try {
      const response = await requestJson('/api/admin/availability', {
        method: 'PATCH',
        body: JSON.stringify(availabilityDraft),
      });

      setAvailabilityDraft(
        response.adminAvailability ||
          availabilityDraft ||
          buildDefaultAvailabilityDraft(),
      );
      successToast(response.message || 'Working hours updated');
      await reloadOverview();
    } catch (error) {
      errorToast(error.message);
    } finally {
      setAvailabilitySaving(false);
    }
  };

  const handleConfirmAppointment = async (orderId) => {
    setCalendarBusyOrderId(orderId);

    try {
      const response = await requestJson(`/api/admin/service-orders/${orderId}/confirm`, {
        method: 'PATCH',
        body: JSON.stringify({}),
      });

      successToast(response.message || 'Meeting confirmed');
      await reloadOverview();
    } catch (error) {
      errorToast(error.message);
    } finally {
      setCalendarBusyOrderId('');
    }
  };

  const handleProposeAlternatives = async (orderId, alternativeSlots, note) => {
    setCalendarBusyOrderId(orderId);

    try {
      const response = await requestJson(
        `/api/admin/service-orders/${orderId}/propose-alternatives`,
        {
          method: 'PATCH',
          body: JSON.stringify({ alternativeSlots, note }),
        },
      );

      successToast(response.message || 'Alternative dates sent');
      await reloadOverview();
    } catch (error) {
      errorToast(error.message);
    } finally {
      setCalendarBusyOrderId('');
    }
  };
  const spotlightMetrics = [
    {
      icon: FiDollarSign,
      label: 'Platform Revenue',
      value: kpis.totalRevenue || 0,
      format: 'currency',
      detail: 'Confirmed payments from events and services.',
      accent: '#d7b46f',
    },
    {
      icon: FiTrendingUp,
      label: 'Transactions',
      value: kpis.totalTransactions || 0,
      format: 'number',
      detail: 'Paid bookings and service checkouts combined.',
      accent: '#66b6e3',
    },
    {
      icon: FiCheckCircle,
      label: 'Email Verification',
      value: kpis.verificationRate || 0,
      format: 'percent',
      detail: 'Verified client accounts ready for checkout.',
      accent: '#6ad4be',
    },
    {
      icon: FiCalendar,
      label: 'Seat Occupancy',
      value: kpis.occupancyRate || 0,
      format: 'percent',
      detail: 'How much of the event capacity is already booked.',
      accent: '#f07f78',
    },
  ];

  const recentUserEntries = (overview?.recentUsers || []).map((entry) => ({
    _id: entry._id,
    title: `${entry.firstName} ${entry.lastName}`,
    subtitle: entry.email,
    valueText: entry.emailVerified ? 'Verified' : 'Pending verification',
    createdAt: entry.createdAt,
  }));

  const recentReservationEntries = (overview?.recentReservations || []).map((entry) => ({
    _id: entry._id,
    title: entry.eventTitle,
    subtitle: entry.fullName,
    valueText: formatMetricValue(entry.amount || 0, 'currency'),
    createdAt: entry.createdAt,
  }));

  const recentServiceEntries = (overview?.recentServiceOrders || []).map((entry) => ({
    _id: entry._id,
    title: entry.serviceTitle,
    subtitle: entry.fullName,
    valueText: entry.paymentStatus,
    createdAt: entry.createdAt,
  }));

  const recentContactEntries = (overview?.recentContacts || []).map((entry) => ({
    _id: entry._id,
    title: entry.name,
    subtitle: entry.email,
    valueText: entry.phone || 'No phone',
    createdAt: entry.createdAt,
  }));

  return (
    <DashboardLayout
      eyebrow="Admin Intelligence"
      title={`Analytics studio, ${user?.firstName || 'Admin'}`}
      description="Animated charts, booking momentum, and a clearer view of how the showcase is performing."
      user={user}
      navItems={navigationItems}
      activeSection={activeSection}
      onSectionChange={setActiveSection}
      onLogout={logout}
    >
      {activeSection === 'overview' ? (
        loading ? (
          <div className="dashboard-card dashboard-analytics-loading">
            <p className="dashboard-section-label">Loading Analytics</p>
            <h2>Preparing the latest site performance signals...</h2>
            <p>Your revenue, booking, and audience charts are being assembled.</p>
          </div>
        ) : (
          <div className="dashboard-analytics-stack">
            <section className="dashboard-card dashboard-analytics-hero">
              <div className="dashboard-analytics-hero-copy">
                <p className="dashboard-section-label">Site Performance Pulse</p>
                <h2>See bookings, revenue, and client signals moving together.</h2>
                <p>
                  This admin view now reads like a live control room: revenue flow,
                  booking demand, audience quality, and offer performance all in one
                  place.
                </p>
              </div>

              <div className="dashboard-analytics-badges">
                <div className="dashboard-analytics-badge">
                  <FiUsers />
                  <div>
                    <strong>{formatMetricValue(stats.usersCount || 0, 'number')}</strong>
                    <span>Accounts on the platform</span>
                  </div>
                </div>
                <div className="dashboard-analytics-badge">
                  <FiCalendar />
                  <div>
                    <strong>
                      {formatMetricValue(kpis.upcomingEventsCount || 0, 'number')}
                    </strong>
                    <span>Upcoming events still in motion</span>
                  </div>
                </div>
                <div className="dashboard-analytics-badge">
                  <FiPieChart />
                  <div>
                    <strong>
                      {formatMetricValue(kpis.averageOrderValue || 0, 'currency')}
                    </strong>
                    <span>Average order value across paid checkouts</span>
                  </div>
                </div>
              </div>
            </section>

            <div className="dashboard-kpi-grid">
              {spotlightMetrics.map((metric) => (
                <MetricCard key={metric.label} {...metric} />
              ))}
            </div>

            <div className="dashboard-analytics-grid">
              <article className="dashboard-card dashboard-card--chart dashboard-card--wide">
                <div className="dashboard-card-head">
                  <div>
                    <p className="dashboard-section-label">Momentum</p>
                    <h2>Monthly activity trend</h2>
                  </div>
                  <span className="dashboard-card-pill">Last 6 months</span>
                </div>
                <TrendChart data={analytics.activityTrend} />
              </article>

              <DonutChart
                data={analytics.revenueSplit}
                centerLabel="Total Revenue"
                centerValue={kpis.totalRevenue || 0}
                centerFormat="currencyCompact"
                title="Revenue Split"
                subtitle="Where the money is coming from"
                legendFormat="currencyCompact"
              />

              <article className="dashboard-card dashboard-card--chart">
                <div className="dashboard-card-head">
                  <div>
                    <p className="dashboard-section-label">Revenue Flow</p>
                    <h2>Monthly payment energy</h2>
                  </div>
                </div>
                <RevenueBars data={analytics.activityTrend} />
              </article>

              <DonutChart
                data={analytics.audienceSplit}
                centerLabel="Verified"
                centerValue={kpis.verificationRate || 0}
                centerFormat="percent"
                title="Audience Quality"
                subtitle="Verification and access health"
                legendFormat="number"
              />

              <RankingCard
                title="Top Events"
                subtitle="Most booked experiences right now"
                items={analytics.topEvents}
                accentClass="dashboard-card--gold"
              />

              <RankingCard
                title="Top Services"
                subtitle="Best converting premium offers"
                items={analytics.topServices}
                accentClass="dashboard-card--blue"
              />
            </div>
          </div>
        )
      ) : null}

      {activeSection === 'calendar' ? (
        loading ? (
          <div className="dashboard-card dashboard-analytics-loading">
            <p className="dashboard-section-label">Loading Calendar</p>
            <h2>Preparing the service meeting board...</h2>
            <p>Paid requests, confirmations, and reschedule flows are loading.</p>
          </div>
        ) : (
          <ServiceCalendarSection
            mode="admin"
            appointments={serviceScheduleOrders}
            busyOrderId={calendarBusyOrderId}
            googleCalendarStatus={googleCalendarStatus}
            googleCalendarBusy={googleCalendarBusy}
            availabilityDraft={availabilityDraft}
            availabilitySaving={availabilitySaving}
            onConnectGoogleCalendar={handleConnectGoogleCalendar}
            onDisconnectGoogleCalendar={handleDisconnectGoogleCalendar}
            onAvailabilityChange={setAvailabilityDraft}
            onSaveAvailability={handleSaveAvailability}
            onConfirmAppointment={handleConfirmAppointment}
            onProposeAlternatives={handleProposeAlternatives}
          />
        )
      ) : null}

      {activeSection === 'events' ? (
        <AdminEventStudio
          stats={{
            eventsCount: stats.eventsCount,
            upcomingEventsCount: kpis.upcomingEventsCount,
          }}
          onEventCreated={reloadOverview}
        />
      ) : null}

      {activeSection === 'services' ? (
        <AdminServiceStudio
          stats={{
            servicesCount: stats.servicesCount,
          }}
          onServiceCreated={reloadOverview}
        />
      ) : null}

      {activeSection === 'reviews' ? <AdminReviewsPanel /> : null}

      {activeSection === 'activity' ? (
        <div className="dashboard-activity-grid">
          <ActivityFeedCard
            title="Latest Users"
            items={recentUserEntries}
            valueLabel="New account"
            emptyLabel="User signups will appear here."
          />
          <ActivityFeedCard
            title="Latest Reservations"
            items={recentReservationEntries}
            valueLabel="Reservation"
            emptyLabel="Event reservations will appear here."
          />
          <ActivityFeedCard
            title="Latest Service Orders"
            items={recentServiceEntries}
            valueLabel="Service order"
            emptyLabel="Service orders will appear here."
          />
          <ActivityFeedCard
            title="Latest Contact Messages"
            items={recentContactEntries}
            valueLabel="Contact lead"
            emptyLabel="Contact requests will appear here."
          />
        </div>
      ) : null}

      {activeSection === 'profile' ? (
        <ProfileEditorPanel
          user={user}
          formData={formData}
          setFormData={setFormData}
          onSubmit={handleProfileSubmit}
          saving={saving}
          submitLabel="Save Admin Profile"
        />
      ) : null}
    </DashboardLayout>
  );
}
