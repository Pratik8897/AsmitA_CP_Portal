const express = require("express");
const path = require("path");
const multer = require("multer");
const { createClient } = require("@supabase/supabase-js");
const {
  fetchAll,
  fetchAllWithFilters,
  insertOne,
  listTables,
  fetchAllByName,
  updateOne,
  fetchTableColumns,
  fetchEnumColumns,
  fetchOneById,
  deleteOne,
} = require("../controllers/genericController");
const tables = require("../config/tables");
const {
  ACTION_CREATE,
  ACTION_READ,
  ACTION_UPDATE,
  ACTION_DELETE,
  authorize,
  authorizeParam,
  getLeadOwnershipFilter,
  applyLeadOwnershipToPayload,
} = require("../middleware/permissions");
const pool = require("../config/db");

const router = express.Router();

const leadAllowedFields = [
  "cp_id",
  "customer_name",
  "customer_phone",
  "customer_email",
  "wing_id",
  "floor_number",
  "typology_id",
  "payment_plan_id",
  "base_price",
  "pitched_price",
  "expected_commission_pct",
  "status",
  "project_id",
  "unit_id",
  "lead_temperature",
  "assigned_to",
];

const formatNowForMySQL = () => {
  const now = new Date();
  const iso = now.toISOString().slice(0, 19);
  return iso.replace("T", " ");
};

const buildLeadActivityPayload = (columns, { leadId, action, status, userId, userName }) => {
  if (!Array.isArray(columns) || !columns.length) {
    return null;
  }

  const payload = {};
  const setIf = (column, value) => {
    if (columns.includes(column) && value !== undefined && value !== null && value !== "") {
      payload[column] = value;
    }
  };

  setIf("lead_id", leadId);
  setIf("leadId", leadId);

  const actionValue = action || "updated";
  setIf("activity_type", actionValue);
  setIf("type", actionValue);
  setIf("action", actionValue);
  setIf("activity", actionValue);

  const baseDescription = status
    ? `Lead ${actionValue} (status: ${status})`
    : `Lead ${actionValue}`;
  setIf("description", baseDescription);
  setIf("notes", baseDescription);
  setIf("remark", baseDescription);
  setIf("remarks", baseDescription);

  setIf("status", status);

  setIf("created_by", userId);
  setIf("created_by_id", userId);
  setIf("user_id", userId);
  setIf("updated_by", userId);
  setIf("created_by_name", userName);

  const nowValue = formatNowForMySQL();
  setIf("created_at", nowValue);
  setIf("activity_at", nowValue);
  setIf("logged_at", nowValue);

  const hasLeadId = columns.includes("lead_id") || columns.includes("leadId");
  if (!hasLeadId) {
    return null;
  }

  return payload;
};

const createLeadActivity = async ({ leadId, action, status, user }) => {
  const columns = await fetchTableColumns(tables.leadActivities);
  const payload = buildLeadActivityPayload(columns, {
    leadId,
    action,
    status,
    userId: user?.id,
    userName: user?.name,
  });
  if (!payload) {
    return;
  }
  await insertOne(tables.leadActivities, payload, columns);
};

const attachAssignedToNames = async (rows) => {
  if (!Array.isArray(rows) || rows.length === 0) {
    return rows;
  }
  const ids = Array.from(
    new Set(
      rows
        .map((row) => row?.assigned_to)
        .filter((id) => id !== null && id !== undefined && id !== "")
    )
  );
  if (!ids.length) {
    return rows;
  }

  const placeholders = ids.map(() => "?").join(", ");
  const userColumns = await fetchTableColumns(tables.internalUsers);
  const selectable = ["id", "name", "first_name", "last_name"].filter((col) =>
    userColumns.includes(col)
  );
  if (!selectable.includes("id")) {
    return rows;
  }
  const selectList = selectable.map((col) => `\`${col}\``).join(", ");
  const [users] = await pool.query(
    `SELECT ${selectList} FROM \`${tables.internalUsers}\` WHERE \`id\` IN (${placeholders})`,
    ids
  );
  const nameMap = new Map();
  users.forEach((user) => {
    const first = user?.first_name ? String(user.first_name).trim() : "";
    const last = user?.last_name ? String(user.last_name).trim() : "";
    const name =
      String(user?.name || "").trim() ||
      [first, last].filter(Boolean).join(" ").trim();
    if (name) {
      nameMap.set(String(user.id), name);
    }
  });

  return rows.map((row) => {
    const id = row?.assigned_to;
    const assignedName = nameMap.get(String(id));
    if (!assignedName) {
      return row;
    }
    return { ...row, assigned_to_name: assignedName };
  });
};

const resolveAutoAssignedSalesUser = async () => {
  const [salesUsers] = await pool.query(
    "SELECT id FROM internal_users WHERE LOWER(`role`) IN ('sales_user', 'sales user', 'sales-user') AND (is_active IS NULL OR is_active = 1)"
  );
  const ids = salesUsers.map((row) => row.id).filter(Boolean);
  if (!ids.length) {
    return null;
  }

  const placeholders = ids.map(() => "?").join(", ");
  const [counts] = await pool.query(
    `SELECT assigned_to AS id, COUNT(*) AS cnt FROM \`${tables.leads}\` WHERE assigned_to IN (${placeholders}) GROUP BY assigned_to`,
    ids
  );
  const countMap = new Map(ids.map((id) => [id, 0]));
  counts.forEach((row) => {
    if (countMap.has(row.id)) {
      countMap.set(row.id, Number(row.cnt) || 0);
    }
  });

  let selectedId = ids[0];
  let minCount = countMap.get(selectedId) ?? 0;
  ids.forEach((id) => {
    const cnt = countMap.get(id) ?? 0;
    if (cnt < minCount || (cnt === minCount && id < selectedId)) {
      selectedId = id;
      minCount = cnt;
    }
  });

  return selectedId;
};

const resourceToTable = {
  "leads": tables.leads,
  "channel-partners": tables.channelPartners,
  "projects-wings": tables.projectsWings,
  "projects": tables.projects,
  "wings": tables.wings,
  "units": tables.units,
  "commissions": tables.commissions,
  "lead-activities": tables.leadActivities,
  "lead-payment-milestones": tables.leadPaymentMilestones,
  "payment-milestones": tables.paymentMilestones,
  "payment-plans": tables.paymentPlans,
  "support-tickets": tables.supportTickets,
  "system-logs": tables.systemLogs,
  "internal-users": tables.internalUsers,
};

router.get("/enums/:resource", authorizeParam("resource", ACTION_READ), async (req, res) => {
  try {
    const resource = req.params.resource;
    const table = resourceToTable[resource];
    if (!table) {
      return res.status(404).json({ error: "Resource not found" });
    }
    const enums = await fetchEnumColumns(table);
    res.json(enums);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch enum columns" });
  }
});

router.put("/:resource/:id/deactivate", authorizeParam("resource", ACTION_UPDATE), async (req, res) => {
  try {
    const resource = req.params.resource;
    const table = resourceToTable[resource];
    const id = Number(req.params.id);
    if (!table || !id) {
      return res.status(400).json({ error: "Invalid resource or id" });
    }

    const columns = await fetchTableColumns(table);
    if (!columns.includes("is_active")) {
      return res.status(400).json({ error: "is_active column not available" });
    }

    const result = await updateOne(table, id, { is_active: 0 }, ["is_active"]);
    if (!result.affectedRows) {
      return res.status(404).json({ error: "Record not found" });
    }
    return res.json({ status: "ok" });
  } catch (error) {
    res.status(500).json({ error: "Failed to deactivate record" });
  }
});

router.delete("/:resource/:id", authorizeParam("resource", ACTION_DELETE), async (req, res) => {
  try {
    const resource = req.params.resource;
    const table = resourceToTable[resource];
    const id = Number(req.params.id);
    if (!table || !id) {
      return res.status(400).json({ error: "Invalid resource or id" });
    }

    const result = await deleteOne(table, id);
    if (!result.affectedRows) {
      return res.status(404).json({ error: "Record not found" });
    }
    return res.json({ status: "ok" });
  } catch (error) {
    if (error?.message === "Soft delete not supported") {
      return res.status(400).json({ error: "Soft delete not supported for this resource" });
    }
    res.status(500).json({ error: "Failed to delete record" });
  }
});

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabaseBucket = process.env.SUPABASE_BUCKET || "channel-partners";
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

const reraUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype !== "application/pdf") {
      return cb(new Error("Only PDF files are allowed"));
    }
    return cb(null, true);
  },
});

const profileUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      return cb(new Error("Only image files are allowed"));
    }
    return cb(null, true);
  },
});

router.post(
  "/channel-partners/rera-upload",
  authorize("channel-partners", ACTION_UPDATE),
  reraUpload.single("file"),
  async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }
    if (!supabase) {
      return res.status(500).json({ error: "Supabase is not configured" });
    }

    const ext = path.extname(req.file.originalname || ".pdf");
    const safeExt = ext && ext.toLowerCase() === ".pdf" ? ext : ".pdf";
    const base = path
      .basename(req.file.originalname || "rera", ext)
      .replace(/[^a-zA-Z0-9-_]/g, "");
    const stamp = Date.now();
    const objectPath = `rera/${base || "rera"}-${stamp}${safeExt}`;

    const { error: uploadError } = await supabase.storage
      .from(supabaseBucket)
      .upload(objectPath, req.file.buffer, {
        contentType: req.file.mimetype,
        upsert: false,
      });

    if (uploadError) {
      return res.status(500).json({ error: "Supabase upload failed" });
    }

    const { data: publicData } = supabase.storage
      .from(supabaseBucket)
      .getPublicUrl(objectPath);

    return res.status(201).json({
      path: objectPath,
      publicUrl: publicData?.publicUrl || "",
    });
  },
  (err, req, res, next) => {
    res.status(400).json({ error: err?.message || "Upload failed" });
  }
);

router.post(
  "/channel-partners/profile-upload",
  authorize("channel-partners", ACTION_UPDATE),
  profileUpload.single("file"),
  async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }
    if (!supabase) {
      return res.status(500).json({ error: "Supabase is not configured" });
    }

    const ext = path.extname(req.file.originalname || "");
    const safeExt = ext ? ext.toLowerCase() : "";
    const base = path
      .basename(req.file.originalname || "profile", ext)
      .replace(/[^a-zA-Z0-9-_]/g, "");
    const stamp = Date.now();
    const objectPath = `profile/${base || "profile"}-${stamp}${safeExt || ""}`;

    const { error: uploadError } = await supabase.storage
      .from(supabaseBucket)
      .upload(objectPath, req.file.buffer, {
        contentType: req.file.mimetype,
        upsert: false,
      });

    if (uploadError) {
      return res.status(500).json({ error: "Supabase upload failed" });
    }

    const { data: publicData } = supabase.storage
      .from(supabaseBucket)
      .getPublicUrl(objectPath);

    return res.status(201).json({
      path: objectPath,
      publicUrl: publicData?.publicUrl || "",
    });
  },
  (err, req, res, next) => {
    res.status(400).json({ error: err?.message || "Upload failed" });
  }
);

router.get("/leads", authorize("leads", ACTION_READ), async (req, res) => {
  try {
    if (req.access?.scope === "own") {
      const filter = getLeadOwnershipFilter(req.access.role, req.session?.user?.id);
      if (!filter) {
        return res.status(403).json({ error: "Forbidden" });
      }
      const columns = await fetchTableColumns(tables.leads);
      if (!columns.includes(filter.column)) {
        return res.status(403).json({ error: "Forbidden" });
      }
      const data = await fetchAllWithFilters(
        tables.leads,
        filter ? [filter] : [],
        req.query.limit
      );
      const enriched = await attachAssignedToNames(data);
      return res.json(enriched);
    }

    const data = await fetchAll(tables.leads, req.query.limit);
    const enriched = await attachAssignedToNames(data);
    res.json(enriched);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch leads" });
  }
});

router.post("/leads", authorize("leads", ACTION_CREATE), async (req, res) => {
  try {
    let payload = { ...req.body };
    Object.keys(payload).forEach((key) => {
      if (payload[key] === "") {
        payload[key] = null;
      }
    });

    const leadColumns = await fetchTableColumns(tables.leads);
    if (leadColumns.includes("created_at") && !payload.created_at) {
      payload.created_at = formatNowForMySQL();
    }

    if (req.access?.scope === "own") {
      const filter = getLeadOwnershipFilter(req.access.role, req.session?.user?.id);
      if (!filter) {
        return res.status(403).json({ error: "Forbidden" });
      }
      if (!leadColumns.includes(filter.column)) {
        return res.status(403).json({ error: "Forbidden" });
      }
      payload = applyLeadOwnershipToPayload(req.access.role, req.session?.user?.id, payload);
    }

    if (!payload.assigned_to) {
      if (req.access?.role === "sales_user" && req.access?.scope === "own") {
        payload.assigned_to = req.session?.user?.id;
      } else {
        const autoAssigned = await resolveAutoAssignedSalesUser();
        if (autoAssigned) {
          payload.assigned_to = autoAssigned;
        }
      }
    }

    if (!payload.customer_name) {
      return res.status(400).json({ error: "Customer name is required" });
    }

    if (!payload.customer_phone) {
      return res.status(400).json({ error: "Customer phone is required" });
    }

    if (!payload.customer_email) {
      return res.status(400).json({ error: "Customer email is required" });
    }

    const result = await insertOne(tables.leads, payload, leadAllowedFields);
    try {
      await createLeadActivity({
        leadId: result.insertId,
        action: "created",
        status: payload.status,
        user: req.session?.user,
      });
    } catch (activityError) {
      // Best-effort logging; lead creation should still succeed.
    }
    res.status(201).json({ id: result.insertId });
  } catch (error) {
    res.status(500).json({ error: "Failed to create lead" });
  }
});

router.put("/leads/:id", authorize("leads", ACTION_UPDATE), async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) {
      return res.status(400).json({ error: "Invalid lead id" });
    }

    const existing = await fetchOneById(tables.leads, id);
    if (!existing) {
      return res.status(404).json({ error: "Lead not found" });
    }

    if (req.access?.scope === "own") {
      const ownershipFilter = getLeadOwnershipFilter(req.access.role, req.session?.user?.id);
      if (!ownershipFilter) {
        return res.status(403).json({ error: "Forbidden" });
      }
      if (existing[ownershipFilter.column] !== ownershipFilter.value) {
        return res.status(403).json({ error: "Forbidden" });
      }
    }

    const payload = { ...req.body };
    Object.keys(payload).forEach((key) => {
      if (payload[key] === "") {
        payload[key] = null;
      }
    });

    const result = await updateOne(tables.leads, id, payload, leadAllowedFields);
    if (!result.affectedRows) {
      return res.status(404).json({ error: "Lead not found" });
    }

    const previousStatus = existing.status;
    const nextStatus = Object.prototype.hasOwnProperty.call(payload, "status")
      ? payload.status
      : previousStatus;
    const statusChanged = nextStatus && String(nextStatus) !== String(previousStatus || "");
    const isClosed =
      typeof nextStatus === "string" && nextStatus.toLowerCase().includes("closed");
    const action = statusChanged && isClosed ? "closed" : "updated";

    try {
      await createLeadActivity({
        leadId: id,
        action,
        status: nextStatus,
        user: req.session?.user,
      });
    } catch (activityError) {
      // Best-effort logging; lead update should still succeed.
    }

    return res.json({ status: "ok" });
  } catch (error) {
    res.status(500).json({ error: "Failed to update lead" });
  }
});

router.get("/channel-partners", authorize("channel-partners", ACTION_READ), async (req, res) => {
  try {
    const data = await fetchAll(tables.channelPartners, req.query.limit);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch channel partners" });
  }
});

router.post("/channel-partners", authorize("channel-partners", ACTION_CREATE), async (req, res) => {
  try {
    const payload = { ...req.body };
    Object.keys(payload).forEach((key) => {
      if (payload[key] === "") {
        payload[key] = null;
      }
    });

    if (!payload.first_name) {
      return res.status(400).json({ error: "First name is required" });
    }
    if (!payload.last_name) {
      return res.status(400).json({ error: "Last name is required" });
    }
    if (!payload.phone) {
      return res.status(400).json({ error: "Phone is required" });
    }
    if (!payload.email) {
      return res.status(400).json({ error: "Email is required" });
    }

    const allowedFields = [
      "first_name",
      "last_name",
      "phone",
      "email",
      "password_hash",
      "pan_number",
      "aadhar_number",
      "address",
      "rera_number",
      "gst_number",
      "rera_certificate_path",
      "is_verified",
      "is_active",
      "firebase_uuids",
      "login_methods",
      "commission_slab",
      "fcm_token",
      "poc_id",
      "profile_image_url",
    ];

    const result = await insertOne(tables.channelPartners, payload, allowedFields);
    res.status(201).json({ id: result.insertId });
  } catch (error) {
    res.status(500).json({ error: "Failed to create channel partner" });
  }
});

router.put("/channel-partners/:id", authorize("channel-partners", ACTION_UPDATE), async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) {
      return res.status(400).json({ error: "Invalid channel partner id" });
    }

    const payload = { ...req.body };
    Object.keys(payload).forEach((key) => {
      if (payload[key] === "") {
        payload[key] = null;
      }
    });

    const allowedFields = [
      "first_name",
      "last_name",
      "phone",
      "email",
      "password_hash",
      "pan_number",
      "aadhar_number",
      "address",
      "rera_number",
      "gst_number",
      "rera_certificate_path",
      "is_verified",
      "is_active",
      "firebase_uuids",
      "login_methods",
      "commission_slab",
      "fcm_token",
      "poc_id",
      "profile_image_url",
    ];

    const result = await updateOne(tables.channelPartners, id, payload, allowedFields);
    if (!result.affectedRows) {
      return res.status(404).json({ error: "Channel partner not found" });
    }
    return res.json({ status: "ok" });
  } catch (error) {
    res.status(500).json({ error: "Failed to update channel partner" });
  }
});

router.get("/projects-wings", authorize("projects-wings", ACTION_READ), async (req, res) => {
  try {
    const data = await fetchAll(tables.projectsWings, req.query.limit);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch projects & wings" });
  }
});

router.get("/projects", authorize("projects", ACTION_READ), async (req, res) => {
  try {
    const data = await fetchAll(tables.projects, req.query.limit);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch projects" });
  }
});

router.post("/projects", authorize("projects", ACTION_CREATE), async (req, res) => {
  try {
    const payload = { ...req.body };
    Object.keys(payload).forEach((key) => {
      if (payload[key] === "") {
        payload[key] = null;
      }
    });

    if (!payload.name) {
      return res.status(400).json({ error: "Project name is required" });
    }

    const allowedFields = [
      "name",
      "is_active",
      "status",
      "area",
      "address",
      "brochure_link",
      "location_link",
      "images",
      "construction_percent",
    ];

    const result = await insertOne(tables.projects, payload, allowedFields);
    res.status(201).json({ id: result.insertId });
  } catch (error) {
    res.status(500).json({ error: "Failed to create project" });
  }
});

router.get("/wings", authorize("wings", ACTION_READ), async (req, res) => {
  try {
    const data = await fetchAll(tables.wings, req.query.limit);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch wings" });
  }
});

router.post("/wings", authorize("wings", ACTION_CREATE), async (req, res) => {
  try {
    const payload = { ...req.body };
    Object.keys(payload).forEach((key) => {
      if (payload[key] === "") {
        payload[key] = null;
      }
    });

    const allowedFields = await fetchTableColumns(tables.wings);
    const result = await insertOne(tables.wings, payload, allowedFields);
    res.status(201).json({ id: result.insertId });
  } catch (error) {
    const message = error?.message === "No valid fields provided" ? error.message : "Failed to create wing";
    res.status(message === error.message ? 400 : 500).json({ error: message });
  }
});

router.get("/units", authorize("units", ACTION_READ), async (req, res) => {
  try {
    const data = await fetchAll(tables.units, req.query.limit);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch units" });
  }
});

router.post("/units", authorize("units", ACTION_CREATE), async (req, res) => {
  try {
    const payload = { ...req.body };
    Object.keys(payload).forEach((key) => {
      if (payload[key] === "") {
        payload[key] = null;
      }
    });

    const allowedFields = await fetchTableColumns(tables.units);
    const result = await insertOne(tables.units, payload, allowedFields);
    res.status(201).json({ id: result.insertId });
  } catch (error) {
    const message = error?.message === "No valid fields provided" ? error.message : "Failed to create unit";
    res.status(message === error.message ? 400 : 500).json({ error: message });
  }
});

router.put("/units/:id", authorize("units", ACTION_UPDATE), async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) {
      return res.status(400).json({ error: "Invalid unit id" });
    }

    const payload = { ...req.body };
    Object.keys(payload).forEach((key) => {
      if (payload[key] === "") {
        payload[key] = null;
      }
    });

    const allowedFields = await fetchTableColumns(tables.units);
    const result = await updateOne(tables.units, id, payload, allowedFields);
    if (!result.affectedRows) {
      return res.status(404).json({ error: "Unit not found" });
    }
    return res.json({ status: "ok" });
  } catch (error) {
    const message = error?.message === "No valid fields provided" ? error.message : "Failed to update unit";
    res.status(message === error.message ? 400 : 500).json({ error: message });
  }
});

router.get("/commissions", authorize("commissions", ACTION_READ), async (req, res) => {
  try {
    const data = await fetchAll(tables.commissions, req.query.limit);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch commissions" });
  }
});

router.get("/lead-activities", authorize("lead-activities", ACTION_READ), async (req, res) => {
  try {
    const data = await fetchAll(tables.leadActivities, req.query.limit);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch lead activities" });
  }
});

router.get("/lead-payment-milestones", authorize("lead-payment-milestones", ACTION_READ), async (req, res) => {
  try {
    const data = await fetchAll(tables.leadPaymentMilestones, req.query.limit);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch lead payment milestones" });
  }
});

router.get("/payment-milestones", authorize("payment-milestones", ACTION_READ), async (req, res) => {
  try {
    const data = await fetchAll(tables.paymentMilestones, req.query.limit);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch payment milestones" });
  }
});

router.get("/payment-plans", authorize("payment-plans", ACTION_READ), async (req, res) => {
  try {
    const data = await fetchAll(tables.paymentPlans, req.query.limit);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch payment plans" });
  }
});

router.get("/support-tickets", authorize("support-tickets", ACTION_READ), async (req, res) => {
  try {
    const data = await fetchAll(tables.supportTickets, req.query.limit);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch support tickets" });
  }
});

router.get("/system-logs", authorize("system-logs", ACTION_READ), async (req, res) => {
  try {
    const data = await fetchAll(tables.systemLogs, req.query.limit);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch system logs" });
  }
});

router.get("/sales-users", authorize("sales-users", ACTION_READ), async (req, res) => {
  try {
    const userColumns = await fetchTableColumns(tables.internalUsers);
    const selectable = ["id", "name", "first_name", "last_name", "email", "role"].filter((col) =>
      userColumns.includes(col)
    );
    if (!selectable.includes("id")) {
      return res.json([]);
    }
    const selectList = selectable.map((col) => `\`${col}\``).join(", ");
    const [rows] = await pool.query(
      `SELECT ${selectList} FROM \`${tables.internalUsers}\` WHERE LOWER(\`role\`) IN ('sales_user', 'sales user', 'sales-user') AND (is_active IS NULL OR is_active = 1) ORDER BY \`id\``
    );
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch sales users" });
  }
});

router.get("/internal-users", authorize("internal-users", ACTION_READ), async (req, res) => {
  try {
    const data = await fetchAll(tables.internalUsers, req.query.limit);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch internal users" });
  }
});

router.post("/internal-users", authorize("internal-users", ACTION_CREATE), async (req, res) => {
  try {
    const payload = { ...req.body };
    Object.keys(payload).forEach((key) => {
      if (payload[key] === "") {
        payload[key] = null;
      }
    });

    if (payload.name && !payload.first_name) {
      payload.first_name = payload.name;
    }

    if (!payload.name) {
      return res.status(400).json({ error: "Name is required" });
    }
    if (!payload.email) {
      return res.status(400).json({ error: "Email is required" });
    }

    const allowedFields = [
      "name",
      "first_name",
      "last_name",
      "email",
      "phone",
      "role",
      "designation",
      "department",
      "is_active",
      "is_verified",
      "password_hash",
    ];

    const result = await insertOne(tables.internalUsers, payload, allowedFields);
    res.status(201).json({ id: result.insertId });
  } catch (error) {
    res.status(500).json({ error: "Failed to create internal user" });
  }
});

router.put("/internal-users/:id", authorize("internal-users", ACTION_UPDATE), async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) {
      return res.status(400).json({ error: "Invalid internal user id" });
    }

    const payload = { ...req.body };
    Object.keys(payload).forEach((key) => {
      if (payload[key] === "") {
        payload[key] = null;
      }
    });

    const allowedFields = [
      "name",
      "first_name",
      "last_name",
      "email",
      "phone",
      "role",
      "designation",
      "department",
      "is_active",
      "is_verified",
      "password_hash",
    ];

    const result = await updateOne(tables.internalUsers, id, payload, allowedFields);
    if (!result.affectedRows) {
      return res.status(404).json({ error: "Internal user not found" });
    }
    return res.json({ status: "ok" });
  } catch (error) {
    res.status(500).json({ error: "Failed to update internal user" });
  }
});

router.get("/tables", authorize("tables", ACTION_READ), async (req, res) => {
  try {
    const data = await listTables();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch tables" });
  }
});

router.get("/table/:name", authorize("table", ACTION_READ), async (req, res) => {
  try {
    const data = await fetchAllByName(req.params.name, req.query.limit);
    res.json(data);
  } catch (error) {
    res.status(404).json({ error: "Table not found" });
  }
});

module.exports = router;
