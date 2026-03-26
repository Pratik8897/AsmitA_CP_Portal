import { useEffect, useMemo, useState } from "react";
import AdminLayout from "../components/AdminLayout";
import DataFormModal from "../components/DataFormModal";
import "./PropertyDashboard.css";

const toBool = (value) => {
  if (value === true || value === 1) return true;
  if (value === false || value === 0) return false;
  if (typeof value === "string") {
    const lowered = value.trim().toLowerCase();
    if (["true", "yes", "y", "1"].includes(lowered)) return true;
    if (["false", "no", "n", "0"].includes(lowered)) return false;
  }
  return null;
};

const getCaseInsensitive = (row, key) => {
  if (!row) return undefined;
  if (Object.prototype.hasOwnProperty.call(row, key)) {
    return row[key];
  }
  const lower = key.toLowerCase();
  const match = Object.keys(row).find((k) => k.toLowerCase() === lower);
  return match ? row[match] : undefined;
};

const getFirstValue = (row, keys) => {
  for (const key of keys) {
    const value = getCaseInsensitive(row, key);
    if (value !== undefined && value !== null && value !== "") {
      return value;
    }
  }
  return undefined;
};

const getUnitStatus = (unit) => {
  const statusValue = getFirstValue(unit, [
    "status",
    "unit_status",
    "availability",
    "booking_status",
    "bookingStatus",
  ]);
  const isAvailable = toBool(getFirstValue(unit, ["is_available", "available"]));
  const isSold = toBool(getFirstValue(unit, ["is_sold", "sold"]));
  const isBooked = toBool(getFirstValue(unit, ["is_booked", "booked"]));

  if (isSold || isBooked) {
    return { label: "Booked", category: "booked" };
  }
  if (isAvailable) {
    return { label: "Available", category: "available" };
  }

  if (typeof statusValue === "string" || typeof statusValue === "number") {
    const raw = String(statusValue).trim();
    if (!raw) {
      return { label: "Unknown", category: "unknown" };
    }
    const lowered = raw.toLowerCase();
    if (lowered.includes("avail") || lowered.includes("open") || lowered.includes("vacant")) {
      return { label: raw, category: "available" };
    }
    if (
      lowered.includes("sold") ||
      lowered.includes("book") ||
      lowered.includes("block") ||
      lowered.includes("hold") ||
      lowered.includes("reserv")
    ) {
      return { label: raw, category: "booked" };
    }
    if (lowered.includes("cancel") || lowered.includes("inactive") || lowered.includes("close")) {
      return { label: raw, category: "unavailable" };
    }
    return { label: raw, category: "unknown" };
  }

  return { label: "Unknown", category: "unknown" };
};

const getUnitLabel = (unit) =>
  getFirstValue(unit, [
    "unit_number",
    "unit_no",
    "unit",
    "flat_no",
    "flat_number",
    "name",
    "unit_name",
  ]) ||
  unit?.id ||
  "-";

const getUnitPrice = (unit) =>
  getFirstValue(unit, ["base_price", "price", "total_price", "quoted_price"]);

const getUnitArea = (unit) => getFirstValue(unit, ["area", "carpet_area", "super_area"]);

const getProjectId = (unit) =>
  getFirstValue(unit, ["project_id", "projectId", "project", "projectid"]);

const getWingId = (unit) => getFirstValue(unit, ["wing_id", "wingId", "wing", "wingid"]);

const getProjectName = (project) =>
  getFirstValue(project, ["name", "project_name", "title"]) || project?.id || "-";

const getWingName = (wing) =>
  getFirstValue(wing, ["name", "wing_name", "title"]) || wing?.id || "-";

const PropertyDashboard = () => {
  const [projects, setProjects] = useState([]);
  const [wings, setWings] = useState([]);
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedUnit, setSelectedUnit] = useState(null);
  const [filters, setFilters] = useState({
    projectId: "",
    wingId: "",
    status: "",
    search: "",
    availableOnly: false,
  });

  const [isWingOpen, setIsWingOpen] = useState(false);
  const [isUnitOpen, setIsUnitOpen] = useState(false);
  const [isProjectOpen, setIsProjectOpen] = useState(false);
  const [wingError, setWingError] = useState("");
  const [unitError, setUnitError] = useState("");
  const [projectError, setProjectError] = useState("");
  const [savingWing, setSavingWing] = useState(false);
  const [savingUnit, setSavingUnit] = useState(false);
  const [savingProject, setSavingProject] = useState(false);

  const [wingForm, setWingForm] = useState({
    name: "",
    project_id: "",
    status: "Active",
    is_active: "1",
  });

  const [unitForm, setUnitForm] = useState({
    unit_number: "",
    project_id: "",
    wing_id: "",
    floor_number: "",
    status: "Available",
    base_price: "",
    is_active: "1",
  });

  const [projectForm, setProjectForm] = useState({
    name: "",
    status: "Ongoing",
    area: "",
    address: "",
    brochure_link: "",
    location_link: "",
    construction_percent: "",
    is_active: "1",
  });

  const apiBase = process.env.REACT_APP_API_BASE || "http://localhost:5000";

  useEffect(() => {
    let isMounted = true;
    const loadAll = async () => {
      setLoading(true);
      setError("");
      try {
        const [projectsRes, wingsRes, unitsRes] = await Promise.all([
          fetch(`${apiBase}/api/projects`, { credentials: "include" }),
          fetch(`${apiBase}/api/wings`, { credentials: "include" }),
          fetch(`${apiBase}/api/units`, { credentials: "include" }),
        ]);

        if (!projectsRes.ok || !wingsRes.ok || !unitsRes.ok) {
          throw new Error("Failed to fetch property data");
        }

        const [projectsData, wingsData, unitsData] = await Promise.all([
          projectsRes.json(),
          wingsRes.json(),
          unitsRes.json(),
        ]);

        if (isMounted) {
          setProjects(Array.isArray(projectsData) ? projectsData : []);
          setWings(Array.isArray(wingsData) ? wingsData : []);
          setUnits(Array.isArray(unitsData) ? unitsData : []);
        }
      } catch (err) {
        if (isMounted) {
          setError("Unable to load property data. Please try again.");
          setProjects([]);
          setWings([]);
          setUnits([]);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadAll();
    return () => {
      isMounted = false;
    };
  }, [apiBase]);

  const projectMap = useMemo(() => {
    const map = new Map();
    projects.forEach((project) => {
      map.set(String(project?.id ?? ""), getProjectName(project));
    });
    return map;
  }, [projects]);

  const wingMap = useMemo(() => {
    const map = new Map();
    wings.forEach((wing) => {
      map.set(String(wing?.id ?? ""), getWingName(wing));
    });
    return map;
  }, [wings]);

  const enrichedUnits = useMemo(
    () =>
      units.map((unit) => {
        const status = getUnitStatus(unit);
        return {
          ...unit,
          _statusLabel: status.label,
          _statusCategory: status.category,
          _projectId: getProjectId(unit),
          _wingId: getWingId(unit),
          _unitLabel: getUnitLabel(unit),
        };
      }),
    [units]
  );

  const filteredUnits = useMemo(() => {
    return enrichedUnits.filter((unit) => {
      if (filters.projectId && String(unit._projectId ?? "") !== String(filters.projectId)) {
        return false;
      }
      if (filters.wingId && String(unit._wingId ?? "") !== String(filters.wingId)) {
        return false;
      }
      if (filters.status && unit._statusCategory !== filters.status) {
        return false;
      }
      if (filters.availableOnly && unit._statusCategory !== "available") {
        return false;
      }
      if (filters.search) {
        const query = filters.search.toLowerCase();
        const label = String(unit._unitLabel ?? "").toLowerCase();
        const id = String(unit?.id ?? "").toLowerCase();
        if (!label.includes(query) && !id.includes(query)) {
          return false;
        }
      }
      return true;
    });
  }, [enrichedUnits, filters]);

  const totals = useMemo(() => {
    const summary = {
      total: enrichedUnits.length,
      available: 0,
      booked: 0,
      unavailable: 0,
      unknown: 0,
    };
    enrichedUnits.forEach((unit) => {
      summary[unit._statusCategory] += 1;
    });
    return summary;
  }, [enrichedUnits]);

  const leaderboard = useMemo(() => {
    const map = new Map();
    enrichedUnits.forEach((unit) => {
      const projectId = String(unit._projectId ?? "unknown");
      if (!map.has(projectId)) {
        map.set(projectId, {
          id: projectId,
          name: projectMap.get(String(projectId)) || "Unmapped Project",
          total: 0,
          available: 0,
          booked: 0,
          unavailable: 0,
          unknown: 0,
        });
      }
      const entry = map.get(projectId);
      entry.total += 1;
      entry[unit._statusCategory] += 1;
    });
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [enrichedUnits, projectMap]);

  const handleWingChange = (event) => {
    const { name, value } = event.target;
    setWingForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleUnitChange = (event) => {
    const { name, value } = event.target;
    setUnitForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleProjectChange = (event) => {
    const { name, value } = event.target;
    setProjectForm((prev) => ({ ...prev, [name]: value }));
  };

  const refreshUnits = async () => {
    try {
      const res = await fetch(`${apiBase}/api/units`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch units");
      const data = await res.json();
      setUnits(Array.isArray(data) ? data : []);
    } catch (err) {
      setError("Unable to load property data. Please try again.");
    }
  };

  const refreshWings = async () => {
    try {
      const res = await fetch(`${apiBase}/api/wings`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch wings");
      const data = await res.json();
      setWings(Array.isArray(data) ? data : []);
    } catch (err) {
      setError("Unable to load property data. Please try again.");
    }
  };

  const refreshProjects = async () => {
    try {
      const res = await fetch(`${apiBase}/api/projects`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch projects");
      const data = await res.json();
      setProjects(Array.isArray(data) ? data : []);
    } catch (err) {
      setError("Unable to load property data. Please try again.");
    }
  };

  const handleWingSubmit = async (event) => {
    event.preventDefault();
    setWingError("");
    if (!wingForm.name.trim()) {
      setWingError("Wing name is required.");
      return;
    }

    setSavingWing(true);
    try {
      const payload = {
        ...wingForm,
        wing_name: wingForm.name,
        projectId: wingForm.project_id,
      };
      const res = await fetch(`${apiBase}/api/wings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        throw new Error("Failed to create wing");
      }
      setIsWingOpen(false);
      setWingForm({
        name: "",
        project_id: "",
        status: "Active",
        is_active: "1",
      });
      await refreshWings();
    } catch (err) {
      setWingError("Unable to add wing. Please verify the fields and try again.");
    } finally {
      setSavingWing(false);
    }
  };

  const handleUnitSubmit = async (event) => {
    event.preventDefault();
    setUnitError("");
    if (!unitForm.unit_number.trim()) {
      setUnitError("Unit number is required.");
      return;
    }

    setSavingUnit(true);
    try {
      const payload = {
        ...unitForm,
        unit_no: unitForm.unit_number,
        unit_name: unitForm.unit_number,
        projectId: unitForm.project_id,
        wingId: unitForm.wing_id,
        availability: unitForm.status,
      };
      const res = await fetch(`${apiBase}/api/units`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        throw new Error("Failed to create unit");
      }
      setIsUnitOpen(false);
      setUnitForm({
        unit_number: "",
        project_id: "",
        wing_id: "",
        floor_number: "",
        status: "Available",
        base_price: "",
        is_active: "1",
      });
      await refreshUnits();
    } catch (err) {
      setUnitError("Unable to add unit. Please verify the fields and try again.");
    } finally {
      setSavingUnit(false);
    }
  };

  const handleProjectSubmit = async (event) => {
    event.preventDefault();
    setProjectError("");
    if (!projectForm.name.trim()) {
      setProjectError("Project name is required.");
      return;
    }

    setSavingProject(true);
    try {
      const res = await fetch(`${apiBase}/api/projects`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(projectForm),
      });
      if (!res.ok) {
        throw new Error("Failed to create project");
      }
      setIsProjectOpen(false);
      setProjectForm({
        name: "",
        status: "Ongoing",
        area: "",
        address: "",
        brochure_link: "",
        location_link: "",
        construction_percent: "",
        is_active: "1",
      });
      await refreshProjects();
    } catch (err) {
      setProjectError("Unable to add project. Please verify the fields and try again.");
    } finally {
      setSavingProject(false);
    }
  };

  return (
    <AdminLayout
      title="Property Dashboard"
      subtitle="Track projects, wings, and unit availability"
    >
      <div className="property-dashboard">
        <section className="property-hero">
          <div>
            <p className="property-hero-title">Portfolio at a glance</p>
            <p className="property-hero-subtitle">
              Monitor units, create wings, and spot availability gaps quickly.
            </p>
          </div>
          <div className="property-hero-actions">
            <button className="action-btn add" type="button" onClick={() => setIsProjectOpen(true)}>
              Add Project
            </button>
            <button className="action-btn add" type="button" onClick={() => setIsWingOpen(true)}>
              Add Wing
            </button>
            <button className="action-btn add" type="button" onClick={() => setIsUnitOpen(true)}>
              Add Unit
            </button>
          </div>
        </section>

        {loading ? (
          <div className="property-state">Loading property data...</div>
        ) : error ? (
          <div className="property-state error">{error}</div>
        ) : (
          <>
            <section className="property-summary">
              <div className="property-card">
                <p>Total Units</p>
                <h3>{totals.total}</h3>
                <span>Across all projects</span>
              </div>
              <div className="property-card available">
                <p>Available Units</p>
                <h3>{totals.available}</h3>
                <span>Ready to allocate</span>
              </div>
              <div className="property-card booked">
                <p>Booked / Sold</p>
                <h3>{totals.booked}</h3>
                <span>Committed inventory</span>
              </div>
              <div className="property-card muted">
                <p>Unknown Status</p>
                <h3>{totals.unknown}</h3>
                <span>Needs review</span>
              </div>
            </section>

            <section className="property-filters">
              <div className="filter-grid">
                <label>
                  Project
                  <select
                    value={filters.projectId}
                    onChange={(event) =>
                      setFilters((prev) => ({ ...prev, projectId: event.target.value }))
                    }
                  >
                    <option value="">All Projects</option>
                    {projects.map((project) => (
                      <option key={project.id} value={project.id}>
                        {getProjectName(project)}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Wing
                  <select
                    value={filters.wingId}
                    onChange={(event) =>
                      setFilters((prev) => ({ ...prev, wingId: event.target.value }))
                    }
                  >
                    <option value="">All Wings</option>
                    {wings.map((wing) => (
                      <option key={wing.id} value={wing.id}>
                        {getWingName(wing)}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Status
                  <select
                    value={filters.status}
                    onChange={(event) =>
                      setFilters((prev) => ({ ...prev, status: event.target.value }))
                    }
                  >
                    <option value="">All Status</option>
                    <option value="available">Available</option>
                    <option value="booked">Booked</option>
                    <option value="unavailable">Unavailable</option>
                    <option value="unknown">Unknown</option>
                  </select>
                </label>
                <label>
                  Search Unit
                  <input
                    type="text"
                    placeholder="Unit number or ID"
                    value={filters.search}
                    onChange={(event) =>
                      setFilters((prev) => ({ ...prev, search: event.target.value }))
                    }
                  />
                </label>
              </div>
              <label className="filter-toggle">
                <input
                  type="checkbox"
                  checked={filters.availableOnly}
                  onChange={(event) =>
                    setFilters((prev) => ({ ...prev, availableOnly: event.target.checked }))
                  }
                />
                Show only available units
              </label>
            </section>

            <section className="property-grid">
              <div className="property-panel">
                <div className="panel-header">
                  <h3>Project Leaderboard</h3>
                  <span>{leaderboard.length} projects</span>
                </div>
                <div className="panel-table">
                  <div className="panel-row header">
                    <span>Project</span>
                    <span>Total</span>
                    <span>Available</span>
                    <span>Booked</span>
                  </div>
                  {leaderboard.length ? (
                    leaderboard.map((entry) => (
                      <div className="panel-row" key={entry.id}>
                        <span>{entry.name}</span>
                        <span>{entry.total}</span>
                        <span>{entry.available}</span>
                        <span>{entry.booked}</span>
                      </div>
                    ))
                  ) : (
                    <div className="panel-empty">No units found.</div>
                  )}
                </div>
              </div>

              <div className="property-panel">
                <div className="panel-header">
                  <h3>Units Left</h3>
                  <span>
                    {filteredUnits.filter((unit) => unit._statusCategory === "available").length} units
                  </span>
                </div>
                <div className="panel-table">
                  <div className="panel-row header">
                    <span>Unit</span>
                    <span>Project</span>
                    <span>Wing</span>
                    <span>Status</span>
                    <span>Price</span>
                  </div>
                  {filteredUnits.filter((unit) => unit._statusCategory === "available").length ? (
                    filteredUnits
                      .filter((unit) => unit._statusCategory === "available")
                      .slice(0, 12)
                      .map((unit) => (
                      <button
                        type="button"
                        className="panel-row panel-row-click"
                        key={unit.id ?? unit._unitLabel}
                        onClick={() => setSelectedUnit(unit)}
                      >
                        <span>{unit._unitLabel}</span>
                        <span>
                          {projectMap.get(String(unit._projectId ?? "")) || "-"}
                        </span>
                        <span>{wingMap.get(String(unit._wingId ?? "")) || "-"}</span>
                        <span className={`status-pill ${unit._statusCategory}`}>
                          {unit._statusLabel}
                        </span>
                        <span>{getUnitPrice(unit) ?? "-"}</span>
                      </button>
                    ))
                  ) : (
                    <div className="panel-empty">No matching units.</div>
                  )}
                </div>
              </div>
            </section>

            <section className="property-panel full">
              <div className="panel-header">
                <h3>All Units Snapshot</h3>
                <span>{filteredUnits.length} records</span>
              </div>
              <div className="panel-table">
                <div className="panel-row header">
                  <span>Unit</span>
                  <span>Area</span>
                  <span>Floor</span>
                  <span>Project</span>
                  <span>Wing</span>
                  <span>Status</span>
                </div>
                {filteredUnits.length ? (
                  filteredUnits.map((unit) => (
                    <button
                      type="button"
                      className="panel-row panel-row-click"
                      key={`full-${unit.id ?? unit._unitLabel}`}
                      onClick={() => setSelectedUnit(unit)}
                    >
                      <span>{unit._unitLabel}</span>
                      <span>{getUnitArea(unit) ?? "-"}</span>
                      <span>{getFirstValue(unit, ["floor_number", "floor"]) ?? "-"}</span>
                      <span>
                        {projectMap.get(String(unit._projectId ?? "")) || "-"}
                      </span>
                      <span>{wingMap.get(String(unit._wingId ?? "")) || "-"}</span>
                      <span className={`status-pill ${unit._statusCategory}`}>
                        {unit._statusLabel}
                      </span>
                    </button>
                  ))
                ) : (
                  <div className="panel-empty">No matching units.</div>
                )}
              </div>
            </section>
          </>
        )}
      </div>

      {selectedUnit ? (
        <div className="unit-modal-backdrop" role="presentation" onClick={() => setSelectedUnit(null)}>
          <div
            className="unit-modal"
            role="dialog"
            aria-modal="true"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="unit-modal-header">
              <h3>Unit Details</h3>
              <button
                type="button"
                className="modal-close"
                aria-label="Close"
                onClick={() => setSelectedUnit(null)}
              >
                X
              </button>
            </div>
            <div className="unit-modal-body">
              <div className="unit-modal-row">
                <span>Unit</span>
                <strong>{selectedUnit._unitLabel}</strong>
              </div>
              <div className="unit-modal-row">
                <span>Project</span>
                <strong>{projectMap.get(String(selectedUnit._projectId ?? "")) || "-"}</strong>
              </div>
              <div className="unit-modal-row">
                <span>Wing</span>
                <strong>{wingMap.get(String(selectedUnit._wingId ?? "")) || "-"}</strong>
              </div>
              <div className="unit-modal-row">
                <span>Status</span>
                <strong className={`status-pill ${selectedUnit._statusCategory}`}>
                  {selectedUnit._statusLabel}
                </strong>
              </div>
              <div className="unit-modal-row">
                <span>Price</span>
                <strong>{getUnitPrice(selectedUnit) ?? "-"}</strong>
              </div>
              <div className="unit-modal-row">
                <span>Area</span>
                <strong>{getUnitArea(selectedUnit) ?? "-"}</strong>
              </div>
              <div className="unit-modal-row">
                <span>Floor</span>
                <strong>{getFirstValue(selectedUnit, ["floor_number", "floor"]) ?? "-"}</strong>
              </div>
              <div className="unit-modal-row">
                <span>Unit ID</span>
                <strong>{selectedUnit?.id ?? "-"}</strong>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <DataFormModal
        title="Add Wing"
        isOpen={isWingOpen}
        onClose={() => setIsWingOpen(false)}
        onSubmit={handleWingSubmit}
        saving={savingWing}
        error={wingError}
        submitLabel="Save Wing"
      >
        <label>
          Wing Name *
          <input
            type="text"
            name="name"
            value={wingForm.name}
            onChange={handleWingChange}
            required
          />
        </label>
        <label>
          Project
          <select name="project_id" value={wingForm.project_id} onChange={handleWingChange}>
            <option value="">Select Project</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {getProjectName(project)}
              </option>
            ))}
          </select>
        </label>
        <label>
          Status
          <input
            type="text"
            name="status"
            value={wingForm.status}
            onChange={handleWingChange}
          />
        </label>
        <label>
          Active
          <select name="is_active" value={wingForm.is_active} onChange={handleWingChange}>
            <option value="1">Yes</option>
            <option value="0">No</option>
          </select>
        </label>
      </DataFormModal>

      <DataFormModal
        title="Add Project"
        isOpen={isProjectOpen}
        onClose={() => setIsProjectOpen(false)}
        onSubmit={handleProjectSubmit}
        saving={savingProject}
        error={projectError}
        submitLabel="Save Project"
      >
        <label>
          Project Name *
          <input
            type="text"
            name="name"
            value={projectForm.name}
            onChange={handleProjectChange}
            required
          />
        </label>
        <label>
          Status
          <input
            type="text"
            name="status"
            value={projectForm.status}
            onChange={handleProjectChange}
          />
        </label>
        <label>
          Area
          <input
            type="text"
            name="area"
            value={projectForm.area}
            onChange={handleProjectChange}
          />
        </label>
        <label>
          Address
          <input
            type="text"
            name="address"
            value={projectForm.address}
            onChange={handleProjectChange}
          />
        </label>
        <label>
          Brochure Link
          <input
            type="text"
            name="brochure_link"
            value={projectForm.brochure_link}
            onChange={handleProjectChange}
          />
        </label>
        <label>
          Location Link
          <input
            type="text"
            name="location_link"
            value={projectForm.location_link}
            onChange={handleProjectChange}
          />
        </label>
        <label>
          Construction %
          <input
            type="number"
            name="construction_percent"
            value={projectForm.construction_percent}
            onChange={handleProjectChange}
            min="0"
            max="100"
          />
        </label>
        <label>
          Active
          <select
            name="is_active"
            value={projectForm.is_active}
            onChange={handleProjectChange}
          >
            <option value="1">Yes</option>
            <option value="0">No</option>
          </select>
        </label>
      </DataFormModal>

      <DataFormModal
        title="Add Unit"
        isOpen={isUnitOpen}
        onClose={() => setIsUnitOpen(false)}
        onSubmit={handleUnitSubmit}
        saving={savingUnit}
        error={unitError}
        submitLabel="Save Unit"
      >
        <label>
          Unit Number *
          <input
            type="text"
            name="unit_number"
            value={unitForm.unit_number}
            onChange={handleUnitChange}
            required
          />
        </label>
        <label>
          Project
          <select name="project_id" value={unitForm.project_id} onChange={handleUnitChange}>
            <option value="">Select Project</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {getProjectName(project)}
              </option>
            ))}
          </select>
        </label>
        <label>
          Wing
          <select name="wing_id" value={unitForm.wing_id} onChange={handleUnitChange}>
            <option value="">Select Wing</option>
            {wings.map((wing) => (
              <option key={wing.id} value={wing.id}>
                {getWingName(wing)}
              </option>
            ))}
          </select>
        </label>
        <label>
          Floor Number
          <input
            type="text"
            name="floor_number"
            value={unitForm.floor_number}
            onChange={handleUnitChange}
          />
        </label>
        <label>
          Status
          <input
            type="text"
            name="status"
            value={unitForm.status}
            onChange={handleUnitChange}
          />
        </label>
        <label>
          Base Price
          <input
            type="number"
            name="base_price"
            value={unitForm.base_price}
            onChange={handleUnitChange}
            step="0.01"
          />
        </label>
        <label>
          Active
          <select name="is_active" value={unitForm.is_active} onChange={handleUnitChange}>
            <option value="1">Yes</option>
            <option value="0">No</option>
          </select>
        </label>
      </DataFormModal>
    </AdminLayout>
  );
};

export default PropertyDashboard;
