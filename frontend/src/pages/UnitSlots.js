import { useEffect, useMemo, useState } from "react";
import AdminLayout from "../components/AdminLayout";
import UnitTiles from "../components/UnitTiles";
import "./UnitSlots.css";

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

const UnitSlots = () => {
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
          throw new Error("Failed to fetch unit slots");
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
          setError("Unable to load unit slots. Please try again.");
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

  return (
    <AdminLayout title="Unit Slots" subtitle="Clickable unit slots with detail view">
      <div className="unit-slots">
        <section className="unit-slots-filters">
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
        </section>

        {loading ? (
          <div className="unit-slots-state">Loading unit slots...</div>
        ) : error ? (
          <div className="unit-slots-state error">{error}</div>
        ) : filteredUnits.length === 0 ? (
          <div className="unit-slots-state">No units match your filters.</div>
        ) : (
          <UnitTiles
            units={filteredUnits}
            projectMap={projectMap}
            wingMap={wingMap}
            onSelect={setSelectedUnit}
            getFloor={(unit) => getFirstValue(unit, ["floor_number", "floor"]) ?? "-"}
            getPrice={(unit) => getUnitPrice(unit) ?? "-"}
          />
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
    </AdminLayout>
  );
};

export default UnitSlots;
