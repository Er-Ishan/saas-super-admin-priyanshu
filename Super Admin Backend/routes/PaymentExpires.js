import express from "express";
import db from "../config/db.js";
import { sendBookingEmail } from "../utils/sendBookingEmail.js";

const router = express.Router();

const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";



router.post("/payment-session-expired", async (req, res) => {
  try {
    const { booking_id } = req.body;

    if (!booking_id) {
      return res.status(400).json({
        success: false,
        message: "Booking ID required"
      });
    }

    const [rows] = await db.promise().query(
      "SELECT * FROM parking_bookings WHERE id = ? AND company_id = ?",
      [booking_id, req.companyId || 1]
    );

    if (!rows.length) {
      return res.status(404).json({
        success: false,
        message: "Booking not found"
      });
    }

    const booking = rows[0];

    // Prevent duplicate email
    if (booking.email_sent === 3 && booking.payment_link) {
      return res.status(200).json({
        success: true,
        payment_link: booking.payment_link
      });
    }

    const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";
    const paymentLink = `${FRONTEND_URL}/retry-payment/${booking.id}`;

    let emailFailed = false;

    // ✅ EMAIL SEND (SAFE)
    try {
      await sendBookingEmail({
        to: booking.email,
        first_name: booking.first_name,
        booking_id: booking.id,
        product_name: booking.product_name,
        drop_off_date: booking.drop_off_date,
        return_date: booking.return_date,
        total_payable: booking.total_payable,
        payment_link: paymentLink,
        company_id: booking.company_id
      });
    } catch (emailError) {
      emailFailed = true;

      console.error("⚠️ Email send failed (rate limit or SMTP):", {
        booking_id: booking.id,
        message: emailError?.response || emailError.message
      });
    }

    // ✅ UPDATE BOOKING REGARDLESS
    await db.promise().query(
      `
      UPDATE parking_bookings
      SET 
        email_sent = ?,
        email_sent_at = ?,
        status = 'Pending',
        payment_link = ?
      WHERE id = ? AND company_id = ?
      `,
      [
        emailFailed ? 0 : 3,               // retry later if failed
        emailFailed ? null : new Date(),
        paymentLink,
        booking_id,
        req.companyId || 1
      ]
    );

    // ✅ ALWAYS RETURN SUCCESS
    return res.status(200).json({
      success: true,
      payment_link: paymentLink,
      email_sent: !emailFailed,
      email_error: emailFailed ? "Rate limit exceeded" : null
    });

  } catch (error) {
    console.error("Session expiry handler failed:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
});

export default router;
