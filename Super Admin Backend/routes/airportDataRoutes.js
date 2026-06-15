import express from "express";
import db from "../config/db.js";

const router = express.Router();

// ---------- GET all airports ----------
router.get("/airport-data", (req, res) => {
  const companyId = req.companyId || 1;
  const sql = `
    SELECT a.airport_id, a.airport_name, a.iata_code, a.icao_code,
           a.country, a.city, a.total_terminals, a.airport_type, a.website
    FROM airports a
    JOIN company_airports ca ON a.airport_id = ca.airport_id
    WHERE ca.company_id = ? AND ca.status = 'Y'
    ORDER BY a.airport_name ASC
  `;
  db.query(sql, [companyId], (err, results) => {
    if (err) {
      console.error("Error fetching airport data:", err);
      return res.status(500).json([]);
    }
    res.json(results);
  });
});

// ---------- ADD airport ----------
router.post("/add-my-airport", (req, res) => {
  console.log("[BACKEND] POST /add-my-airport hit with body:", req.body);
  const {
    airport_name, iata_code, icao_code,
    country, city, total_terminals, airport_type, website,
  } = req.body;
  const companyId = req.companyId || 1;

  if (!airport_name) {
    return res.status(400).json({ success: false, message: "airport_name is required" });
  }

  // First, insert into global airports
  const sqlAirport = `
    INSERT INTO airports
      (airport_name, iata_code, icao_code, country, city, total_terminals, airport_type, website)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `;
  db.query(
    sqlAirport,
    [airport_name, iata_code || "", icao_code || "", country || "", city || "", total_terminals || 0, airport_type || "", website || ""],
    (err, result) => {
      if (err) {
        console.error("Error adding to global airports:", err);
        return res.status(500).json({ success: false, message: err.sqlMessage });
      }
      const newAirportId = result.insertId;

      // Then, link it to the company
      const sqlLink = `
        INSERT INTO company_airports (company_id, airport_id, status, entered_by, entered_on)
        VALUES (?, ?, 'Y', ?, NOW())
      `;
      const userId = req.userId || 1; // Assuming userId is available in req
      db.query(sqlLink, [companyId, newAirportId, userId], (err2) => {
        if (err2) {
          console.error("Error linking airport to company:", err2);
          return res.status(500).json({ success: false, message: err2.sqlMessage });
        }
        res.json({ success: true, airport_id: newAirportId });
      });
    }
  );
});

// ---------- UPDATE airport ----------
router.put("/update-airport/:id", (req, res) => {
  const { id } = req.params;
  const {
    airport_name, iata_code, icao_code,
    country, city, total_terminals, airport_type, website,
  } = req.body;
  const companyId = req.companyId || 1;

  // Update global airports (Note: this affects all companies using this airport)
  const sql = `
    UPDATE airports SET
      airport_name = ?, iata_code = ?, icao_code = ?,
      country = ?, city = ?, total_terminals = ?,
      airport_type = ?, website = ?
    WHERE airport_id = ?
  `;
  // First verify ownership
  db.query("SELECT id FROM company_airports WHERE airport_id = ? AND company_id = ?", [id, companyId], (err, rows) => {
    if (err || !rows.length) {
      return res.status(403).json({ success: false, message: "Unauthorized to update this airport" });
    }

    db.query(
      sql,
      [airport_name, iata_code, icao_code, country, city, total_terminals, airport_type, website, id],
      (err2) => {
        if (err2) {
          console.error("Error updating airport:", err2);
          return res.status(500).json({ success: false, message: err2.sqlMessage });
        }
        res.json({ success: true });
      }
    );
  });
});

// ---------- DELETE airport ----------
router.delete("/delete-airport/:id", (req, res) => {
  const companyId = req.companyId || 1;
  // Just remove the link, don't delete the global airport
  db.query("DELETE FROM company_airports WHERE airport_id = ? AND company_id = ?", [req.params.id, companyId], (err) => {
    if (err) {
      console.error("Error deleting airport link:", err);
      return res.status(500).json({ success: false, message: err.sqlMessage });
    }
    res.json({ success: true });
  });
});

// ---------- GET global terminals (from terminals_info) ----------
router.get("/global-terminals", (req, res) => {
  const sql = "SELECT * FROM terminals_info WHERE status = 'Y' ORDER BY terminal_name ASC";
  db.query(sql, (err, results) => {
    if (err) {
      console.error("Error fetching global terminals:", err);
      return res.status(500).json([]);
    }
    res.json(results);
  });
});

// ---------- GET terminals by airport ----------
router.get("/parking-terminals/:airport_id", (req, res) => {
  const companyId = req.companyId || 1;
  const sql = `
    SELECT cat.id as terminal_id, cat.airport_id, cat.terminal_id as global_terminal_id, 
           IFNULL(cat.terminal_name, ti.terminal_name) as terminal_name,
           cat.postcode, cat.latitude, cat.longitude, cat.status
    FROM comp_airport_terminals cat
    JOIN terminals_info ti ON cat.terminal_id = ti.id
    WHERE cat.airport_id = ? AND cat.company_id = ?
    ORDER BY ti.terminal_name ASC
  `;
  db.query(sql, [req.params.airport_id, companyId], (err, results) => {
    if (err) {
      console.error("Error fetching terminals:", err);
      return res.status(500).json([]);
    }
    res.json(results);
  });
});

// ---------- DELETE terminal ----------
router.delete("/delete-parking-terminal/:id", (req, res) => {
  const companyId = req.companyId || 1;
  const sql = `
    DELETE FROM comp_airport_terminals
    WHERE id = ? AND company_id = ?
  `;
  db.query(sql, [req.params.id, companyId], (err) => {
    if (err) {
      console.error("Error deleting terminal:", err);
      return res.status(500).json({ success: false, message: err.sqlMessage });
    }
    res.json({ success: true });
  });
});

// ---------- ADD terminal ----------
router.post("/parking-terminals", (req, res) => {
  const { airport_id, terminal_id, terminal_name, postcode, latitude, longitude } = req.body;
  const companyId = req.companyId || 1;
  const userId = req.userId || 1;

  if (!terminal_id || !airport_id) {
    return res.status(400).json({ success: false, message: "airport_id and terminal_id (global) are required" });
  }

  // Verify airport ownership
  db.query("SELECT id FROM company_airports WHERE airport_id = ? AND company_id = ?", [airport_id, companyId], (err, rows) => {
    if (err || !rows.length) {
      return res.status(403).json({ success: false, message: "Unauthorized or invalid airport" });
    }

    const sql = `
      INSERT INTO comp_airport_terminals
        (company_id, airport_id, terminal_id, terminal_name, postcode, latitude, longitude, status, entered_by, entered_on)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'Y', ?, NOW())
    `;
    db.query(
      sql,
      [companyId, airport_id, terminal_id, terminal_name || null, postcode || null, latitude || null, longitude || null, userId],
      (err, result) => {
        if (err) {
          console.error("Error adding terminal:", err);
          return res.status(500).json({ success: false, message: err.sqlMessage });
        }
        res.json({ success: true, terminal_id: result.insertId });
      }
    );
  });
});


// ---------- GET global airports (not already linked to company) ----------
router.get("/global-airports", (req, res) => {
  const companyId = req.companyId || 1;
  const sql = `
    SELECT * FROM airports 
    WHERE airport_id NOT IN (
      SELECT airport_id FROM company_airports WHERE company_id = ?
    ) AND is_active = 1
    ORDER BY airport_name ASC
  `;
  db.query(sql, [companyId], (err, results) => {
    if (err) {
      console.error("Error fetching global airports:", err);
      return res.status(500).json([]);
    }
    res.json(results);
  });
});

// ---------- LINK global airport to company ----------
router.post("/link-airport", (req, res) => {
  const { airport_id } = req.body;
  const companyId = req.companyId || 1;
  const userId = req.userId || 1;

  if (!airport_id) {
    return res.status(400).json({ success: false, message: "airport_id is required" });
  }

  const sql = `
    INSERT INTO company_airports (company_id, airport_id, status, entered_by, entered_on)
    VALUES (?, ?, 'Y', ?, NOW())
  `;
  db.query(sql, [companyId, airport_id, userId], (err) => {
    if (err) {
      console.error("Error linking airport:", err);
      return res.status(500).json({ success: false, message: "Failed to link airport" });
    }
    res.json({ success: true, message: "Airport linked successfully" });
  });
});

export default router;
