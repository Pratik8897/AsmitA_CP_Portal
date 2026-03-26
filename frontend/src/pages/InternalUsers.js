import { useEffect, useState } from "react";
import AdminLayout from "../components/AdminLayout";
import DataTable from "../components/DataTable";
import DataFormModal from "../components/DataFormModal";

const InternalUsers = () => {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [enumOptions, setEnumOptions] = useState({});
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    role: "",
    designation: "",
    department: "",
    is_active: "1",
    password_hash: "",
  });

  const apiBase = process.env.REACT_APP_API_BASE || "http://localhost:5000";

  useEffect(() => {
    let isMounted = true;
    const loadEnums = async () => {
      try {
        const res = await fetch(`${apiBase}/api/enums/internal-users`, {
          credentials: "include",
        });
        if (!res.ok) {
          throw new Error("No enums");
        }
        const data = await res.json();
        if (isMounted) {
          setEnumOptions(data && typeof data === "object" ? data : {});
        }
      } catch (error) {
        if (isMounted) {
          setEnumOptions({});
        }
      }
    };
    loadEnums();
    return () => {
      isMounted = false;
    };
  }, [apiBase]);

  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const resetForm = () => {
    setSaving(false);
    setFormError("");
    setFormData({
      name: "",
      email: "",
      phone: "",
      role: "",
      designation: "",
      department: "",
      is_active: "1",
      password_hash: "",
    });
  };

  const handleAddSubmit = async (event) => {
    event.preventDefault();
    setFormError("");

    if (!formData.name.trim()) {
      setFormError("Name is required.");
      return;
    }
    if (!formData.email.trim()) {
      setFormError("Email is required.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`${apiBase}/api/internal-users`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(formData),
      });
      if (!res.ok) {
        throw new Error("Failed to create internal user");
      }
      setIsAddOpen(false);
      resetForm();
      setRefreshKey((prev) => prev + 1);
    } catch (error) {
      setFormError("Unable to add internal user. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminLayout title="User Management" subtitle="All internal user records">
      <DataTable
        title="Users"
        endpoint="/api/internal-users"
        onAdd={() => {
          resetForm();
          setIsAddOpen(true);
        }}
        addLabel="Add New User"
        columns={["name", "email", "phone", "role", "is_active"]}
        columnLabels={{
          name: "Name",
          email: "Email",
          phone: "Phone",
          role: "Role",
          designation: "Designation",
          department: "Department",
          is_active: "Active",
        }}
        viewExclude={[]}
        refreshKey={refreshKey}
      />

      <DataFormModal
        title="Add Internal User"
        isOpen={isAddOpen}
        onClose={() => {
          setIsAddOpen(false);
          resetForm();
        }}
        onSubmit={handleAddSubmit}
        saving={saving}
        error={formError}
        submitLabel="Save User"
      >
        <label>
          Name *
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleInputChange}
            required
          />
        </label>
        <label>
          Email *
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleInputChange}
            required
          />
        </label>
        <label>
          Phone
          <input
            type="text"
            name="phone"
            value={formData.phone}
            onChange={handleInputChange}
          />
        </label>
        <label>
          Role
          {Array.isArray(enumOptions?.role) && enumOptions.role.length ? (
            <select name="role" value={formData.role} onChange={handleInputChange}>
              <option value="">Select</option>
              {enumOptions.role.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          ) : (
            <input
              type="text"
              name="role"
              value={formData.role}
              onChange={handleInputChange}
            />
          )}
        </label>
        <label>
          Designation
          <input
            type="text"
            name="designation"
            value={formData.designation}
            onChange={handleInputChange}
          />
        </label>
        <label>
          Department
          {Array.isArray(enumOptions?.department) && enumOptions.department.length ? (
            <select
              name="department"
              value={formData.department}
              onChange={handleInputChange}
            >
              <option value="">Select</option>
              {enumOptions.department.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          ) : (
            <input
              type="text"
              name="department"
              value={formData.department}
              onChange={handleInputChange}
            />
          )}
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
        <label>
          Password
          <input
            type="password"
            name="password_hash"
            value={formData.password_hash}
            onChange={handleInputChange}
            placeholder="Enter password"
          />
        </label>
      </DataFormModal>
    </AdminLayout>
  );
};

export default InternalUsers;
