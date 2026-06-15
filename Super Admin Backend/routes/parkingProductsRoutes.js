import express from "express";
import db from "../config/db.js";

const router = express.Router();

const companyIdFromReq = (req) => req.companyId || 1;

router.post("/product/create", (req, res) => {
  const companyId = companyIdFromReq(req);
  const body = req.body || {};

  const required = ["airport_name", "service_provider", "product_name", "service_type"];
  for (const k of required) {
    if (!body[k] || String(body[k]).trim() === "") {
      return res.status(400).json({ success: false, error: `Missing ${k}` });
    }
  }
  if (!body.operational_from || !body.operational_to) {
    return res.status(400).json({ success: false, error: "Missing operational hours" });
  }

  db.query(
    "SELECT COALESCE(MAX(id), 0) + 1 AS nextId FROM parking_products",
    (idErr, idRows) => {
      if (idErr) {
        console.error("POST /parking/product/create nextId error:", idErr);
        return res.status(500).json({ success: false, error: "Server error" });
      }

      const nextId = idRows?.[0]?.nextId;
      if (!nextId) {
        return res.status(500).json({ success: false, error: "Could not allocate product id" });
      }

      const sql = `
        INSERT INTO parking_products (
          id, company_id,
          airport_name, service_provider, product_name,
          airport_number, booking_email, airport_charges,
          operational_from, operational_to,
          book_short_hours, commission, product_extra,
          nonflex, service_type, recommended,
          product_description, product_overview,
          dropoff_procedure, directions,
          point_1, point_2, point_3, point_4, point_5, point_6,
          status,
          is_active
        ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
      `;

      const values = [
        nextId,
        companyId,
        body.airport_name,
        body.service_provider,
        body.product_name,
        body.airport_number || null,
        body.booking_email || null,
        body.airport_charges || 0,
        body.operational_from,
        body.operational_to,
        Number(body.book_short_hours || 0),
        Number(body.commission || 0),
        body.product_extra || null,
        body.nonflex || "Non-Refundable",
        body.service_type,
        body.recommended || null,
        body.product_description || null,
        body.product_overview || null,
        body.dropoff_procedure || null,
        body.directions || null,
        body.point_1 || null,
        body.point_2 || null,
        body.point_3 || null,
        body.point_4 || null,
        body.point_5 || null,
        body.point_6 || null,
        body.status || "Active",
        body.status === "Inactive" ? 0 : 1,
      ];

      db.query(sql, values, (err) => {
        if (err) {
          console.error("POST /parking/product/create error:", err);
          return res
            .status(500)
            .json({ success: false, error: err.sqlMessage || "Server error" });
        }
        return res.json({ success: true, id: nextId });
      });
    }
  );
});

router.get("/products", (req, res) => {
  const companyId = companyIdFromReq(req);
  const sql = "SELECT * FROM parking_products WHERE company_id = ? ORDER BY id DESC";

  db.query(sql, [companyId], (err, results) => {
    if (err) {
      console.error("GET /parking/products error:", err);
      return res.status(500).json({ success: false, message: "Server error" });
    }

    const formatted = (results || []).map((p) => {
      if (p.image_data) {
        p.image_url = `/api/parking/product/image/${p.id}`;
        delete p.image_data; // Don't send the massive blob in the list
      }
      return p;
    });

    return res.json({ success: true, data: formatted });
  });
});

router.get("/products/:id", (req, res) => {
  const companyId = companyIdFromReq(req);
  const { id } = req.params;
  db.query(
    "SELECT * FROM parking_products WHERE id = ? AND company_id = ? LIMIT 1",
    [id, companyId],
    (err, results) => {
      if (err) {
        console.error("GET /parking/products/:id error:", err);
        return res.status(500).json({ success: false, message: "Server error" });
      }
      if (!results?.length) {
        return res.status(404).json({ success: false, message: "Not found" });
      }
      const p = results[0];
      if (p.image_data) {
        p.image_url = `/api/parking/product/image/${p.id}`;
        delete p.image_data;
      }
      return res.json({ success: true, data: p });
    }
  );
});

router.put("/products/toggle/:id", (req, res) => {
  const companyId = companyIdFromReq(req);
  const { id } = req.params;
  const { is_active } = req.body || {};
  db.query(
    "UPDATE parking_products SET is_active = ? WHERE id = ? AND company_id = ?",
    [Number(is_active) ? 1 : 0, id, companyId],
    (err, result) => {
      if (err) {
        console.error("PUT /parking/products/toggle error:", err);
        return res.status(500).json({ success: false, message: "Server error" });
      }
      if (!result?.affectedRows) {
        return res.status(404).json({ success: false, message: "Not found" });
      }
      return res.json({ success: true });
    }
  );
});

router.put("/products/:id", (req, res) => {
  const companyId = companyIdFromReq(req);
  const { id } = req.params;
  const body = req.body || {};

  // Minimal safe update: only update known fields that exist in admin UI.
  const fields = [
    "airport_name",
    "service_provider",
    "product_name",
    "booking_email",
    "airport_charges",
    "operational_from",
    "operational_to",
    "book_short_hours",
    "commission",
    "product_extra",
    "nonflex",
    "service_type",
    "recommended",
    "airport_duty_number",
    "edit_short_hours",
    "cancel_short_hours",
    "promocodes_applicable",
    "product_description",
    "product_overview",
    "dropoff_procedure",
    "return_procedure",
    "directions",
    "important_information",
    "email_dropoff_procedure",
    "email_return_procedure",
    "email_notes",
    "point_1",
    "point_2",
    "point_3",
    "point_4",
    "point_5",
    "point_6",
    "status",
  ];

  const setParts = [];
  const params = [];
  for (const f of fields) {
    if (Object.prototype.hasOwnProperty.call(body, f)) {
      setParts.push(`${f} = ?`);
      params.push(body[f]);
    }
  }

  if (!setParts.length) {
    return res.json({ success: true, message: "No changes" });
  }

  const sql = `UPDATE parking_products SET ${setParts.join(", ")} WHERE id = ? AND company_id = ?`;
  params.push(id, companyId);

  db.query(sql, params, (err, result) => {
    if (err) {
      console.error("PUT /parking/products/:id error:", err);
      return res.status(500).json({ success: false, message: err.sqlMessage || "Server error" });
    }
    if (!result?.affectedRows) {
      return res.status(404).json({ success: false, message: "Not found" });
    }
    return res.json({ success: true });
  });
});

router.delete("/products/:id", (req, res) => {
  const companyId = companyIdFromReq(req);
  const { id } = req.params;
  db.query(
    "DELETE FROM parking_products WHERE id = ? AND company_id = ?",
    [id, companyId],
    (err, result) => {
      if (err) {
        console.error("DELETE /parking/products/:id error:", err);
        return res.status(500).json({ success: false, message: "Server error" });
      }
      if (!result?.affectedRows) {
        return res.status(404).json({ success: false, message: "Not found" });
      }
      return res.json({ success: true });
    }
  );
});

router.get("/product/image/:id", (req, res) => {
  const companyId = companyIdFromReq(req);
  const { id } = req.params;
  db.query(
    "SELECT image_data FROM parking_products WHERE id = ? AND company_id = ? LIMIT 1",
    [id, companyId],
    (err, results) => {
      if (err) {
        console.error("GET /parking/product/image/:id error:", err);
        return res.status(500).end();
      }
      if (!results?.length || !results[0]?.image_data) {
        return res.status(404).end();
      }
      // Try to detect content type or default to jpeg
      const buffer = results[0].image_data;
      res.setHeader("Content-Type", "image/jpeg"); // Default
      return res.status(200).send(buffer);
    }
  );
});

import multer from "multer";
const upload = multer({ storage: multer.memoryStorage() });

router.put("/product/update-image/:id", upload.single("image"), (req, res) => {
  const companyId = companyIdFromReq(req);
  const { id } = req.params;

  if (!req.file) {
    return res.status(400).json({ success: false, message: "No image file provided" });
  }

  const sql = "UPDATE parking_products SET image_data = ? WHERE id = ? AND company_id = ?";
  db.query(sql, [req.file.buffer, id, companyId], (err, result) => {
    if (err) {
      console.error("PUT /parking/product/update-image error:", err);
      return res.status(500).json({ success: false, message: "Database error" });
    }
    if (!result?.affectedRows) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }
    return res.json({ success: true, message: "Image updated successfully" });
  });
});

export default router;

