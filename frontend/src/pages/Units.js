import { useEffect, useMemo, useState } from "react";
import AdminLayout from "../components/AdminLayout";
import DataTable from "../components/DataTable";
import DataFormModal from "../components/DataFormModal";

const getFirstValue = (row, keys) => {
  for (const key of keys) {
    if (row && Object.prototype.hasOwnProperty.call(row, key) && row[key] !== null && row[key] !== "") {
      return row[key];
    }
  }
  return "";
};

const Units = () => {
  const [projects, setProjects] = useState([]);
  const [wings, setWings] = useState([]);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [editError, setEditError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [formData, setFormData] = useState({
    unit_number: "",
    project_id: "",
    wing_id: "",
    floor_number: "",
    status: "Available",
    base_price: "",
    is_active: "1",
  });
  const [editData, setEditData] = useState({
    id: "",
    unit_label: "",
    status: "",
    base_price: "",
    is_active: "1",
  });

  const apiBase = process.env.REACT_APP_API_BASE || "http://localhost:5000";

  useEffect(() => {
    let isMounted = true;
    const loadLists = async () => {
      try {
        const [projectsRes, wingsRes] = await Promise.all([
          fetch(`${apiBase}/api/projects`, { credentials: "include" }),
          fetch(`${apiBase}/api/wings`, { credentials: "include" }),
        ]);

        if (projectsRes.ok) {
          const data = await projectsRes.json();
          if (isMounted) setProjects(Array.isArray(data) ? data : []);
        }

        if (wingsRes.ok) {
          const data = await wingsRes.json();
          if (isMounted) setWings(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        if (isMounted) {
          setProjects([]);
          setWings([]);
        }
      }
    };

    loadLists();
    return () => {
      isMounted = false;
    };
  }, [apiBase]);

  const projectOptions = useMemo(
    () => projects.map((project) => ({ id: project.id, name: project.name || project.project_name || project.id })),
    [projects]
  );

  const wingOptions = useMemo(
    () => wings.map((wing) => ({ id: wing.id, name: wing.name || wing.wing_name || wing.id })),
    [wings]
  );

  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleEditChange = (event) => {
    const { name, value } = event.target;
    setEditData((prev) => ({ ...prev, [name]: value }));
  };

  const handleAddSubmit = async (event) => {
    event.preventDefault();
    setFormError("");

    if (!formData.unit_number.trim()) {
      setFormError("Unit number is required.");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ...formData,
        unit_no: formData.unit_number,
        unit_name: formData.unit_number,
        projectId: formData.project_id,
        wingId: formData.wing_id,
        availability: formData.status,
        price: formData.base_price,
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
      setIsAddOpen(false);
      setFormData({
        unit_number: "",
        project_id: "",
        wing_id: "",
        floor_number: "",
        status: "Available",
        base_price: "",
        is_active: "1",
      });
      setRefreshKey((prev) => prev + 1);
    } catch (error) {
      setFormError("Unable to add unit. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleEditSubmit = async (event) => {
    event.preventDefault();
    setEditError("");

    if (!editData.id) {
      setEditError("Unable to determine unit id.");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        base_price: editData.base_price,
        price: editData.base_price,
        status: editData.status,
        availability: editData.status,
        is_active: editData.is_active,
      };
      const res = await fetch(`${apiBase}/api/units/${editData.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        throw new Error("Failed to update unit");
      }
      setIsEditOpen(false);
      setRefreshKey((prev) => prev + 1);
    } catch (error) {
      setEditError("Unable to update unit. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (row) => {
    const label = getFirstValue(row, [
      "unit_number",
      "unit_no",
      "unit",
      "flat_no",
      "flat_number",
      "name",
      "unit_name",
    ]);
    setEditData({
      id: row?.id ?? "",
      unit_label: label || row?.id || "",
      status: getFirstValue(row, ["status", "availability", "unit_status"]) || "",
      base_price: getFirstValue(row, ["base_price", "price", "total_price"]) || "",
      is_active: getFirstValue(row, ["is_active"]) || "1",
    });
    setIsEditOpen(true);
  };

  return (
    <AdminLayout title="Units" subtitle="Create and update unit pricing">
      <DataTable
        title="Units"
        endpoint="/api/units"
        onAdd={() => setIsAddOpen(true)}
        addLabel="Add Unit"
        onEdit={handleEdit}
        columns={["unit_number", "unit_no", "unit_name", "status", "base_price", "price", "is_active"]}
        columnLabels={{
          unit_number: "Unit",
          unit_no: "Unit",
          unit_name: "Unit",
          status: "Status",
          base_price: "Base Price",
          price: "Price",
          is_active: "Active",
        }}
        viewExclude={["id"]}
        refreshKey={refreshKey}
      />

      <DataFormModal
        title="Add Unit"
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        onSubmit={handleAddSubmit}
        saving={saving}
        error={formError}
        submitLabel="Save Unit"
      >
        <label>
          Unit Number *
          <input
            type="text"
            name="unit_number"
            value={formData.unit_number}
            onChange={handleInputChange}
            required
          />
        </label>
        <label>
          Project
          <select name="project_id" value={formData.project_id} onChange={handleInputChange}>
            <option value="">Select Project</option>
            {projectOptions.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Wing
          <select name="wing_id" value={formData.wing_id} onChange={handleInputChange}>
            <option value="">Select Wing</option>
            {wingOptions.map((wing) => (
              <option key={wing.id} value={wing.id}>
                {wing.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Floor Number
          <input
            type="text"
            name="floor_number"
            value={formData.floor_number}
            onChange={handleInputChange}
          />
        </label>
        <label>
          Status
          <input
            type="text"
            name="status"
            value={formData.status}
            onChange={handleInputChange}
          />
        </label>
        <label>
          Base Price
          <input
            type="number"
            name="base_price"
            value={formData.base_price}
            onChange={handleInputChange}
            step="0.01"
          />
        </label>
        <label>
          Active
          <select name="is_active" value={formData.is_active} onChange={handleInputChange}>
            <option value="1">Yes</option>
            <option value="0">No</option>
          </select>
        </label>
      </DataFormModal>

      <DataFormModal
        title={`Edit Unit${editData.unit_label ? `: ${editData.unit_label}` : ""}`}
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        onSubmit={handleEditSubmit}
        saving={saving}
        error={editError}
        submitLabel="Update Unit"
      >
        <label>
          Status
          <input
            type="text"
            name="status"
            value={editData.status}
            onChange={handleEditChange}
          />
        </label>
        <label>
          Base Price
          <input
            type="number"
            name="base_price"
            value={editData.base_price}
            onChange={handleEditChange}
            step="0.01"
          />
        </label>
        <label>
          Active
          <select name="is_active" value={editData.is_active} onChange={handleEditChange}>
            <option value="1">Yes</option>
            <option value="0">No</option>
          </select>
        </label>
      </DataFormModal>
    </AdminLayout>
  );
};

export default Units;
