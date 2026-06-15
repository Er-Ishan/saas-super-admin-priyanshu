import express from "express";
import db from "../config/db.js";

const router = express.Router();

// ---------- helper: GET charges by category ----------
const getChargesByCategory = (category) => (req, res) => {
  const sql = `SELECT id, charge_name, price, is_enabled FROM charges WHERE category = ?`;
  db.query(sql, [category], (err, results) => {
    if (err) {
      console.error(`Error fetching ${category} charges:`, err);
      return res.status(500).json({ success: false, message: "Failed to fetch charges" });
    }
    res.json(results);
  });
};

// ---------- helper: POST (add) charge to category ----------
const addChargeToCategory = (category) => (req, res) => {
  const { charge_name, price, is_enabled } = req.body;
  if (!charge_name) {
    return res.status(400).json({ success: false, message: "charge_name is required" });
  }
  const sql = `INSERT INTO charges (category, charge_name, price, is_enabled) VALUES (?, ?, ?, ?)`;
  db.query(sql, [category, charge_name, price || 0, is_enabled ?? 1], (err, result) => {
    if (err) {
      console.error(`Error adding ${category} charge:`, err);
      return res.status(500).json({ success: false, message: err.sqlMessage || "Insert failed" });
    }
    res.json({
      success: true,
      data: { id: result.insertId, charge_name, price: price || 0, is_enabled: is_enabled ?? 1 },
    });
  });
};

// -------- GET / POST per category --------
router.get("/booking", getChargesByCategory("booking"));
router.post("/booking", addChargeToCategory("booking"));

router.get("/amended", getChargesByCategory("amended"));
router.post("/amended", addChargeToCategory("amended"));

router.get("/cancellation", getChargesByCategory("cancellation"));
router.post("/cancellation", addChargeToCategory("cancellation"));

// -------- PUT toggle is_enabled --------
router.put("/:id", (req, res) => {
  const { is_enabled } = req.body;
  db.query("UPDATE charges SET is_enabled = ? WHERE id = ?", [is_enabled, req.params.id], (err) => {
    if (err) return res.status(500).json({ success: false, message: err.sqlMessage });
    res.json({ success: true });
  });
});

// -------- PUT update price --------
router.put("/:id/price", (req, res) => {
  const { price } = req.body;
  db.query("UPDATE charges SET price = ? WHERE id = ?", [price, req.params.id], (err) => {
    if (err) return res.status(500).json({ success: false, message: err.sqlMessage });
    res.json({ success: true });
  });
});

// -------- DELETE --------
router.delete("/:id", (req, res) => {
  db.query("DELETE FROM charges WHERE id = ?", [req.params.id], (err) => {
    if (err) return res.status(500).json({ success: false, message: err.sqlMessage });
    res.json({ success: true });
  });
});

export default router;
