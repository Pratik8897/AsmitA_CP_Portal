import { useMemo, useState } from "react";
import AdminLayout from "../components/AdminLayout";
import DataTable from "../components/DataTable";
import DataFormModal from "../components/DataFormModal";

const ChannelPartners = () => {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [saving, setSaving] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [uploadEditError, setUploadEditError] = useState("");
  const [profileUploadError, setProfileUploadError] = useState("");
  const [profileUploadEditError, setProfileUploadEditError] = useState("");
  const [formError, setFormError] = useState("");
  const [editError, setEditError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    phone: "",
    email: "",
    password_hash: "",
    pan_number: "",
    aadhar_number: "",
    address: "",
    rera_number: "",
    gst_number: "",
    rera_certificate_path: "",
    is_verified: "0",
    is_active: "1",
    firebase_uuids: "",
    login_methods: "",
    commission_slab: "",
    fcm_token: "",
    poc_id: "",
  });
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editData, setEditData] = useState({
    id: "",
    first_name: "",
    last_name: "",
    phone: "",
    email: "",
    pan_number: "",
    aadhar_number: "",
    address: "",
    rera_number: "",
    gst_number: "",
    rera_certificate_path: "",
    is_verified: "0",
    is_active: "1",
    commission_slab: "",
    poc_id: "",
    profile_image_url: "",
  });

  const [reraFile, setReraFile] = useState(null);
  const [editReraFile, setEditReraFile] = useState(null);
  const [profileFile, setProfileFile] = useState(null);
  const [editProfileFile, setEditProfileFile] = useState(null);

  const apiBase = process.env.REACT_APP_API_BASE || "http://localhost:5000";

  const steps = useMemo(
    
    () => [
      { key: "basic", label: "Basic Info" },
      { key: "kyc", label: "KYC Details" },
      { key: "registration", label: "Registration" },
      { key: "upload", label: "RERA Upload" },
    ],

    []
  );

  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleEditChange = (event) => {
    const { name, value } = event.target;
    setEditData((prev) => ({ ...prev, [name]: value }));
  };

  const resetForm = () => {
    setStepIndex(0);
    setSaving(false);
    setUploading(false);
    setUploadError("");
    setFormError("");
    setReraFile(null);
    setFormData({
      first_name: "",
      last_name: "",
      phone: "",
      email: "",
      password_hash: "",
      pan_number: "",
      aadhar_number: "",
      address: "",
      rera_number: "",
      gst_number: "",
      rera_certificate_path: "",
      is_verified: "0",
      is_active: "1",
      firebase_uuids: "",
      login_methods: "",
      commission_slab: "",
      fcm_token: "",
      poc_id: "",
    });
  };

  const validateStep = (index) => {
    if (index === 0) {
      if (!formData.first_name.trim()) return "First name is required.";
      if (!formData.last_name.trim()) return "Last name is required.";
      if (!formData.phone.trim()) return "Phone is required.";
      if (!formData.email.trim()) return "Email is required.";
    }
    if (index === 1) {
      if (!formData.pan_number.trim()) return "PAN number is required.";
      if (!formData.aadhar_number.trim()) return "Aadhar number is required.";
      if (!formData.address.trim()) return "Address is required.";
    }
    if (index === 2) {
      if (!formData.rera_number.trim()) return "RERA number is required.";
      if (!formData.gst_number.trim()) return "GST number is required.";
    }
    if (index === 3) {
      if (!formData.rera_certificate_path.trim())
        return "RERA certificate is required.";
    }
    return "";
  };

  const handleNext = () => {
    const error = validateStep(stepIndex);
    if (error) {
      setFormError(error);
      return;
    }
    setFormError("");
    setStepIndex((prev) => Math.min(prev + 1, steps.length - 1));
  };

  const handleBack = () => {
    setFormError("");
    setStepIndex((prev) => Math.max(prev - 1, 0));
  };

  const handleReraFileChange = (event) => {
    const file = event.target.files && event.target.files[0];
    setReraFile(file || null);
    setUploadError("");
  };

  const handleEditReraFileChange = (event) => {
    const file = event.target.files && event.target.files[0];
    setEditReraFile(file || null);
    setUploadEditError("");
  };

  const handleProfileFileChange = (event) => {
    const file = event.target.files && event.target.files[0];
    setProfileFile(file || null);
    setProfileUploadError("");
  };

  const handleEditProfileFileChange = (event) => {
    const file = event.target.files && event.target.files[0];
    setEditProfileFile(file || null);
    setProfileUploadEditError("");
  };

  const handleReraUpload = async () => {
    if (!reraFile) {
      setUploadError("Please select a PDF file to upload.");
      return;
    }
    if (reraFile.type !== "application/pdf") {
      setUploadError("Only PDF files are allowed.");
      return;
    }
    setUploading(true);
    setUploadError("");
    try {
      const form = new FormData();
      form.append("file", reraFile);
      const res = await fetch(`${apiBase}/api/channel-partners/rera-upload`, {
        method: "POST",
        body: form,
        credentials: "include",
      });
      if (!res.ok) {
        throw new Error("Upload failed");
      }
      const data = await res.json();
      setFormData((prev) => ({
        ...prev,
        rera_certificate_path: data.path || "",
      }));
    } catch (error) {
      setUploadError("Unable to upload RERA certificate. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const handleProfileUpload = async () => {
    if (!profileFile) {
      setProfileUploadError("Please select an image to upload.");
      return;
    }
    if (!profileFile.type.startsWith("image/")) {
      setProfileUploadError("Only image files are allowed.");
      return;
    }
    setUploading(true);
    setProfileUploadError("");
    try {
      const form = new FormData();
      form.append("file", profileFile);
      const res = await fetch(`${apiBase}/api/channel-partners/profile-upload`, {
        method: "POST",
        body: form,
        credentials: "include",
      });
      if (!res.ok) {
        throw new Error("Upload failed");
      }
      const data = await res.json();
      setFormData((prev) => ({
        ...prev,
        profile_image_url: data.publicUrl || data.path || "",
      }));
    } catch (error) {
      setProfileUploadError("Unable to upload profile image. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const handleEditReraUpload = async () => {
    if (!editReraFile) {
      setUploadEditError("Please select a PDF file to upload.");
      return;
    }
    if (editReraFile.type !== "application/pdf") {
      setUploadEditError("Only PDF files are allowed.");
      return;
    }
    setUploading(true);
    setUploadEditError("");
    try {
      const form = new FormData();
      form.append("file", editReraFile);
      const res = await fetch(`${apiBase}/api/channel-partners/rera-upload`, {
        method: "POST",
        body: form,
        credentials: "include",
      });
      if (!res.ok) {
        throw new Error("Upload failed");
      }
      const data = await res.json();
      setEditData((prev) => ({
        ...prev,
        rera_certificate_path: data.path || "",
      }));
    } catch (error) {
      setUploadEditError("Unable to upload RERA certificate. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const handleEditProfileUpload = async () => {
    if (!editProfileFile) {
      setProfileUploadEditError("Please select an image to upload.");
      return;
    }
    if (!editProfileFile.type.startsWith("image/")) {
      setProfileUploadEditError("Only image files are allowed.");
      return;
    }
    setUploading(true);
    setProfileUploadEditError("");
    try {
      const form = new FormData();
      form.append("file", editProfileFile);
      const res = await fetch(`${apiBase}/api/channel-partners/profile-upload`, {
        method: "POST",
        body: form,
        credentials: "include",
      });
      if (!res.ok) {
        throw new Error("Upload failed");
      }
      const data = await res.json();
      setEditData((prev) => ({
        ...prev,
        profile_image_url: data.publicUrl || data.path || "",
      }));
    } catch (error) {
      setProfileUploadEditError("Unable to upload profile image. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const handleAddSubmit = async (event) => {
    event.preventDefault();
    const error =
      validateStep(0) || validateStep(1) || validateStep(2) || validateStep(3);
    if (error) {
      setFormError(error);
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`${apiBase}/api/channel-partners`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (!res.ok) {
        throw new Error("Failed to create channel partner");
      }
      setIsAddOpen(false);
      resetForm();
      setRefreshKey((prev) => prev + 1);
    } catch (error) {
      setFormError("Unable to add channel partner. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (row) => {
    setEditError("");
    setEditData({
      id: row?.id ?? "",
      first_name: row?.first_name ?? "",
      last_name: row?.last_name ?? "",
      phone: row?.phone ?? "",
      email: row?.email ?? "",
      pan_number: row?.pan_number ?? "",
      aadhar_number: row?.aadhar_number ?? "",
      address: row?.address ?? "",
      rera_number: row?.rera_number ?? "",
      gst_number: row?.gst_number ?? "",
      rera_certificate_path: row?.rera_certificate_path ?? "",
      is_verified: String(row?.is_verified ?? "0"),
      is_active: String(row?.is_active ?? "1"),
      commission_slab: row?.commission_slab ?? "",
      poc_id: row?.poc_id ?? "",
      profile_image_url: row?.profile_image_url ?? "",
    });
    setIsEditOpen(true);
  };

  const handleEditSubmit = async (event) => {
    event.preventDefault();
    setEditError("");

    if (!editData.id) {
      setEditError("Unable to determine channel partner id.");
      return;
    }

    setSavingEdit(true);
    try {
      const payload = { ...editData };
      delete payload.id;
      const res = await fetch(`${apiBase}/api/channel-partners/${editData.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        throw new Error("Failed to update channel partner");
      }
      setIsEditOpen(false);
      setRefreshKey((prev) => prev + 1);
    } catch (error) {
      setEditError("Unable to update channel partner. Please try again.");
    } finally {
      setSavingEdit(false);
    }
  };

  return (
    <AdminLayout
      title="Channel Partners"
      subtitle="All channel partner records"
    >
      <DataTable
        title="Channel Partners"
        endpoint="/api/channel-partners"
        onAdd={() => {
          resetForm();
          setIsAddOpen(true);
        }}
        addLabel="Add Channel Partner"
        onEdit={handleEdit}
        columns={["first_name", "phone", "email", "is_active"]}
        editExclude={[
          "password_hash",
          "firebase_uuids",
          "login_methods",
          "fcm_token",
        ]}
        columnLabels={{
          first_name: "First Name",
          phone: "Phone",
          email: "Email",
          is_active: "Active",
        }}
        viewExclude={[
          "id",
          "last_name",
          "password_hash",
          "pan_number",
          "aadhar_number",
          "address",
          "rera_number",
          "gst_number",
          "is_verified",
          "created_at",
          "updated_at",
          "firebase_uuids",
          "login_methods",
          "commission_slab",
          "fcm_token",
          "poc_id",
        ]}
        refreshKey={refreshKey}
      />

      <DataFormModal
        title="Add Channel Partner"
        isOpen={isAddOpen}
        onClose={() => {
          setIsAddOpen(false);
          resetForm();
        }}
        onSubmit={handleAddSubmit}
        saving={saving}
        error={formError}
        submitLabel="Save Partner"
        actions={
          <>
            <button
              type="button"
              className="action-btn"
              onClick={() => {
                setIsAddOpen(false);
                resetForm();
              }}
            >
              Cancel
            </button>
            {stepIndex > 0 ? (
              <button type="button" className="action-btn" onClick={handleBack}>
                Back
              </button>
            ) : null}
            {stepIndex < steps.length - 1 ? (
              <button type="button" className="action-btn add" onClick={handleNext}>
                Next
              </button>
            ) : (
              <button type="submit" className="action-btn add" disabled={saving}>
                {saving ? "Saving..." : "Save Partner"}
              </button>
            )}
          </>
        }
        withGrid={false}
      >
        <div className="data-stepper">
          {steps.map((step, index) => (
            <span
              key={step.key}
              className={`data-step${
                index === stepIndex ? " active" : index < stepIndex ? " completed" : ""
              }`}
            >
              {step.label}
            </span>
          ))}
        </div>

        {stepIndex === 0 ? (
          <div className="data-form-grid">
            <label>
              First Name *
              <input
                type="text"
                name="first_name"
                value={formData.first_name}
                onChange={handleInputChange}
                required
              />
            </label>
            <label>
              Last Name *
              <input
                type="text"
                name="last_name"
                value={formData.last_name}
                onChange={handleInputChange}
                required
              />
            </label>
            <label>
              Phone *
              <input
                type="text"
                name="phone"
                value={formData.phone}
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
              Password
              <input
                type="text"
                name="password_hash"
                value={formData.password_hash}
                onChange={handleInputChange}
                placeholder="Enter password"
              />
            </label>
          </div>
        ) : null}

        {stepIndex === 1 ? (
          <div className="data-form-grid">
            <label>
              PAN Number *
              <input
                type="text"
                name="pan_number"
                value={formData.pan_number}
                onChange={handleInputChange}
                required
              />
            </label>
            <label>
              Aadhar Number *
              <input
                type="text"
                name="aadhar_number"
                value={formData.aadhar_number}
                onChange={handleInputChange}
                required
              />
            </label>
            <label>
              Address *
              <input
                type="text"
                name="address"
                value={formData.address}
                onChange={handleInputChange}
                required
              />
            </label>
          </div>
        ) : null}

        {stepIndex === 2 ? (
          <div className="data-form-grid">
            <label>
              RERA Number *
              <input
                type="text"
                name="rera_number"
                value={formData.rera_number}
                onChange={handleInputChange}
                required
              />
            </label>
            <label>
              GST Number *
              <input
                type="text"
                name="gst_number"
                value={formData.gst_number}
                onChange={handleInputChange}
                required
              />
            </label>
            <label>
              Verified
              <select
                name="is_verified"
                value={formData.is_verified}
                onChange={handleInputChange}
              >
                <option value="1">Yes</option>
                <option value="0">No</option>
              </select>
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
              Commission Slab
              <input
                type="number"
                name="commission_slab"
                value={formData.commission_slab}
                onChange={handleInputChange}
                step="0.01"
              />
            </label>
            <label>
              POC ID
              <input
                type="text"
                name="poc_id"
                value={formData.poc_id}
                onChange={handleInputChange}
              />
            </label>
          </div>
        ) : null}

        {stepIndex === 3 ? (
          <div className="data-form-grid">
            <label>
              Firebase UUIDs (JSON array)
              <input
                type="text"
                name="firebase_uuids"
                value={formData.firebase_uuids}
                onChange={handleInputChange}
                placeholder='["uuid1","uuid2"]'
              />
            </label>
            <label>
              Login Methods (JSON array)
              <input
                type="text"
                name="login_methods"
                value={formData.login_methods}
                onChange={handleInputChange}
                placeholder='["email","phone"]'
              />
            </label>
            <label>
              FCM Token
              <input
                type="text"
                name="fcm_token"
                value={formData.fcm_token}
                onChange={handleInputChange}
              />
            </label>
            <div className="upload-block field-span">
              <div className="upload-row">
                <label>
                  Profile Image (Photo)
                  <input type="file" accept="image/*" onChange={handleProfileFileChange} />
                </label>
                <div className="upload-actions">
                  <button
                    type="button"
                    className="action-btn add"
                    onClick={handleProfileUpload}
                    disabled={uploading}
                  >
                    {uploading ? "Uploading..." : "Upload Profile Photo"}
                  </button>
                  {profileUploadError ? (
                    <div className="data-form-error">{profileUploadError}</div>
                  ) : null}
                </div>
              </div>
              <div className="upload-preview">
                <div className="data-view-key">Profile Preview</div>
                {formData.profile_image_url ? (
                  <img className="data-preview" src={formData.profile_image_url} alt="Profile" />
                ) : (
                  <div className="data-form-error">Upload a profile photo to see the preview.</div>
                )}
              </div>
            </div>
            <div className="upload-block field-span">
              <div className="upload-row">
                <label>
                  RERA Certificate (PDF) *
                  <input type="file" accept="application/pdf" onChange={handleReraFileChange} />
                </label>
                <div className="upload-actions">
                  <button
                    type="button"
                    className="action-btn add"
                    onClick={handleReraUpload}
                    disabled={uploading}
                  >
                    {uploading ? "Uploading..." : "Upload RERA PDF"}
                  </button>
                  {uploadError ? <div className="data-form-error">{uploadError}</div> : null}
                </div>
              </div>
              <div className="upload-preview">
                <div className="data-view-key">RERA Certificate Preview</div>
                {formData.rera_certificate_path ? (
                  <>
                    <a
                      className="data-link"
                      href={formData.rera_certificate_path}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Open Document
                    </a>
                    <iframe
                      className="data-pdf-preview"
                      title="RERA Certificate"
                      src={formData.rera_certificate_path}
                    />
                  </>
                ) : (
                  <div className="data-form-error">Upload the RERA PDF to see the preview.</div>
                )}
              </div>
            </div>
          </div>
        ) : null}
      </DataFormModal>

      <DataFormModal
        title="Edit Channel Partner"
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        onSubmit={handleEditSubmit}
        saving={savingEdit}
        error={editError}
        submitLabel="Update Partner"
      >
        <label>
          First Name *
          <input
            type="text"
            name="first_name"
            value={editData.first_name}
            onChange={handleEditChange}
            required
          />
        </label>
        <label>
          Last Name *
          <input
            type="text"
            name="last_name"
            value={editData.last_name}
            onChange={handleEditChange}
            required
          />
        </label>
        <label>
          Phone
          <input
            type="text"
            name="phone"
            value={editData.phone}
            onChange={handleEditChange}
          />
        </label>
        <label>
          Email
          <input
            type="email"
            name="email"
            value={editData.email}
            onChange={handleEditChange}
          />
        </label>
        <label>
          PAN Number
          <input
            type="text"
            name="pan_number"
            value={editData.pan_number}
            onChange={handleEditChange}
          />
        </label>
        <label>
          Aadhar Number
          <input
            type="text"
            name="aadhar_number"
            value={editData.aadhar_number}
            onChange={handleEditChange}
          />
        </label>
        <label>
          Address
          <input
            type="text"
            name="address"
            value={editData.address}
            onChange={handleEditChange}
          />
        </label>
        <label>
          RERA Number
          <input
            type="text"
            name="rera_number"
            value={editData.rera_number}
            onChange={handleEditChange}
          />
        </label>
        <label>
          GST Number
          <input
            type="text"
            name="gst_number"
            value={editData.gst_number}
            onChange={handleEditChange}
          />
        </label>
        <label>
          Verified
          <select name="is_verified" value={editData.is_verified} onChange={handleEditChange}>
            <option value="1">Yes</option>
            <option value="0">No</option>
          </select>
        </label>
        <label>
          Active
          <select name="is_active" value={editData.is_active} onChange={handleEditChange}>
            <option value="1">Yes</option>
            <option value="0">No</option>
          </select>
        </label>
        <label>
          Commission Slab
          <input
            type="number"
            name="commission_slab"
            value={editData.commission_slab}
            onChange={handleEditChange}
            step="0.01"
          />
        </label>
        <label>
          POC ID
          <input
            type="text"
            name="poc_id"
            value={editData.poc_id}
            onChange={handleEditChange}
          />
        </label>
        <div className="upload-block field-span">
          <div className="upload-row">
            <label>
              Profile Image (Photo)
              <input type="file" accept="image/*" onChange={handleEditProfileFileChange} />
            </label>
            <div className="upload-actions">
              <button
                type="button"
                className="action-btn add"
                onClick={handleEditProfileUpload}
                disabled={uploading}
              >
                {uploading ? "Uploading..." : "Upload Profile Photo"}
              </button>
              {profileUploadEditError ? (
                <div className="data-form-error">{profileUploadEditError}</div>
              ) : null}
            </div>
          </div>
          <div className="upload-preview">
            <div className="data-view-key">Profile Preview</div>
            {editData.profile_image_url ? (
              <img className="data-preview" src={editData.profile_image_url} alt="Profile" />
            ) : (
              <div className="data-form-error">Upload a profile photo to see the preview.</div>
            )}
          </div>
        </div>
        <div className="upload-block field-span">
          <div className="upload-row">
            <label>
              RERA Certificate (PDF)
              <input type="file" accept="application/pdf" onChange={handleEditReraFileChange} />
            </label>
            <div className="upload-actions">
              <button
                type="button"
                className="action-btn add"
                onClick={handleEditReraUpload}
                disabled={uploading}
              >
                {uploading ? "Uploading..." : "Upload RERA PDF"}
              </button>
              {uploadEditError ? <div className="data-form-error">{uploadEditError}</div> : null}
            </div>
          </div>
          <div className="upload-preview">
            <div className="data-view-key">RERA Certificate Preview</div>
            {editData.rera_certificate_path ? (
              <>
                <a
                  className="data-link"
                  href={editData.rera_certificate_path}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open Document
                </a>
                <iframe
                  className="data-pdf-preview"
                  title="RERA Certificate"
                  src={editData.rera_certificate_path}
                />
              </>
            ) : (
              <div className="data-form-error">Upload the RERA PDF to see the preview.</div>
            )}
          </div>
        </div>
      </DataFormModal>
    </AdminLayout>
  );
};

export default ChannelPartners;
