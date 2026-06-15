import express from "express";
import transporter from "../utils/mailer.js"; // your existing Nodemailer setup
import db from "../config/db.js";

const router = express.Router();

// Increase JSON size to handle large PDF
router.use(express.json({ limit: "10mb" }));

/**
 * POST /api/email-booking
 * Body: { booking_id, email, first_name, receipt_pdf (base64) }
 */
router.post("/email-booking", async (req, res) => {
    try {
        const { booking_id, email, first_name, receipt_pdf } = req.body;

        if (!booking_id || !email || !receipt_pdf) {
            return res.status(400).json({ message: "Missing required data" });
        }

        // Convert base64 PDF to buffer
        const attachmentBuffer = Buffer.from(receipt_pdf, "base64");

        const [settingsRows] = await db.promise().query(
            "SELECT website_name FROM website_settings WHERE company_id = ? LIMIT 1",
            [req.companyId || 1]
        );
        const companyName = settingsRows.length && settingsRows[0].website_name
            ? settingsRows[0].website_name
            : "Parking Box";

        // Email content
        const htmlContent = `
      <div style="font-family: Arial, sans-serif; background:#f4f6f8; padding:20px;">
        <div style="max-width:600px; margin:auto; background:#fff; padding:25px; border-radius:6px;">
          <h2 style="color:#0a3d62; text-align:center;">Booking Details</h2>
          <p>Dear <strong>${first_name}</strong>,</p>
          <p>Thank you for your booking. Please find your booking receipt attached as a PDF.</p>
          <p>Booking ID: <strong>${booking_id}</strong></p>
          <p>Kind regards,<br><strong>${companyName} Team</strong></p>
        </div>
      </div>
    `;

        // Send the email
        // Send the email
        await transporter.sendMail({
            from: `"${companyName}" <${process.env.SMTP_USER}>`,
            to: email,
            subject: `✅ Your Booking Receipt – ${booking_id}`,
            html: htmlContent,
            attachments: [
                {
                    filename: `Booking_${booking_id}.pdf`,
                    content: attachmentBuffer,
                    contentType: "application/pdf",
                },
            ],
        });


        return res.json({ message: "Email sent successfully" });
    } catch (err) {
        console.error("Email sending failed:", err);
        return res.status(500).json({ message: "Failed to send email" });
    }
});

export default router;
