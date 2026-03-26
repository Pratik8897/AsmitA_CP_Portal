const express = require("express");
const bcrypt = require("bcryptjs");
const pool = require("../config/db");

const router = express.Router();

const getInternalUserColumns = async () => {
  const [rows] = await pool.query(
    "SELECT COLUMN_NAME FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'internal_users'"
  );
  return rows.map((row) => row.COLUMN_NAME);
};

const isBcryptHash = (value) =>
  typeof value === "string" && (value.startsWith("$2a$") || value.startsWith("$2b$") || value.startsWith("$2y$"));

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const columns = await getInternalUserColumns();
    const identifierFields = ["email", "user_email", "username", "phone"].filter((col) =>
      columns.includes(col)
    );
    const passwordField =
      ["password_hash", "password", "user_password"].find((col) => columns.includes(col)) ||
      null;

    if (!identifierFields.length || !passwordField) {
      return res.status(500).json({ error: "User schema is not supported" });
    }

    const whereClause = identifierFields.map((col) => `\`${col}\` = ?`).join(" OR ");
    const params = identifierFields.map(() => email);
    const [rows] = await pool.query(
      `SELECT * FROM internal_users WHERE ${whereClause} LIMIT 1`,
      params
    );
    if (!rows.length) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const user = rows[0];
    const stored = user[passwordField] || "";
    let ok = false;
    if (isBcryptHash(stored)) {
      ok = await bcrypt.compare(password, stored);
    } else {
      ok = String(password) === String(stored);
    }

    if (!ok) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const name =
      user.name ||
      [user.first_name, user.last_name].filter(Boolean).join(" ").trim() ||
      "User";

    req.session.user = {
      id: user.id,
      name,
      email: user.email,
      role: user.role,
      is_active: user.is_active,
    };

    return res.json({ user: req.session.user });
  } catch (error) {
    return res.status(500).json({ error: "Login failed" });
  }
});

router.post("/logout", (req, res) => {
  req.session.destroy(() => {
    res.clearCookie("sid");
    res.json({ status: "ok" });
  });
});

router.get("/me", (req, res) => {
  if (!req.session?.user) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  return res.json({ user: req.session.user });
});

module.exports = router;
