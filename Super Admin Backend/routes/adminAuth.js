import express from "express";
import bcrypt from "bcrypt";
import db from "../config/db.js";

const router = express.Router();

router.post("/login", async (req, res) => {
  const { password } = req.body;
  const email = req.body.email || req.body.name;

  if (!email || !password) {
    return res.status(400).json({ success: false, message: "Email/Username and password are required" });
  }

  const query = `
    SELECT u.*, c.name AS company_name, c.logo_url AS company_logo, 
           c.support_email_address, c.support_contact_no, r.name AS role
    FROM users u
    LEFT JOIN companies c ON u.company_id = c.id
    LEFT JOIN user_roles ur ON u.id = ur.user_id
    LEFT JOIN roles r ON ur.role_id = r.id
    WHERE u.email = ? OR u.name = ? 
    LIMIT 1
  `;

  db.query(query, [email, email], async (err, results) => {
    if (err) {
      console.error("DB error:", err);
      return res.status(500).json({ success: false, message: "Server error" });
    }

    if (results.length === 0) {
      return res.status(401).json({ success: false, message: "Invalid credentials" });
    }

    const user = results[0];
    console.log("Found user:", user.email, "Hash:", user.password);

    try {
      // Replace $2y$ with $2a$ because Node's bcrypt might not support $2y$ directly
      let hash = user.password;
      if (!hash) {
        console.error("User found but has no password hash:", user.email);
        return res.status(401).json({ success: false, message: "Invalid credentials (no password set)" });
      }
      if (hash.startsWith("$2y$")) {
        hash = hash.replace("$2y$", "$2a$");
      }
      console.log("Using hash for compare:", hash);
      const match = await bcrypt.compare(password, hash);
      console.log("Bcrypt match result:", match);

      if (!match) {
        return res.status(401).json({ success: false, message: "Invalid credentials (password mismatch)" });
      }

      delete user.password;

      // Ensure role defaults if not assigned
      if (!user.role) user.role = "admin";

      res.json({
        success: true,
        user
      });
    } catch (compareError) {
      console.error("Bcrypt error:", compareError);
      return res.status(500).json({ success: false, message: "Server error during authentication" });
    }
  });
});

router.get("/charges", (req, res) => {
  const sql = `
    SELECT category, charge_name, price
    FROM charges
    WHERE is_enabled = 1
      AND category IN ('booking', 'cancellation')
    ORDER BY category ASC, id ASC
  `;

  db.query(sql, (err, rows) => {
    if (err) {
      console.error("Charges fetch error:", err);
      return res.status(500).json({ success: false, message: "Server error" });
    }

    const charges = {};
    for (const r of rows || []) {
      const category = String(r.category || "").toLowerCase();
      if (!category) continue;
      if (!charges[category]) {
        charges[category] = {
          name: r.charge_name,
          price: Number(r.price),
        };
      }
    }

    return res.json({ success: true, charges });
  });
});

router.post("/search-products", (req, res) => {
  const { dropoff, return_date, airport_name } = req.body || {};
  if (!dropoff || !return_date) {
    return res
      .status(400)
      .json({ success: false, message: "Missing dropoff or return_date" });
  }

  const dropTime = String(dropoff).split(" ")[1] + ":00";
  const returnTime = String(return_date).split(" ")[1] + ":00";
  const companyId = req.companyId || 1;

  let sql = `
    SELECT *
    FROM parking_products
    WHERE
      (
        (
          operational_from <= operational_to
          AND ? BETWEEN operational_from AND operational_to
        )
        OR
        (
          operational_from > operational_to
          AND (? >= operational_from OR ? <= operational_to)
        )
      )
      AND
      (
        (
          operational_from <= operational_to
          AND ? BETWEEN operational_from AND operational_to
        )
        OR
        (
          operational_from > operational_to
          AND (? >= operational_from OR ? <= operational_to)
        )
      )
      AND is_active = 1
      AND company_id = ?
  `;

  const params = [
    dropTime,
    dropTime,
    dropTime,
    returnTime,
    returnTime,
    returnTime,
    companyId,
  ];

  if (airport_name) {
    sql += " AND airport_name = ?";
    params.push(airport_name);
  }

  console.log("[SEARCH] Params:", { dropoff, return_date, airport_name, companyId });
  console.log("[SEARCH] Times:", { dropTime, returnTime });

  db.query(
    sql,
    params,

    (err, results) => {
      console.log("[SEARCH] Initial SQL results:", results?.length || 0);
      import("moment").then(async (momentModule) => {
        const moment = momentModule.default || momentModule;
        try {
          if (err) {
            console.error("search-products SQL error:", err);
            return res.status(500).json({ success: false, message: "Server error" });
          }

          const validProducts = [];

          // Calculate price for each product
          for (let p of (results || [])) {
            // Add image format
            if (p.image_data) {
              p.image_data = `data:image/jpeg;base64,${p.image_data.toString("base64")}`;
            }

            const start = moment(dropoff, "YYYY-MM-DD HH:mm");
            const end = moment(return_date, "YYYY-MM-DD HH:mm");

            let hours = end.diff(start, "hours");
            if (hours < 0) hours = 0;

            let days = Math.ceil(hours / 24) + 1;
            if (days < 1) days = 1;

            const dayOfMonth = start.date();

            let bandRow = [];
            let bandMonth = moment(start);

            for (let i = 0; i < 12; i++) {
              const monthName = bandMonth.format("MMMM");
              const year = bandMonth.format("YYYY");

              const [rows] = await db.promise().query(
                "SELECT * FROM parking_product_price_bands WHERE product_id=? AND month=? AND year=? AND company_id=? LIMIT 1",
                [p.id, monthName, year, companyId]
              );

              if (rows.length) {
                bandRow = rows;
                break;
              }
              bandMonth.subtract(1, "month");
            }

            if (!bandRow.length) continue; // Skip product if no pricing band matched

            const bandName = bandRow[0][`day_${dayOfMonth}`];

            const [priceRow] = await db.promise().query(
              "SELECT * FROM parking_product_price_global_bands WHERE product_id=? AND band_name=? AND company_id=? LIMIT 1",
              [p.id, bandName, companyId]
            );

            if (!priceRow.length) continue;

            const basePrice = priceRow[0][`day_${days}`] ?? priceRow[0]["day_31+"];
            p.total_price = parseFloat(basePrice).toFixed(2);

            validProducts.push(p);
          }

          return res.json({ success: true, data: validProducts });
        } catch (calcErr) {
          console.error("Price calc error:", calcErr);
          return res.status(500).json({ success: false, message: "Server error during price calculation" });
        }
      });
    }
  );
});

router.post("/create-admin-booking", (req, res) => {
  try {
    const body = req.body || {};
    const companyId = req.companyId || 1;

    const dropOff = body.dropoff || body.drop_off_date || null;
    const returnDate = body.return_date || null;

    const required = ["first_name", "last_name", "email", "mobile", "product_name"];
    for (const k of required) {
      if (!body[k]) {
        return res.status(400).json({ success: false, message: `Missing ${k}` });
      }
    }
    if (!dropOff || !returnDate) {
      return res.status(400).json({ success: false, message: "Missing dropoff/return_date" });
    }

    const valuesPlaceholders = Array(45).fill("?").join(",");
    const sql = `
      INSERT INTO parking_bookings (
        company_id,
        product_name, product_flexibility,
        title, first_name, last_name, email, mobile,
        address, postcode,
        travelling_from, service_provider, service,
        drop_off_date, return_date, no_of_days,
        status, source, website_name, transaction_source, transaction_id,
        depart_terminal, depart_flight, return_terminal, return_flight,
        vehicle_make, vehicle_model, vehicle_colour, vehicle_registration,
        passengers,
        quote_amount, discount, booking_fee,
        has_cancellation_cover, cancellation_fee,
        total_payable,
        card_name, card_number, expiry_date, cvc,
        terms_accepted,
        cancellation_cover, sms_confirmation, addons_total,
        email_sent
      ) VALUES (${valuesPlaceholders})
    `;

    const values = [
      companyId,
      body.product_name,
      body.product_flexibility || "Flexible",
      body.title || "",
      body.first_name,
      body.last_name,
      body.email,
      body.mobile,
      body.address || "",
      body.postcode || "N/A",
      body.travelling_from || "",
      body.service_provider || "Parking Box",
      body.service || "",
      dropOff,
      returnDate,
      body.no_of_days || null,
      body.status || "Pending",
      body.source || "Admin",
      body.website_name || "Parking Box Services",
      body.transaction_source || "Admin",
      body.transaction_id || null,
      body.depart_terminal || "",
      body.depart_flight || "",
      body.return_terminal || "",
      body.return_flight || "",
      body.vehicle_make || "",
      body.vehicle_model || "",
      body.vehicle_colour || "",
      body.vehicle_reg || body.vehicle_registration || "",
      Number(body.passengers || 1),
      Number(body.quote_amount || 0),
      Number(body.discount || 0),
      Number(body.booking_fee || 0),
      Number(body.has_cancellation_cover || 0) ? 1 : 0,
      Number(body.has_cancellation_cover || 0) ? Number(body.cancellation_fee || 0) : 0,
      Number(body.total_payable || 0),
      body.card_name || "ADMIN",
      body.card_number || "0000",
      body.expiry_date || "00/00",
      body.cvc || "000",
      body.terms ? 1 : 0,
      0,
      0,
      Number(body.addons_total || 0),
      0,
    ];

    db.query(sql, values, (err, result) => {
      if (err) {
        console.error("create-admin-booking insert error:", err);
        return res.status(500).json({ success: false, message: err.sqlMessage || "Server error" });
      }
      return res.json({ success: true, booking_id: result.insertId });
    });
  } catch (e) {
    console.error("create-admin-booking error:", e);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

router.post("/send-invoice", (req, res) => {
  const { booking_id } = req.body || {};
  if (!booking_id) {
    return res.status(400).json({ success: false, message: "Missing booking_id" });
  }

  // Local dev often has no SMTP; keep response JSON-only.
  return res.json({
    success: false,
    message: "Invoice email is not configured on this backend (SMTP).",
  });
});

router.post("/send-payment-email", (req, res) => {
  const { email, amount } = req.body || {};
  if (!email) {
    return res.status(400).json({ success: false, message: "Missing email" });
  }

  return res.json({
    success: false,
    message: "Payment email is not configured on this backend (SMTP).",
    email,
    amount,
  });
});

router.post("/manual-confirm-payment", (req, res) => {
  const { booking_id, transaction_id } = req.body || {};
  if (!booking_id || !transaction_id) {
    return res.status(400).json({
      success: false,
      message: "Missing booking_id or transaction_id",
    });
  }

  const companyId = req.companyId || 1;
  const sql = `
    UPDATE parking_bookings
    SET status = 'Active',
        transaction_id = ?,
        transaction_source = 'Manual'
    WHERE id = ? AND company_id = ?
  `;

  db.query(sql, [transaction_id, booking_id, companyId], (err, result) => {
    if (err) {
      console.error("manual-confirm-payment update error:", err);
      return res.status(500).json({ success: false, message: "Server error" });
    }
    if (!result?.affectedRows) {
      return res.status(404).json({ success: false, message: "Booking not found" });
    }
    return res.json({ success: true, ref_no: null });
  });
});

router.get("/users", (req, res) => {
  db.query("SELECT id, email, password FROM users", (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

export default router;
