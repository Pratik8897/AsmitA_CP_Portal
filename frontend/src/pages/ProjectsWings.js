import { useState } from "react";
import AdminLayout from "../components/AdminLayout";
import DataTable from "../components/DataTable";
import DataFormModal from "../components/DataFormModal";

const ProjectsWings = () => {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [formData, setFormData] = useState({
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

  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleAddSubmit = async (event) => {
    event.preventDefault();
    setFormError("");

    if (!formData.name.trim()) {
      setFormError("Project name is required.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`${apiBase}/api/projects`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(formData),
      });
      if (!res.ok) {
        throw new Error("Failed to create project");
      }
      setIsAddOpen(false);
      setFormData({
        name: "",
        status: "Ongoing",
        area: "",
        address: "",
        brochure_link: "",
        location_link: "",
        construction_percent: "",
        is_active: "1",
      });
      setRefreshKey((prev) => prev + 1);
    } catch (error) {
      setFormError("Unable to add project. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminLayout title="Projects" subtitle="All project records">
      <DataTable
        title="Projects"
        endpoint="/api/projects"
        onAdd={() => setIsAddOpen(true)}
        addLabel="Add New Project"
        columns={["name", "status", "area", "is_active", "construction_percent"]}
        columnLabels={{
          name: "Project Name",
          status: "Status",
          area: "Area",
          is_active: "Active",
          construction_percent: "Construction %",
          address: "Address",
          brochure_link: "Brochure Link",
          location_link: "Location Link",
        }}
        viewExclude={["id", "images"]}
        refreshKey={refreshKey}
      />

      <DataFormModal
        title="Add Project"
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        onSubmit={handleAddSubmit}
        saving={saving}
        error={formError}
        submitLabel="Save Project"
      >
        <label>
          Project Name *
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleInputChange}
            required
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
          Area
          <input
            type="text"
            name="area"
            value={formData.area}
            onChange={handleInputChange}
          />
        </label>
        <label>
          Address
          <input
            type="text"
            name="address"
            value={formData.address}
            onChange={handleInputChange}
          />
        </label>
        <label>
          Brochure Link
          <input
            type="text"
            name="brochure_link"
            value={formData.brochure_link}
            onChange={handleInputChange}
          />
        </label>
        <label>
          Location Link
          <input
            type="text"
            name="location_link"
            value={formData.location_link}
            onChange={handleInputChange}
          />
        </label>
        <label>
          Construction %
          <input
            type="number"
            name="construction_percent"
            value={formData.construction_percent}
            onChange={handleInputChange}
            min="0"
            max="100"
          />
        </label>
        <label>
          Active
          <select
            name="is_active"
            value={formData.is_active}
            onChange={handleInputChange}
          >
            <option value="1">Yes</option>
            <option value="0">No</option>
          </select>
        </label>
      </DataFormModal>
    </AdminLayout>
  );
};

export default ProjectsWings;
