import express from "express";
import db from "../config/db.js";

const router = express.Router();

function getCompanyId(req) {
  return req.companyId || 1;
}

// GET Terms and Conditions
router.get("/terms", async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    const [rows] = await db.promise().query(
      "SELECT terms_and_conditions FROM companies WHERE id = ?",
      [companyId]
    );
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: "Company not found" });
    }
    res.json({ success: true, terms: rows[0].terms_and_conditions });
  } catch (err) {
    console.error("GET company/terms error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// UPDATE Terms and Conditions
router.put("/terms", async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    const { terms } = req.body;

    const [result] = await db.promise().query(
      "UPDATE companies SET terms_and_conditions = ? WHERE id = ?",
      [terms, companyId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: "Company not found" });
    }

    res.json({ success: true, message: "Terms and conditions updated successfully" });
  } catch (err) {
    console.error("PUT company/terms error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

export default router;
