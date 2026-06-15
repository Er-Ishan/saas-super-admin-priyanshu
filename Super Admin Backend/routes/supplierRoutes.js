import express from "express";
import db from "../config/db.js";

const router = express.Router();

export const authenticateJWT = (req, res, next) => {
    // A simplified placeholder or you can import it from your auth middleware if it exists.
    // Assuming companyId is set by server.js globally for these admin routes
    next();
};

/* ==========================================
   SUPPLIERS LIST ENDPOINTS
========================================== */

router.post("/suppliers/add", authenticateJWT, async (req, res) => {
  try {
    const companyId = req.companyId || req.company_id || 1;

    const {
      supplier_name,
      reg_no,
      supplier_address,
      supplier_contact,
      supplier_email,
      from_email_address,
      commission,
      director_name,
      director_email,
      director_phone,
      email_parsing_active,
      supplier_active,
    } = req.body;

    if (!supplier_name?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Supplier name is required",
      });
    }

    if (!from_email_address?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Booking email is required",
      });
    }

    // suppliers.from_email_address requires JSON
    const supplierEmailJson = JSON.stringify([
      from_email_address.trim(),
    ]);

    // Check existing supplier
    const [existingSupplier] = await db.promise().query(
      `
      SELECT supplier_id
      FROM suppliers
      WHERE from_email_address = ?
      LIMIT 1
      `,
      [supplierEmailJson]
    );

    let supplierId;

    if (existingSupplier.length) {
      supplierId = existingSupplier[0].supplier_id;
    } else {
      // Create supplier
      const [supplierResult] = await db.promise().query(
        `
        INSERT INTO suppliers (
          supplier_name,
          reg_no,
          supplier_contact,
          supplier_email,
          supplier_address,
          from_email_address,
          director_name,
          director_email,
          director_phone,
          supplier_active,
          email_parsing_active
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          supplier_name,
          reg_no || null,
          supplier_contact || "N/A",
          supplier_email || "noemail@unknown.com",
          supplier_address || "N/A",
          supplierEmailJson,
          director_name || null,
          director_email || null,
          director_phone || null,
          supplier_active ? 1 : 0,
          email_parsing_active ? 1 : 0,
        ]
      );

      supplierId = supplierResult.insertId;
    }

    // Check supplier already linked to company
    const [existingCompanySupplier] = await db.promise().query(
      `
      SELECT id
      FROM company_suppliers
      WHERE company_id = ?
      AND supplier_id = ?
      LIMIT 1
      `,
      [companyId, supplierId]
    );

    if (existingCompanySupplier.length) {
      return res.status(400).json({
        success: false,
        message: "Supplier already exists for this company",
      });
    }

    // company_suppliers.supplier_from_email requires JSON
    const companySupplierEmails = JSON.stringify([
      from_email_address.trim(),
    ]);

    await db.promise().query(
      `
      INSERT INTO company_suppliers (
        company_id,
        supplier_id,
        supplier_from_email,
        active,
        data_from,
        commission,
        booking_count
      )
      VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
      [
        companyId,
        supplierId,
        companySupplierEmails,
        supplier_active ? 1 : 0,
        "both",
        Number(commission || 0),
        0,
      ]
    );

    return res.status(201).json({
      success: true,
      message: "Supplier added successfully",
      supplier_id: supplierId,
    });

  } catch (err) {
    console.error("ADD SUPPLIER ERROR:", err);

    return res.status(500).json({
      success: false,
      message: err.sqlMessage || err.message,
    });
  }
});

// 1. GET Suppliers
router.get("/getdata/suppliers", authenticateJWT, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50;
        const search = req.query.search || "";
        const offset = (page - 1) * limit;
        const companyId = req.companyId || 1;

        let query = `
            SELECT s.*, cs.commission, cs.id as assignment_id 
            FROM company_suppliers cs
            JOIN suppliers s ON cs.supplier_id = s.supplier_id
            WHERE cs.company_id = ?
        `;
        let countQuery = `
            SELECT COUNT(*) as total 
            FROM company_suppliers 
            WHERE company_id = ?
        `;
        const params = [companyId];

        if (search) {
            query += " AND (s.supplier_name LIKE ? OR s.supplier_email LIKE ? OR s.from_email_address LIKE ?)";
            countQuery += " AND EXISTS (SELECT 1 FROM suppliers s2 WHERE s2.supplier_id = company_suppliers.supplier_id AND (s2.supplier_name LIKE ? OR s2.supplier_email LIKE ? OR s2.from_email_address LIKE ?))";
            params.push(`%${search}%`, `%${search}%`, `%${search}%`);
        }

        query += " ORDER BY s.supplier_id DESC LIMIT ? OFFSET ?";
        
        const [rows] = await db.promise().query(query, [...params, limit, offset]);
        const [countRows] = await db.promise().query(countQuery, params);

        res.json({
            success: true,
            data: rows,
            total: countRows[0].total,
            page,
            totalPages: Math.ceil(countRows[0].total / limit)
        });
    } catch (err) {
        console.error("GET Suppliers Error:", err);
        res.status(500).json({ success: false, message: "Failed to fetch suppliers", error: err.message });
    }
});

// 2. PUT Update Supplier
router.put("/getdata/suppliers/update/:id", authenticateJWT, async (req, res) => {
    try {
        const { id } = req.params;
        const companyId = req.companyId || 1;
        
        const {
            supplier_name, reg_no, supplier_address, supplier_contact, supplier_email,
            from_email_address, commission, director_name, director_email, director_phone,
            email_parsing_active, supplier_active
        } = req.body;

        const updateQuery = `
            UPDATE company_suppliers 
            SET commission=?
            WHERE supplier_id=? AND company_id=?
        `;
        
        const [result] = await db.promise().query(updateQuery, [
            commission, id, companyId
        ]);

        // Also allow updating global if it's allowed
        await db.promise().query(
            "UPDATE suppliers SET supplier_name=?, reg_no=?, supplier_address=?, supplier_contact=?, supplier_email=?, from_email_address=?, director_name=?, director_email=?, director_phone=?, email_parsing_active=?, supplier_active=? WHERE supplier_id=?",
            [supplier_name, reg_no, supplier_address, supplier_contact, supplier_email, from_email_address, director_name, director_email, director_phone, email_parsing_active, supplier_active, id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: "Supplier assignment not found" });
        }

        res.json({ success: true, message: "Supplier updated successfully" });
    } catch (err) {
        console.error("PUT Update Supplier Error:", err);
        res.status(500).json({ success: false, message: "Server error", error: err.message });
    }
});

// 3. DELETE Supplier
router.delete("/getdata/suppliers/delete/:id", authenticateJWT, async (req, res) => {
    try {
        const { id } = req.params;
        const companyId = req.companyId || 1;

        const [result] = await db.promise().query("DELETE FROM company_suppliers WHERE supplier_id=? AND company_id=?", [id, companyId]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: "Assignment not found or unauthorized" });
        }

        res.json({ success: true, message: "Supplier deleted successfully" });
    } catch (err) {
        console.error("DELETE Supplier Error:", err);
        res.status(500).json({ success: false, message: "Server error", error: err.message });
    }
});

/* ==========================================
   SUPPLIER BOOKINGS ENDPOINTS
========================================== */

// 4. GET Supplier Bookings
router.get("/bookings/supplierData", authenticateJWT, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50;
        const offset = (page - 1) * limit;
        const companyId = req.companyId || 1;

        // supplierData frontend uses multiple query parameters, but mostly needs to return a list of bookings
        let query = "SELECT *, CONCAT(first_name, ' ', last_name) AS customer_name, created_at AS booked_on, drop_off_date AS dropoff_datetime, return_date AS return_datetime, vehicle_registration AS vehicle_reg_no, vehicle_make AS make_model, vehicle_model AS model, vehicle_colour AS color, depart_terminal AS airport_alias FROM supplier_bookings WHERE company_id = ?";
        let countQuery = "SELECT COUNT(*) as total FROM supplier_bookings WHERE company_id = ?";
        const params = [companyId];

        query += " ORDER BY id DESC LIMIT ? OFFSET ?";
        
        const [rows] = await db.promise().query(query, [...params, limit, offset]);
        const [countRows] = await db.promise().query(countQuery, params);

        res.json({
            success: true,
            data: rows,
            total: countRows[0].total,
            page,
            totalPages: Math.ceil(countRows[0].total / limit)
        });
    } catch (err) {
        console.error("GET Supplier Bookings Error:", err);
        res.status(500).json({ success: false, message: "Failed to fetch supplier bookings", error: err.message });
    }
});

// 5. PUT Update Supplier Booking
router.put("/supplier/update/:id", authenticateJWT, async (req, res) => {
    try {
        const { id } = req.params;
        const companyId = req.companyId || 1;
        const data = req.body;

        let first_name = "", last_name = "";
        if (data.customer_name) {
            const parts = data.customer_name.split(" ");
            first_name = parts[0];
            last_name = parts.slice(1).join(" ");
        }

        const updateQuery = `
            UPDATE supplier_bookings 
            SET first_name=?, last_name=?, mobile=?, email=?, vehicle_registration=?, 
                status=?, drop_off_date=?, return_date=?, vehicle_make=?, vehicle_model=?, vehicle_colour=?
            WHERE id=? AND company_id=?
        `;
        
        const [result] = await db.promise().query(updateQuery, [
            first_name || data.first_name, last_name || data.last_name, data.contact_no, data.customer_email, data.vehicle_reg_no,
            data.status, data.dropoff_datetime, data.return_datetime, data.make_model, data.model, data.color,
            id, companyId
        ]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: "Supplier booking not found or unauthorized" });
        }

        res.json({ success: true, message: "Supplier booking updated successfully" });
    } catch (err) {
        console.error("PUT Update Supplier Booking Error:", err);
        res.status(500).json({ success: false, message: "Server error", error: err.message });
    }
});

// 6. DELETE Supplier Booking
router.delete("/delete/supplier/:id", authenticateJWT, async (req, res) => {
    try {
        const { id } = req.params;
        const companyId = req.companyId || 1;

        const [result] = await db.promise().query("DELETE FROM supplier_bookings WHERE id=? AND company_id=?", [id, companyId]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: "Supplier booking not found or unauthorized" });
        }

        res.json({ success: true, message: "Supplier booking deleted successfully" });
    } catch (err) {
        console.error("DELETE Supplier Booking Error:", err);
       return res.status(500).json({ success: false, message: "Server Error" });
  }
});

// GET /api/supplier-summary
// Fetches aggegated booking counts, totals, and commissions per active supplier.
router.get("/supplier-summary", authenticateJWT, async (req, res) => {
  try {
    const from = req.query.from;
    const to = req.query.to;
    const companyId = req.companyId || 1;
    console.log(`[DEBUG] Fetching supplier summary for companyId: ${companyId}, from: ${from}, to: ${to}`);

    // We get associated suppliers with their company-specific commission
    const [suppliers] = await db.promise().query(
      `SELECT 
         s.supplier_id, 
         s.supplier_name, 
         s.supplier_email, 
         s.supplier_contact, 
         s.supplier_address,
         cs.commission
       FROM company_suppliers cs
       JOIN suppliers s ON cs.supplier_id = s.supplier_id
       WHERE cs.company_id = ? AND s.supplier_active = 1`,
      [companyId]
    );

    let whereClause = "source = 'Supplier' AND status != 'Cancelled' AND company_id = ?";
    const queryParams = [companyId];

    if (from && to) {
      whereClause += " AND DATE(created_at) >= ? AND DATE(created_at) <= ?";
      queryParams.push(from, to);
    } else if (from) {
      whereClause += " AND DATE(created_at) >= ?";
      queryParams.push(from);
    } else if (to) {
      whereClause += " AND DATE(created_at) <= ?";
      queryParams.push(to);
    }

    // Get aggregated bookings grouped by supplier_name
    const [bookings] = await db.promise().query(
      `SELECT 
         supplier_name,
         COUNT(id) AS total_bookings,
         SUM(total_payable) AS total_amount
       FROM parking_bookings
       WHERE ${whereClause}
       GROUP BY supplier_name`,
      queryParams
    );

    // Map bookings to suppliers
    const summaryData = suppliers.map((sup) => {
      // Find matching aggregated booking data
      const bData = bookings.find(b => b.supplier_name === sup.supplier_name) || { total_bookings: 0, total_amount: 0 };
      
      const totalBookings = Number(bData.total_bookings || 0);
      const totalAmount = Number(bData.total_amount || 0);
      const commissionRate = Number(sup.commission || 0);
      const commissionAmount = (totalAmount * commissionRate) / 100;
      const invoiceAmount = totalAmount - commissionAmount;

      return {
        supplierId: sup.supplier_id,
        supplierName: sup.supplier_name,
        supplierContact: sup.supplier_contact || "",
        supplierEmail: sup.supplier_email || "",
        supplierAddress: sup.supplier_address || "",
        supplierCommission: commissionRate,
        totalBookings: totalBookings,
        totalAmount: totalAmount,
        commission: commissionAmount,
        invoiceAmount: invoiceAmount,
        invoiceDate: new Date().toISOString()
      };
    });

    return res.json(summaryData);
  } catch (error) {
    console.error("Error fetching supplier summary:", error);
    return res.status(500).json({ success: false, message: error.message || "Server error" });
  }
});

// GET /api/suppliers/list
// Returns a simple list of all active suppliers for drop-downs
router.get("/suppliers/list", authenticateJWT, async (req, res) => {
  try {
    const companyId = req.companyId || 1;
    const [rows] = await db.promise().query(
      `SELECT s.supplier_id, s.supplier_name 
       FROM company_suppliers cs
       JOIN suppliers s ON cs.supplier_id = s.supplier_id
       WHERE cs.company_id = ? AND s.supplier_active = 1 
       ORDER BY s.supplier_name ASC`,
      [companyId]
    );
    return res.json({ success: true, data: rows });
  } catch (err) {
    console.error("Error fetching suppliers list:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

// GET /api/bookings/invoice/supplier/:id
// Returns complete invoice calculations and all individual matching bookings for the PDF
router.get("/bookings/invoice/supplier/:id", authenticateJWT, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      from,
      to,
      status,
      dateType = "booked"
    } = req.query;
    const companyId = req.companyId || 1;

    let dateColumn = "created_at";

    switch (dateType) {
      case "depart":
        dateColumn = "drop_off_date";
        break;

      case "return":
        dateColumn = "return_date";
        break;

      case "cancelled":
        dateColumn = "cancelled_at";
        break;

      default:
        dateColumn = "created_at";
    }

    // 1. Fetch Supplier Info (ensure it's assigned to this company)
    const [supplierRows] = await db.promise().query(
      `SELECT s.supplier_name, cs.commission 
       FROM company_suppliers cs
       JOIN suppliers s ON cs.supplier_id = s.supplier_id
       WHERE s.supplier_id = ? AND cs.company_id = ?`,
      [id, companyId]
    );

    if (!supplierRows.length) {
      return res.status(404).json({ success: false, message: "Supplier not found" });
    }

    const supplier = supplierRows[0];
    const commissionRate = Number(supplier.commission || 0);

    // 2. Build Where Clause
    let whereClause = "source = 'Supplier' AND supplier_name = ? AND company_id = ?";
    const queryParams = [supplier.supplier_name, companyId];

    if (from && to) {
      whereClause += ` AND DATE(${dateColumn}) >= ? AND DATE(${dateColumn}) <= ?`;
      queryParams.push(from, to);
    } else if (from) {
      whereClause += ` AND DATE(${dateColumn}) >= ?`;
      queryParams.push(from);
    } else if (to) {
      whereClause += ` AND DATE(${dateColumn}) <= ?`;
      queryParams.push(to);
    }

    if (status && status.toLowerCase() !== "all status") {
      whereClause += " AND status = ?";
      queryParams.push(status);
    } else {
      whereClause += " AND status != 'Cancelled'";
    }

    // 3. Fetch Bookings
    const [bookings] = await db.promise().query(
      `SELECT 
         ref_no, mobile AS contact_no, created_at AS booked_on, drop_off_date AS dropoff_datetime, return_date AS return_datetime, total_payable
       FROM parking_bookings 
       WHERE ${whereClause} 
       ORDER BY created_at DESC`,
      queryParams
    );

    let totalAmount = 0;
    const rowsMap = bookings.map(b => {
      const p = Number(b.total_payable || 0);
      totalAmount += p;
      return {
        ref_no: b.ref_no,
        contact_no: b.contact_no,
        booked_on: b.booked_on,
        dropoff_datetime: b.dropoff_datetime,
        return_datetime: b.return_datetime,
        price: p
      };
    });

    const totalBookings = rowsMap.length;
    const commissionAmount = (totalAmount * commissionRate) / 100;
    const invoiceAmount = totalAmount - commissionAmount;

    return res.json({
      success: true,
      supplierName: supplier.supplier_name,
      totalBookings,
      totalAmount,
      commission: commissionAmount,
      invoiceAmount,
      rows: rowsMap
    });
  } catch (error) {
    console.error("Error fetching supplier invoice:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

export default router;
