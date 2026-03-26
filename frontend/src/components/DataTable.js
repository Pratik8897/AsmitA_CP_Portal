import { useEffect, useMemo, useState } from "react";
import Select from "react-select";
import "./DataTable.css";
import DataFormModal from "./DataFormModal";

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
  valueFormatter = null,
  viewExclude = [],
  refreshKey = 0,
  showActions = true,
  editExclude = [],
  editSelectOptions = {},
  idField = "id",
}) => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [viewRow, setViewRow] = useState(null);
  const [editRow, setEditRow] = useState(null);
  const [editData, setEditData] = useState({});
  const [editError, setEditError] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [uploadingEdit, setUploadingEdit] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [enumOptions, setEnumOptions] = useState({});

  useEffect(() => {
    let isMounted = true;
    const apiBase = process.env.REACT_APP_API_BASE || "http://localhost:5000";

    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await fetch(`${apiBase}${endpoint}`, { credentials: "include" });
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

  useEffect(() => {
    let isMounted = true;
    const apiBase = process.env.REACT_APP_API_BASE || "http://localhost:5000";
    const resource = endpoint.replace(/^\/?api\//, "").split("/")[0];
    const loadEnums = async () => {
      try {
        const res = await fetch(`${apiBase}/api/enums/${resource}`, {
          credentials: "include",
        });
        if (!res.ok) {
          throw new Error("No enums");
        }
        const data = await res.json();
        if (isMounted) {
          setEnumOptions(data && typeof data === "object" ? data : {});
        }
      } catch (err) {
        if (isMounted) {
          setEnumOptions({});
        }
      }
    };
    loadEnums();
    return () => {
      isMounted = false;
    };
  }, [endpoint]);

  const allColumns = rows.length ? Object.keys(rows[0]) : [];
  const columns = Array.isArray(preferredColumns) && preferredColumns.length
    ? preferredColumns.filter((col) => allColumns.includes(col))
    : allColumns;
  const hasActions = showActions;
  const apiBase = process.env.REACT_APP_API_BASE || "http://localhost:5000";
  const menuPortalTarget = typeof document !== "undefined" ? document.body : null;

  const editExcludedFields = useMemo(
    () => Array.from(new Set([idField, "created_at", "updated_at", ...editExclude])),
    [editExclude, idField]
  );

  const editableFields = useMemo(
    () => allColumns.filter((col) => !editExcludedFields.includes(col)),
    [allColumns, editExcludedFields]
  );

  const handleEdit = (row) => {
    if (typeof onEdit === "function") {
      onEdit(row);
      return;
    }
    setEditRow(row);
    setEditData({ ...row });
    setEditError("");
  };

  const handleDelete = (row) => {
    if (typeof onDelete === "function") {
      onDelete(row);
      return;
    }
    const id = row?.[idField];
    if (!id) {
      window.alert("Unable to deactivate: missing record id.");
      return;
    }
    const resource = endpoint.replace(/^\/?api\//, "").split("/")[0];
    const confirmDeactivate = window.confirm("Deactivate this record?");
    if (!confirmDeactivate) {
      return;
    }
    fetch(`${apiBase}/api/${resource}/${id}/deactivate`, {
      method: "PUT",
      credentials: "include",
    })
      .then((res) => {
        if (!res.ok) throw new Error("Deactivate failed");
        setRows((prev) =>
          prev.map((item) =>
            item[idField] === id ? { ...item, is_active: 0 } : item
          )
        );
      })
      .catch(() => {
        window.alert("Unable to deactivate. Please try again.");
      });
  };

  const handleView = (row) => {
    setViewRow(row);
  };

  const formatValue = (value) => {
    if (value === null || value === undefined) {
      return "";
    }
    if (typeof value === "object") {
      try {
        return JSON.stringify(value);
      } catch (err) {
        return String(value);
      }
    }
    return String(value);
  };

  const resolveAssetUrl = (value) => {
    const text = String(value || "");
    if (!text) return "";
    if (text.startsWith("http://") || text.startsWith("https://")) return text;
    if (text.startsWith("/")) return `${apiBase}${text}`;
    return text;
  };

  const defaultProfileImage =
    "data:image/svg+xml;utf8,%3Csvg%20xmlns%3D'http%3A//www.w3.org/2000/svg'%20viewBox%3D'0%200%2080%2080'%3E%3Crect%20width%3D'80'%20height%3D'80'%20rx%3D'16'%20fill%3D'%23e2e8f0'/%3E%3Ccircle%20cx%3D'40'%20cy%3D'30'%20r%3D'16'%20fill%3D'%2394a3b8'/%3E%3Cpath%20d%3D'M16%2066c0-12%2010.7-22%2024-22h0c13.3%200%2024%2010%2024%2022'%20fill%3D'%2394a3b8'/%3E%3C/svg%3E";

  const isPdf = (value) => {
    const text = String(value || "").toLowerCase();
    return text.endsWith(".pdf");
  };

  const isImageField = (key) =>
    key.toLowerCase().includes("image") || key.toLowerCase().includes("photo");

  const isDateField = (key) =>
    key.toLowerCase() === "created_at" || key.toLowerCase() === "updated_at";

  const formatDateTime = (value) => {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return new Intl.DateTimeFormat("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(date);
  };

  const renderCellValue = (key, value, variant = "table", row = null) => {
    if (typeof valueFormatter === "function") {
      const formatted = valueFormatter(key, value, row);
      if (formatted !== undefined && formatted !== null && formatted !== "") {
        return formatted;
      }
    }
    const text = formatValue(value);
    if (!text) {
      if (isImageField(key) && key === "profile_image_url") {
        return (
          <img
            className={variant === "table" ? "data-thumb" : "data-preview"}
            src={defaultProfileImage}
            alt="Default profile"
            loading="lazy"
          />
        );
      }
      return "";
    }
    if (isDateField(key)) {
      return formatDateTime(text);
    }
    if (isImageField(key)) {
      const src = resolveAssetUrl(text);
      if (variant === "modal" && key === "profile_image_url") {
        return (
          <a className="data-link" href={src} target="_blank" rel="noreferrer">
            View Image
          </a>
        );
      }
      return (
        <img
          className={variant === "table" ? "data-thumb" : "data-preview"}
          src={src}
          alt={`${formatLabel(key)} preview`}
          loading="lazy"
        />
      );
    }
    if (isPdf(text)) {
      const href = resolveAssetUrl(text);
      return (
        <a className="data-link" href={href} target="_blank" rel="noreferrer">
          View PDF
        </a>
      );
    }
    return text;
  };

  const handleEditChange = (event, key) => {
    const { value } = event.target;
    setEditData((prev) => ({ ...prev, [key]: value }));
  };

  const handleEditSubmit = async (event) => {
    event.preventDefault();
    if (!editRow) {
      return;
    }
    const id = editRow[idField];
    if (!id) {
      setEditError("Unable to update: missing record id.");
      return;
    }
    setSavingEdit(true);
    setEditError("");

    const payload = {};
    editableFields.forEach((field) => {
      if (Object.prototype.hasOwnProperty.call(editData, field)) {
        const value = editData[field];
        payload[field] = value === "" ? null : value;
      }
    });

    try {
      const res = await fetch(`${apiBase}${endpoint}/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        throw new Error("Update failed");
      }
      setRows((prev) =>
        prev.map((row) =>
          row[idField] === id ? { ...row, ...payload } : row
        )
      );
      setEditRow(null);
      setEditData({});
    } catch (err) {
      setEditError("Unable to update. Please try again.");
    } finally {
      setSavingEdit(false);
    }
  };

  const handleEditFileChange = async (event, field) => {
    const file = event.target.files && event.target.files[0];
    if (!file) {
      return;
    }
    if (file.type !== "application/pdf") {
      setUploadError("Only PDF files are allowed.");
      return;
    }
    if (!endpoint.includes("channel-partners")) {
      setUploadError("Upload is not configured for this table.");
      return;
    }
    setUploadingEdit(true);
    setUploadError("");
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch(`${apiBase}/api/channel-partners/rera-upload`, {
        method: "POST",
        credentials: "include",
        body: form,
      });
      if (!res.ok) {
        throw new Error("Upload failed");
      }
      const data = await res.json();
      setEditData((prev) => ({
        ...prev,
        [field]: data.publicUrl || data.path || "",
      }));
    } catch (err) {
      setUploadError("Unable to upload PDF. Please try again.");
    } finally {
      setUploadingEdit(false);
    }
  };

  const handleEditProfileFileChange = async (event, field) => {
    const file = event.target.files && event.target.files[0];
    if (!file) {
      return;
    }
    if (!file.type.startsWith("image/")) {
      setUploadError("Only image files are allowed.");
      return;
    }
    if (!endpoint.includes("channel-partners")) {
      setUploadError("Upload is not configured for this table.");
      return;
    }
    setUploadingEdit(true);
    setUploadError("");
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch(`${apiBase}/api/channel-partners/profile-upload`, {
        method: "POST",
        credentials: "include",
        body: form,
      });
      if (!res.ok) {
        throw new Error("Upload failed");
      }
      const data = await res.json();
      setEditData((prev) => ({
        ...prev,
        [field]: data.publicUrl || data.path || "",
      }));
    } catch (err) {
      setUploadError("Unable to upload image. Please try again.");
    } finally {
      setUploadingEdit(false);
    }
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
                    <td key={col} data-label={formatLabel(col)}>
                      {renderCellValue(col, row[col], "table", row)}
                    </td>
                  ))}
                  {hasActions ? (
                    <td className="data-actions">
                      <button
                        type="button"
                        className="action-btn view"
                        aria-label="View"
                        title="View"
                        onClick={() => handleView(row)}
                      >
                        <span className="action-btn-icon" aria-hidden="true">
                          <svg viewBox="0 0 24 24" role="img" focusable="false">
                            <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7zm10 3a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" />
                          </svg>
                        </span>
                      </button>
                      <button
                        type="button"
                        className="action-btn edit"
                        aria-label="Edit"
                        title="Edit"
                        onClick={() => handleEdit(row)}
                      >
                        <span className="action-btn-icon" aria-hidden="true">
                          <svg viewBox="0 0 24 24" role="img" focusable="false">
                            <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.46 7.04a1.003 1.003 0 0 0 0-1.42l-2.08-2.08a1.003 1.003 0 0 0-1.42 0l-1.62 1.62 3.75 3.75 1.37-1.87z" />
                          </svg>
                        </span>
                      </button>
                      <button
                        type="button"
                        className="action-btn delete"
                        aria-label="Delete"
                        title="Delete"
                        onClick={() => handleDelete(row)}
                      >
                        <span className="action-btn-icon" aria-hidden="true">
                          <svg viewBox="0 0 24 24" role="img" focusable="false">
                            <path d="M6 7h12l-1 14H7L6 7zm3-3h6l1 2H8l1-2z" />
                          </svg>
                        </span>
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
                  <img
                    className="view-logo"
                    src={
                      viewRow?.profile_image_url
                        ? resolveAssetUrl(viewRow.profile_image_url)
                        : defaultProfileImage
                    }
                    alt={viewRow?.profile_image_url ? "Profile" : "Default profile"}
                  />
                  </div>
                  <div>
                    <div className="view-title">
                      {endpoint.includes("leads")
                        ? viewRow?.customer_name || `${title} Profile`
                        : endpoint.includes("internal-users")
                          ? viewRow?.name || `${title} Profile`
                          : [viewRow?.first_name, viewRow?.last_name].filter(Boolean).join(" ") ||
                            `${title} Profile`}
                    </div>
                    <div className="view-subtitle">
                      {endpoint.includes("leads")
                        ? viewRow?.customer_phone || viewRow?.customer_email || "Full record details"
                        : endpoint.includes("internal-users")
                          ? viewRow?.phone || viewRow?.email || "Full record details"
                          : viewRow?.phone || viewRow?.email || "Full record details"}
                    </div>
                  </div>
                </div>
                {(() => {
                  if (endpoint.includes("leads")) {
                    const temp = String(viewRow?.lead_temperature || "").toLowerCase();
                    const label = temp === "hot" || temp === "warm" || temp === "cold"
                      ? temp
                      : "unknown";
                    return (
                      <div className={`view-status temp-${label}`}>
                        <span className="view-status-dot" />
                        {label}
                      </div>
                    );
                  }
                  const raw = viewRow?.is_active;
                  const isActive =
                    String(raw ?? "").toLowerCase() === "1" ||
                    String(raw ?? "").toLowerCase() === "true";
                  return (
                    <div className={`view-status ${isActive ? "active" : "inactive"}`}>
                      <span className="view-status-dot" />
                      {isActive ? "Active" : "Inactive"}
                    </div>
                  );
                })()}
              </div>
              <div className="data-view-grid">
                {Object.entries(viewRow)
                  .filter(([key]) => shouldShowInView(key) && key !== "rera_certificate_path")
                  .map(([key, value]) => (
                    <div className="data-view-card" key={key}>
                      <div className="data-view-key">{formatLabel(key)}</div>
                      <div className="data-view-value">
                        {renderCellValue(key, value, "modal", viewRow)}
                        {isPdf(value) ? (
                          <iframe
                            className="data-pdf-preview"
                            src={resolveAssetUrl(value)}
                            title={`${formatLabel(key)} PDF`}
                          />
                        ) : null}
                      </div>
                    </div>
                  ))}
                {viewRow?.rera_certificate_path ? (
                  <div className="data-view-card full" key="rera_certificate_path">
                    <div className="data-view-key">{formatLabel("rera_certificate_path")}</div>
                    <div className="data-view-value">
                      {renderCellValue(
                        "rera_certificate_path",
                        viewRow.rera_certificate_path,
                        "modal",
                        viewRow
                      )}
                      {isPdf(viewRow.rera_certificate_path) ? (
                        <iframe
                          className="data-pdf-preview"
                          src={resolveAssetUrl(viewRow.rera_certificate_path)}
                          title={`${formatLabel("rera_certificate_path")} PDF`}
                        />
                      ) : null}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <DataFormModal
        title={`Edit ${title}`}
        isOpen={!!editRow}
        onClose={() => {
          setEditRow(null);
          setEditData({});
          setEditError("");
          setUploadError("");
        }}
        onSubmit={handleEditSubmit}
        saving={savingEdit}
        error={editError}
        submitLabel="Save Changes"
      >
        {editableFields.map((field) => {
          if (Array.isArray(editSelectOptions?.[field]) && editSelectOptions[field].length) {
            const options = editSelectOptions[field];
            const selectedOption =
              options.find(
                (option) => String(option.value) === String(editData[field])
              ) || null;
            return (
              <label key={field}>
                {formatLabel(field)}
                <Select
                  classNamePrefix="edit-select"
                  className="edit-select"
                  placeholder="Select"
                  options={options}
                  value={selectedOption}
                  onChange={(option) =>
                    setEditData((prev) => ({
                      ...prev,
                      [field]: option ? option.value : "",
                    }))
                  }
                  isClearable
                  menuPortalTarget={menuPortalTarget}
                  menuPosition="fixed"
                  menuPlacement="auto"
                  styles={{
                    menuPortal: (base) => ({ ...base, zIndex: 2000 }),
                    menu: (base) => ({
                      ...base,
                      zIndex: 2000,
                      backgroundColor: "#ffffff",
                    }),
                  }}
                />
              </label>
            );
          }
          if (Array.isArray(enumOptions?.[field]) && enumOptions[field].length) {
            return (
              <label key={field}>
                {formatLabel(field)}
                <select
                  value={formatValue(editData[field])}
                  onChange={(event) => handleEditChange(event, field)}
                >
                  <option value="">Select</option>
                  {enumOptions[field].map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
            );
          }
          if (field === "profile_image_url") {
            return (
              <label key={field}>
                {formatLabel(field)}
                {editData[field] ? (
                  <img
                    className="data-preview"
                    src={resolveAssetUrl(editData[field])}
                    alt={`${formatLabel(field)} preview`}
                  />
                ) : (
                  <div className="data-state">No image uploaded.</div>
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={(event) => handleEditProfileFileChange(event, field)}
                />
                {uploadingEdit ? (
                  <div className="data-state">Uploading...</div>
                ) : null}
                {uploadError ? <div className="data-form-error">{uploadError}</div> : null}
              </label>
            );
          }
          if (field === "rera_certificate_path") {
            return (
              <label key={field}>
                {formatLabel(field)}
                {editData[field] ? (
                  <a
                    className="data-link"
                    href={resolveAssetUrl(editData[field])}
                    target="_blank"
                    rel="noreferrer"
                  >
                    View PDF
                  </a>
                ) : (
                  <div className="data-state">No file uploaded.</div>
                )}
                {editData[field] ? (
                  <iframe
                    className="data-pdf-preview"
                    src={resolveAssetUrl(editData[field])}
                    title={`${formatLabel(field)} PDF`}
                  />
                ) : null}
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={(event) => handleEditFileChange(event, field)}
                />
                {uploadingEdit ? (
                  <div className="data-state">Uploading...</div>
                ) : null}
                {uploadError ? <div className="data-form-error">{uploadError}</div> : null}
              </label>
            );
          }
          return (
            <label key={field}>
              {formatLabel(field)}
              <input
                type={typeof editData[field] === "number" ? "number" : "text"}
                value={formatValue(editData[field])}
                onChange={(event) => handleEditChange(event, field)}
              />
            </label>
          );
        })}
      </DataFormModal>
    </div>
  );
};

export default DataTable;

