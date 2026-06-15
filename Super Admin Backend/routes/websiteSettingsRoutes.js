import express from "express";
import db from "../config/db.js";

const router = express.Router();

function getCompanyId(req) {
  return req.companyId || 1;
}

// 1. GET Website Settings
router.get("/get", async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    const [rows] = await db.promise().query(
      "SELECT * FROM website_settings WHERE company_id = ?",
      [companyId]
    );
    res.json(rows);
  } catch (err) {
    console.error("GET website/settings/get error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// 2. POST Insert Website Setting
router.post("/insert", async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    const data = req.body;

    const [result] = await db.promise().query(
      `INSERT INTO website_settings (
        company_id, website_name, website_url, website_contact, website_mobile,
        website_email, office_address, postcode, booking_prefix, booking_ref,
        amend_short_notice_hours, cancel_short_notice_hours, booking_fee,
        booking_fee_message, smtp_server, smtp_port, smtp_user, smtp_password,
        email_title, booking_email_address, reply_email_address, no_reply_email,
        website_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        companyId, data.website_name, data.website_url, data.website_contact, data.website_mobile,
        data.website_email, data.office_address, data.postcode, data.booking_prefix, data.booking_ref,
        data.amend_short_notice_hours, data.cancel_short_notice_hours, data.booking_fee,
        data.booking_fee_message, data.smtp_server, data.smtp_port, data.smtp_user, data.smtp_password,
        data.email_title, data.booking_email_address, data.reply_email_address, data.no_reply_email,
        data.website_active
      ]
    );

    res.json({ success: true, id: result.insertId });
  } catch (err) {
    console.error("POST website/settings/insert error:", err);
    res.status(500).json({ success: false, message: "Server error", error: err.message });
  }
});

// 3. PUT Update Website Setting
router.put("/update/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = getCompanyId(req);
    const data = req.body;

    const [result] = await db.promise().query(
      `UPDATE website_settings SET 
        website_name=?, website_url=?, website_contact=?, website_mobile=?,
        website_email=?, office_address=?, postcode=?, booking_prefix=?, booking_ref=?,
        amend_short_notice_hours=?, cancel_short_notice_hours=?, booking_fee=?,
        booking_fee_message=?, smtp_server=?, smtp_port=?, smtp_user=?, smtp_password=?,
        email_title=?, booking_email_address=?, reply_email_address=?, no_reply_email=?,
        website_active=?
      WHERE id=? AND company_id=?`,
      [
        data.website_name, data.website_url, data.website_contact, data.website_mobile,
        data.website_email, data.office_address, data.postcode, data.booking_prefix, data.booking_ref,
        data.amend_short_notice_hours, data.cancel_short_notice_hours, data.booking_fee,
        data.booking_fee_message, data.smtp_server, data.smtp_port, data.smtp_user, data.smtp_password,
        data.email_title, data.booking_email_address, data.reply_email_address, data.no_reply_email,
        data.website_active, id, companyId
      ]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: "Setting not found or unauthorized" });
    }

    res.json({ success: true });
  } catch (err) {
    console.error("PUT website/settings/update error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// 4. DELETE Website Setting
router.delete("/delete/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = getCompanyId(req);

    const [result] = await db.promise().query(
      "DELETE FROM website_settings WHERE id=? AND company_id=?",
      [id, companyId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: "Setting not found or unauthorized" });
    }

    res.json({ success: true });
  } catch (err) {
    console.error("DELETE website/settings/delete error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

export default router;
