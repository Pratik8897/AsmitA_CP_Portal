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
  valueFormatter,
  viewExclude = [],
  refreshKey = 0,
  showActions = true,
  idField = "id",
  deleteEndpoint = "",
}) => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [viewRow, setViewRow] = useState(null);
  const apiBase = process.env.REACT_APP_API_BASE || "http://localhost:5000";

  useEffect(() => {
    let isMounted = true;
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

  const handleDelete = async (row) => {
    if (typeof onDelete === "function") {
      onDelete(row);
      return;
    }
    const id = row?.[idField];
    if (!id) {
      window.alert("Unable to find record id.");
      return;
    }
    const confirmed = window.confirm("Delete this record? This cannot be undone.");
    if (!confirmed) return;

    try {
      const target = deleteEndpoint || endpoint;
      const res = await fetch(`${apiBase}${target}/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) {
        throw new Error("Delete failed");
      }
      setRows((prev) => prev.filter((item) => item?.[idField] !== id));
    } catch (err) {
      window.alert("Unable to delete record. Please try again.");
    }
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

  const resolveValue = (key, value, row) => {
    if (typeof valueFormatter === "function") {
      const formatted = valueFormatter(key, value, row);
      if (formatted !== null && formatted !== undefined) {
        return formatted;
      }
    }
    return value ?? "";
  };

  const resolveUrl = (value) => {
    if (!value) return "";
    const raw = String(value);
    if (raw.startsWith("http") || raw.startsWith("data:")) return raw;
    if (raw.startsWith("/")) return `${apiBase}${raw}`;
    return raw;
  };

  const getFirstValue = (row, keys) => {
    for (const key of keys) {
      if (row && Object.prototype.hasOwnProperty.call(row, key) && row[key] !== null && row[key] !== "") {
        return row[key];
      }
    }
    return "";
  };

  const imageKeys = [
    "profile_image_url",
    "profile_image",
    "profile_pic",
    "avatar",
    "image",
    "image_url",
    "photo",
    "photo_url",
    "logo",
    "logo_url",
  ];

  const pdfKeys = ["rera_certificate_path", "certificate", "pdf", "document", "doc_url"];

  const getViewTitle = (row) => {
    const fullName =
      [row?.first_name, row?.last_name].filter(Boolean).join(" ").trim() ||
      getFirstValue(row, ["name", "customer_name", "unit_name", "unit_number", "unit_no", "project_name", "title"]);
    return fullName || row?.id || title;
  };

  const getViewSubtitle = (row) =>
    getFirstValue(row, ["email", "phone", "customer_phone", "customer_email"]);

  const getStatusInfo = (row) => {
    const isActive = getFirstValue(row, ["is_active"]);
    if (isActive !== "") {
      const active = String(isActive) === "1" || String(isActive).toLowerCase() === "true";
      return { label: active ? "Active" : "Inactive", className: active ? "active" : "inactive" };
    }
    const temp = getFirstValue(row, ["lead_temperature"]);
    if (temp) {
      const lowered = String(temp).toLowerCase();
      const cls = lowered.includes("hot")
        ? "temp-hot"
        : lowered.includes("warm")
        ? "temp-warm"
        : lowered.includes("cold")
        ? "temp-cold"
        : "temp-unknown";
      return { label: String(temp), className: cls };
    }
    const status = getFirstValue(row, ["status"]);
    if (status) {
      return { label: String(status), className: "" };
    }
    return null;
  };

  const isImageValue = (key, value) => {
    if (!value || typeof value !== "string") return false;
    const lowered = key.toLowerCase();
    if (imageKeys.some((k) => lowered.includes(k.replace(/_/g, "")) || lowered.includes(k))) return true;
    return /\.(png|jpe?g|gif|webp|svg)$/i.test(value);
  };

  const isPdfValue = (key, value) => {
    if (!value || typeof value !== "string") return false;
    const lowered = key.toLowerCase();
    if (pdfKeys.some((k) => lowered.includes(k.replace(/_/g, "")) || lowered.includes(k))) return true;
    return /\.pdf$/i.test(value);
  };

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
        <div className="data-loader-overlay" aria-live="polite">
          <div className="data-state loader">
            <span className="data-spinner" aria-hidden="true" />
            Loading...
          </div>
        </div>
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
                    <td key={col}>{String(resolveValue(col, row[col], row))}</td>
                  ))}
                  {hasActions ? (
                    <td className="data-actions">
                      <button
                        type="button"
                        className="action-btn view"
                        onClick={() => handleView(row)}
                      >
                        <span className="action-btn-icon" aria-hidden="true">
                          <svg viewBox="0 0 24 24">
                            <path d="M12 5c-5.23 0-9.27 3.11-11 7 1.73 3.89 5.77 7 11 7s9.27-3.11 11-7c-1.73-3.89-5.77-7-11-7zm0 11a4 4 0 1 1 0-8 4 4 0 0 1 0 8z" />
                          </svg>
                        </span>
                        View
                      </button>
                      <button
                        type="button"
                        className="action-btn edit"
                        onClick={() => handleEdit(row)}
                      >
                        <span className="action-btn-icon" aria-hidden="true">
                          <svg viewBox="0 0 24 24">
                            <path d="M3 17.25V21h3.75L19.81 7.94l-3.75-3.75L3 17.25zM21.41 6.34a1.25 1.25 0 0 0 0-1.77l-2.98-2.98a1.25 1.25 0 0 0-1.77 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
                          </svg>
                        </span>
                        Edit
                      </button>
                      <button
                        type="button"
                        className="action-btn delete"
                        onClick={() => handleDelete(row)}
                      >
                        <span className="action-btn-icon" aria-hidden="true">
                          <svg viewBox="0 0 24 24">
                            <path d="M6 7h12l-1 14H7L6 7zm3-3h6l1 2H8l1-2z" />
                          </svg>
                        </span>
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

            <div className="data-modal-body view-theme">
              <div className="view-hero">
                <div className="view-title-wrap">
                  <div className="view-logo-card">
                    {(() => {
                      const imageValue = getFirstValue(viewRow, imageKeys);
                      if (imageValue) {
                        return (
                          <img
                            className="view-logo"
                            src={resolveUrl(imageValue)}
                            alt="Profile"
                          />
                        );
                      }
                      return <div className="view-logo" />;
                    })()}
                  </div>
                  <div>
                    <div className="view-title">{getViewTitle(viewRow)}</div>
                    {getViewSubtitle(viewRow) ? (
                      <div className="view-subtitle">{getViewSubtitle(viewRow)}</div>
                    ) : null}
                  </div>
                </div>
                {getStatusInfo(viewRow) ? (
                  <span className={`view-status ${getStatusInfo(viewRow).className || ""}`}>
                    <span className="view-status-dot" />
                    {getStatusInfo(viewRow).label}
                  </span>
                ) : null}
              </div>

              <div className="data-view-grid">
                {Object.entries(viewRow)
                  .filter(([key]) => shouldShowInView(key))
                  .map(([key, value]) => {
                    const displayValue = resolveValue(key, value, viewRow);
                    if (isImageValue(key, value)) {
                      const src = resolveUrl(value);
                      return (
                        <div className="data-view-card full" key={key}>
                          <div className="data-view-key">{formatLabel(key)}</div>
                          <img className="data-preview" src={src} alt={formatLabel(key)} />
                        </div>
                      );
                    }
                    if (isPdfValue(key, value)) {
                      const href = resolveUrl(value);
                      return (
                        <div className="data-view-card full" key={key}>
                          <div className="data-view-key">{formatLabel(key)}</div>
                          <a className="data-link" href={href} target="_blank" rel="noreferrer">
                            Open Document
                          </a>
                          <iframe className="data-pdf-preview" title={formatLabel(key)} src={href} />
                        </div>
                      );
                    }
                    return (
                      <div className="data-view-card" key={key}>
                        <div className="data-view-key">{formatLabel(key)}</div>
                        <div className="data-view-value">{String(displayValue)}</div>
                      </div>
                    );
                  })}
              </div>
            </div>

          </div>
        </div>
        
      ) : null}
    </div>
  );
};

export default DataTable;








