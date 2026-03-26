import { useEffect, useMemo, useState } from "react";
import AdminLayout from "../components/AdminLayout";
import DataTable from "../components/DataTable";
import DataFormModal from "../components/DataFormModal";
import Select from "react-select";

const Leads = () => {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [editError, setEditError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [formData, setFormData] = useState({
    cp_id: "",
    customer_name: "",
    customer_phone: "",
    customer_email: "",
    base_price: "",
    pitched_price: "",
    status: "Shared",
    lead_temperature: "Warm",
  });
  const [editData, setEditData] = useState({
    id: "",
    cp_id: "",
    customer_name: "",
    customer_phone: "",
    customer_email: "",
    base_price: "",
    pitched_price: "",
    status: "Shared",
    lead_temperature: "Warm",
    assigned_to: "",
  });
  const [channelPartners, setChannelPartners] = useState([]);
  const [salesUsers, setSalesUsers] = useState([]);

  const apiBase = process.env.REACT_APP_API_BASE || "http://localhost:5000";
  const menuPortalTarget =
    typeof document !== "undefined" ? document.body : null;

  useEffect(() => {
    let isMounted = true;
    const loadChannelPartners = async () => {
      try {
        const res = await fetch(`${apiBase}/api/channel-partners`, {
          credentials: "include",
        });
        if (!res.ok) {
          throw new Error("Failed to fetch channel partners");
        }
        const data = await res.json();
        if (isMounted) {
          setChannelPartners(Array.isArray(data) ? data : []);
        }
      } catch (error) {
        if (isMounted) {
          setChannelPartners([]);
        }
      }
    };

    loadChannelPartners();
    return () => {
      isMounted = false;
    };
  }, [apiBase]);

  useEffect(() => {
    let isMounted = true;
    const loadSalesUsers = async () => {
      try {
        const res = await fetch(`${apiBase}/api/sales-users`, {
          credentials: "include",
        });
        if (!res.ok) {
          throw new Error("Failed to fetch internal users");
        }
        const data = await res.json();
        if (isMounted) {
          const list = Array.isArray(data) ? data : [];
          const onlySales = list.filter((user) => {
            const role = String(user?.role || "").toLowerCase();
            return role.includes("sales");
          });
          setSalesUsers(onlySales);
        }
      } catch (error) {
        if (isMounted) {
          setSalesUsers([]);
        }
      }
    };

    loadSalesUsers();
    return () => {
      isMounted = false;
    };
  }, [apiBase]);

  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleEditChange = (event) => {
    const { name, value } = event.target;
    setEditData((prev) => ({ ...prev, [name]: value }));
  };

  const cpOptions = useMemo(
    () =>
      channelPartners.map((cp) => {
        const name = cp?.first_name ? String(cp.first_name).trim() : "CP";
        return {
          value: cp.id,
          label: `${name} - ${cp?.id ?? ""}`,
        };
      }),
    [channelPartners]
  );

  const cpNameById = useMemo(() => {
    const map = new Map();
    channelPartners.forEach((cp) => {
      const first = cp?.first_name ? String(cp.first_name).trim() : "";
      const last = cp?.last_name ? String(cp.last_name).trim() : "";
      const name = [first, last].filter(Boolean).join(" ").trim() || "CP";
      map.set(String(cp?.id ?? ""), name);
    });
    return map;
  }, [channelPartners]);

  const salesNameById = useMemo(() => {
    const map = new Map();
    salesUsers.forEach((user) => {
      const first = user?.first_name ? String(user.first_name).trim() : "";
      const last = user?.last_name ? String(user.last_name).trim() : "";
      const name =
        String(user?.name || "").trim() ||
        [first, last].filter(Boolean).join(" ").trim() ||
        "Sales";
      map.set(String(user?.id ?? ""), name);
    });
    return map;
  }, [salesUsers]);

  const selectedCpOption =
    cpOptions.find((option) => String(option.value) === String(formData.cp_id)) || null;
  const selectedEditCpOption =
    cpOptions.find((option) => String(option.value) === String(editData.cp_id)) || null;

  const salesUserOptions = useMemo(
    () =>
      salesUsers.map((user) => {
        const first = user?.first_name ? String(user.first_name).trim() : "";
        const last = user?.last_name ? String(user.last_name).trim() : "";
        const name =
          String(user?.name || "").trim() ||
          [first, last].filter(Boolean).join(" ").trim() ||
          "Sales";
        return {
          value: user.id,
          label: `${name} - ${user?.id ?? ""}`,
        };
      }),
    [salesUsers]
  );

  const selectedEditAssignedOption =
    salesUserOptions.find((option) => String(option.value) === String(editData.assigned_to)) || null;

  const handleAddSubmit = async (event) => {
    event.preventDefault();
    setFormError("");

    if (!formData.customer_name.trim()) {
      setFormError("Customer name is required.");
      return;
    }
    if (!formData.customer_phone.trim()) {
      setFormError("Customer phone is required.");
      return;
    }
    if (!formData.customer_email.trim()) {
      setFormError("Customer email is required.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`${apiBase}/api/leads`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(formData),
      });
      if (!res.ok) {
        throw new Error("Failed to create lead");
      }
      setIsAddOpen(false);
      setFormData({
        cp_id: "",
        customer_name: "",
        customer_phone: "",
        customer_email: "",
        base_price: "",
        pitched_price: "",
        status: "Shared",
        lead_temperature: "Warm",
      });
      setRefreshKey((prev) => prev + 1);
    } catch (error) {
      setFormError("Unable to add lead. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (row) => {
    setEditError("");
    setEditData({
      id: row?.id ?? "",
      cp_id: row?.cp_id ?? "",
      customer_name: row?.customer_name ?? "",
      customer_phone: row?.customer_phone ?? "",
      customer_email: row?.customer_email ?? "",
      base_price: row?.base_price ?? "",
      pitched_price: row?.pitched_price ?? "",
      status: row?.status ?? "Shared",
      lead_temperature: row?.lead_temperature ?? "Warm",
      assigned_to: row?.assigned_to ?? "",
    });
    setIsEditOpen(true);
  };

  const handleEditSubmit = async (event) => {
    event.preventDefault();
    setEditError("");
    if (!editData.id) {
      setEditError("Unable to determine lead id.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`${apiBase}/api/leads/${editData.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(editData),
      });
      if (!res.ok) {
        throw new Error("Failed to update lead");
      }
      setIsEditOpen(false);
      setRefreshKey((prev) => prev + 1);
    } catch (error) {
      setEditError("Unable to update lead. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminLayout title="Leads" subtitle="All lead records from the database">
      <DataTable
        title="Leads"
        endpoint="/api/leads"
        onAdd={() => setIsAddOpen(true)}
        addLabel="Add New Lead"
        onEdit={handleEdit}
        columns={[
          "customer_name",
          "customer_phone",
          "customer_email",
          "base_price",
          "pitched_price",
        ]}
        columnLabels={{
          id: "Lead ID",
          cp_id: "Channel Partner ID",
          customer_name: "Customer Name",
          customer_phone: "Customer Phone",
          customer_email: "Customer Email",
          wing_id: "Wing ID",
          floor_number: "Floor Number",
          typology_id: "Typology ID",
          payment_plan_id: "Payment Plan ID",
          base_price: "Base Price",
          pitched_price: "Pitched Price",
          expected_commission_pct: "Expected Commission %",
          status: "Status",
          created_at: "Created At",
          project_id: "Project ID",
          unit_id: "Unit ID",
          lead_temperature: "Lead Temperature",
          assigned_to: "Assigned To",
        }}
        valueFormatter={(key, value, row) => {
          if (key === "cp_id") {
            const id = value ?? "";
            const name = cpNameById.get(String(id));
            return name ? `${name} - ${id}` : String(id);
          }
          if (key === "assigned_to") {
            const id = value ?? "";
            const directName = row?.assigned_to_name;
            if (directName) {
              return `${directName} - ${id}`;
            }
            const name = salesNameById.get(String(id));
            return name ? `${name} - ${id}` : String(id);
          }
          return null;
        }}
        editSelectOptions={{
          assigned_to: salesUserOptions,
        }}
        viewExclude={["id", "typology_id", "created_at", "project_id", "assigned_to_name"]}
        refreshKey={refreshKey}
      />

      <DataFormModal
        title="Add Lead"
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        onSubmit={handleAddSubmit}
        saving={saving}
        error={formError}
        submitLabel="Save Lead"
      >
        <label>
          Channel Partner
          <Select
            classNamePrefix="cp-select"
            className="cp-select"
            placeholder="Type name (e.g., Rushis - 12)"
            options={cpOptions}
            value={selectedCpOption}
            onChange={(option) =>
              setFormData((prev) => ({
                ...prev,
                cp_id: option ? String(option.value) : "",
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
        <label>
          Customer Name *
          <input
            type="text"
            name="customer_name"
            value={formData.customer_name}
            onChange={handleInputChange}
            required
          />
        </label>
        <label>
          Phone *
          <input
            type="text"
            name="customer_phone"
            value={formData.customer_phone}
            onChange={handleInputChange}
            required
          />
        </label>
        <label>
          Email *
          <input
            type="email"
            name="customer_email"
            value={formData.customer_email}
            onChange={handleInputChange}
            required
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
          Pitched Price
          <input
            type="number"
            name="pitched_price"
            value={formData.pitched_price}
            onChange={handleInputChange}
            step="0.01"
          />
        </label>
        <label>
          Status
          <select
            name="status"
            value={formData.status}
            onChange={handleInputChange}
          >
            <option value="Shared">Shared</option>
            <option value="Site Visit">Site Visit</option>
            <option value="Negotiation">Negotiation</option>
            <option value="Booked">Booked</option>
            <option value="Lost">Lost</option>
          </select>
        </label>
        <label>
          Lead Temperature
          <select
            name="lead_temperature"
            value={formData.lead_temperature}
            onChange={handleInputChange}
          >
            <option value="Hot">Hot</option>
            <option value="Warm">Warm</option>
            <option value="Cold">Cold</option>
          </select>
        </label>
      </DataFormModal>

      <DataFormModal
        title="Edit Lead"
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        onSubmit={handleEditSubmit}
        saving={saving}
        error={editError}
        submitLabel="Update Lead"
      >
        <label>
          Channel Partner
          <Select
            classNamePrefix="cp-select"
            className="cp-select"
            placeholder="Type name (e.g., Rushis - 12)"
            options={cpOptions}
            value={selectedEditCpOption}
            onChange={(option) =>
              setEditData((prev) => ({
                ...prev,
                cp_id: option ? String(option.value) : "",
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
        <label>
          Assigned To
          <Select
            classNamePrefix="edit-select"
            className="edit-select"
            placeholder="Select sales user"
            options={salesUserOptions}
            value={selectedEditAssignedOption}
            onChange={(option) =>
              setEditData((prev) => ({
                ...prev,
                assigned_to: option ? String(option.value) : "",
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
        <label>
          Customer Name *
          <input
            type="text"
            name="customer_name"
            value={editData.customer_name}
            onChange={handleEditChange}
            required
          />
        </label>
        <label>
          Phone *
          <input
            type="text"
            name="customer_phone"
            value={editData.customer_phone}
            onChange={handleEditChange}
            required
          />
        </label>
        <label>
          Email *
          <input
            type="email"
            name="customer_email"
            value={editData.customer_email}
            onChange={handleEditChange}
            required
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
          Pitched Price
          <input
            type="number"
            name="pitched_price"
            value={editData.pitched_price}
            onChange={handleEditChange}
            step="0.01"
          />
        </label>
        <label>
          Status
          <select
            name="status"
            value={editData.status}
            onChange={handleEditChange}
          >
            <option value="Shared">Shared</option>
            <option value="Site Visit">Site Visit</option>
            <option value="Negotiation">Negotiation</option>
            <option value="Booked">Booked</option>
            <option value="Lost">Lost</option>
          </select>
        </label>
        <label>
          Lead Temperature
          <select
            name="lead_temperature"
            value={editData.lead_temperature}
            onChange={handleEditChange}
          >
            <option value="Hot">Hot</option>
            <option value="Warm">Warm</option>
            <option value="Cold">Cold</option>
          </select>
        </label>
      </DataFormModal>
    </AdminLayout>
  );
};

export default Leads;
