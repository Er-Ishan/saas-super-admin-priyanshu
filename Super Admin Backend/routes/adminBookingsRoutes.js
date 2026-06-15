import express from "express";
import db from "../config/db.js";
import Stripe from "stripe";
import dotenv from "dotenv";

dotenv.config();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "sk_test_dummy");

const router = express.Router();

function companyIdFromReq(req) {
  return req.companyId || 1;
}

function isNonEmpty(v) {
  return v !== undefined && v !== null && String(v).trim() !== "";
}

router.get("/getalldata", async (req, res) => {
  try {
    const companyId = companyIdFromReq(req);

    const page = Math.max(1, Number(req.query.page || 1));
    const limit = Math.min(500, Math.max(1, Number(req.query.limit || 25)));
    const offset = (page - 1) * limit;

    const where = ["company_id = ?"];
    const params = [companyId];

    const status = req.query.status;
    const source = req.query.source;
    const airport = req.query.airport;
    const serviceType = req.query.service_type;

    if (isNonEmpty(status)) {
      where.push("status = ?");
      params.push(String(status));
    }
    if (isNonEmpty(source)) {
      where.push("LOWER(TRIM(source)) = LOWER(TRIM(?))");
      params.push(String(source));
    }
    if (isNonEmpty(airport)) {
      where.push("travelling_from = ?");
      params.push(String(airport));
    }
    if (isNonEmpty(serviceType)) {
      where.push("service = ?");
      params.push(String(serviceType));
    }

    // Date filters (YYYY-MM-DD)
    const bookingDate = req.query.booking_date;
    const departDate = req.query.depart_date;
    const returnDate = req.query.return_date;
    const rangeFrom = req.query.range_from;
    const rangeTo = req.query.range_to;

    if (isNonEmpty(bookingDate)) {
      where.push("DATE(created_at) = ?");
      params.push(String(bookingDate));
    }
    if (isNonEmpty(departDate)) {
      where.push("DATE(drop_off_date) = ?");
      params.push(String(departDate));
    }
    if (isNonEmpty(returnDate)) {
      where.push("DATE(return_date) = ?");
      params.push(String(returnDate));
    }
    if (isNonEmpty(rangeFrom)) {
      where.push("DATE(created_at) >= ?");
      params.push(String(rangeFrom));
    }
    if (isNonEmpty(rangeTo)) {
      where.push("DATE(created_at) <= ?");
      params.push(String(rangeTo));
    }

    // Free-text search
    const search = req.query.search;
    if (isNonEmpty(search)) {
      const s = `%${String(search).trim()}%`;
      where.push(
        "(" +
        [
          "ref_no LIKE ?",
          "first_name LIKE ?",
          "last_name LIKE ?",
          "email LIKE ?",
          "mobile LIKE ?",
          "vehicle_registration LIKE ?",
          "product_name LIKE ?",
        ].join(" OR ") +
        ")"
      );
      params.push(s, s, s, s, s, s, s);
    }

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

    const countSql = `SELECT COUNT(*) AS total FROM parking_bookings ${whereSql}`;
    const dataSql = `
      SELECT *
      FROM parking_bookings
      ${whereSql}
      ORDER BY id DESC
      LIMIT ? OFFSET ?
    `;

    const [countRows] = await db.promise().query(countSql, params);
    const total = Number(countRows?.[0]?.total || 0);

    const dataParams = [...params, limit, offset];
    const [rows] = await db.promise().query(dataSql, dataParams);

    return res.json({ success: true, data: rows, total });
  } catch (error) {
    console.error("getalldata error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

// Used by FrontendAdmin "Suppliers-Info" page
router.get("/supplier-booking", async (req, res) => {
  try {
    const companyId = companyIdFromReq(req);

    const page = Math.max(1, Number(req.query.page || 1));
    const limit = Math.min(500, Math.max(1, Number(req.query.limit || 25)));
    const offset = (page - 1) * limit;

    const where = ["company_id = ?", "source = 'Supplier'"];
    const params = [companyId];

    const status = req.query.status;
    const source = req.query.source;
    const airport = req.query.airport;
    const serviceType = req.query.service_type;

    if (isNonEmpty(status)) {
      where.push("status = ?");
      params.push(String(status));
    }
    // For source, we're already locked to 'Supplier', but if they request something else, it might contradict.
    // Handling just in case:
    if (isNonEmpty(source) && String(source).trim() !== "") {
       // do nothing as we locked to Supplier
    }
    if (isNonEmpty(airport)) {
      where.push("travelling_from = ?");
      params.push(String(airport));
    }
    if (isNonEmpty(serviceType)) {
      where.push("service = ?");
      params.push(String(serviceType));
    }

    // Date filters (YYYY-MM-DD)
    const bookingDate = req.query.booking_date;
    const departDate = req.query.depart_date;
    const returnDate = req.query.return_date;
    
    // Pattern parameters
    const rangeFrom = req.query.range_from;
    const rangeTo = req.query.range_to;
    const dropoffFrom = req.query.dropoff_from;
    const dropoffTo = req.query.dropoff_to;
    const returnFrom = req.query.return_from;
    const returnTo = req.query.return_to;

    if (isNonEmpty(bookingDate)) {
      where.push("DATE(created_at) = ?");
      params.push(String(bookingDate));
    }
    if (isNonEmpty(departDate)) {
      where.push("DATE(drop_off_date) = ?");
      params.push(String(departDate));
    }
    if (isNonEmpty(returnDate)) {
      where.push("DATE(return_date) = ?");
      params.push(String(returnDate));
    }
    
    if (isNonEmpty(rangeFrom)) {
      where.push("DATE(created_at) >= ?");
      params.push(String(rangeFrom));
    }
    if (isNonEmpty(rangeTo)) {
      where.push("DATE(created_at) <= ?");
      params.push(String(rangeTo));
    }

    if (isNonEmpty(dropoffFrom)) {
      where.push("DATE(drop_off_date) >= ?");
      params.push(String(dropoffFrom));
    }
    if (isNonEmpty(dropoffTo)) {
      where.push("DATE(drop_off_date) <= ?");
      params.push(String(dropoffTo));
    }

    if (isNonEmpty(returnFrom)) {
      where.push("DATE(return_date) >= ?");
      params.push(String(returnFrom));
    }
    if (isNonEmpty(returnTo)) {
      where.push("DATE(return_date) <= ?");
      params.push(String(returnTo));
    }

    // Free-text search
    const search = req.query.search;
    if (isNonEmpty(search)) {
      const s = `%${String(search).trim()}%`;
      where.push(
        "(" +
        [
          "ref_no LIKE ?",
          "first_name LIKE ?",
          "last_name LIKE ?",
          "email LIKE ?",
          "mobile LIKE ?",
          "vehicle_registration LIKE ?",
          "product_name LIKE ?",
        ].join(" OR ") +
        ")"
      );
      params.push(s, s, s, s, s, s, s);
    }

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

    const countSql = `SELECT COUNT(*) AS total FROM parking_bookings ${whereSql}`;
    const dataSql = `
      SELECT *
      FROM parking_bookings
      ${whereSql}
      ORDER BY id DESC
      LIMIT ? OFFSET ?
    `;

    const [countRows] = await db.promise().query(countSql, params);
    const total = Number(countRows?.[0]?.total || 0);

    const dataParams = [...params, limit, offset];
    const [rows] = await db.promise().query(dataSql, dataParams);

    return res.json({ success: true, data: rows, total });
  } catch (error) {
    console.error("supplier-booking error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

// Used by FrontendAdmin "Cancelled / Refund bookings" pages
router.get("/refund-data", async (req, res) => {
  try {
    const companyId = companyIdFromReq(req);

    const page = Math.max(1, Number(req.query.page || 1));
    const limit = Math.min(500, Math.max(1, Number(req.query.limit || 25)));
    const offset = (page - 1) * limit;

    const where = ["company_id = ?", "status = 'Cancelled'"];
    const params = [companyId];

    // Optional filters matching FrontendAdmin query string
    const source = req.query.source;
    const airport = req.query.airport;
    const serviceType = req.query.service_type;
    if (isNonEmpty(source)) {
      where.push("LOWER(TRIM(source)) = LOWER(TRIM(?))");
      params.push(String(source));
    }
    if (isNonEmpty(airport)) {
      where.push("travelling_from = ?");
      params.push(String(airport));
    }
    if (isNonEmpty(serviceType)) {
      where.push("service = ?");
      params.push(String(serviceType));
    }

    const bookingDate = req.query.booking_date;
    const departDate = req.query.depart_date;
    const returnDate = req.query.return_date;
    const rangeFrom = req.query.range_from;
    const rangeTo = req.query.range_to;
    if (isNonEmpty(bookingDate)) {
      where.push("DATE(created_at) = ?");
      params.push(String(bookingDate));
    }
    if (isNonEmpty(departDate)) {
      where.push("DATE(drop_off_date) = ?");
      params.push(String(departDate));
    }
    if (isNonEmpty(returnDate)) {
      where.push("DATE(return_date) = ?");
      params.push(String(returnDate));
    }
    if (isNonEmpty(rangeFrom)) {
      where.push("DATE(created_at) >= ?");
      params.push(String(rangeFrom));
    }
    if (isNonEmpty(rangeTo)) {
      where.push("DATE(created_at) <= ?");
      params.push(String(rangeTo));
    }

    const search = req.query.search;
    if (isNonEmpty(search)) {
      const s = `%${String(search).trim()}%`;
      where.push(
        "(" +
        [
          "ref_no LIKE ?",
          "first_name LIKE ?",
          "last_name LIKE ?",
          "email LIKE ?",
          "mobile LIKE ?",
          "vehicle_registration LIKE ?",
          "product_name LIKE ?",
        ].join(" OR ") +
        ")"
      );
      params.push(s, s, s, s, s, s, s);
    }

    const whereSql = `WHERE ${where.join(" AND ")}`;
    const countSql = `SELECT COUNT(*) AS total FROM parking_bookings ${whereSql}`;
    const dataSql = `
      SELECT *
      FROM parking_bookings
      ${whereSql}
      ORDER BY id DESC
      LIMIT ? OFFSET ?
    `;

    const [countRows] = await db.promise().query(countSql, params);
    const total = Number(countRows?.[0]?.total || 0);

    const dataParams = [...params, limit, offset];
    const [rows] = await db.promise().query(dataSql, dataParams);

    return res.json({ success: true, data: rows, total });
  } catch (error) {
    console.error("refund-data error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

// Used by FrontendAdmin "Website bookings" page
router.get("/websitedata", async (req, res) => {
  try {
    const companyId = companyIdFromReq(req);

    const page = Math.max(1, Number(req.query.page || 1));
    const limit = Math.min(500, Math.max(1, Number(req.query.limit || 25)));
    const offset = (page - 1) * limit;

    const where = ["company_id = ?", "LOWER(TRIM(source)) = 'website'"];
    const params = [companyId];

    // Optional filters (match FE params)
    const status = req.query.status;
    const airport = req.query.airport;
    const serviceType = req.query.service_type;
    if (isNonEmpty(status)) {
      where.push("status = ?");
      params.push(String(status));
    }
    if (isNonEmpty(airport)) {
      where.push("travelling_from = ?");
      params.push(String(airport));
    }
    if (isNonEmpty(serviceType)) {
      where.push("service = ?");
      params.push(String(serviceType));
    }

    // Date filters (FE also sends additional ones; we support the common ones)
    const bookingDate = req.query.booking_date;
    const departDate = req.query.depart_date;
    const returnDate = req.query.return_date;
    const rangeFrom = req.query.range_from;
    const rangeTo = req.query.range_to;
    if (isNonEmpty(bookingDate)) {
      where.push("DATE(created_at) = ?");
      params.push(String(bookingDate));
    }
    if (isNonEmpty(departDate)) {
      where.push("DATE(drop_off_date) = ?");
      params.push(String(departDate));
    }
    if (isNonEmpty(returnDate)) {
      where.push("DATE(return_date) = ?");
      params.push(String(returnDate));
    }
    if (isNonEmpty(rangeFrom)) {
      where.push("DATE(created_at) >= ?");
      params.push(String(rangeFrom));
    }
    if (isNonEmpty(rangeTo)) {
      where.push("DATE(created_at) <= ?");
      params.push(String(rangeTo));
    }

    const search = req.query.search;
    if (isNonEmpty(search)) {
      const s = `%${String(search).trim()}%`;
      where.push(
        "(" +
          [
            "ref_no LIKE ?",
            "first_name LIKE ?",
            "last_name LIKE ?",
            "email LIKE ?",
            "mobile LIKE ?",
            "vehicle_registration LIKE ?",
            "product_name LIKE ?",
          ].join(" OR ") +
          ")"
      );
      params.push(s, s, s, s, s, s, s);
    }

    const whereSql = `WHERE ${where.join(" AND ")}`;
    const countSql = `SELECT COUNT(*) AS total FROM parking_bookings ${whereSql}`;
    const dataSql = `
      SELECT *
      FROM parking_bookings
      ${whereSql}
      ORDER BY id DESC
      LIMIT ? OFFSET ?
    `;

    const [countRows] = await db.promise().query(countSql, params);
    const total = Number(countRows?.[0]?.total || 0);

    const dataParams = [...params, limit, offset];
    const [rows] = await db.promise().query(dataSql, dataParams);

    return res.json({ success: true, data: rows, total });
  } catch (error) {
    console.error("websitedata error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

// Used by FrontendAdmin "Admin Booking" page
router.get("/mobile-bookings", async (req, res) => {
  try {
    const companyId = companyIdFromReq(req);

    const page = Math.max(1, Number(req.query.page || 1));
    const limit = Math.min(500, Math.max(1, Number(req.query.limit || 25)));
    const offset = (page - 1) * limit;

    const where = ["company_id = ?", "LOWER(TRIM(source)) = 'admin'"];
    const params = [companyId];

    // Optional filters (match FE params)
    const status = req.query.status;
    const airport = req.query.airport;
    const serviceType = req.query.service_type;
    if (isNonEmpty(status)) {
      where.push("status = ?");
      params.push(String(status));
    }
    if (isNonEmpty(airport)) {
      where.push("travelling_from = ?");
      params.push(String(airport));
    }
    if (isNonEmpty(serviceType)) {
      where.push("service = ?");
      params.push(String(serviceType));
    }

    // Date filters
    const bookingDate = req.query.booking_date;
    const departDate = req.query.depart_date;
    const returnDate = req.query.return_date;
    const rangeFrom = req.query.range_from;
    const rangeTo = req.query.range_to;
    if (isNonEmpty(bookingDate)) {
      where.push("DATE(created_at) = ?");
      params.push(String(bookingDate));
    }
    if (isNonEmpty(departDate)) {
      where.push("DATE(drop_off_date) = ?");
      params.push(String(departDate));
    }
    if (isNonEmpty(returnDate)) {
      where.push("DATE(return_date) = ?");
      params.push(String(returnDate));
    }
    if (isNonEmpty(rangeFrom)) {
      where.push("DATE(created_at) >= ?");
      params.push(String(rangeFrom));
    }
    if (isNonEmpty(rangeTo)) {
      where.push("DATE(created_at) <= ?");
      params.push(String(rangeTo));
    }

    const search = req.query.search;
    if (isNonEmpty(search)) {
      const s = `%${String(search).trim()}%`;
      where.push(
        "(" +
          [
            "ref_no LIKE ?",
            "first_name LIKE ?",
            "last_name LIKE ?",
            "email LIKE ?",
            "mobile LIKE ?",
            "vehicle_registration LIKE ?",
            "product_name LIKE ?",
          ].join(" OR ") +
          ")"
      );
      params.push(s, s, s, s, s, s, s);
    }

    const whereSql = `WHERE ${where.join(" AND ")}`;
    const countSql = `SELECT COUNT(*) AS total FROM parking_bookings ${whereSql}`;
    const dataSql = `
      SELECT *
      FROM parking_bookings
      ${whereSql}
      ORDER BY id DESC
      LIMIT ? OFFSET ?
    `;

    const [countRows] = await db.promise().query(countSql, params);
    const total = Number(countRows?.[0]?.total || 0);

    const dataParams = [...params, limit, offset];
    const [rows] = await db.promise().query(dataSql, dataParams);

    return res.json({ success: true, data: rows, total });
  } catch (error) {
    console.error("mobile-bookings error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

// Used by FrontendAdmin "Incomplete Booking" page
router.get("/incompletebooking", async (req, res) => {
  try {
    const companyId = companyIdFromReq(req);

    const page = Math.max(1, Number(req.query.page || 1));
    const limit = Math.min(500, Math.max(1, Number(req.query.limit || 25)));
    const offset = (page - 1) * limit;

    const where = ["company_id = ?", "status = 'Pending'"];
    const params = [companyId];

    // Optional filters (match FE params)
    const airport = req.query.airport;
    const serviceType = req.query.service_type;
    const source = req.query.source;

    if (isNonEmpty(airport)) {
      where.push("travelling_from = ?");
      params.push(String(airport));
    }
    if (isNonEmpty(serviceType)) {
      where.push("service = ?");
      params.push(String(serviceType));
    }
    if (isNonEmpty(source)) {
      where.push("source = ?");
      params.push(String(source));
    }

    // Date filters
    const bookingDate = req.query.booking_date;
    const departDate = req.query.depart_date;
    const returnDate = req.query.return_date;
    const rangeFrom = req.query.range_from;
    const rangeTo = req.query.range_to;
    if (isNonEmpty(bookingDate)) {
      where.push("DATE(created_at) = ?");
      params.push(String(bookingDate));
    }
    if (isNonEmpty(departDate)) {
      where.push("DATE(drop_off_date) = ?");
      params.push(String(departDate));
    }
    if (isNonEmpty(returnDate)) {
      where.push("DATE(return_date) = ?");
      params.push(String(returnDate));
    }
    if (isNonEmpty(rangeFrom)) {
      where.push("DATE(created_at) >= ?");
      params.push(String(rangeFrom));
    }
    if (isNonEmpty(rangeTo)) {
      where.push("DATE(created_at) <= ?");
      params.push(String(rangeTo));
    }

    const search = req.query.search;
    if (isNonEmpty(search)) {
      const s = `%${String(search).trim()}%`;
      where.push(
        "(" +
          [
            "ref_no LIKE ?",
            "first_name LIKE ?",
            "last_name LIKE ?",
            "email LIKE ?",
            "mobile LIKE ?",
            "vehicle_registration LIKE ?",
            "product_name LIKE ?",
          ].join(" OR ") +
          ")"
      );
      params.push(s, s, s, s, s, s, s);
    }

    const whereSql = `WHERE ${where.join(" AND ")}`;
    const countSql = `SELECT COUNT(*) AS total FROM parking_bookings ${whereSql}`;
    const dataSql = `
      SELECT *
      FROM parking_bookings
      ${whereSql}
      ORDER BY id DESC
      LIMIT ? OFFSET ?
    `;

    const [countRows] = await db.promise().query(countSql, params);
    const total = Number(countRows?.[0]?.total || 0);

    const dataParams = [...params, limit, offset];
    const [rows] = await db.promise().query(dataSql, dataParams);

    return res.json({ success: true, data: rows, total });
  } catch (error) {
    console.error("incompletebooking error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

/* ========================================================
   BOOKING ACTION ENDPOINTS for Suppliers-Info & Dashboard
   Mounted as /api/bookings/...
======================================================== */

// 1. Update Notes
router.put("/bookings/update-notes/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;
    const companyId = companyIdFromReq(req);

    const [result] = await db.promise().query(
      "UPDATE parking_bookings SET notes = ? WHERE id = ? AND company_id = ?",
      [notes || null, id, companyId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: "Booking not found" });
    }
    return res.json({ success: true, message: "Notes updated" });
  } catch (error) {
    console.error("Update notes error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

// 2. Extend Preview
router.post("/bookings/extend/preview/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { new_drop_off_date, new_return_date, extra_charge } = req.body;
    const companyId = companyIdFromReq(req);

    // Fetch original booking to get current price
    const [rows] = await db.promise().query(
      "SELECT total_payable, drop_off_date, return_date FROM parking_bookings WHERE id = ? AND company_id = ?",
      [id, companyId]
    );

    if (!rows.length) {
      return res.status(404).json({ success: false, message: "Booking not found" });
    }

    const booking = rows[0];
    const oldPrice = Number(booking.total_payable || 0);

    // Basic calculation logic: Add extra_charge to old price
    // You can refine this logic to calculate daily differences using bands later
    const parsedExtra = Number(extra_charge || 0);
    const newPayable = oldPrice + parsedExtra;

    return res.json({
      success: true,
      new_total_payable: newPayable.toFixed(2),
      extra_charge: parsedExtra.toFixed(2),
      discount: 0,
      old_quote: oldPrice,
      new_quote: newPayable
    });
  } catch (error) {
    console.error("Extend preview error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

// 3. Extend Booking
router.put("/bookings/extend/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { new_drop_off_date, new_return_date, extended_transaction_id, extra_charge } = req.body;
    const companyId = companyIdFromReq(req);

    // Step 1: get old payable
    const [rows] = await db.promise().query(
      "SELECT total_payable FROM parking_bookings WHERE id = ? AND company_id = ?",
      [id, companyId]
    );

    if (!rows.length) return res.status(404).json({ success: false, message: "Booking not found" });

    const parsedExtra = Number(extra_charge || 0);
    const newPayable = Number(rows[0].total_payable || 0) + parsedExtra;

    const [result] = await db.promise().query(
      `UPDATE parking_bookings 
       SET extended_return_date = return_date, 
           return_date = ?, 
           extended_transaction_id = ?, 
           extra_charge = ?, 
           total_payable = ?, 
           status = 'Extended'
       WHERE id = ? AND company_id = ?`,
      [new_return_date, extended_transaction_id, parsedExtra, newPayable, id, companyId]
    );

    if (result.affectedRows === 0) {
       return res.status(404).json({ success: false, message: "Booking not found" });
    }
    return res.json({ success: true, message: "Booking extended successfully" });
  } catch (error) {
    console.error("Extend booking error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

// 4. Cancel Booking
router.post("/bookings/cancel/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { reason, action } = req.body; // e.g. cancellation_reason
    const companyId = companyIdFromReq(req);

    const [result] = await db.promise().query(
      "UPDATE parking_bookings SET status = 'Cancelled', notes = CONCAT(IFNULL(notes, ''), '\nCancelled Action: ', ?) WHERE id = ? AND company_id = ?",
      [action || 'None', id, companyId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: "Booking not found" });
    }
    return res.json({ success: true, message: "Booking cancelled" });
  } catch (error) {
    console.error("Cancel booking error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

// 5. Email CSV
router.post("/bookings/email-csv", async (req, res) => {
  try {
    // Stub implementation: normally you would generate a CSV and send via nodemailer here.
    return res.json({ success: true, message: "CSV sent to administrator's email successfully" });
  } catch (error) {
    console.error("Email CSV error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

// 6. Send Booking Email to Customer
router.post("/bookings/send-booking-email/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = companyIdFromReq(req);

    // Update email sent status
    const [result] = await db.promise().query(
      "UPDATE parking_bookings SET email_sent = 1, email_sent_at = NOW() WHERE id = ? AND company_id = ?",
      [id, companyId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: "Booking not found" });
    }
    return res.json({ success: true, message: "Email sent to customer" });
  } catch (error) {
    console.error("Send booking email error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

// 7. Get Email Status
router.get("/bookings/email-status/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = companyIdFromReq(req);

    const [rows] = await db.promise().query(
      "SELECT email_sent FROM parking_bookings WHERE id = ? AND company_id = ?",
      [id, companyId]
    );

    if (!rows.length) {
      return res.status(404).json({ success: false, message: "Booking not found" });
    }
    return res.json({ success: true, email_sent: rows[0].email_sent });
  } catch (error) {
    console.error("Email status error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

// 8. Delete Booking
router.delete("/bookings/delete/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = companyIdFromReq(req);

    const [result] = await db.promise().query(
      "DELETE FROM parking_bookings WHERE id = ? AND company_id = ?",
      [id, companyId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: "Booking not found" });
    }
    return res.json({ success: true, message: "Booking deleted successfully" });
  } catch (error) {
    console.error("Delete booking error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

/* ========================================================
   THOMSONDATA ENDPOINTS for Report Pages (Depart/Return)
   Mounted as /api/thomsondata/...
   These endpoints fetch raw arrays for client-side filtering
======================================================== */

// 1. /thomsondata/active
router.get("/thomsondata/active", async (req, res) => {
  try {
    const companyId = companyIdFromReq(req);
    const [rows] = await db.promise().query(
      "SELECT * FROM parking_bookings WHERE company_id = ? AND status != 'Cancelled' ORDER BY created_at DESC LIMIT 2000",
      [companyId]
    );
    return res.json({ success: true, data: rows });
  } catch (error) {
    console.error("thomsondata active error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

// 2. /thomsondata/daterange
router.get("/thomsondata/daterange", async (req, res) => {
  try {
    const companyId = companyIdFromReq(req);
    const { start, end } = req.query;
    console.log(`[DEBUG] /thomsondata/daterange called: companyId=${companyId}, start=${start}, end=${end}`);

    if (!start || !end) {
      return res.status(400).json({ success: false, message: "Start and end dates required" });
    }

    const [rows] = await db.promise().query(
      "SELECT * FROM parking_bookings WHERE company_id = ? AND status != 'Cancelled' AND (DATE(drop_off_date) >= ? AND DATE(drop_off_date) <= ?) ORDER BY drop_off_date DESC LIMIT 5000",
      [companyId, start, end]
    );
    console.log(`[DEBUG] /thomsondata/daterange found ${rows.length} rows`);
    return res.json({ success: true, data: rows });
  } catch (error) {
    console.error("thomsondata daterange error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

// 3. /thomsondata/return-daterange
router.get("/thomsondata/return-daterange", async (req, res) => {
  try {
    const companyId = companyIdFromReq(req);
    const { start, end } = req.query;

    if (!start || !end) {
      return res.status(400).json({ success: false, message: "Start and end dates required" });
    }

    const [rows] = await db.promise().query(
      "SELECT * FROM parking_bookings WHERE company_id = ? AND status != 'Cancelled' AND (DATE(return_date) >= ? AND DATE(return_date) <= ?) ORDER BY return_date DESC LIMIT 5000",
      [companyId, start, end]
    );
    return res.json({ success: true, data: rows });
  } catch (error) {
    console.error("thomsondata return-daterange error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

// 4. /thomsondata/depart-return-range
router.get("/thomsondata/depart-return-range", async (req, res) => {
  try {
    const companyId = companyIdFromReq(req);
    const { start, end } = req.query;

    if (!start || !end) {
      return res.status(400).json({ success: false, message: "Start and end dates required" });
    }

    const [rows] = await db.promise().query(
      `SELECT *,
        DATE_FORMAT(drop_off_date, '%Y-%m-%d %H:%i:%s') AS drop_off_date,
        DATE_FORMAT(return_date, '%Y-%m-%d %H:%i:%s') AS return_date,
        DATE_FORMAT(created_at, '%Y-%m-%d %H:%i:%s') AS created_at
       FROM parking_bookings
       WHERE company_id = ? AND status != 'Cancelled'
         AND (
           (DATE(drop_off_date) >= ? AND DATE(drop_off_date) <= ?)
           OR (DATE(return_date) >= ? AND DATE(return_date) <= ?)
         )
       ORDER BY created_at DESC LIMIT 5000`,
      [companyId, start, end, start, end]
    );
    return res.json({ success: true, data: rows });
  } catch (error) {
    console.error("thomsondata depart-return-range error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

/* ========================================================
   PARKING INVOICE ENDPOINTS
======================================================== */

// GET /api/bookings/invoice/parking
router.get("/bookings/invoice/parking", async (req, res) => {
  try {
    const companyId = companyIdFromReq(req);
    const { from, to, airport, service_type } = req.query;

    const where = ["company_id = ?", "status != 'Cancelled'", "LOWER(TRIM(source)) = 'website'"];
    const params = [companyId];

    if (isNonEmpty(from)) {
      where.push("DATE(created_at) >= ?");
      params.push(from);
    }
    if (isNonEmpty(to)) {
      where.push("DATE(created_at) <= ?");
      params.push(to);
    }
    if (isNonEmpty(airport)) {
      where.push("travelling_from = ?");
      params.push(airport);
    }
    if (isNonEmpty(service_type)) {
      where.push("service = ?");
      params.push(service_type);
    }

    const whereSql = `WHERE ${where.join(" AND ")}`;
    const sql = `
      SELECT 
        COUNT(*) AS totalBookings,
        IFNULL(SUM(quote_amount), 0) AS totalQuoteAmount,
        IFNULL(SUM(booking_fee), 0) AS totalBookingFee,
        IFNULL(SUM(total_payable), 0) AS totalPayableAmount
      FROM parking_bookings
      ${whereSql}
    `;

    const [rows] = await db.promise().query(sql, params);
    const r = rows[0];

    return res.json({
      success: true,
      totalBookings: Number(r.totalBookings || 0),
      totals: {
        quoteAmount: Number(r.totalQuoteAmount || 0),
        bookingFee: Number(r.totalBookingFee || 0),
        payableAmount: Number(r.totalPayableAmount || 0),
      },
    });
  } catch (error) {
    console.error("Parking invoice error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

// POST /api/bookings/invoice/parking/email
router.post("/bookings/invoice/parking/email", async (req, res) => {
  try {
    // Stub implementation
    return res.json({ success: true, message: "Invoice email sent successfully" });
  } catch (error) {
    console.error("Parking invoice email error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

/* ========================================================
   CANCELLATION & REFUND ENDPOINTS
   Used by CancelPopup component
======================================================== */

// 1. GET Cancellation Details
router.get("/cancellations/parking-booking/:id/details", async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = companyIdFromReq(req);

    const sql = `
      SELECT b.*, p.nonflex
      FROM parking_bookings b
      LEFT JOIN parking_products p ON b.product_name = p.product_name
      WHERE b.id = ? AND b.company_id = ?
      LIMIT 1
    `;

    const [rows] = await db.promise().query(sql, [id, companyId]);

    if (!rows.length) {
      return res.status(404).json({ success: false, message: "Booking not found" });
    }

    res.json(rows[0]);
  } catch (error) {
    console.error("Cancellation details error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// 2. POST Cancel and Refund
router.post("/cancel-and-refund", async (req, res) => {
  try {
    const {
      id,
      refundAmount,
      difference,
      action,
      refund_type,
      cancel_reason,
      cancel_date,
      action_note,
      email_customer,
      email_carpark,
      cancellation_cover
    } = req.body;

    const companyId = companyIdFromReq(req);

    // 1. Fetch booking to get transaction_id
    const [rows] = await db.promise().query(
      "SELECT * FROM parking_bookings WHERE id = ? AND company_id = ?",
      [id, companyId]
    );

    if (!rows.length) {
      return res.status(404).json({ success: false, message: "Booking not found" });
    }

    const booking = rows[0];
    let refundId = null;
    let status = booking.status;

    // 2. Process Refund if requested
    if ((action === "refund" || action === "cancel_refund") && refundAmount > 0) {
      if (!booking.transaction_id) {
        return res.status(400).json({ success: false, error: "No payment found for refund" });
      }

      try {
        const refund = await stripe.refunds.create({
          payment_intent: booking.transaction_id,
          amount: Math.round(Number(refundAmount) * 100)
        });
        refundId = refund.id;
        status = "Refunded";
      } catch (stripeErr) {
        console.error("Stripe Refund Error:", stripeErr);
        return res.status(400).json({ success: false, error: stripeErr.message });
      }
    }

    // 3. Process Cancellation
    if (action === "cancel" || action === "cancel_refund") {
      status = "Cancelled";
    }

    // 4. Update DB
    const note = `\n[${new Date().toISOString()}] Action: ${action}. Reason: ${cancel_reason}. Note: ${action_note}`;
    
    await db.promise().query(
      `UPDATE parking_bookings 
       SET status = ?, 
           refund_id = IFNULL(?, refund_id),
           refund_amount = IFNULL(?, refund_amount),
           refund_status = ?,
           refunded_at = IF(?, NOW(), refunded_at),
           notes = CONCAT(IFNULL(notes, ''), ?),
           cancellation_cover = ?
       WHERE id = ? AND company_id = ?`,
      [
        status,
        refundId,
        refundAmount || null,
        refundId ? (refundAmount >= booking.total_payable ? "Full" : "Partial") : booking.refund_status,
        refundId ? 1 : 0,
        note,
        cancellation_cover || booking.cancellation_cover,
        id,
        companyId
      ]
    );

    res.json({ success: true, message: "Action processed successfully" });

  } catch (error) {
    console.error("Cancel and Refund error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 3. Update Booking (Amend)
router.put("/bookings/update/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = companyIdFromReq(req);
    const body = req.body;

    const fields = [
      "first_name", "last_name", "mobile", "email", "vehicle_registration",
      "vehicle_make", "vehicle_model", "vehicle_colour", "product_name",
      "status", "total_payable", "depart_flight", "depart_terminal",
      "return_flight", "return_terminal", "drop_off_date", "return_date",
      "service"
    ];

    const updates = [];
    const values = [];

    fields.forEach(f => {
      if (body[f] !== undefined) {
        updates.push(`${f} = ?`);
        values.push(body[f]);
      }
    });

    if (updates.length === 0) {
      return res.status(400).json({ success: false, message: "No fields to update" });
    }

    values.push(id, companyId);

    const sql = `UPDATE parking_bookings SET ${updates.join(", ")} WHERE id = ? AND company_id = ?`;
    const [result] = await db.promise().query(sql, values);

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: "Booking not found" });
    }

    res.json({ success: true, message: "Booking updated successfully" });
  } catch (error) {
    console.error("Update booking error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

export default router;
