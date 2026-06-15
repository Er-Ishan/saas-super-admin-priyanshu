import express from "express";
import transporter from "../utils/mailer.js";
import db from "../config/db.js";

const router = express.Router();

router.post("/email-receipt-pdf", async (req, res) => {
    try {
        const {
            booking_id,
            email,
            first_name,
            receipt_pdf
        } = req.body;

        if (!receipt_pdf || !email) {
            return res.status(400).json({
                success: false,
                message: "Missing PDF or email"
            });
        }

        const pdfBuffer = Buffer.from(receipt_pdf, "base64");

        const [settingsRows] = await db.promise().query(
            "SELECT website_name FROM website_settings WHERE company_id = ? LIMIT 1",
            [req.companyId || 1]
        );
        const companyName = settingsRows.length && settingsRows[0].website_name
            ? settingsRows[0].website_name
            : "Parking Box";

        await transporter.sendMail({
            from: `"${process.env.SMTP_FROM_NAME}" <${process.env.SMTP_USER}>`,
            to: email,
            subject: `🧾 Your Receipt – ${companyName}`,
            html: `
        <p>Dear <strong>${first_name}</strong>,</p>

        <p>
            Thank you for your payment.  
            Please find your receipt attached as a PDF.
        </p>

        <p>
            Booking Reference: <strong>${booking_id}</strong>
        </p>

        <p>
            Kind regards,<br/>
            <strong>${companyName} Team</strong>
        </p>
    `,
            attachments: [
                {
                    filename: `Receipt_${booking_id}.pdf`,
                    content: pdfBuffer,
                    contentType: "application/pdf"
                }
            ]
        });


        res.json({
            success: true,
            message: "Receipt emailed successfully"
        });

    } catch (err) {
        console.error("Email receipt error:", err);
        res.status(500).json({
            success: false,
            message: "Failed to send receipt email"
        });
    }
});

export default router;
