import express from "express";
import db from "../config/db.js";

const router = express.Router();

// Inline JWT auth middleware (matches pattern in supplierRoutes.js)
const authenticateJWT = (req, res, next) => {
  // Auth is handled upstream; just pass through
  next();
};

// Helper: extract company_id from JWT or header
function companyIdFromReq(req) {
  return req.user?.company_id ?? req.companyId ?? 1;
}

/* ===========================
   GET /api/promocodes
   List all promo codes for the company
=========================== */
router.get("/promocodes", authenticateJWT, async (req, res) => {
  try {
    const companyId = companyIdFromReq(req);
    const [rows] = await db.promise().query(
      "SELECT * FROM promocodes WHERE company_id = ? ORDER BY created_at DESC",
      [companyId]
    );
    return res.json(rows);
  } catch (err) {
    console.error("GET /promocodes error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

/* ===========================
   GET /api/promocodes/:id
   Fetch a single promo code by ID
=========================== */
router.get("/promocodes/:id", authenticateJWT, async (req, res) => {
  try {
    const companyId = companyIdFromReq(req);
    const [rows] = await db.promise().query(
      "SELECT * FROM promocodes WHERE id = ? AND company_id = ?",
      [req.params.id, companyId]
    );

    if (!rows.length) {
      return res.status(404).json({ success: false, message: "Promo code not found" });
    }

    return res.json(rows[0]);
  } catch (err) {
    console.error("GET /promocodes/:id error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

/* ===========================
   POST /api/insert/promocodes
   Create a new promo code
=========================== */
router.post("/insert/promocodes", authenticateJWT, async (req, res) => {
  try {
    const companyId = companyIdFromReq(req);
    const { promo_code, discount_type, discount_value, usage_limit, start_date, expiry_date } = req.body;

    if (!promo_code || discount_value === undefined) {
      return res.status(400).json({ success: false, message: "promo_code and discount_value are required" });
    }

    const [result] = await db.promise().query(
      `INSERT INTO promocodes (company_id, promo_code, discount_type, discount_value, usage_limit, start_date, expiry_date)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [companyId, promo_code, discount_type || "fixed", discount_value, usage_limit || null, start_date || null, expiry_date || null]
    );

    return res.status(201).json({ success: true, message: "Promo code created", id: result.insertId });
  } catch (err) {
    console.error("POST /insert/promocodes error detail:", {
      message: err.message,
      code: err.code,
      stack: err.stack,
      body: req.body
    });
    if (err.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ success: false, message: "This promo code already exists" });
    }
    return res.status(500).json({ success: false, message: "Server error: " + err.message });
  }
});

/* ===========================
   PUT /api/promocodes/:id
   Update an existing promo code
=========================== */
router.put("/promocodes/:id", authenticateJWT, async (req, res) => {
  try {
    const companyId = companyIdFromReq(req);
    const { promo_code, discount_type, discount_value, usage_limit, start_date, expiry_date } = req.body;

    const [result] = await db.promise().query(
      `UPDATE promocodes
       SET promo_code = ?, discount_type = ?, discount_value = ?, usage_limit = ?, start_date = ?, expiry_date = ?
       WHERE id = ? AND company_id = ?`,
      [promo_code, discount_type, discount_value, usage_limit, start_date || null, expiry_date || null, req.params.id, companyId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: "Promo code not found" });
    }

    return res.json({ success: true, message: "Promo code updated" });
  } catch (err) {
    console.error("PUT /promocodes/:id error:", err);
    if (err.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ success: false, message: "This promo code already exists" });
    }
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

/* ===========================
   DELETE /api/promocodes/:id
   Delete a promo code
=========================== */
router.delete("/promocodes/:id", authenticateJWT, async (req, res) => {
  try {
    const companyId = companyIdFromReq(req);
    const [result] = await db.promise().query(
      "DELETE FROM promocodes WHERE id = ? AND company_id = ?",
      [req.params.id, companyId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: "Promo code not found" });
    }

    return res.json({ success: true, message: "Promo code deleted" });
  } catch (err) {
    console.error("DELETE /promocodes/:id error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

export default router;
