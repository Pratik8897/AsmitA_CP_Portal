import { useEffect, useMemo, useState } from "react";
import { NavLink } from "react-router-dom";
import AdminLayout from "../components/AdminLayout";
import "./DashboardHome.css";

const DashboardHome = () => {
  const apiBase = process.env.REACT_APP_API_BASE || "http://localhost:5000";
  const [user, setUser] = useState(null);
  const [leads, setLeads] = useState([]);
  const [activities, setActivities] = useState([]);
  const [salesUsers, setSalesUsers] = useState([]);

  useEffect(() => {
    let isMounted = true;
    const loadUser = async () => {
      try {
        const res = await fetch(`${apiBase}/api/auth/me`, { credentials: "include" });
        if (!res.ok) {
          throw new Error("Unauthorized");
        }
        const data = await res.json();
        if (isMounted) {
          setUser(data?.user || null);
        }
      } catch (err) {
        if (isMounted) {
          setUser(null);
        }
      }
    };
    loadUser();
    return () => {
      isMounted = false;
    };
  }, [apiBase]);

  useEffect(() => {
    let isMounted = true;
    const loadData = async () => {
      try {
        const [leadsRes, activityRes, salesRes] = await Promise.all([
          fetch(`${apiBase}/api/leads`, { credentials: "include" }),
          fetch(`${apiBase}/api/lead-activities`, { credentials: "include" }),
          fetch(`${apiBase}/api/sales-users`, { credentials: "include" }),
        ]);
        const [leadsData, activityData, salesData] = await Promise.all([
          leadsRes.ok ? leadsRes.json() : [],
          activityRes.ok ? activityRes.json() : [],
          salesRes.ok ? salesRes.json() : [],
        ]);
        if (isMounted) {
          setLeads(Array.isArray(leadsData) ? leadsData : []);
          setActivities(Array.isArray(activityData) ? activityData : []);
          setSalesUsers(Array.isArray(salesData) ? salesData : []);
        }
      } catch (err) {
        if (isMounted) {
          setLeads([]);
          setActivities([]);
          setSalesUsers([]);
        }
      }
    };
    loadData();
    return () => {
      isMounted = false;
    };
  }, [apiBase]);

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 18) return "Good Afternoon";
    return "Good Evening";
  }, []);

  const totalLeads = leads.length;
  const totalActivities = activities.length;
  const totalSalesUsers = salesUsers.length;

  const newLeads = useMemo(() => {
    const now = Date.now();
    const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
    return leads.filter((lead) => {
      const created = lead?.created_at ? new Date(lead.created_at).getTime() : NaN;
      return Number.isFinite(created) && created >= weekAgo;
    }).length;
  }, [leads]);

  const recentLeads = useMemo(
    () =>
      [...leads]
        .sort((a, b) => {
          const aTime = a?.created_at ? new Date(a.created_at).getTime() : 0;
          const bTime = b?.created_at ? new Date(b.created_at).getTime() : 0;
          return bTime - aTime;
        })
        .slice(0, 5),
    [leads]
  );

  const activityPulse = [
    { label: "Mon", value: 14 },
    { label: "Tue", value: 32 },
    { label: "Wed", value: 10 },
    { label: "Thu", value: 28 },
    { label: "Fri", value: 40 },
    { label: "Sat", value: 22 },
    { label: "Sun", value: 16 },
  ];

  const donutStats = [
    { label: "New Leads", value: 38, color: "#1e4bd1" },
    { label: "Warm Leads", value: 32, color: "#48c6ff" },
    { label: "Closed Leads", value: 30, color: "#7dd3fc" },
  ];

  const totalDonut = donutStats.reduce((sum, item) => sum + item.value, 0) || 1;

  return (
    <AdminLayout
      title="Dashboard"
      subtitle="Performance summary and operational analytics"
    >
      <div className="dashboard-home">
        <section className="dashboard-hero">
          <div>
            <p className="hero-greeting">
              {greeting}, <strong>{user?.name || "Team"}</strong>
            </p>
            <p className="hero-subtitle">Your performance summary this week</p>
          </div>
          <div className="hero-actions">
            <div className="hero-filter">
              <span>Category</span>
              <button type="button">All Teams</button>
            </div>
            <div className="hero-filter">
              <span>Range</span>
              <button type="button">Last 7 days</button>
            </div>
            <button type="button" className="hero-primary">
              + New Lead
            </button>
          </div>
        </section>

        <section className="stat-grid">
          <div className="stat-card">
            <p>New Leads</p>
            <h3>{newLeads}</h3>
            <span className="stat-note">Last 7 days</span>
          </div>
          <div className="stat-card">
            <p>Total Leads</p>
            <h3>{totalLeads}</h3>
            <span className="stat-note">Active pipeline</span>
          </div>
          <div className="stat-card">
            <p>Lead Activities</p>
            <h3>{totalActivities}</h3>
            <span className="stat-note">All logged actions</span>
          </div>
          <div className="stat-card">
            <p>Sales Users</p>
            <h3>{totalSalesUsers}</h3>
            <span className="stat-note">Active sales team</span>
          </div>
          <div className="stat-card accent">
            <p>User Management</p>
            <h3>Manage</h3>
            <span className="stat-note">Roles &amp; permissions</span>
          </div>
          <div className="stat-card accent-alt">
            <p>Settings</p>
            <h3>Configure</h3>
            <span className="stat-note">System preferences</span>
          </div>
        </section>

        <section className="analytics-grid">
          <div className="analytics-card">
            <div className="analytics-header">
              <h4>Lead Activity Pulse</h4>
              <button type="button">This week</button>
            </div>
            <div className="bar-chart">
              {activityPulse.map((item) => (
                <div key={item.label} className="bar-item">
                  <div
                    className="bar-fill"
                    style={{ height: `${item.value}%` }}
                  />
                  <span>{item.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="analytics-card">
            <div className="analytics-header">
              <h4>Lead Mix</h4>
              <button type="button">This month</button>
            </div>
            <div className="donut-wrap">
              <div
                className="donut"
                style={{
                  background: `conic-gradient(${donutStats
                    .map((item) => `${item.color} ${(item.value / totalDonut) * 100}%`)
                    .join(", ")})`,
                }}
              >
                <div className="donut-center">
                  <strong>{totalLeads}</strong>
                  <span>Leads</span>
                </div>
              </div>
              <div className="donut-legend">
                {donutStats.map((item) => (
                  <div key={item.label} className="legend-item">
                    <span style={{ background: item.color }} />
                    {item.label} ({item.value}%)
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="lower-grid">
          <div className="recent-card">
            <div className="analytics-header">
              <h4>Recent Leads</h4>
              <NavLink to="/leads">View all</NavLink>
            </div>
            <div className="recent-list">
              {recentLeads.length ? (
                recentLeads.map((lead) => (
                  <div key={lead.id} className="recent-item">
                    <div>
                      <strong>{lead.customer_name || "New Lead"}</strong>
                      <span>{lead.customer_phone || lead.customer_email || "No contact"}</span>
                    </div>
                    <span className="recent-tag">{lead.status || "New"}</span>
                  </div>
                ))
              ) : (
                <div className="empty-state">No recent leads available.</div>
              )}
            </div>
          </div>

          <div className="quick-card">
            <div className="analytics-header">
              <h4>Quick Actions</h4>
            </div>
            <div className="quick-links">
              <NavLink to="/lead-activities">Lead Activity</NavLink>
              <NavLink to="/user-management">User Management</NavLink>
              <NavLink to="/system-logs">System Logs</NavLink>
              <NavLink to="/support-tickets">Support Tickets</NavLink>
              <NavLink to="/payment-plans">Payment Plans</NavLink>
              <NavLink to="/projects-wings">Projects</NavLink>
            </div>
          </div>
        </section>
      </div>
    </AdminLayout>
  );
};

export default DashboardHome;
