import { useEffect, useState } from "react";
import AdminLayout from "../components/AdminLayout";
import DataTable from "../components/DataTable";
import "./DatabaseTables.css";

const DatabaseTables = () => {
  const [tables, setTables] = useState([]);
  const [openTables, setOpenTables] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const apiBase = process.env.REACT_APP_API_BASE || "http://localhost:5000";

  useEffect(() => {
    let isMounted = true;

    const loadTables = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await fetch(`${apiBase}/api/tables`, {
          credentials: "include",
        });
        if (!res.ok) {
          throw new Error("Failed to fetch tables");
        }
        const data = await res.json();
        if (isMounted) {
          setTables(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        if (isMounted) {
          setError("Unable to load tables.");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadTables();
    return () => {
      isMounted = false;
    };
  }, [apiBase]);

  const toggleTable = (name) => {
    setOpenTables((prev) => ({
      ...prev,
      [name]: !prev[name],
    }));
  };

  return (
    <AdminLayout title="Database Tables" subtitle="Testing view for all tables">
      {loading ? (
        <div className="data-state loader">
          <span className="data-spinner" aria-hidden="true" />
          Loading tables...
        </div>
      ) : error ? (
        <div className="data-state error">{error}</div>
      ) : tables.length === 0 ? (
        <div className="data-state">No tables found.</div>
      ) : (
        <div className="table-accordion">
          {tables.map((table) => (
            <div className="table-accordion-item" key={table}>
              <button
                type="button"
                className="table-accordion-header"
                onClick={() => toggleTable(table)}
              >
                <span>{table}</span>
                <span className="table-accordion-icon">
                  {openTables[table] ? "-" : "+"}
                </span>
              </button>
              {openTables[table] ? (
                <div className="table-accordion-body">
                  <DataTable
                    title={table}
                    endpoint={`/api/table/${table}`}
                    showActions={false}
                    actionLabel=""
                  />
                </div>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </AdminLayout>
  );
};

export default DatabaseTables;
