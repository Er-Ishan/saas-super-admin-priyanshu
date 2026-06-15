import express from "express";
import db from "../config/db.js";

const router = express.Router();

function getCompanyId(req) {
  const header = req.headers["x-company-id"];
  const n = Number(Array.isArray(header) ? header[0] : header);
  return Number.isFinite(n) && n > 0 ? n : 1;
}

router.get("/parking-analytics", (req, res) => {
  const companyId = getCompanyId(req);

  // Status values in this codebase include at least: Pending, Active, Cancelled
  const sql = `
    SELECT
      COUNT(*) AS totalBookings,
      SUM(CASE WHEN status = 'Active' THEN 1 ELSE 0 END) AS active,
      SUM(CASE WHEN status = 'Pending' THEN 1 ELSE 0 END) AS pending,
      SUM(CASE WHEN status = 'Cancelled' THEN 1 ELSE 0 END) AS cancelled,
      SUM(CASE WHEN DATE(created_at) = CURDATE() THEN 1 ELSE 0 END) AS supplier
    FROM parking_bookings
    WHERE company_id = ?
  `;

  db.query(sql, [companyId], (err, rows) => {
    if (err) {
      console.error("parking-analytics query error:", err);
      return res.status(500).json({ success: false, message: "Server error" });
    }
    const r = rows?.[0] || {};
    return res.json({
      totalBookings: Number(r.totalBookings || 0),
      active: Number(r.active || 0),
      pending: Number(r.pending || 0),
      cancelled: Number(r.cancelled || 0),
      supplier: Number(r.supplier || 0),
    });
  });
});

router.get("/parking-pickups-returns", (req, res) => {
  const companyId = getCompanyId(req);

  // Use drop_off_date / return_date as pickup/return signals.
  // Trend over last 7 days including today.
  const pickupSql = `
    SELECT DATE(drop_off_date) AS d, COUNT(*) AS total
    FROM parking_bookings
    WHERE company_id = ?
      AND drop_off_date IS NOT NULL
      AND DATE(drop_off_date) >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)
    GROUP BY DATE(drop_off_date)
    ORDER BY d ASC
  `;

  const returnSql = `
    SELECT DATE(return_date) AS d, COUNT(*) AS total
    FROM parking_bookings
    WHERE company_id = ?
      AND return_date IS NOT NULL
      AND DATE(return_date) >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)
    GROUP BY DATE(return_date)
    ORDER BY d ASC
  `;

  db.query(pickupSql, [companyId], (err1, pickupRows) => {
    if (err1) {
      console.error("pickup trend query error:", err1);
      return res.status(500).json({ success: false, message: "Server error" });
    }
    db.query(returnSql, [companyId], (err2, returnRows) => {
      if (err2) {
        console.error("return trend query error:", err2);
        return res.status(500).json({ success: false, message: "Server error" });
      }

      const pickupTrend = (pickupRows || []).map((r) => ({
        date: r.d ? String(r.d).slice(0, 10) : "",
        total: Number(r.total || 0),
      }));
      const returnTrend = (returnRows || []).map((r) => ({
        date: r.d ? String(r.d).slice(0, 10) : "",
        total: Number(r.total || 0),
      }));

      const totalPickups = pickupTrend.reduce((a, b) => a + b.total, 0);
      const totalReturns = returnTrend.reduce((a, b) => a + b.total, 0);

      return res.json({
        totalPickups,
        totalReturns,
        pickupTrend,
        returnTrend,
      });
    });
  });
});

router.get("/navbar-counts", (req, res) => {
  const companyId = getCompanyId(req);

  const sql = `
    SELECT
      COUNT(*) AS total,
      SUM(CASE WHEN status = 'Active' THEN 1 ELSE 0 END) AS active,
      SUM(CASE WHEN status = 'Pending' THEN 1 ELSE 0 END) AS pending,
      SUM(CASE WHEN status = 'Cancelled' THEN 1 ELSE 0 END) AS cancelled,
      SUM(CASE WHEN status = 'Pending' AND source = 'Website' THEN 1 ELSE 0 END) AS incomplete
    FROM parking_bookings
    WHERE company_id = ?
  `;

  db.query(sql, [companyId], (err, rows) => {
    if (err) {
      console.error("navbar-counts query error:", err);
      return res.status(500).json({ success: false, message: "Server error" });
    }
    const r = rows?.[0] || {};
    return res.json({
      total: Number(r.total || 0),
      active: Number(r.active || 0),
      pending: Number(r.pending || 0),
      cancelled: Number(r.cancelled || 0),
      incomplete: Number(r.incomplete || 0),
    });
  });
});

router.get("/sales", (req, res) => {
  const companyId = getCompanyId(req);
  const filter = String(req.query.filter || "Yearly");

  const filterLower = filter.toLowerCase();
  const isToday = filterLower === "today";
  const isWeekly = filterLower === "weekly";
  const isMonthly = filterLower === "monthly";

  // Determine range and bucket.
  // - Today: 24h buckets (hour)
  // - Weekly: last 7 days (day)
  // - Monthly: current month by day
  // - Yearly: current year by month
  let sql = "";

  if (isToday) {
    sql = `
      SELECT HOUR(created_at) AS bucket, SUM(total_payable) AS total
      FROM parking_bookings
      WHERE company_id = ?
        AND created_at >= CURDATE()
        AND created_at < DATE_ADD(CURDATE(), INTERVAL 1 DAY)
      GROUP BY HOUR(created_at)
      ORDER BY bucket ASC
    `;
  } else if (isWeekly) {
    sql = `
      SELECT DATE(created_at) AS bucket, SUM(total_payable) AS total
      FROM parking_bookings
      WHERE company_id = ?
        AND DATE(created_at) >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)
      GROUP BY DATE(created_at)
      ORDER BY bucket ASC
    `;
  } else if (isMonthly) {
    sql = `
      SELECT DATE(created_at) AS bucket, SUM(total_payable) AS total
      FROM parking_bookings
      WHERE company_id = ?
        AND YEAR(created_at) = YEAR(CURDATE())
        AND MONTH(created_at) = MONTH(CURDATE())
      GROUP BY DATE(created_at)
      ORDER BY bucket ASC
    `;
  } else {
    sql = `
      SELECT MONTH(created_at) AS bucket, SUM(total_payable) AS total
      FROM parking_bookings
      WHERE company_id = ?
        AND YEAR(created_at) = YEAR(CURDATE())
      GROUP BY MONTH(created_at)
      ORDER BY bucket ASC
    `;
  }

  db.query(sql, [companyId], (err, rows) => {
    if (err) {
      console.error("sales analytics query error:", err);
      return res.status(500).json({ success: false, message: "Server error" });
    }

    const points = (rows || []).map((r) => ({
      bucket: r.bucket,
      total: Number(r.total || 0),
    }));

    const totalSales = points.reduce((a, b) => a + b.total, 0);

    // Simple growth placeholders (compute properly later)
    const growthPercent = 0;
    const growthPerDay = 0;

    const categories = points.map((p) => String(p.bucket));
    const series = [{ name: "Sales", data: points.map((p) => p.total) }];

    return res.json({
      totalSales: Math.round(totalSales * 100) / 100,
      growthPercent,
      growthPerDay,
      chartData: { categories, series },
    });
  });
});

export default router;

