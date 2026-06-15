import express from "express";
import db from "../config/db.js";

const router = express.Router();

/* ──────────────── helpers ──────────────── */
const companyId = (req) => {
  const companyId = (req) => {
    return req.companyId || 1;
  };
  return req.companyId;
};

const query = (sql, params) =>
  new Promise((resolve, reject) =>
    db.query(sql, params, (err, rows) => (err ? reject(err) : resolve(rows)))
  );

/* ═══════════════ PERMISSIONS ═══════════════ */

// GET /api/access-control/permissions
router.get("/permissions", async (req, res) => {
  try {
    const rows = await query("SELECT * FROM permissions ORDER BY module, id");
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error("GET permissions error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// GET /api/access-control/my-permissions/:userId
// Returns the permission *names* for a given user (joined through user_roles → role_permissions → permissions)
router.get("/my-permissions/:userId", async (req, res) => {
  try {
    const rows = await query(
      `SELECT DISTINCT p.name
       FROM user_roles ur
       JOIN role_permissions rp ON ur.role_id = rp.role_id
       JOIN permissions p ON rp.permission_id = p.id
       WHERE ur.user_id = ?`,
      [req.params.userId]
    );
    res.json({ success: true, data: rows.map((r) => r.name) });
  } catch (err) {
    console.error("GET my-permissions error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

/* ═══════════════ ROLES ═══════════════ */

// GET /api/access-control/roles
router.get("/roles", async (req, res) => {
  try {
    const cid = companyId(req);
    const roles = await query(
      "SELECT * FROM roles WHERE company_id = ? ORDER BY id",
      [cid]
    );

    // attach permission IDs to each role
    for (const role of roles) {
      const perms = await query(
        "SELECT permission_id FROM role_permissions WHERE role_id = ?",
        [role.id]
      );
      role.permissions = perms.map((p) => p.permission_id);
    }

    res.json({ success: true, data: roles });
  } catch (err) {
    console.error("GET roles error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// GET /api/access-control/roles/:id
router.get("/roles/:id", async (req, res) => {
  try {
    const [role] = await query("SELECT * FROM roles WHERE id = ?", [
      req.params.id,
    ]);
    if (!role) return res.status(404).json({ success: false, message: "Role not found" });

    const perms = await query(
      "SELECT permission_id FROM role_permissions WHERE role_id = ?",
      [role.id]
    );
    role.permissions = perms.map((p) => p.permission_id);

    res.json({ success: true, data: role });
  } catch (err) {
    console.error("GET role error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// POST /api/access-control/roles
router.post("/roles", async (req, res) => {
  try {
    const { name, description, permissions = [] } = req.body;
    if (!name) return res.status(400).json({ success: false, message: "Name is required" });

    const cid = companyId(req);

    const result = await query(
      "INSERT INTO roles (company_id, name, description) VALUES (?, ?, ?)",
      [cid, name, description || null]
    );
    const roleId = result.insertId;

    // insert permission mappings
    for (const pid of permissions) {
      await query(
        "INSERT INTO role_permissions (role_id, permission_id) VALUES (?, ?)",
        [roleId, pid]
      );
    }

    res.json({ success: true, data: { id: roleId, name, permissions } });
  } catch (err) {
    console.error("POST role error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// PUT /api/access-control/roles/:id
router.put("/roles/:id", async (req, res) => {
  try {
    const { name, description, permissions = [] } = req.body;
    const roleId = req.params.id;

    // update the role itself
    await query("UPDATE roles SET name = ?, description = ? WHERE id = ?", [
      name,
      description || null,
      roleId,
    ]);

    // replace permissions
    await query("DELETE FROM role_permissions WHERE role_id = ?", [roleId]);
    for (const pid of permissions) {
      await query(
        "INSERT INTO role_permissions (role_id, permission_id) VALUES (?, ?)",
        [roleId, pid]
      );
    }

    res.json({ success: true, message: "Role updated" });
  } catch (err) {
    console.error("PUT role error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// DELETE /api/access-control/roles/:id
router.delete("/roles/:id", async (req, res) => {
  try {
    const roleId = req.params.id;

    // prevent deleting system defaults
    const [role] = await query("SELECT * FROM roles WHERE id = ?", [roleId]);
    if (!role) return res.status(404).json({ success: false, message: "Role not found" });
    if (role.is_system_default) {
      return res
        .status(403)
        .json({ success: false, message: "Cannot delete system default role" });
    }

    await query("DELETE FROM role_permissions WHERE role_id = ?", [roleId]);
    await query("DELETE FROM user_roles WHERE role_id = ?", [roleId]);
    await query("DELETE FROM roles WHERE id = ?", [roleId]);

    res.json({ success: true, message: "Role deleted" });
  } catch (err) {
    console.error("DELETE role error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

export default router;
