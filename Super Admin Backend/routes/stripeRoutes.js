import express from "express";
import Stripe from "stripe";
import db from "../config/db.js";
import sendPaymentSuccessEmail from "../utils/sendPaymentSuccessEmail.js";

const router = express.Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "sk_test_dummy");

// 1️⃣ Create Payment Intent
router.post("/stripe/create-payment-intent", async (req, res) => {
  try {
    const { amount, payment_intent_id } = req.body;

    if (!amount || isNaN(amount)) {
      return res.status(400).json({ error: "Invalid amount" });
    }

    // 🔁 Reuse existing PaymentIntent
    if (payment_intent_id) {
      const pi = await stripe.paymentIntents.retrieve(payment_intent_id);
      return res.json({ clientSecret: pi.client_secret });
    }

    // ✅ Create new PaymentIntent
    // const paymentIntent = await stripe.paymentIntents.create({
    //   amount,
    //   currency: "gbp",
    //   payment_method_types: ["card"], // ✅ REQUIRED for CardElement
    // });

    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: "gbp",
      automatic_payment_methods: { enabled: true },
    });


    res.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    });

  } catch (error) {
    console.error("Stripe Error:", error.message);
    res.status(500).json({ error: error.message });
  }
});

router.post("/confirm-payment", async (req, res) => {
  try {
    const { payment_intent_id } = req.body;

    // 🔐 VERIFY WITH STRIPE (SERVER SIDE)
    const paymentIntent = await stripe.paymentIntents.retrieve(
      payment_intent_id
    );

    if (paymentIntent.status !== "succeeded") {
      return res.status(400).json({ success: false });
    }

    // 🔍 Find booking
    db.query(
      "SELECT * FROM parking_bookings WHERE payment_intent_id = ? AND company_id = ?",
      [payment_intent_id, req.companyId || 1],
      async (err, results) => {
        if (err || !results.length) {
          return res.status(404).json({ success: false });
        }

        const booking = results[0];

        // ✅ Update booking
        db.query(
          `UPDATE parking_bookings
           SET status='Active', transaction_id=?
           WHERE id=? AND company_id=?`,
          [payment_intent_id, booking.id, req.companyId || 1]
        );

        // 📧 SEND EMAIL VIA STRAPI
        await fetch(`${process.env.STRAPI_URL}/api/email`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            to: booking.email,
            subject: `Payment Successful - ${booking.website_name || "Parking Box Parking Services"}`,
            html: `
              <h3>Payment Successful</h3>
              <p>Thank you for your booking.</p>
              <p><strong>Reference:</strong> ${booking.ref_no}</p>
              <p><strong>Amount Paid:</strong> £${booking.total_payable}</p>
            `,
          }),
        });

        res.json({ success: true });
      }
    );
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ------------------------------------------------------------------------------------------------



router.post("/create-booking-after-payment", (req, res) => {
  const booking = req.body;

  if (!booking.booking_id || !booking.transaction_id || !booking.payment_method_id) {
    return res.status(400).json({ success: false });
  }

  db.query(
    `
    UPDATE parking_bookings
    SET transaction_id=?, payment_method_id=?, status='Active'
    WHERE id=? AND company_id=?
    `,
    [booking.transaction_id, booking.payment_method_id, booking.booking_id, req.companyId || 1],
    (err) => {
      if (err) return res.status(500).json({ success: false });

      const ref_no = `PB-${String(booking.booking_id).padStart(6, "0")}`;

      db.query(
        "UPDATE parking_bookings SET ref_no=? WHERE id=? AND company_id=?",
        [ref_no, booking.booking_id, req.companyId || 1],
        () => {

          /* 🔥 FINAL FETCH WITH PRODUCT DATA */
          db.query(
            `
            SELECT 
              b.*,
              p.email_dropoff_procedure,
              p.email_return_procedure,
              p.directions,
              p.email_notes,
              p.airport_duty_number,
              p.nonflex,
              p.service_type
            FROM parking_bookings b
            LEFT JOIN parking_products p
              ON p.product_name = b.product_name
            WHERE b.id = ? AND b.company_id = ?
            LIMIT 1
            `,
            [booking.booking_id, req.companyId || 1],
            async (err2, rows) => {

              if (err2 || !rows.length) {
                return res.json({ success: true, ref_no });
              }

              try {
                await sendPaymentSuccessEmail(rows[0]);

                db.query(
                  `
                  UPDATE parking_bookings
                  SET email_sent=1, email_sent_at=NOW(), email_error=NULL
                  WHERE id=? AND company_id=?
                  `,
                  [booking.booking_id, req.companyId || 1]
                );
              } catch (e) {
                db.query(
                  `
                  UPDATE parking_bookings
                  SET email_sent=0, email_error=?
                  WHERE id=? AND company_id=?
                  `,
                  [e.message, booking.booking_id, req.companyId || 1]
                );
              }

              res.json({ success: true, ref_no });
            }
          );
        }
      );
    }
  );
});


// ------------------------------------------------------------------------------------------------


// 5️⃣ Save Receipt PDF (Base64 → LONGBLOB)
router.post("/save-receipt-pdf", (req, res) => {
  const { booking_id, receipt_pdf } = req.body;

  if (!booking_id || !receipt_pdf) {
    return res.status(400).json({
      success: false,
      message: "Missing booking_id or receipt_pdf",
    });
  }

  const pdfBuffer = Buffer.from(receipt_pdf, "base64");

  const sql = `
    UPDATE parking_bookings
    SET receipt = ?
    WHERE id = ? AND company_id = ?
  `;

  db.query(sql, [pdfBuffer, booking_id, req.companyId || 1], (err, result) => {
    if (err) {
      console.error("Receipt Save Error:", err.sqlMessage);
      return res.status(500).json({
        success: false,
        error: err.sqlMessage,
      });
    }

    res.json({
      success: true,
      message: "Receipt PDF stored successfully",
    });
  });
});

// 6️⃣ Download receipt from DB
router.get("/download-receipt/:bookingId", (req, res) => {
  const { bookingId } = req.params;

  db.query(
    "SELECT receipt FROM parking_bookings WHERE id = ? AND company_id = ?",
    [bookingId, req.companyId || 1],
    (err, results) => {
      if (err || !results.length || !results[0].receipt) {
        return res.status(404).send("Receipt not found");
      }

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `inline; filename=receipt_${bookingId}.pdf`
      );

      res.send(results[0].receipt);
    }
  );
});



// 3️⃣ Fetch booking by transaction ID
router.get("/get-booking-by-transaction/:transactionId", (req, res) => {
  const { transactionId } = req.params;

  db.query(
    "SELECT * FROM parking_bookings WHERE transaction_id = ? AND company_id = ? LIMIT 1",
    [transactionId, req.companyId || 1],
    (err, results) => {
      if (err) {
        return res.status(500).json({
          success: false,
          error: err.sqlMessage
        });
      }

      if (!results.length) {
        return res.status(404).json({
          success: false,
          message: "Booking not found"
        });
      }

      res.json({
        success: true,
        booking: results[0]
      });
    }
  );
});


// 4️⃣ Payment Expired — Retry Link + Email
router.post("/payment-expired", async (req, res) => {
  const { booking_id, email, total_payable, product_name } = req.body;

  const retryLink = `${process.env.FRONTEND_URL}/retry-payment/${booking_id}`;

  const sql = `
    UPDATE parking_bookings 
    SET status='Awaiting Payment', retry_link=?
    WHERE id=? AND company_id=?
  `;

  db.query(sql, [retryLink, booking_id, req.companyId || 1], async (err) => {
    if (err) {
      return res.json({ success: false });
    }

    // 📧 Send Email via Strapi
    await fetch(`${process.env.STRAPI_URL}/api/email`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: email,
        subject: `Complete Your Payment - ${product_name}`,
        html: `
          <p>Hello,</p>
          <p>Your booking for <strong>${product_name}</strong> has not been paid.</p>
          <p>Amount Due: <strong>£${total_payable}</strong></p>
          <p>
            <a href="${retryLink}" style="color:blue;">
              Click here to complete payment
            </a>
          </p>
        `
      }),
    });

    res.json({ success: true });
  });
});

router.post("/refund-booking", async (req, res) => {
  try {
    const { booking_id, refund_amount } = req.body;

    if (!booking_id) {
      return res.status(400).json({ error: "booking_id is required" });
    }

    // 1️⃣ Get booking
    db.query(
      "SELECT * FROM parking_bookings WHERE id = ? AND company_id = ?",
      [booking_id, req.companyId || 1],
      async (err, results) => {
        if (err || !results.length) {
          return res.status(404).json({ error: "Booking not found" });
        }

        const booking = results[0];

        if (!booking.transaction_id) {
          return res.status(400).json({ error: "No payment found" });
        }

        if (booking.refund_status !== "None") {
          return res.status(400).json({ error: "Already refunded" });
        }

        // 2️⃣ Create Stripe refund (TEST MODE)
        const refund = await stripe.refunds.create({
          payment_intent: booking.transaction_id,
          amount: refund_amount
            ? Math.round(Number(refund_amount) * 100)
            : undefined, // full refund if not provided
        });

        // 3️⃣ Update DB
        db.query(
          `UPDATE parking_bookings
           SET refund_id = ?,
               refund_amount = ?,
               refund_status = ?,
               refunded_at = NOW(),
               status = 'Refunded'
           WHERE id = ? AND company_id = ?`,
          [
            refund.id,
            refund_amount || booking.total_payable,
            refund_amount ? "Partial" : "Full",
            booking_id,
            req.companyId || 1
          ]
        );

        res.json({
          success: true,
          message: "Refund processed successfully",
          refund,
        });
      }
    );
  } catch (err) {
    console.error("Refund error:", err.message);
    res.status(500).json({ error: err.message });
  }
});


export default router;
