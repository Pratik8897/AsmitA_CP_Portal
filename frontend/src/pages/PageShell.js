import AdminLayout from "../components/AdminLayout";
import "./PageShell.css";

const PageShell = ({ title }) => {
  return (
    <AdminLayout title={title}>
      <div className="cp-page-shell">
        <div className="cp-page-card">
          <h2>{title}</h2>
          <p>This page is ready for your content.</p>
        </div>
      </div>
    </AdminLayout>
  );
};

export default PageShell;
