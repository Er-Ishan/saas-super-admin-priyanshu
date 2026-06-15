import express from "express";
import bcrypt from "bcrypt";
import db from "../config/db.js";

const router = express.Router();

// GET /getdata/users
router.get("/getdata/users", (req, res) => {
  const sql = `
    SELECT u.id, u.name, u.email, IFNULL(r.name, 'admin') as role
    FROM users u
    LEFT JOIN user_roles ur ON u.id = ur.user_id
    LEFT JOIN roles r ON ur.role_id = r.id
    WHERE u.company_id = ?
    GROUP BY u.id
  `;
  const companyId = req.companyId;
  if (!companyId) return res.status(400).json({ success: false, message: "Missing company identity" });
  db.query(sql, [companyId], (err, results) => {
    if (err) return res.status(500).json({ success: false, message: err.sqlMessage });
    res.json(results);
  });
});

// POST /insertdata/users
router.post("/insertdata/users", async (req, res) => {
  const { name, email, password, role } = req.body;
  if (!name || !email || !password) return res.status(400).json({ success: false, message: "Missing fields" });
  
  const companyId = req.companyId;
  if (!companyId) return res.status(400).json({ success: false, message: "Missing company identity" });
  const hash = await bcrypt.hash(password, 10);
  
  const sql = "INSERT INTO users (company_id, name, email, password) VALUES (?, ?, ?, ?)";
  db.query(sql, [companyId, name, email, hash], (err, result) => {
    if (err) return res.status(500).json({ success: false, message: err.sqlMessage });
    
    const userId = result.insertId;
    const roleName = role || 'admin';
    
    // Map role
    db.query("SELECT id FROM roles WHERE name = ? AND company_id = ?", [roleName, companyId], (err, roles) => {
      if (!err && roles && roles.length > 0) {
        db.query("INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)", [userId, roles[0].id]);
        return res.json({ success: true, id: userId });
      } else {
        db.query("INSERT INTO roles (company_id, name) VALUES (?, ?)", [companyId, roleName], (err, roleResult) => {
          if (!err && roleResult) {
            db.query("INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)", [userId, roleResult.insertId]);
          }
          return res.json({ success: true, id: userId });
        });
      }
    });
  });
});

// PUT /updatedata/users/:id
router.put("/updatedata/users/:id", async (req, res) => {
  const { name, email, password, role } = req.body;
  const { id } = req.params;
  const companyId = req.companyId;
  if (!companyId) return res.status(400).json({ success: false, message: "Missing company identity" });
  const roleName = role || 'admin';

  const updateRole = () => {
    db.query("DELETE FROM user_roles WHERE user_id = ?", [id], () => {
      db.query("SELECT id FROM roles WHERE name = ? AND company_id = ?", [roleName, companyId], (err, roles) => {
        if (!err && roles && roles.length > 0) {
          db.query("INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)", [id, roles[0].id]);
        } else {
          db.query("INSERT INTO roles (company_id, name) VALUES (?, ?)", [companyId, roleName], (err, roleResult) => {
            if (!err && roleResult) {
              db.query("INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)", [id, roleResult.insertId]);
            }
          });
        }
      });
    });
  };

  if (password) {
    const hash = await bcrypt.hash(password, 10);
    const sql = "UPDATE users SET name=?, email=?, password=? WHERE id=?";
    db.query(sql, [name, email, hash, id], (err) => {
      if (err) return res.status(500).json({ success: false, message: err.sqlMessage });
      updateRole();
      res.json({ success: true });
    });
  } else {
    const sql = "UPDATE users SET name=?, email=? WHERE id=?";
    db.query(sql, [name, email, id], (err) => {
      if (err) return res.status(500).json({ success: false, message: err.sqlMessage });
      updateRole();
      res.json({ success: true });
    });
  }
});

// DELETE /deletedata/users/:id
router.delete("/deletedata/users/:id", (req, res) => {
  const sql = "DELETE FROM users WHERE id=?";
  db.query(sql, [req.params.id], (err) => {
    if (err) return res.status(500).json({ success: false, message: err.sqlMessage });
    res.json({ success: true });
  });
});

// POST /change-password
router.post("/change-password", async (req, res) => {
  const { newPassword } = req.body;
  const userId = req.userId;
  const companyId = req.companyId;

  if (!userId) {
    return res.status(401).json({ success: false, message: "Unauthorized: Missing user identity" });
  }

  if (!newPassword) {
    return res.status(400).json({ success: false, message: "New password is required" });
  }

  try {
    const hash = await bcrypt.hash(newPassword, 10);
    const sql = "UPDATE users SET password = ? WHERE id = ? AND company_id = ?";
    
    db.query(sql, [hash, userId, companyId], (err, result) => {
      if (err) {
        console.error("Change password DB error:", err);
        return res.status(500).json({ success: false, message: "Database error" });
      }
      
      if (result.affectedRows === 0) {
        return res.status(404).json({ success: false, message: "User not found" });
      }
      
      res.json({ success: true, message: "Password updated successfully" });
    });
  } catch (err) {
    console.error("Bcrypt hash error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

export default router;
