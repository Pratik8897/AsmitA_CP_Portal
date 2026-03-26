import { useEffect, useState } from "react";
import "./DataTable.css";

const DataTable = ({
  title,
  endpoint,
  onEdit,
  onDelete,
  onAdd,
  addLabel = "Add New",
  actionLabel = "Actions",
  columns: preferredColumns,
  columnLabels = {},
  viewExclude = [],
  refreshKey = 0,
  showActions = true,
}) => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [viewRow, setViewRow] = useState(null);

  useEffect(() => {
    let isMounted = true;
    const apiBase = process.env.REACT_APP_API_BASE || "http://localhost:5000";

    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await fetch(`${apiBase}${endpoint}`, {
          credentials: "include",
        });
        if (!res.ok) {
          throw new Error("Failed to fetch data");
        }
        const data = await res.json();
        if (isMounted) {
          setRows(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        if (isMounted) {
          setError("Unable to load data. Please try again.");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    load();
    return () => {
      isMounted = false;
    };
  }, [endpoint, refreshKey]);

  const allColumns = rows.length ? Object.keys(rows[0]) : [];
  const columns = Array.isArray(preferredColumns) && preferredColumns.length
    ? preferredColumns.filter((col) => allColumns.includes(col))
    : allColumns;
  const hasActions = showActions;

  const handleEdit = (row) => {
    if (typeof onEdit === "function") {
      onEdit(row);
      return;
    }
    window.alert("Edit action is not wired yet.");
  };

  const handleDelete = (row) => {
    if (typeof onDelete === "function") {
      onDelete(row);
      return;
    }
    window.alert("Delete action is not wired yet.");
  };

  const handleView = (row) => {
    setViewRow(row);
  };

  const formatLabel = (key) => {
    if (columnLabels && columnLabels[key]) {
      return columnLabels[key];
    }
    return key
      .split("_")
      .map((part) => (part ? part[0].toUpperCase() + part.slice(1) : part))
      .join(" ");
  };

  const shouldShowInView = (key) =>
    !Array.isArray(viewExclude) || !viewExclude.includes(key);

  return (
    <div className="data-card">
      <div className="data-card-header">
        <h2>{title}</h2>
        {onAdd ? (
          <button
            type="button"
            className="action-btn add"
            onClick={() => onAdd()}
          >
            {addLabel}
          </button>
        ) : null}
      </div>

      {loading ? (
        <div className="data-state">Loading...</div>
      ) : error ? (
        <div className="data-state error">{error}</div>
      ) : rows.length === 0 ? (
        <div className="data-state">No data available.</div>
      ) : (
        <div className="data-table">

          <table>
            <thead>
              <tr>
                {columns.map((col) => (
                  <th key={col}>{formatLabel(col)}</th>
                ))}
                {hasActions ? <th className="data-actions">{actionLabel}</th> : null}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => (
                <tr key={idx}>
                  {columns.map((col) => (
                    <td key={col}>{String(row[col] ?? "")}</td>
                  ))}
                  {hasActions ? (
                    <td className="data-actions">
                      <button
                        type="button"
                        className="action-btn view"
                        onClick={() => handleView(row)}
                      >
                        View
                      </button>
                      <button
                        type="button"
                        className="action-btn edit"
                        onClick={() => handleEdit(row)}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="action-btn delete"
                        onClick={() => handleDelete(row)}
                      >
                        Delete
                      </button>
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>

          </table>

        </div>
      )}

      {viewRow ? (
        <div className="data-modal-backdrop" role="presentation" onClick={() => setViewRow(null)}>
          <div
            className="data-modal"
            role="dialog"
            aria-modal="true"
            onClick={(event) => event.stopPropagation()}
          >

            <div className="data-modal-header">
              <h3>{title} Details</h3>
              <button
                type="button"
                className="modal-close"
                aria-label="Close"
                onClick={() => setViewRow(null)}
              >
                X
              </button>
            </div>

            <div className="data-modal-body">
              {Object.entries(viewRow)
                .filter(([key]) => shouldShowInView(key))
                .map(([key, value]) => (
                  <div className="data-modal-row" key={key}>
                    <span className="data-modal-key">{formatLabel(key)}</span>
                    <span className="data-modal-value">{String(value ?? "")}</span>
                  </div>
                ))}
            </div>

          </div>
        </div>
        
      ) : null}
    </div>
  );
};

export default DataTable;
















