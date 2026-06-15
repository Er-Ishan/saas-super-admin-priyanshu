import express from "express";
import db from "../config/db.js";

const router = express.Router();

router.get("/airports", (req, res) => {
  const companyId = req.companyId || 1;
  const sql = `
    SELECT a.airport_id, a.airport_name, a.iata_code
    FROM airports a
    JOIN company_airports ca ON a.airport_id = ca.airport_id
    WHERE ca.company_id = ? AND ca.status = 'Y'
    ORDER BY a.airport_name ASC
  `;
  db.query(sql, [companyId], (err, results) => {
    if (err) {
      console.error("airports fetch error:", err);
      return res.status(500).json({ success: false, message: "Database error" });
    }
    return res.json({ success: true, data: results });
  });
});

router.get("/terminals", (req, res) => {
  const companyId = req.companyId || 1;
  const sql = `
    SELECT cat.terminal_id, IFNULL(cat.terminal_name, ti.terminal_name) as terminal_name, ti.id as terminal_code
    FROM comp_airport_terminals cat
    JOIN terminals_info ti ON cat.terminal_id = ti.id
    JOIN company_airports ca ON cat.airport_id = ca.airport_id
    WHERE ca.company_id = ? AND cat.status = 'Y' AND ca.status = 'Y'
    ORDER BY ti.terminal_name ASC
  `;
  db.query(sql, [companyId], (err, results) => {
    if (err) {
      console.error("terminals fetch error:", err);
      return res.status(500).json({ success: false, message: "Database error" });
    }
    return res.json({ success: true, data: results });
  });
});

router.get("/branding", (req, res) => {
  const companyId = req.companyId;
  if (!companyId) {
    return res.status(400).json({ success: false, message: "Missing company identity" });
  }

  const sql = "SELECT logo_url FROM companies WHERE id = ?";
  db.query(sql, [companyId], (err, results) => {
    if (err) {
      console.error("branding fetch error:", err);
      return res.status(500).json({ success: false, message: "Database error" });
    }
    if (results.length === 0) {
      return res.status(404).json({ success: false, message: "Company not found" });
    }
    return res.json({ success: true, logo_url: results[0].logo_url });
  });
});

export default router;

