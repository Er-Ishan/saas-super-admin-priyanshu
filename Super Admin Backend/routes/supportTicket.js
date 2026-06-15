import express from "express";
import db from "../config/db.js"; // mysql2 connection / pool
import axios from "axios";


const router = express.Router();

/**
 * LIST ALL SUPPORT TICKETS
 * GET /api/support-ticket
 */
router.get("/", async (req, res) => {
  try {
    const companyId = req.companyId || 1;
    const [rows] = await db.promise().query(
      "SELECT * FROM support_tickets WHERE company_id = ? ORDER BY created_at DESC",
      [companyId]
    );
    return res.json(rows);
  } catch (error) {
    console.error("List tickets error:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch tickets" });
  }
});

/**
 * DELETE SUPPORT TICKET
 * DELETE /api/support-ticket/:id
 */
router.delete("/:id", async (req, res) => {
  try {
    const companyId = req.companyId || 1;
    const [result] = await db.promise().query(
      "DELETE FROM support_tickets WHERE id = ? AND company_id = ?",
      [req.params.id, companyId]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: "Ticket not found" });
    }
    return res.json({ success: true, message: "Ticket deleted" });
  } catch (error) {
    console.error("Delete ticket error:", error);
    return res.status(500).json({ success: false, message: "Failed to delete ticket" });
  }
});

/**
 * EMAIL EXCEL / CSV of tickets
 * POST /api/support-ticket/email-excel
 */
router.post("/email-excel", async (req, res) => {
  try {
    // Stub: In production, generate CSV and email it
    return res.json({ success: true, message: "Email sent successfully (stub)" });
  } catch (error) {
    console.error("Email excel error:", error);
    return res.status(500).json({ success: false, message: "Failed to send email" });
  }
});

/**
 * REPLY TO SUPPORT TICKET
 * POST /api/support-ticket/support-ticket-user-reply
 */
router.post("/support-ticket-user-reply", async (req, res) => {
  try {
    const { to, ticket_no, subject, message } = req.body;

    if (!to || !message) {
      return res.status(400).json({ success: false, message: "Recipient and message are required" });
    }

    // Stub: In production, send email via transporter
    console.log(`Reply to ${to} for ticket ${ticket_no}: ${message}`);

    return res.json({ success: true, message: "Reply sent successfully" });
  } catch (error) {
    console.error("Reply error:", error);
    return res.status(500).json({ success: false, message: "Failed to send reply" });
  }
});

/**
 * CREATE SUPPORT TICKET
 * POST /api/support-ticket
 */
// router.post("/", async (req, res) => {
//   try {
//     const {
//       customer_name,
//       customer_email,
//       subject,
//       category,
//       message,
//       ref_no, // ✅ NEW
//     } = req.body;

//     // 🔹 Basic Validation
//     if (!customer_name || !customer_email || !subject || !message) {
//       return res.status(400).json({
//         success: false,
//         message: "Missing required fields",
//       });
//     }

//     // 🔒 Registered user validation
//     if (
//       category &&
//       category.toLowerCase().includes("registered") &&
//       !ref_no
//     ) {
//       return res.status(400).json({
//         success: false,
//         message: "Reference number is required for registered users",
//       });
//     }

//     const ticket_no = "TCK-" + Date.now();

//     const sql = `
//       INSERT INTO support_tickets
//       (
//         ticket_no,
//         ref_no,
//         customer_name,
//         customer_email,
//         subject,
//         category,
//         message,
//         priority,
//         status,
//         source,
//         created_at
//       )
//       VALUES (?, ?, ?, ?, ?, ?, ?, 'low', 'open', 'web', NOW())
//     `;

//     const result = await db.execute(sql, [
//       ticket_no,
//       ref_no || null, // ✅ Guest users get NULL
//       customer_name,
//       customer_email,
//       subject,
//       category || null,
//       message,
//     ]);

//     res.status(201).json({
//       success: true,
//       ticket_no,
//       ticket_id: result.insertId,
//     });

//   } catch (error) {
//     console.error("Insert ticket error:", error);
//     res.status(500).json({
//       success: false,
//       message: "Failed to create support ticket",
//     });
//   }
// });

router.post("/", async (req, res) => {
    try {
        const {
            customer_name,
            customer_email,
            subject,
            category,
            message,
            ref_no,
            captchaToken, // ✅ NEW
        } = req.body;

        // 🔹 Basic validation
        if (!customer_name || !customer_email || !subject || !message || !captchaToken) {
            return res.status(400).json({
                success: false,
                message: "Missing required fields",
            });
        }

        // 🔐 Verify CAPTCHA with Google
        const captchaRes = await axios.post(
            "https://www.google.com/recaptcha/api/siteverify",
            null,
            {
                params: {
                    secret: process.env.RECAPTCHA_SECRET_KEY,
                    response: captchaToken,
                },
            }
        );

        if (!captchaRes.data.success) {
            return res.status(400).json({
                success: false,
                message: "Captcha verification failed",
            });
        }

        // 🔒 Registered user validation
        if (category?.toLowerCase().includes("registered") && !ref_no) {
            return res.status(400).json({
                success: false,
                message: "Reference number is required for registered users",
            });
        }

        const ticket_no = "TCK-" + Date.now();

        const sql = `
      INSERT INTO support_tickets
      (
        company_id,
        ticket_no,
        ref_no,
        customer_name,
        customer_email,
        subject,
        category,
        message,
        priority,
        status,
        source,
        created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'low', 'open', 'web', NOW())
    `;

        const result = await db.execute(sql, [
            req.companyId || 1,
            ticket_no,
            ref_no || null,
            customer_name,
            customer_email,
            subject,
            category || null,
            message,
        ]);

        res.status(201).json({
            success: true,
            ticket_no,
            ticket_id: result.insertId,
        });

    } catch (error) {
        console.error("Insert ticket error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to create support ticket",
        });
    }
});


/**
 * UPDATE TICKET (STATUS / PRIORITY)
 * PUT /api/support-ticket/:id
 */
router.put("/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const { status, priority } = req.body;

        // 🔹 Validation
        if (!status && !priority) {
            return res.status(400).json({
                success: false,
                message: "Nothing to update"
            });
        }

        const sql = `
            UPDATE support_tickets
            SET
                status = COALESCE(?, status),
                priority = COALESCE(?, priority),
                updated_at = NOW()
            WHERE id = ? AND company_id = ?
        `;

        // ✅ FIXED: NO ARRAY DESTRUCTURING
        const result = await db.execute(sql, [
            status || null,
            priority || null,
            id,
            req.companyId || 1
        ]);

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: "Ticket not found"
            });
        }

        res.json({
            success: true,
            message: "Ticket updated successfully"
        });

    } catch (error) {
        console.error("Update ticket error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to update ticket"
        });
    }
});

export default router;
