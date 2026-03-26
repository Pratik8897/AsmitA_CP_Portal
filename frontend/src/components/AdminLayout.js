import { NavLink, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import "./AdminLayout.css";
import asmitaLogo from "../assets/AsmitA Logo.webp";

const navItems = [
  { label: "Home", path: "/", icon: "home", resource: "home", end: true },
  { label: "Leads", path: "/leads", icon: "leads", resource: "leads" },
  { label: "DB Tables (Test)", path: "/db-tables", icon: "logs", resource: "tables" },
  { label: "Channel Partners", path: "/channel-partners", icon: "partners", resource: "channel-partners" },
  { label: "Property Dashboard", path: "/property-dashboard", icon: "projects", resource: "units" },
  { label: "Unit Slots", path: "/unit-slots", icon: "units", resource: "units" },
  { label: "Units", path: "/units", icon: "units", resource: "units" },
  { label: "Commissions", path: "/commissions", icon: "commissions", resource: "commissions" },
  { label: "Lead Activities", path: "/lead-activities", icon: "activities", resource: "lead-activities" },
  {
    label: "Lead Payment Milestones",
    path: "/lead-payment-milestones",
    icon: "lead-payments",
    resource: "lead-payment-milestones",
  },
  {
    label: "Payment Milestones",
    path: "/payment-milestones",
    icon: "payments",
    resource: "payment-milestones",
  },
  { label: "Payment Plans", path: "/payment-plans", icon: "plans", resource: "payment-plans" },
  { label: "Support Tickets", path: "/support-tickets", icon: "support", resource: "support-tickets" },
  { label: "System Logs", path: "/system-logs", icon: "logs", resource: "system-logs" },
  { label: "User Management", path: "/user-management", icon: "support", resource: "internal-users" },
];

const normalizeRole = (role) => {
  if (!role) return "";
  const raw = String(role).trim().toLowerCase();
  if (!raw) return "";
  const compact = raw.replace(/\s+/g, "_").replace(/-+/g, "_");
  if (["cp", "channel_partner", "channel_partners", "channelpartner"].includes(compact)) {
    return "cp";
  }
  if (["sales_user", "salesuser"].includes(compact)) return "sales_user";
  if (["sales_admin", "salesadmin"].includes(compact)) return "sales_admin";
  if (["analytics", "analyst"].includes(compact)) return "analytics";
  if (["super_admin", "superadmin", "super"].includes(compact)) return "super_admin";
  return compact;
};

const roleReadMatrix = {
  home: ["cp", "sales_user", "sales_admin", "analytics", "super_admin"],
  leads: ["cp", "sales_user", "sales_admin", "analytics", "super_admin"],
  "channel-partners": ["cp", "sales_user", "sales_admin", "analytics", "super_admin"],
  "projects-wings": ["cp", "sales_admin", "analytics", "super_admin"],
  units: ["cp", "sales_admin", "analytics", "super_admin"],
  commissions: ["cp", "sales_user", "sales_admin", "analytics", "super_admin"],
  "lead-activities": ["cp", "sales_user", "sales_admin", "analytics", "super_admin"],
  "lead-payment-milestones": ["sales_admin", "analytics", "super_admin"],
  "payment-milestones": ["sales_admin", "analytics", "super_admin"],
  "payment-plans": ["sales_admin", "analytics", "super_admin"],
  "support-tickets": ["sales_admin", "analytics", "super_admin"],
  "system-logs": ["sales_admin", "analytics", "super_admin"],
  "internal-users": ["super_admin"],
  tables: ["super_admin"],
};

const canReadResource = (role, resource) => {
  if (!role || !resource) return false;
  const allowed = roleReadMatrix[resource] || [];
  return allowed.includes(role);
};

const AdminLayout = ({ title, subtitle, children }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [user, setUser] = useState(null);
  const navigate = useNavigate();
  const apiBase = process.env.REACT_APP_API_BASE || "http://localhost:5000";

  useEffect(() => {
    const handleResize = () => {
      if (!window.matchMedia("(max-width: 900px)").matches) {
        setIsMobileOpen(false);
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

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

  const handleMenuToggle = () => {
    if (window.matchMedia("(max-width: 900px)").matches) {
      setIsMobileOpen((prev) => !prev);
      return;
    }
    setIsCollapsed((prev) => !prev);
  };

  const role = normalizeRole(user?.role);
  const visibleNavItems = role
    ? navItems.filter((item) => canReadResource(role, item.resource))
    : [];

  return (
    <div
      className={`dashboard-page${isCollapsed ? " collapsed" : ""}${
        isMobileOpen ? " mobile-open" : ""
      }`}
    >
      <button
        type="button"
        className="dashboard-overlay"
        aria-label="Close menu"
        onClick={() => setIsMobileOpen(false)}
      />
      <aside className="dashboard-sidebar">
        <div className="sidebar-brand">
          <img src={asmitaLogo} alt="AsmitA" />
          <span>
            my <strong>AsmitA</strong>
          </span>
        </div>

        <nav className="sidebar-menu">
          {visibleNavItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.end}
              className={({ isActive }) =>
                `sidebar-link${isActive ? " active" : ""}`
              }
            >
              <span className={`sidebar-icon ${item.icon}`} />
              <span className="sidebar-label">{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </aside>

      <main className="dashboard-main">
        <header className="dashboard-topbar">
          <button
            className="hamburger"
            type="button"
            aria-label={isCollapsed ? "Expand menu" : "Collapse menu"}
            aria-pressed={isCollapsed}
            onClick={handleMenuToggle}
          >
            <span />
            <span />
            <span />
          </button>

          <div className="topbar-spacer" />

          <div className="topbar-user">
            <img
              src="https://images.unsplash.com/photo-1544723795-3fb6469f5b39?auto=format&fit=crop&w=80&q=80"
              alt="Admin avatar"
            />
            <span>Hi, {user?.name || "User"}!</span>
            <button className="topbar-icon" type="button" aria-label="Alerts">
              <span className="dot" />
            </button>
            <button
              className="topbar-link"
              type="button"
              onClick={async () => {
                try {
                  await fetch(`${apiBase}/api/auth/logout`, {
                    method: "POST",
                    credentials: "include",
                  });
                } finally {
                  navigate("/login");
                }
              }}
            >
              Sign out
            </button>
          </div>
        </header>

        <section className="dashboard-content">
          {title ? (
            <div className="dashboard-title">
              <div className="home-icon" />
              <div>
                <h1>{title}</h1>
                {subtitle ? <p>{subtitle}</p> : null}
              </div>
            </div>
          ) : null}
          {children}
        </section>

        <footer className="dashboard-footer">
          <span>Copyright 2026 myAsmitA</span>
          <div className="footer-links">
            <NavLink to="/about-us">About Us</NavLink>
            <NavLink to="/contact-us">Contact Us</NavLink>
            <NavLink to="/terms-conditions">Terms &amp; Conditions</NavLink>
            <NavLink to="/privacy-policy">Privacy Policy</NavLink>
          </div>
        </footer>
      </main>
    </div>
  );
};

export default AdminLayout;
