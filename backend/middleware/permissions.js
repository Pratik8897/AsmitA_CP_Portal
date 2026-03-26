const ROLE_CP = "cp";
const ROLE_SALES_USER = "sales_user";
const ROLE_SALES_ADMIN = "sales_admin";
const ROLE_ANALYTICS = "analytics";
const ROLE_SUPER_ADMIN = "super_admin";

const normalizeRole = (role) => {
  if (!role) return "";
  const raw = String(role).trim().toLowerCase();
  if (!raw) return "";
  const compact = raw.replace(/\s+/g, "_").replace(/-+/g, "_");
  if (["cp", "channel_partner", "channel_partners", "channelpartner"].includes(compact)) {
    return ROLE_CP;
  }
  if (["sales_user", "salesuser"].includes(compact)) return ROLE_SALES_USER;
  if (["sales_admin", "salesadmin"].includes(compact)) return ROLE_SALES_ADMIN;
  if (["analytics", "analyst"].includes(compact)) return ROLE_ANALYTICS;
  if (["super_admin", "superadmin", "super"].includes(compact)) return ROLE_SUPER_ADMIN;
  return compact;
};

const ACTION_CREATE = "create";
const ACTION_READ = "read";
const ACTION_UPDATE = "update";
const ACTION_DELETE = "delete";

const baseMatrix = {
  "channel-partners": {
    [ROLE_CP]: [ACTION_CREATE, ACTION_READ, ACTION_UPDATE],
    [ROLE_SALES_USER]: [ACTION_CREATE, ACTION_READ, ACTION_UPDATE],
    [ROLE_SALES_ADMIN]: [ACTION_CREATE, ACTION_READ, ACTION_UPDATE, ACTION_DELETE],
    [ROLE_ANALYTICS]: [ACTION_READ],
    [ROLE_SUPER_ADMIN]: [ACTION_CREATE, ACTION_READ, ACTION_UPDATE, ACTION_DELETE],
  },
  "projects-wings": {
    [ROLE_CP]: [ACTION_READ],
    [ROLE_SALES_ADMIN]: [ACTION_CREATE, ACTION_READ, ACTION_UPDATE, ACTION_DELETE],
    [ROLE_ANALYTICS]: [ACTION_READ],
    [ROLE_SUPER_ADMIN]: [ACTION_CREATE, ACTION_READ, ACTION_UPDATE, ACTION_DELETE],
  },
  "projects": {
    [ROLE_CP]: [ACTION_READ],
    [ROLE_SALES_ADMIN]: [ACTION_CREATE, ACTION_READ, ACTION_UPDATE, ACTION_DELETE],
    [ROLE_ANALYTICS]: [ACTION_READ],
    [ROLE_SUPER_ADMIN]: [ACTION_CREATE, ACTION_READ, ACTION_UPDATE, ACTION_DELETE],
  },
  "wings": {
    [ROLE_CP]: [ACTION_READ],
    [ROLE_SALES_ADMIN]: [ACTION_CREATE, ACTION_READ, ACTION_UPDATE, ACTION_DELETE],
    [ROLE_ANALYTICS]: [ACTION_READ],
    [ROLE_SUPER_ADMIN]: [ACTION_CREATE, ACTION_READ, ACTION_UPDATE, ACTION_DELETE],
  },
  "units": {
    [ROLE_CP]: [ACTION_READ],
    [ROLE_SALES_ADMIN]: [ACTION_CREATE, ACTION_READ, ACTION_UPDATE, ACTION_DELETE],
    [ROLE_ANALYTICS]: [ACTION_READ],
    [ROLE_SUPER_ADMIN]: [ACTION_CREATE, ACTION_READ, ACTION_UPDATE, ACTION_DELETE],
  },
  "commissions": {
    [ROLE_CP]: [ACTION_CREATE, ACTION_READ, ACTION_UPDATE],
    [ROLE_SALES_USER]: [ACTION_CREATE, ACTION_READ, ACTION_UPDATE],
    [ROLE_SALES_ADMIN]: [ACTION_CREATE, ACTION_READ, ACTION_UPDATE, ACTION_DELETE],
    [ROLE_ANALYTICS]: [ACTION_READ],
    [ROLE_SUPER_ADMIN]: [ACTION_CREATE, ACTION_READ, ACTION_UPDATE, ACTION_DELETE],
  },
  "lead-activities": {
    [ROLE_CP]: [ACTION_CREATE, ACTION_READ, ACTION_UPDATE],
    [ROLE_SALES_USER]: [ACTION_CREATE, ACTION_READ, ACTION_UPDATE],
    [ROLE_SALES_ADMIN]: [ACTION_CREATE, ACTION_READ, ACTION_UPDATE, ACTION_DELETE],
    [ROLE_ANALYTICS]: [ACTION_READ],
    [ROLE_SUPER_ADMIN]: [ACTION_CREATE, ACTION_READ, ACTION_UPDATE, ACTION_DELETE],
  },
  "lead-payment-milestones": {
    [ROLE_SALES_ADMIN]: [ACTION_READ],
    [ROLE_ANALYTICS]: [ACTION_READ],
    [ROLE_SUPER_ADMIN]: [ACTION_CREATE, ACTION_READ, ACTION_UPDATE, ACTION_DELETE],
  },
  "payment-milestones": {
    [ROLE_SALES_ADMIN]: [ACTION_READ],
    [ROLE_ANALYTICS]: [ACTION_READ],
    [ROLE_SUPER_ADMIN]: [ACTION_CREATE, ACTION_READ, ACTION_UPDATE, ACTION_DELETE],
  },
  "payment-plans": {
    [ROLE_SALES_ADMIN]: [ACTION_READ],
    [ROLE_ANALYTICS]: [ACTION_READ],
    [ROLE_SUPER_ADMIN]: [ACTION_CREATE, ACTION_READ, ACTION_UPDATE, ACTION_DELETE],
  },
  "support-tickets": {
    [ROLE_SALES_ADMIN]: [ACTION_READ],
    [ROLE_ANALYTICS]: [ACTION_READ],
    [ROLE_SUPER_ADMIN]: [ACTION_CREATE, ACTION_READ, ACTION_UPDATE, ACTION_DELETE],
  },
  "system-logs": {
    [ROLE_SALES_ADMIN]: [ACTION_READ],
    [ROLE_ANALYTICS]: [ACTION_READ],
    [ROLE_SUPER_ADMIN]: [ACTION_CREATE, ACTION_READ, ACTION_UPDATE, ACTION_DELETE],
  },
  "internal-users": {
    [ROLE_SUPER_ADMIN]: [ACTION_CREATE, ACTION_READ, ACTION_UPDATE, ACTION_DELETE],
  },
  "sales-users": {
    [ROLE_CP]: [ACTION_READ],
    [ROLE_SALES_USER]: [ACTION_READ],
    [ROLE_SALES_ADMIN]: [ACTION_READ],
    [ROLE_ANALYTICS]: [ACTION_READ],
    [ROLE_SUPER_ADMIN]: [ACTION_READ],
  },
  "tables": {
    [ROLE_SUPER_ADMIN]: [ACTION_READ],
  },
  "table": {
    [ROLE_SUPER_ADMIN]: [ACTION_READ],
  },
};

const leadScopes = {
  [ROLE_CP]: {
    [ACTION_CREATE]: "own",
    [ACTION_READ]: "all",
    [ACTION_UPDATE]: "own",
    [ACTION_DELETE]: "none",
  },
  [ROLE_SALES_USER]: {
    [ACTION_CREATE]: "own",
    [ACTION_READ]: "all",
    [ACTION_UPDATE]: "own",
    [ACTION_DELETE]: "none",
  },
  [ROLE_SALES_ADMIN]: {
    [ACTION_CREATE]: "all",
    [ACTION_READ]: "all",
    [ACTION_UPDATE]: "all",
    [ACTION_DELETE]: "all",
  },
  [ROLE_ANALYTICS]: {
    [ACTION_CREATE]: "none",
    [ACTION_READ]: "all",
    [ACTION_UPDATE]: "none",
    [ACTION_DELETE]: "none",
  },
  [ROLE_SUPER_ADMIN]: {
    [ACTION_CREATE]: "all",
    [ACTION_READ]: "all",
    [ACTION_UPDATE]: "all",
    [ACTION_DELETE]: "all",
  },
};

const getScope = (resource, action, role) => {
  if (resource === "leads") {
    return leadScopes[role]?.[action] || "none";
  }
  const allowed = baseMatrix[resource]?.[role] || [];
  return allowed.includes(action) ? "all" : "none";
};

const authorize = (resource, action) => (req, res, next) => {
  const role = normalizeRole(req.session?.user?.role);
  if (!role) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  if (!baseMatrix[resource] && resource !== "leads") {
    return res.status(404).json({ error: "Resource not found" });
  }

  const scope = getScope(resource, action, role);
  if (!scope || scope === "none") {
    return res.status(403).json({ error: "Forbidden" });
  }

  req.access = { resource, action, scope, role };
  return next();
};

const authorizeParam = (paramName, action) => (req, res, next) => {
  const resource = req.params?.[paramName];
  if (!resource) {
    return res.status(400).json({ error: "Invalid resource" });
  }
  return authorize(resource, action)(req, res, next);
};

const getLeadOwnershipFilter = (role, userId) => {
  if (!userId) return null;
  if (role === ROLE_CP) {
    return { column: "cp_id", value: userId };
  }
  if (role === ROLE_SALES_USER) {
    return { column: "assigned_to", value: userId };
  }
  return null;
};

const applyLeadOwnershipToPayload = (role, userId, payload) => {
  if (!payload || !userId) return payload;
  if (role === ROLE_CP) {
    return { ...payload, cp_id: userId };
  }
  if (role === ROLE_SALES_USER) {
    return { ...payload, assigned_to: userId };
  }
  return payload;
};

module.exports = {
  ROLE_CP,
  ROLE_SALES_USER,
  ROLE_SALES_ADMIN,
  ROLE_ANALYTICS,
  ROLE_SUPER_ADMIN,
  ACTION_CREATE,
  ACTION_READ,
  ACTION_UPDATE,
  ACTION_DELETE,
  normalizeRole,
  authorize,
  authorizeParam,
  getLeadOwnershipFilter,
  applyLeadOwnershipToPayload,
};
