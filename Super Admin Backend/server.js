import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import db from "./config/db.js";
import supportTicketRoutes from "./routes/supportTicket.js";
import session from "express-session";
import receiptRoutes from "./routes/receiptRoutes.js";
import emailBookingRouter from "./routes/emailBooking.js";
import paymentRoutes from "./routes/PaymentExpires.js";
import adminAuthRoutes from "./routes/adminAuth.js";
import analyticsRoutes from "./routes/analyticsRoutes.js";
import metaRoutes from "./routes/metaRoutes.js";
import adminBookingsRoutes from "./routes/adminBookingsRoutes.js";
import parkingProductsRoutes from "./routes/parkingProductsRoutes.js";
import supplierRoutes from "./routes/supplierRoutes.js";
import promoCodeRoutes from "./routes/promoCodeRoutes.js";
import chargesRoutes from "./routes/chargesRoutes.js";
import airportDataRoutes from "./routes/airportDataRoutes.js";
import usersDataRoutes from "./routes/usersDataRoutes.js";
import accessControlRoutes from "./routes/accessControlRoutes.js";
import superAdminRoutes from "./routes/superAdminRoutes.js";
import adminSupportRoutes from "./routes/adminSupportRoutes.js";
import websiteSettingsRoutes from "./routes/websiteSettingsRoutes.js";
import trackingRoutes from "./routes/trackingRoutes.js";
import companySettingsRoutes from "./routes/companySettingsRoutes.js";

import MySQLStoreFactory from "express-mysql-session";

const app = express();
const MySQLStore = MySQLStoreFactory(session);
const sessionStore = new MySQLStore({
  clearExpired: true,
  checkExpirationInterval: 900000,
  expiration: 86400000,
}, db.promise());


dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use("/assets", express.static(path.join(__dirname, "../ParkingBoxFrontendAdmin/public/assets")));

app.use(cors({
  origin: [
    process.env.FRONTEND_URL || "http://localhost:3000",
    "http://localhost:5173",
	"https://airportparking.fleetcart.co.uk",
	"https://airportadmin.fleetcart.co.uk",
    "http://localhost:5174",
    "http://localhost:3001",
    "https://companytest.bookstanstedparking.co.uk",
    "https://testfrontend.bookstanstedparking.co.uk"
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-company-id'],
}));


app.use(express.json({ limit: "25mb" }));
app.use(express.urlencoded({ extended: true, limit: "25mb" }));

app.use(session({
  key: "parkingbox_session",
  secret: process.env.SESSION_SECRET || "parkingbox-default-secret",
  store: sessionStore,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    maxAge: 86400000,
  }
}));

// Middleware to extract x-company-id header logic for proxy
// Must run BEFORE routes so handlers can use req.companyId
app.use((req, res, next) => {
  const companyId = req.headers["x-company-id"];
  const userId = req.headers["x-user-id"];
  
  if (companyId) {
    req.companyId = parseInt(companyId, 10);
  }
  if (userId) {
    req.userId = parseInt(userId, 10);
  }
  
  console.log(`[BACKEND] ${req.method} ${req.url} - Company: ${companyId}, User: ${userId}`);
  next();
});

import userRoutes from "./routes/ProductRoutes.js";
import bookingRoutes from "./routes/bookingRoutes.js";
import stripeRoutes from "./routes/stripeRoutes.js";
import bookingRetry from "./routes/booking.js";

app.use("/api", userRoutes);
app.use("/api", bookingRoutes);
app.use("/api", stripeRoutes);

app.use("/api", receiptRoutes);
app.use("/api", emailBookingRouter);
app.use("/api", bookingRetry);

app.use("/api/support-ticket", supportTicketRoutes);
app.use("/api/stripe", paymentRoutes);

// Dashboard endpoints used by FrontendAdmin
app.use("/api", supplierRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api", metaRoutes);
app.use("/api", adminBookingsRoutes);
app.use("/api/parking", parkingProductsRoutes);
app.use("/api", promoCodeRoutes);

app.use("/api/admin", adminAuthRoutes);
app.use("/api/charges", chargesRoutes);
app.use("/api", usersDataRoutes);
app.use("/api/data", airportDataRoutes);
app.use("/api/insert", airportDataRoutes);
app.use("/api/access-control", accessControlRoutes);
app.use("/api/superadmin", superAdminRoutes);
app.use("/api/admin-support", adminSupportRoutes);
app.use("/api/website/settings", websiteSettingsRoutes);
app.use("/api/tracking", trackingRoutes);
app.use("/api/company/settings", companySettingsRoutes);


// ---------------- GET CHARGES API ----------------
app.get("/api/cancellation/charges", (req, res) => {
  const sql = `
  SELECT 
    category,
    charge_name,
    price,
    is_enabled
  FROM charges
  WHERE category = 'cancellation'
`;


  db.query(sql, (err, results) => {
    if (err) {
      console.error("Error fetching charges:", err);
      return res.status(500).json({
        success: false,
        message: "Failed to fetch charges"
      });
    }

    res.json({
      success: true,
      data: results
    });
  });
});


// 🔐 LOGIN / SEARCH BOOKING
app.post("/api/search-booking", (req, res) => {
  const { searchType, value } = req.body;

  const columnMap = {
    email: "email",
    booking: "ref_no",
    mobile: "mobile",
    vehicle: "vehicle_registration",
  };

  const column = columnMap[searchType];

  if (!column || !value) {
    return res.status(400).json({
      success: false,
      message: "Invalid search request",
    });
  }

  const query = `
    SELECT *
    FROM parking_bookings
    WHERE ${column} = ?
  `;

  db.query(query, [value], (err, results) => {
    if (err) {
      console.error("DB error:", err);
      return res.status(500).json({
        success: false,
        message: "Server error",
      });
    }

    if (results.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No booking found",
      });
    }

    // ✅ JUST RETURN DATA (NO SESSION)
    return res.json({
      success: true,
      bookings: results,
    });
  });
});




// 🔒 PROTECTED ROUTE
app.get("/api/my-booking", (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  db.query(
    "SELECT * FROM parking_bookings WHERE id = ?",
    [req.session.user.bookingId],
    (err, results) => {
      res.json(results[0]);
    }
  );
});

app.get("/api/my-bookings", (req, res) => {
  // 🔒 AUTH CHECK
  if (!req.session.user || !req.session.user.email) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const email = req.session.user.email;

  // ✅ FETCH ONLY ACTIVE BOOKINGS
  const sql = `
        SELECT *
        FROM parking_bookings
        WHERE email = ?
          AND status = 'Active'
        ORDER BY id DESC
    `;

  db.query(sql, [email], (err, bookings) => {
    if (err) {
      console.error("DB error:", err);
      return res.status(500).json({ message: "Server error" });
    }

    res.json(bookings);
  });
});



// 🚪 LOGOUT
app.post("/api/logout", (req, res) => {
  req.session.destroy(() => {
    res.clearCookie("booking-session");
    res.json({ success: true });
  });
});





/**
 * GET promo code (NO async/await)
 */
app.get("/api/promocode/:promo_code", (req, res) => {
  const { promo_code } = req.params;

  const sql = `
        SELECT promo_code, discount_type, discount_value
        FROM promocodes
        WHERE promo_code = ?
          AND status = 'active'
          AND (start_date IS NULL OR start_date <= NOW())
          AND (expiry_date IS NULL OR expiry_date >= NOW())
          AND (usage_limit IS NULL OR used_count < usage_limit)
    `;

  db.query(sql, [promo_code], (err, results) => {
    if (err) {
      console.error("DB error:", err);
      return res.status(500).json({
        success: false,
        message: "Database error",
      });
    }

    if (results.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Promo code not found or expired",
      });
    }

    res.json({
      success: true,
      promo: results[0],
    });
  });
});


app.get("/api/data/airports", (req, res) => {
  const companyId = req.companyId || 1;
  const sql = `
    SELECT a.airport_id, a.airport_name, a.iata_code
    FROM airports a
    INNER JOIN company_airports ca ON a.airport_id = ca.airport_id
    WHERE ca.company_id = ? AND ca.status = 'Y'
    ORDER BY a.airport_name ASC
  `;

  db.query(sql, [companyId], (err, results) => {
    if (err) {
      console.error("❌ SQL ERROR:", err);
      return res.status(500).json({ message: "Database error" });
    }

    res.json(results);
  });
});


// ✅ Final booking save after payment
app.post("/api/create-booking-after-payment", async (req, res) => {
  try {
    const booking = req.body;

    console.log("✅ FINAL BOOKING:", booking);

    // Save to DB here
    // await Booking.create(booking)

    res.json({
      success: true,
      message: "Booking saved successfully"
    });

  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get("/api/data/terminals-by-product/:product_id", (req, res) => {
  const { product_id } = req.params;

  const sql = `
    SELECT
      cat.id as terminal_id,
      IFNULL(cat.terminal_name, ti.terminal_name) as terminal_name,
      ti.id as terminal_code,
      cat.status as availability,
      cat.status as operational_status
    FROM parking_products p
    INNER JOIN airports a
      ON p.airport_name = a.airport_name
      OR p.airport_name = a.iata_code
      OR p.airport_name = a.icao_code
    INNER JOIN comp_airport_terminals cat
      ON cat.airport_id = a.airport_id
    JOIN terminals_info ti ON cat.terminal_id = ti.id
    WHERE p.id = ?
      AND cat.status = 'Y'
    ORDER BY ti.terminal_name ASC
  `;

  db.query(sql, [product_id], (err, results) => {
    if (err) {
      console.error("FETCH TERMINALS BY PRODUCT ERROR:", err);
      return res.status(500).json({ error: err.message });
    }

    res.json(results);
  });
});


app.get("/api/booking-fees", async (req, res) => {
  try {
    // 🔥 THIS IS THE FIX
    const [rows] = await db
      .promise()
      .query(
        `SELECT price
         FROM charges
         WHERE category = 'booking'
           AND charge_name = 'booking fees'
           AND is_enabled = 1
         LIMIT 1`
      );

    const bookingFees = rows.length ? Number(rows[0].price) : 0;

    res.json({
      success: true,
      booking_fees: bookingFees,
    });

  } catch (error) {
    console.error("Booking fees fetch error:", error);

    res.json({
      success: true,
      booking_fees: 0,
    });
  }
});





const PORT = process.env.PORT || 9000;



app.listen(PORT, () => {
  console.log(`✅ Server is running on http://localhost:${PORT}`);
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error("Unhandled Error:", err);
  res.status(500).json({
    success: false,
    message: process.env.NODE_ENV === "production" ? "Internal Server Error" : err.message,
    stack: process.env.NODE_ENV === "production" ? null : err.stack
  });
});


