import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import Leads from "../pages/Leads";
import DashboardHome from "../pages/DashboardHome";
import DatabaseTables from "../pages/DatabaseTables";
import ChannelPartners from "../pages/ChannelPartners";
import ProjectsWings from "../pages/ProjectsWings";
import Units from "../pages/Units";
import PropertyDashboard from "../pages/PropertyDashboard";
import UnitSlots from "../pages/UnitSlots";
import Commissions from "../pages/Commissions";
import LeadActivities from "../pages/LeadActivities";
import LeadPaymentMilestones from "../pages/LeadPaymentMilestones";
import PaymentMilestones from "../pages/PaymentMilestones";
import PaymentPlans from "../pages/PaymentPlans";
import SupportTickets from "../pages/SupportTickets";
import SystemLogs from "../pages/SystemLogs";
import InternalUsers from "../pages/InternalUsers";
import Login from "../pages/Login";
import AboutUs from "../pages/AboutUs";
import ContactUs from "../pages/ContactUs";
import TermsConditions from "../pages/TermsConditions";
import PrivacyPolicy from "../pages/PrivacyPolicy";

const AppRoutes = () => {
  const apiBase = process.env.REACT_APP_API_BASE || "http://localhost:5000";
  const [isAuthed, setIsAuthed] = useState(null);

  useEffect(() => {
    let isMounted = true;
    const checkAuth = async () => {
      try {
        const res = await fetch(`${apiBase}/api/auth/me`, { credentials: "include" });
        if (isMounted) {
          setIsAuthed(res.ok);
        }
      } catch (err) {
        if (isMounted) {
          setIsAuthed(false);
        }
      }
    };
    checkAuth();
    return () => {
      isMounted = false;
    };
  }, [apiBase]);

  const RequireAuth = ({ children }) => {
    if (isAuthed === null) {
      return <div style={{ padding: "24px" }}>Loading...</div>;
    }
    return isAuthed ? children : <Navigate to="/login" replace />;
  };

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/"
          element={
            <RequireAuth>
              <DashboardHome />
            </RequireAuth>
          }
        />
        <Route
          path="/home"
          element={
            <RequireAuth>
              <DashboardHome />
            </RequireAuth>
          }
        />
        <Route
          path="/db-tables"
          element={
            <RequireAuth>
              <DatabaseTables />
            </RequireAuth>
          }
        />
        <Route
          path="/leads"
          element={
            <RequireAuth>
              <Leads />
            </RequireAuth>
          }
        />
        <Route
          path="/channel-partners"
          element={
            <RequireAuth>
              <ChannelPartners />
            </RequireAuth>
          }
        />
        <Route
          path="/projects-wings"
          element={
            <RequireAuth>
              <ProjectsWings />
            </RequireAuth>
          }
        />
        <Route
          path="/property-dashboard"
          element={
            <RequireAuth>
              <PropertyDashboard />
            </RequireAuth>
          }
        />
        <Route
          path="/unit-slots"
          element={
            <RequireAuth>
              <UnitSlots />
            </RequireAuth>
          }
        />
        <Route
          path="/units"
          element={
            <RequireAuth>
              <Units />
            </RequireAuth>
          }
        />
        <Route
          path="/commissions"
          element={
            <RequireAuth>
              <Commissions />
            </RequireAuth>
          }
        />
        <Route
          path="/lead-activities"
          element={
            <RequireAuth>
              <LeadActivities />
            </RequireAuth>
          }
        />
        <Route
          path="/lead-payment-milestones"
          element={
            <RequireAuth>
              <LeadPaymentMilestones />
            </RequireAuth>
          }
        />
        <Route
          path="/payment-milestones"
          element={
            <RequireAuth>
              <PaymentMilestones />
            </RequireAuth>
          }
        />
        <Route
          path="/payment-plans"
          element={
            <RequireAuth>
              <PaymentPlans />
            </RequireAuth>
          }
        />
        <Route
          path="/support-tickets"
          element={
            <RequireAuth>
              <SupportTickets />
            </RequireAuth>
          }
        />
        <Route
          path="/system-logs"
          element={
            <RequireAuth>
              <SystemLogs />
            </RequireAuth>
          }
        />
        <Route
          path="/user-management"
          element={
            <RequireAuth>
              <InternalUsers />
            </RequireAuth>
          }
        />
        <Route
          path="/about-us"
          element={
            <RequireAuth>
              <AboutUs />
            </RequireAuth>
          }
        />
        <Route
          path="/contact-us"
          element={
            <RequireAuth>
              <ContactUs />
            </RequireAuth>
          }
        />
        <Route
          path="/terms-conditions"
          element={
            <RequireAuth>
              <TermsConditions />
            </RequireAuth>
          }
        />
        <Route
          path="/privacy-policy"
          element={
            <RequireAuth>
              <PrivacyPolicy />
            </RequireAuth>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default AppRoutes;
