import express from "express";
import db from "../config/db.js";
import moment from "moment";
import Stripe from "stripe";
import { sendBookingEmail } from "../utils/sendBookingEmail.js";
const router = express.Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "sk_test_dummy");





// ============ STRIPE PAYMENT INTENT =============
router.post("/create-payment-intent", async (req, res) => {
  try {
    const { bookingId, amount, email } = req.body;

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100),
      currency: "gbp",
      metadata: { bookingId, email },
      automatic_payment_methods: { enabled: true },
    });

    return res.json({
      clientSecret: paymentIntent.client_secret
    });

  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message
    });
  }
});

router.post("/create-booking", async (req, res) => {
  try {
    const {
      title, first_name, last_name, email, mobile,
      product_name, product_flexibility, travelling_from,
      service_provider, service,
      drop_off_date, return_date, no_of_days,
      status, source, website_name,
      transaction_source, transaction_id,
      depart_terminal, depart_flight,
      return_terminal, return_flight,
      vehicle_make, vehicle_model, vehicle_colour, vehicle_registration,
      passengers,
      quote_amount, discount, booking_fee, total_payable,
      addons, addons_total,
      terms_accepted
    } = req.body;

    // ✅ REQUIRED FIELD CHECK
    if (!first_name || !last_name || !email || !mobile) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields"
      });
    }

    // ✅ ADD-ONS CALCULATION
    const cancellation_cover = addons?.cancellation_cover ? 1.49 : 0.0;
    const sms_confirmation = addons?.sms_confirmation ? 0.75 : 0.0;

    // ✅ INSERT ONLY (NO EMAIL LOGIC)
    const valuesPlaceholders = Array(37).fill("?").join(",");
    const sql = `
      INSERT INTO parking_bookings (
        company_id, title, first_name, last_name, email, mobile,
        product_name, product_flexibility, travelling_from,
        service_provider, service,
        drop_off_date, return_date, no_of_days,
        status, source, website_name, transaction_source, transaction_id,
        depart_terminal, depart_flight,
        return_terminal, return_flight,
        vehicle_make, vehicle_model, vehicle_colour, vehicle_registration,
        passengers,
        quote_amount, discount, booking_fee,
        cancellation_cover, sms_confirmation, addons_total,
        total_payable, terms_accepted,
        email_sent
      ) VALUES (${valuesPlaceholders})
    `;

    const values = [
      req.companyId || 1,
      title, first_name, last_name, email, mobile,
      product_name, product_flexibility, travelling_from,
      service_provider, service,
      drop_off_date, return_date, no_of_days,
      status || "Pending",          // ⛔ Payment not done yet
      source || "Website",
      website_name || "Parking Box Services",
      transaction_source || "Online",
      transaction_id || null,
      depart_terminal, depart_flight,
      return_terminal, return_flight,
      vehicle_make, vehicle_model, vehicle_colour, vehicle_registration,
      passengers,
      quote_amount, discount, booking_fee,
      cancellation_cover, sms_confirmation, addons_total || 0,
      total_payable,
      terms_accepted ? 1 : 0,
      0                               // ✅ email_sent = 0 (NOT SENT)
    ];

    db.query(sql, values, (err, result) => {
      if (err) {
        return res.status(500).json({
          success: false,
          message: err.sqlMessage
        });
      }

      // ✅ ONLY RETURN BOOKING ID
      res.json({
        success: true,
        booking_id: result.insertId
      });
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});



export default router;
