import express from "express";
import db from "../config/db.js";
import multer from "multer";
import path from "path";
import fs from "fs";

const router = express.Router();

// --- Multer Configuration ---
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = "uploads/support";
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowed = [".jpg", ".jpeg", ".png", ".pdf"];
    if (allowed.includes(path.extname(file.originalname).toLowerCase())) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type. Only JPG, PNG and PDF allowed."));
    }
  },
});

/**
 * GET ADMIN SUPPORT TICKETS
 * Super Admin: Returns all
 * Company Admin: Returns only their company's
 */
router.get("/tickets", async (req, res) => {
  try {
    const { isSuperAdmin } = req.query; 
    const cid = req.companyId;
    
    let sql = `
        SELECT t.*, c.name as company_name 
        FROM support_tickets t 
        LEFT JOIN companies c ON t.company_id = c.id
        WHERE t.type = 'admin_support'
    `;
    const params = [];

    if (isSuperAdmin !== "true") {
      if (!cid) return res.status(400).json({ success: false, message: "Missing company identity" });
      sql += " AND t.company_id = ?";
      params.push(cid);
    }

    sql += " ORDER BY t.created_at DESC";

    const [rows] = await db.promise().query(sql, params);
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error("Fetch admin tickets error:", error);
    res.status(500).json({ success: false, message: "Database error" });
  }
});

/**
 * CREATE ADMIN SUPPORT TICKET
 */
router.post("/tickets", upload.array("attachments", 5), async (req, res) => {
  try {
    const { customer_name, customer_email, subject, message, priority } = req.body;
    const cid = req.companyId;
    if (!cid) return res.status(400).json({ success: false, message: "Missing company identity" });
    const ticket_no = "ADM-" + Date.now();
    const files = req.files || [];
    const attachmentPaths = files.map(f => `/uploads/support/${f.filename}`);

    const sql = `
        INSERT INTO support_tickets 
        (company_id, type, ticket_no, customer_name, customer_email, subject, message, priority, status, source, created_at, attachment)
        VALUES (?, 'admin_support', ?, ?, ?, ?, ?, ?, 'Open', 'Admin', NOW(), ?)
    `;

    const [result] = await db.promise().query(sql, [
      cid,
      ticket_no,
      customer_name || "Admin",
      customer_email || "admin@example.com",
      subject,
      message,
      priority || "Medium",
      JSON.stringify(attachmentPaths)
    ]);

    res.json({ success: true, ticket_id: result.insertId, ticket_no });
  } catch (error) {
    console.error("Create admin ticket error:", error);
    res.status(500).json({ success: false, message: "Failed to create ticket" });
  }
});

/**
 * GET TICKET CHAT
 */
router.get("/tickets/:id/chat", async (req, res) => {
  try {
    const [rows] = await db.promise().query(
      "SELECT * FROM support_ticket_chats WHERE ticket_id = ? ORDER BY created_at ASC",
      [req.params.id]
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch chat" });
  }
});

/**
 * SEND CHAT MESSAGE
 */
router.post("/tickets/:id/chat", upload.array("attachments", 5), async (req, res) => {
  try {
    const { senderType, senderId, message } = req.body;
    const files = req.files || [];
    const attachmentPaths = files.map(f => `/uploads/support/${f.filename}`);

    await db.promise().query(
      "INSERT INTO support_ticket_chats (ticket_id, sender_type, sender_id, message, attachments) VALUES (?, ?, ?, ?, ?)",
      [req.params.id, senderType, senderId, message, JSON.stringify(attachmentPaths)]
    );

    // Update ticket status if Super Admin replies
    if (senderType === 'super_admin') {
        await db.promise().query("UPDATE support_tickets SET status = 'In Progress', last_reply_at = NOW() WHERE id = ?", [req.params.id]);
    } else {
        await db.promise().query("UPDATE support_tickets SET last_reply_at = NOW() WHERE id = ?", [req.params.id]);
    }

    res.json({ success: true });
  } catch (error) {
    console.error("Send message error:", error);
    res.status(500).json({ success: false, message: "Failed to send message" });
  }
});

/**
 * UPDATE TICKET STATUS
 */
router.put("/tickets/:id/status", async (req, res) => {
    try {
        const { status } = req.body;
        await db.promise().query("UPDATE support_tickets SET status = ? WHERE id = ?", [status, req.params.id]);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, message: "Failed to update status" });
    }
});

export default router;
