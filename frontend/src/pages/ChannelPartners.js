import { useMemo, useState } from "react";
import AdminLayout from "../components/AdminLayout";
import DataTable from "../components/DataTable";
import DataFormModal from "../components/DataFormModal";

const ChannelPartners = () => {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [profileUploading, setProfileUploading] = useState(false);
  const [profileUploadError, setProfileUploadError] = useState("");
  const [formError, setFormError] = useState("");
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
    profile_image_url: "",
  });
  const [reraFile, setReraFile] = useState(null);
  const [profileFile, setProfileFile] = useState(null);

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

  const resetForm = () => {
    setStepIndex(0);
    setSaving(false);
    setUploading(false);
    setUploadError("");
    setProfileUploading(false);
    setProfileUploadError("");
    setFormError("");
    setReraFile(null);
    setProfileFile(null);
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
      profile_image_url: "",
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

  const handleProfileFileChange = (event) => {
    const file = event.target.files && event.target.files[0];
    setProfileFile(file || null);
    setProfileUploadError("");
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
        credentials: "include",
        body: form,
      });
      if (!res.ok) {
        throw new Error("Upload failed");
      }
      const data = await res.json();
      setFormData((prev) => ({
        ...prev,
        rera_certificate_path: data.publicUrl || data.path || "",
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
    setProfileUploading(true);
    setProfileUploadError("");
    try {
      const form = new FormData();
      form.append("file", profileFile);
      const res = await fetch(`${apiBase}/api/channel-partners/profile-upload`, {
        method: "POST",
        credentials: "include",
        body: form,
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
      setProfileUploading(false);
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
        credentials: "include",
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
        columns={["first_name", "phone", "email", "profile_image_url", "is_active"]}
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
          profile_image_url: "Profile",
          rera_certificate_path: "Rera Certificate",
          is_active: "Active",
        }}
        viewExclude={[]}
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
            <div>
              <div className="data-modal-key">Profile Image</div>
              {formData.profile_image_url ? (
                <img
                  className="data-preview"
                  src={formData.profile_image_url}
                  alt="Profile preview"
                />
              ) : (
                <div className="data-state">No image uploaded.</div>
              )}
              <div style={{ marginTop: "8px" }}>
                <input type="file" accept="image/*" onChange={handleProfileFileChange} />
              </div>
              <div style={{ marginTop: "8px" }}>
                <button
                  type="button"
                  className="action-btn add"
                  onClick={handleProfileUpload}
                  disabled={profileUploading}
                >
                  {profileUploading ? "Uploading..." : "Upload Profile Image"}
                </button>
              </div>
              {profileUploadError ? (
                <div className="data-form-error">{profileUploadError}</div>
              ) : null}
            </div>
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
              RERA Certificate (PDF) *
              <input type="file" accept="application/pdf" onChange={handleReraFileChange} />
            </label>
            <div>
              <div className="data-modal-key">RERA Certificate</div>
              {formData.rera_certificate_path ? (
                <a
                  className="data-link"
                  href={formData.rera_certificate_path}
                  target="_blank"
                  rel="noreferrer"
                >
                  View PDF
                </a>
              ) : (
                <div className="data-state">No file uploaded.</div>
              )}
              {formData.rera_certificate_path ? (
                <iframe
                  className="data-pdf-preview"
                  src={formData.rera_certificate_path}
                  title="RERA Certificate PDF"
                />
              ) : null}
            </div>
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
            <div>
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
        ) : null}
      </DataFormModal>
    </AdminLayout>
  );
};

export default ChannelPartners;
