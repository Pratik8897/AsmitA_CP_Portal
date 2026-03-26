const pool = require("../config/db");

const fetchAll = async (table, limit = 200) => {
  const safeLimit = Math.min(Number(limit) || 200, 500);
  const tableColumns = await fetchTableColumns(table);
  const hasIsDeleted = tableColumns.includes("is_deleted");
  const [rows] = await pool.query(
    hasIsDeleted
      ? `SELECT * FROM \`${table}\` WHERE \`is_deleted\` = 0 OR \`is_deleted\` IS NULL LIMIT ?`
      : `SELECT * FROM \`${table}\` LIMIT ?`,
    [safeLimit]
  );
  return rows;
};

const listTables = async () => {
  const [rows] = await pool.query(
    "SELECT table_name FROM information_schema.tables WHERE table_schema = DATABASE() ORDER BY table_name"
  );
  return rows.map((row) => row.table_name);
};

const fetchAllByName = async (tableName, limit = 200) => {
  const [exists] = await pool.query(
    "SELECT 1 FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = ?",
    [tableName]
  );
  if (!exists.length) {
    throw new Error("Table not found");
  }
  return fetchAll(tableName, limit);
};

const fetchTableColumns = async (tableName) => {
  const [rows] = await pool.query(
    "SELECT COLUMN_NAME FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = ?",
    [tableName]
  );
  return rows.map((row) => row.COLUMN_NAME);
};

const fetchEnumColumns = async (tableName) => {
  const [columns] = await pool.query(
    "SELECT COLUMN_NAME, COLUMN_TYPE FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = ? AND DATA_TYPE = 'enum'",
    [tableName]
  );
  const enums = {};
  columns.forEach((col) => {
    const raw = col.COLUMN_TYPE || "";
    const valuesPart = raw.startsWith("enum(") ? raw.slice(5, -1) : "";
    if (!valuesPart) return;
    const values = valuesPart
      .split("','")
      .map((v) => v.replace(/^'/, "").replace(/'$/, ""));
    enums[col.COLUMN_NAME] = values;
  });
  return enums;
};

const fetchOneById = async (table, id) => {
  const tableColumns = await fetchTableColumns(table);
  if (!tableColumns.length) {
    throw new Error("Table not found");
  }
  const [rows] = await pool.query(`SELECT * FROM \`${table}\` WHERE \`id\` = ? LIMIT 1`, [id]);
  return rows[0] || null;
};

const fetchAllWithFilters = async (table, filters = [], limit = 200) => {
  const safeLimit = Math.min(Number(limit) || 200, 500);
  const tableColumns = await fetchTableColumns(table);
  const hasIsDeleted = tableColumns.includes("is_deleted");
  const usableFilters = (filters || []).filter(
    (filter) =>
      filter &&
      typeof filter.column === "string" &&
      Object.prototype.hasOwnProperty.call(filter, "value") &&
      tableColumns.includes(filter.column)
  );

  if (!usableFilters.length && !hasIsDeleted) {
    return fetchAll(table, safeLimit);
  }

  const whereParts = usableFilters.map((filter) => `\`${filter.column}\` = ?`);
  const values = usableFilters.map((filter) => filter.value);
  if (hasIsDeleted) {
    whereParts.push("(`is_deleted` = 0 OR `is_deleted` IS NULL)");
  }
  const whereClause = whereParts.join(" AND ");
  const [rows] = await pool.query(
    `SELECT * FROM \`${table}\` WHERE ${whereClause} LIMIT ?`,
    [...values, safeLimit]
  );
  return rows;
};

const insertOne = async (table, data, allowedFields = []) => {
  const tableColumns = await fetchTableColumns(table);
  const allowedSet = new Set(allowedFields.filter((field) => tableColumns.includes(field)));
  const cleaned = {};
  allowedSet.forEach((field) => {
    if (Object.prototype.hasOwnProperty.call(data, field)) {
      cleaned[field] = data[field];
    }
  });

  const columns = Object.keys(cleaned);
  if (!columns.length) {
    throw new Error("No valid fields provided");
  }

  const placeholders = columns.map(() => "?").join(", ");
  const values = columns.map((col) => cleaned[col]);
  const sql = `INSERT INTO \`${table}\` (${columns
    .map((col) => `\`${col}\``)
    .join(", ")}) VALUES (${placeholders})`;
  const [result] = await pool.query(sql, values);
  return result;
};

const updateOne = async (table, id, data, allowedFields = []) => {
  const tableColumns = await fetchTableColumns(table);
  const allowedSet = new Set(allowedFields.filter((field) => tableColumns.includes(field)));
  const cleaned = {};
  allowedSet.forEach((field) => {
    if (Object.prototype.hasOwnProperty.call(data, field)) {
      cleaned[field] = data[field];
    }
  });

  const columns = Object.keys(cleaned);
  if (!columns.length) {
    throw new Error("No valid fields provided");
  }

  const assignments = columns.map((col) => `\`${col}\` = ?`).join(", ");
  const values = columns.map((col) => cleaned[col]);
  const sql = `UPDATE \`${table}\` SET ${assignments} WHERE \`id\` = ?`;
  const [result] = await pool.query(sql, [...values, id]);
  return result;
};

const deleteOne = async (table, id) => {
  const tableColumns = await fetchTableColumns(table);
  if (!tableColumns.length) {
    throw new Error("Table not found");
  }
  if (!tableColumns.includes("is_deleted")) {
    throw new Error("Soft delete not supported");
  }
  const [result] = await pool.query(
    `UPDATE \`${table}\` SET \`is_deleted\` = 1 WHERE \`id\` = ?`,
    [id]
  );
  return result;
};

module.exports = {
  fetchAll,
  listTables,
  fetchAllByName,
  fetchTableColumns,
  fetchEnumColumns,
  fetchOneById,
  fetchAllWithFilters,
  insertOne,
  updateOne,
  deleteOne,
};
