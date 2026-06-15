import express from "express";
import db from "../config/db.js";

const router = express.Router();

function companyIdFromReq(req) {
  return req.companyId || 1;
}

function userIdFromReq(req) {
  return req.userId || 1;
}

function isNonEmpty(v) {
  return v !== undefined && v !== null && String(v).trim() !== "";
}

const DEFAULT_GOOGLE_MAPS_KEY =
  process.env.GOOGLE_MAPS_API_KEY || "AIzaSyAzLG-7kEYukE6yEsUaq7K-WTgl-ti64zk";

/* ========================================================
   JOBS ENDPOINTS
   ======================================================== */

// Lists all Jobs models
router.get("/jobs", async (req, res) => {
  try {
    const companyId = companyIdFromReq(req);
    const page = Math.max(1, Number(req.query.page || 1));
    const limit = Math.min(500, Math.max(1, Number(req.query.limit || 20)));
    const offset = (page - 1) * limit;

    const where = ["company_id = ?"];
    const params = [companyId];

    const search = req.query.search;
    if (isNonEmpty(search)) {
      const s = `%${String(search).trim()}%`;
      where.push(
        "(booking_ref LIKE ? OR customer_name LIKE ? OR vehicleregnumber LIKE ?)"
      );
      params.push(s, s, s);
    }

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
    const countSql = `SELECT COUNT(*) AS total FROM jobs ${whereSql}`;
    const dataSql = `
      SELECT * FROM jobs 
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
    console.error("GET /jobs error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

// Displays a single Jobs model
router.get("/jobs/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = companyIdFromReq(req);
    const [rows] = await db.promise().query(
      "SELECT * FROM jobs WHERE id = ? AND company_id = ?",
      [id, companyId]
    );
    if (!rows.length) {
      return res.status(404).json({ success: false, message: "Job not found" });
    }
    return res.json({ success: true, data: rows[0] });
  } catch (error) {
    console.error("GET /jobs/:id error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

// Creates a new Jobs model
router.post("/jobs", async (req, res) => {
  try {
    const companyId = companyIdFromReq(req);
    const data = { ...req.body, company_id: companyId };
    
    // In a real app, we would validate the data here
    const [result] = await db.promise().query("INSERT INTO jobs SET ?", [data]);
    
    return res.json({ success: true, id: result.insertId, message: "Job created successfully" });
  } catch (error) {
    console.error("POST /jobs error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

// Updates an existing Jobs model
router.put("/jobs/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = companyIdFromReq(req);
    const data = { ...req.body };
    delete data.id;
    delete data.company_id;
    delete data.created_at;
    delete data.updated_at;

    const [result] = await db.promise().query(
      "UPDATE jobs SET ? WHERE id = ? AND company_id = ?",
      [data, id, companyId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: "Job not found" });
    }
    return res.json({ success: true, message: "Job updated successfully" });
  } catch (error) {
    console.error("PUT /jobs/:id error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

// Deletes an existing Jobs model
router.delete("/jobs/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = companyIdFromReq(req);

    const [result] = await db.promise().query(
      "DELETE FROM jobs WHERE id = ? AND company_id = ?",
      [id, companyId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: "Job not found" });
    }
    return res.json({ success: true, message: "Job deleted successfully" });
  } catch (error) {
    console.error("DELETE /jobs/:id error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

// Creates a new JobOperation (admin: assign driver + type only; mobile app fills the rest)
router.post("/operations", async (req, res) => {
  try {
    const companyId = companyIdFromReq(req);
    const { job_id, operation_type, driver_id } = req.body;

    if (!job_id) {
      return res.status(400).json({ success: false, message: "Job ID is required" });
    }
    if (!operation_type) {
      return res.status(400).json({ success: false, message: "Operation type is required" });
    }
    if (!driver_id) {
      return res.status(400).json({ success: false, message: "Driver is required" });
    }

    const allowedTypes = ["Receive", "Shift", "Return"];
    if (!allowedTypes.includes(operation_type)) {
      return res.status(400).json({ success: false, message: "Invalid operation type" });
    }

    // Verify job belongs to company
    const [jobRows] = await db.promise().query(
      "SELECT id FROM jobs WHERE id = ? AND company_id = ?",
      [job_id, companyId]
    );
    if (!jobRows.length) {
      return res.status(404).json({ success: false, message: "Job not found or unauthorized" });
    }

    // Verify driver belongs to company
    const [driverRows] = await db.promise().query(
      "SELECT id FROM drivers WHERE id = ? AND company_id = ?",
      [driver_id, companyId]
    );
    if (!driverRows.length) {
      return res.status(404).json({ success: false, message: "Driver not found or unauthorized" });
    }

    const [existing] = await db.promise().query(
      "SELECT id FROM job_operations WHERE job_id = ? AND operation_type = ?",
      [job_id, operation_type]
    );
    if (existing.length) {
      return res.status(400).json({
        success: false,
        message: `${operation_type} operation already exists for this job`,
      });
    }

    const data = {
      job_id,
      operation_type,
      driver_id,
      status: "pending",
    };

    const [result] = await db.promise().query("INSERT INTO job_operations SET ?", [data]);

    return res.json({
      success: true,
      id: result.insertId,
      message: "Operation created successfully",
    });
  } catch (error) {
    console.error("POST /operations error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

// Displays job operations for a specific job
router.get("/jobs/:id/operations", async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = companyIdFromReq(req);

    // Verify job belongs to company
    const [jobRows] = await db.promise().query(
      "SELECT id FROM jobs WHERE id = ? AND company_id = ?",
      [id, companyId]
    );
    if (!jobRows.length) {
      return res.status(404).json({ success: false, message: "Job not found" });
    }

    const sql = `
      SELECT jo.*, CONCAT(d.first_name, ' ', d.last_name) as driver_name 
      FROM job_operations jo
      LEFT JOIN drivers d ON jo.driver_id = d.id
      WHERE jo.job_id = ?
      ORDER BY jo.id ASC
    `;
    const [rows] = await db.promise().query(sql, [id]);
    return res.json({ success: true, data: rows });
  } catch (error) {
    console.error("GET /jobs/:id/operations error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

// Saves job operations (Receive and Return)
router.post("/jobs/save-operations", async (req, res) => {
  const connection = await db.promise().getConnection();
  try {
    await connection.beginTransaction();
    const { job_id, operations } = req.body;
    const companyId = companyIdFromReq(req);

    if (!job_id) {
      return res.status(400).json({ success: false, message: "Job ID is required" });
    }

    // Verify job
    const [jobRows] = await connection.query(
      "SELECT id FROM jobs WHERE id = ? AND company_id = ?",
      [job_id, companyId]
    );
    if (!jobRows.length) {
      return res.status(404).json({ success: false, message: "Job not found" });
    }

    const types = ['Receive', 'Return', 'Shift'];
    
    for (const type of types) {
      if (operations[type]) {
        const opData = operations[type];
        const driver_id = opData.driver_id || null;
        const status = opData.status || 'pending';
        
        if (!driver_id && !opData.id) continue;

        if (opData.id) {
          // Update existing
          await connection.query(
            "UPDATE job_operations SET driver_id = ?, status = ? WHERE id = ?",
            [driver_id, status, opData.id]
          );
        } else {
          // Check if exists for same type
          const [existing] = await connection.query(
            "SELECT id FROM job_operations WHERE job_id = ? AND operation_type = ?",
            [job_id, type]
          );

          if (existing.length) {
            await connection.query(
              "UPDATE job_operations SET driver_id = ?, status = ? WHERE id = ?",
              [driver_id, status, existing[0].id]
            );
          } else {
            await connection.query(
              "INSERT INTO job_operations (job_id, operation_type, driver_id, status) VALUES (?, ?, ?, ?)",
              [job_id, type, driver_id, status]
            );
          }
        }
      }
    }

    await connection.commit();
    return res.json({ success: true, message: "Operations saved successfully" });
  } catch (error) {
    await connection.rollback();
    console.error("POST /jobs/save-operations error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  } finally {
    connection.release();
  }
});

// Creates a new job for shift location
router.post("/jobs/create-shift", async (req, res) => {
  const connection = await db.promise().getConnection();
  try {
    await connection.beginTransaction();
    const { source_job_id, driver_id, terminal_id } = req.body;
    const companyId = companyIdFromReq(req);

    if (!source_job_id || !driver_id || !terminal_id) {
      return res.status(400).json({ success: false, message: "Required fields missing" });
    }

    // Fetch source job
    const [sourceJobs] = await connection.query(
      "SELECT * FROM jobs WHERE id = ? AND company_id = ?",
      [source_job_id, companyId]
    );
    if (!sourceJobs.length) {
      return res.status(404).json({ success: false, message: "Source job not found" });
    }
    const sourceJob = sourceJobs[0];

    // Check if Return is completed
    const [returnOp] = await connection.query(
      "SELECT status FROM job_operations WHERE job_id = ? AND operation_type = 'Return'",
      [source_job_id]
    );
    if (returnOp.length && ['completed', 'delivered'].includes(returnOp[0].status.toLowerCase())) {
      return res.status(400).json({ success: false, message: "Return already completed" });
    }

    // Get terminal info
    const [terminals] = await connection.query(
      `SELECT cat.*, IFNULL(cat.terminal_name, ti.terminal_name) AS terminal_name
       FROM comp_airport_terminals cat
       LEFT JOIN terminals_info ti ON cat.terminal_id = ti.id
       WHERE cat.id = ? AND cat.company_id = ?`,
      [terminal_id, companyId]
    );
    if (!terminals.length) {
      return res.status(404).json({ success: false, message: "Terminal not found" });
    }
    const terminal = terminals[0];

    // Create new job
    const newJobData = {
      company_id: sourceJob.company_id,
      booking_id: sourceJob.booking_id,
      booking_ref: sourceJob.booking_ref + "-SHIFT",
      airport_id: sourceJob.airport_id,
      product_id: sourceJob.product_id,
      customer_name: sourceJob.customer_name,
      passengers: sourceJob.passengers,
      bookingnote: sourceJob.bookingnote,
      booking_date: sourceJob.booking_date,
      depdatetime: new Date(),
      depterminal_id: terminal.id,
      terminal_name: terminal.terminal_name,
      depflight: sourceJob.depflight,
      returndatetime: sourceJob.returndatetime,
      returnterminal_id: sourceJob.returnterminal_id,
      retern_terminal_name: sourceJob.retern_terminal_name,
      returnflight: sourceJob.returnflight,
      parkingdays: sourceJob.parkingdays,
      vehiclemake: sourceJob.vehiclemake,
      vehiclemodel: sourceJob.vehiclemodel,
      vehiclecolour: sourceJob.vehiclecolour,
      vehicleregnumber: sourceJob.vehicleregnumber,
      job_overall_status: 'pending',
      park_operation_status: 'pending',
      deliver_operation_status: 'pending'
    };

    const [jobResult] = await connection.query("INSERT INTO jobs SET ?", [newJobData]);
    const newJobId = jobResult.insertId;

    // Create shift operation
    await connection.query(
      "INSERT INTO job_operations (job_id, operation_type, driver_id, status, yard_id) VALUES (?, 'Shift', ?, 'pending', ?)",
      [newJobId, driver_id, terminal_id]
    );

    await connection.commit();
    return res.json({ success: true, message: "Shift job created successfully", new_job_id: newJobId });
  } catch (error) {
    await connection.rollback();
    console.error("POST /jobs/create-shift error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  } finally {
    connection.release();
  }
});

/* ========================================================
   JOB OPERATIONS ENDPOINTS
   ======================================================== */

// Lists all JobOperations models with counts
router.get("/operations", async (req, res) => {
  try {
    const companyId = companyIdFromReq(req);
    const statusFilter = req.query.status || 'all';
    const operationTypeFilter = req.query.operation_type || '';
    
    const page = Math.max(1, Number(req.query.page || 1));
    const limit = Math.min(500, Math.max(1, Number(req.query.limit || 20)));
    const offset = (page - 1) * limit;

    let where = ["j.company_id = ?"];
    let params = [companyId];

    if (statusFilter !== 'all') {
      if (statusFilter === 'pending') {
        where.push("(jo.status = 'pending' OR jo.status IS NULL OR jo.status = '')");
      } else {
        where.push("jo.status = ?");
        params.push(statusFilter);
      }
    }

    if (operationTypeFilter) {
      let filterValue = operationTypeFilter;
      if (filterValue.toUpperCase() === 'PARK') filterValue = 'Receive';
      else if (filterValue.toUpperCase() === 'DELIVER') filterValue = 'Return';
      
      where.push("jo.operation_type = ?");
      params.push(filterValue);
    }

    const whereSql = `WHERE ${where.join(" AND ")}`;
    
    const dataSql = `
      SELECT jo.*, j.booking_ref, j.customer_name, j.vehiclemake, j.vehiclemodel, j.vehicleregnumber, j.vehiclecolour, CONCAT(d.first_name, ' ', d.last_name) as driver_name
      FROM job_operations jo
      INNER JOIN jobs j ON jo.job_id = j.id
      LEFT JOIN drivers d ON jo.driver_id = d.id
      ${whereSql}
      ORDER BY jo.created_at DESC
      LIMIT ? OFFSET ?
    `;

    const [rows] = await db.promise().query(dataSql, [...params, limit, offset]);

    // Counts logic
    const countsSql = `
      SELECT 
        jo.operation_type,
        COALESCE(jo.status, 'pending') as status,
        COUNT(*) as count
      FROM job_operations jo
      INNER JOIN jobs j ON jo.job_id = j.id
      WHERE j.company_id = ?
      GROUP BY jo.operation_type, jo.status
    `;
    const [countRows] = await db.promise().query(countsSql, [companyId]);
    
    const statusCounts = {};
    const operationTypeCounts = { Receive: 0, Return: 0, Shift: 0 };
    
    countRows.forEach(row => {
      let opType = row.operation_type;
      if (opType.toUpperCase() === 'PARK') opType = 'Receive';
      else if (opType.toUpperCase() === 'DELIVER') opType = 'Return';
      
      const status = row.status || 'pending';
      if (!statusCounts[opType]) statusCounts[opType] = {};
      statusCounts[opType][status] = (statusCounts[opType][status] || 0) + row.count;
      
      if (operationTypeCounts[opType] !== undefined) {
        operationTypeCounts[opType] += row.count;
      }
    });

    const [totalRows] = await db.promise().query(
      "SELECT COUNT(*) as total FROM job_operations jo INNER JOIN jobs j ON jo.job_id = j.id WHERE j.company_id = ?",
      [companyId]
    );

    return res.json({ 
      success: true, 
      data: rows, 
      statusCounts, 
      operationTypeCounts, 
      total: totalRows[0].total 
    });
  } catch (error) {
    console.error("GET /operations error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

// Calendar data
router.get("/operations/calendar", async (req, res) => {
  try {
    const companyId = companyIdFromReq(req);
    const { driver_id, date } = req.query;

    let where = ["j.company_id = ?"];
    let params = [companyId];

    if (driver_id) {
      where.push("jo.driver_id = ?");
      params.push(driver_id);
    }

    if (date) {
      where.push(`
        DATE(CASE 
          WHEN jo.operation_type = 'Receive' THEN j.booking_date
          WHEN jo.operation_type = 'Return' THEN j.returndatetime
          ELSE jo.created_at
        END) = ?
      `);
      params.push(date);
    }

    const sql = `
      SELECT 
        DATE(CASE 
          WHEN jo.operation_type = 'Receive' THEN j.booking_date
          WHEN jo.operation_type = 'Return' THEN j.returndatetime
          ELSE jo.created_at
        END) as operation_date,
        jo.operation_type,
        COUNT(*) as count
      FROM job_operations jo
      INNER JOIN jobs j ON jo.job_id = j.id
      WHERE ${where.join(" AND ")}
      GROUP BY operation_date, jo.operation_type
    `;

    const [results] = await db.promise().query(sql, params);
    
    const calendarData = {};
    results.forEach(row => {
      const date = row.operation_date;
      let type = row.operation_type;
      if (type.toUpperCase() === 'PARK') type = 'Receive';
      else if (type.toUpperCase() === 'DELIVER') type = 'Return';
      
      if (!calendarData[date]) {
        calendarData[date] = { receive: 0, return: 0, shift: 0, total: 0 };
      }
      
      const key = type.toLowerCase();
      if (calendarData[date][key] !== undefined) {
        calendarData[date][key] = row.count;
      }
      calendarData[date].total += row.count;
    });

    return res.json({ success: true, data: calendarData });
  } catch (error) {
    console.error("GET /operations/calendar error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

// Operation details for a date
router.get("/operations/details", async (req, res) => {
  try {
    const companyId = companyIdFromReq(req);
    const { date, type, driver_id } = req.query;

    if (!date || !type) {
      return res.status(400).json({ success: false, message: "Date and type required" });
    }

    let normalizedType = type;
    if (type.toUpperCase() === 'PARK') normalizedType = 'Receive';
    else if (type.toUpperCase() === 'DELIVER') normalizedType = 'Return';

    let where = [
      "j.company_id = ?", 
      `DATE(CASE 
        WHEN jo.operation_type = 'Receive' THEN j.booking_date
        WHEN jo.operation_type = 'Return' THEN j.returndatetime
        ELSE jo.created_at
      END) = ?`,
      "jo.operation_type = ?"
    ];
    let params = [companyId, date, normalizedType];

    if (driver_id) {
      where.push("jo.driver_id = ?");
      params.push(driver_id);
    }

    const sql = `
      SELECT jo.*, j.booking_ref, j.customer_name, j.vehiclemake, j.vehiclemodel, j.vehicleregnumber, j.vehiclecolour, d.first_name as driver_first, d.last_name as driver_last
      FROM job_operations jo
      INNER JOIN jobs j ON jo.job_id = j.id
      LEFT JOIN drivers d ON jo.driver_id = d.id
      WHERE ${where.join(" AND ")}
      ORDER BY jo.created_at ASC
    `;

    const [rows] = await db.promise().query(sql, params);
    return res.json({ success: true, data: rows });
  } catch (error) {
    console.error("GET /operations/details error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

// Fetches a single JobOperation with full details
router.get("/operations/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = companyIdFromReq(req);

    const sql = `
      SELECT 
        jo.*, 
        j.booking_ref, j.customer_name, j.vehiclemake, j.vehiclemodel, j.vehicleregnumber, j.vehiclecolour, 
        j.passengers, j.booking_date, j.depdatetime, j.returndatetime, j.depflight, j.returnflight, 
        j.parkingdays, j.terminal_name, j.retern_terminal_name,
        a.airport_name,
        p.product_name,
        CONCAT(d.first_name, ' ', d.last_name) as driver_name
      FROM job_operations jo
      INNER JOIN jobs j ON jo.job_id = j.id
      LEFT JOIN airports a ON j.airport_id = a.airport_id
      LEFT JOIN comp_products p ON j.product_id = p.id
      LEFT JOIN drivers d ON jo.driver_id = d.id
      WHERE jo.id = ? AND j.company_id = ?
    `;

    const [rows] = await db.promise().query(sql, [id, companyId]);

    if (!rows.length) {
      return res.status(404).json({ success: false, message: "Operation not found" });
    }

    return res.json({ success: true, data: rows[0] });
  } catch (error) {
    console.error("GET /operations/:id error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

// Update operation
router.put("/operations/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = companyIdFromReq(req);
    const data = { ...req.body };
    delete data.id;
    delete data.company_id;
    delete data.created_at;

    const [jobCheck] = await db.promise().query(
      `SELECT jo.id FROM job_operations jo
       INNER JOIN jobs j ON jo.job_id = j.id
       WHERE jo.id = ? AND j.company_id = ?`,
      [id, companyId]
    );
    if (!jobCheck.length) {
      return res.status(404).json({ success: false, message: "Operation not found" });
    }

    await db.promise().query("UPDATE job_operations SET ? WHERE id = ?", [data, id]);
    return res.json({ success: true, message: "Operation updated successfully" });
  } catch (error) {
    console.error("PUT /operations/:id error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

// Delete operation
router.delete("/operations/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = companyIdFromReq(req);

    const [rows] = await db.promise().query(
      `SELECT jo.id FROM job_operations jo
       INNER JOIN jobs j ON jo.job_id = j.id
       WHERE jo.id = ? AND j.company_id = ?`,
      [id, companyId]
    );
    if (!rows.length) {
      return res.status(404).json({ success: false, message: "Operation not found" });
    }

    await db.promise().query("DELETE FROM job_operations WHERE id = ?", [id]);
    return res.json({ success: true, message: "Operation deleted successfully" });
  } catch (error) {
    console.error("DELETE /operations/:id error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

/* ========================================================
   GOOGLE MAPS KEY
   ======================================================== */

router.get("/google-maps-key", async (req, res) => {
  try {
    const companyId = companyIdFromReq(req);
    const [rows] = await db.promise().query(
      "SELECT google_map_api_key FROM companies WHERE id = ?",
      [companyId]
    );
    const key = rows[0]?.google_map_api_key || DEFAULT_GOOGLE_MAPS_KEY;
    return res.json({ success: true, data: { key } });
  } catch (error) {
    console.error("GET /google-maps-key error:", error);
    return res.json({ success: true, data: { key: DEFAULT_GOOGLE_MAPS_KEY } });
  }
});

/* ========================================================
   SYSTEM SETTINGS (comp_settings)
   ======================================================== */

router.get("/settings", async (req, res) => {
  try {
    const companyId = companyIdFromReq(req);
    const [rows] = await db.promise().query(
      "SELECT * FROM comp_settings WHERE company_id = ? ORDER BY id DESC",
      [companyId]
    );
    return res.json({ success: true, data: rows });
  } catch (error) {
    console.error("GET /settings error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

router.post("/settings", async (req, res) => {
  try {
    const companyId = companyIdFromReq(req);
    const userId = userIdFromReq(req);
    const data = {
      company_id: companyId,
      grace_time: req.body.grace_time || null,
      extra_charge_type: req.body.extra_charge_type || null,
      charge_value: req.body.charge_value ?? null,
      status: req.body.status || "Y",
      entered_by: userId,
      entered_on: new Date(),
    };
    const [result] = await db.promise().query("INSERT INTO comp_settings SET ?", [data]);
    return res.json({ success: true, id: result.insertId, message: "Settings created" });
  } catch (error) {
    console.error("POST /settings error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

router.put("/settings/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = companyIdFromReq(req);
    const data = { ...req.body };
    delete data.id;
    delete data.company_id;
    delete data.entered_by;
    delete data.entered_on;

    const [result] = await db.promise().query(
      "UPDATE comp_settings SET ? WHERE id = ? AND company_id = ?",
      [data, id, companyId]
    );
    if (!result.affectedRows) {
      return res.status(404).json({ success: false, message: "Settings not found" });
    }
    return res.json({ success: true, message: "Settings updated" });
  } catch (error) {
    console.error("PUT /settings/:id error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

router.delete("/settings/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = companyIdFromReq(req);
    const [result] = await db.promise().query(
      "DELETE FROM comp_settings WHERE id = ? AND company_id = ?",
      [id, companyId]
    );
    if (!result.affectedRows) {
      return res.status(404).json({ success: false, message: "Settings not found" });
    }
    return res.json({ success: true, message: "Settings deleted" });
  } catch (error) {
    console.error("DELETE /settings/:id error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

/* ========================================================
   LABEL SETTINGS (company_operation_labels)
   ======================================================== */

router.get("/label-settings", async (req, res) => {
  try {
    const companyId = companyIdFromReq(req);
    const [rows] = await db.promise().query(
      "SELECT * FROM company_operation_labels WHERE company_id = ? ORDER BY id DESC",
      [companyId]
    );
    return res.json({ success: true, data: rows });
  } catch (error) {
    console.error("GET /label-settings error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

router.post("/label-settings", async (req, res) => {
  try {
    const companyId = companyIdFromReq(req);
    const data = {
      company_id: companyId,
      receive_label: req.body.receive_label || "Receive",
      shift_label: req.body.shift_label || "Shift",
      return_label: req.body.return_label || "Return",
    };
    const [result] = await db.promise().query(
      "INSERT INTO company_operation_labels SET ?",
      [data]
    );
    return res.json({ success: true, id: result.insertId, message: "Label settings created" });
  } catch (error) {
    console.error("POST /label-settings error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

router.put("/label-settings/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = companyIdFromReq(req);
    const data = { ...req.body };
    delete data.id;
    delete data.company_id;

    const [result] = await db.promise().query(
      "UPDATE company_operation_labels SET ? WHERE id = ? AND company_id = ?",
      [data, id, companyId]
    );
    if (!result.affectedRows) {
      return res.status(404).json({ success: false, message: "Label settings not found" });
    }
    return res.json({ success: true, message: "Label settings updated" });
  } catch (error) {
    console.error("PUT /label-settings/:id error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

router.delete("/label-settings/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = companyIdFromReq(req);
    const [result] = await db.promise().query(
      "DELETE FROM company_operation_labels WHERE id = ? AND company_id = ?",
      [id, companyId]
    );
    if (!result.affectedRows) {
      return res.status(404).json({ success: false, message: "Label settings not found" });
    }
    return res.json({ success: true, message: "Label settings deleted" });
  } catch (error) {
    console.error("DELETE /label-settings/:id error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

/* ========================================================
   TERMINALS (comp_airport_terminals)
   ======================================================== */

router.get("/terminals-info", async (req, res) => {
  try {
    const [rows] = await db.promise().query(
      "SELECT id, terminal_name FROM terminals_info WHERE status = 'Y' ORDER BY terminal_name ASC"
    );
    return res.json({ success: true, data: rows });
  } catch (error) {
    console.error("GET /terminals-info error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

router.get("/terminals", async (req, res) => {
  try {
    const companyId = companyIdFromReq(req);
    const sql = `
      SELECT cat.*, a.airport_name,
             IFNULL(cat.terminal_name, ti.terminal_name) AS display_terminal_name
      FROM comp_airport_terminals cat
      LEFT JOIN airports a ON cat.airport_id = a.airport_id
      LEFT JOIN terminals_info ti ON cat.terminal_id = ti.id
      WHERE cat.company_id = ?
      ORDER BY cat.id DESC
    `;
    const [rows] = await db.promise().query(sql, [companyId]);
    return res.json({ success: true, data: rows });
  } catch (error) {
    console.error("GET /terminals error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

router.post("/terminals", async (req, res) => {
  try {
    const companyId = companyIdFromReq(req);
    const userId = userIdFromReq(req);
    const { airport_id, terminal_id, terminal_name, postcode, latitude, longitude, status } = req.body;

    if (!airport_id || !terminal_id) {
      return res.status(400).json({ success: false, message: "airport_id and terminal_id are required" });
    }

    const [airportCheck] = await db.promise().query(
      "SELECT id FROM company_airports WHERE airport_id = ? AND company_id = ? AND status = 'Y'",
      [airport_id, companyId]
    );
    if (!airportCheck.length) {
      return res.status(403).json({ success: false, message: "Invalid airport for company" });
    }

    const data = {
      company_id: companyId,
      airport_id,
      terminal_id,
      terminal_name: terminal_name || null,
      postcode: postcode || null,
      latitude: latitude || null,
      longitude: longitude || null,
      status: status || "Y",
      entered_by: userId,
      entered_on: new Date(),
    };
    const [result] = await db.promise().query("INSERT INTO comp_airport_terminals SET ?", [data]);
    return res.json({ success: true, id: result.insertId, message: "Terminal created" });
  } catch (error) {
    console.error("POST /terminals error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

router.put("/terminals/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = companyIdFromReq(req);
    const data = { ...req.body };
    delete data.id;
    delete data.company_id;
    delete data.entered_by;
    delete data.entered_on;
    delete data.airport_name;
    delete data.display_terminal_name;

    const [result] = await db.promise().query(
      "UPDATE comp_airport_terminals SET ? WHERE id = ? AND company_id = ?",
      [data, id, companyId]
    );
    if (!result.affectedRows) {
      return res.status(404).json({ success: false, message: "Terminal not found" });
    }
    return res.json({ success: true, message: "Terminal updated" });
  } catch (error) {
    console.error("PUT /terminals/:id error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

router.delete("/terminals/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = companyIdFromReq(req);
    const [result] = await db.promise().query(
      "DELETE FROM comp_airport_terminals WHERE id = ? AND company_id = ?",
      [id, companyId]
    );
    if (!result.affectedRows) {
      return res.status(404).json({ success: false, message: "Terminal not found" });
    }
    return res.json({ success: true, message: "Terminal deleted" });
  } catch (error) {
    console.error("DELETE /terminals/:id error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

/* ========================================================
   PARKING YARDS
   ======================================================== */

router.get("/parking-yards", async (req, res) => {
  try {
    const companyId = companyIdFromReq(req);
    const sql = `
      SELECT py.*, a.airport_name
      FROM parking_yards py
      LEFT JOIN airports a ON py.airport_id = a.airport_id
      WHERE py.company_id = ?
      ORDER BY py.id DESC
    `;
    const [rows] = await db.promise().query(sql, [companyId]);
    return res.json({ success: true, data: rows });
  } catch (error) {
    console.error("GET /parking-yards error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

router.post("/parking-yards", async (req, res) => {
  try {
    const companyId = companyIdFromReq(req);
    const userId = userIdFromReq(req);
    const data = {
      company_id: companyId,
      airport_id: req.body.airport_id,
      yard_name: req.body.yard_name,
      postcode: req.body.postcode || null,
      reny_per_day: req.body.reny_per_day ?? null,
      under_roof_charges: req.body.under_roof_charges ?? null,
      capacity: req.body.capacity ?? null,
      latitude: req.body.latitude || null,
      longitude: req.body.longitude || null,
      status: req.body.status || "Y",
      entered_by: userId,
      entered_on: new Date(),
    };
    const [result] = await db.promise().query("INSERT INTO parking_yards SET ?", [data]);
    return res.json({ success: true, id: result.insertId, message: "Parking yard created" });
  } catch (error) {
    console.error("POST /parking-yards error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

router.put("/parking-yards/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = companyIdFromReq(req);
    const data = { ...req.body };
    delete data.id;
    delete data.company_id;
    delete data.entered_by;
    delete data.entered_on;
    delete data.airport_name;

    const [result] = await db.promise().query(
      "UPDATE parking_yards SET ? WHERE id = ? AND company_id = ?",
      [data, id, companyId]
    );
    if (!result.affectedRows) {
      return res.status(404).json({ success: false, message: "Parking yard not found" });
    }
    return res.json({ success: true, message: "Parking yard updated" });
  } catch (error) {
    console.error("PUT /parking-yards/:id error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

router.delete("/parking-yards/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = companyIdFromReq(req);
    const [result] = await db.promise().query(
      "DELETE FROM parking_yards WHERE id = ? AND company_id = ?",
      [id, companyId]
    );
    if (!result.affectedRows) {
      return res.status(404).json({ success: false, message: "Parking yard not found" });
    }
    return res.json({ success: true, message: "Parking yard deleted" });
  } catch (error) {
    console.error("DELETE /parking-yards/:id error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

/* ========================================================
   DRIVERS (full CRUD)
   ======================================================== */

router.get("/drivers", async (req, res) => {
  try {
    const companyId = companyIdFromReq(req);
    const full = req.query.full === "1" || req.query.full === "true";
    const fields = full
      ? "d.*, a.airport_name"
      : "d.id, d.first_name, d.last_name, d.active_status";
    const sql = full
      ? `SELECT ${fields} FROM drivers d
         LEFT JOIN airports a ON d.airport_id = a.airport_id
         WHERE d.company_id = ? ORDER BY d.id DESC`
      : `SELECT ${fields} FROM drivers d WHERE d.company_id = ? ORDER BY d.first_name ASC`;
    const [rows] = await db.promise().query(sql, [companyId]);
    return res.json({ success: true, data: rows });
  } catch (error) {
    console.error("GET /drivers error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

router.get("/drivers/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = companyIdFromReq(req);
    const [rows] = await db.promise().query(
      `SELECT d.*, a.airport_name FROM drivers d
       LEFT JOIN airports a ON d.airport_id = a.airport_id
       WHERE d.id = ? AND d.company_id = ?`,
      [id, companyId]
    );
    if (!rows.length) {
      return res.status(404).json({ success: false, message: "Driver not found" });
    }
    return res.json({ success: true, data: rows[0] });
  } catch (error) {
    console.error("GET /drivers/:id error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

router.post("/drivers", async (req, res) => {
  try {
    const companyId = companyIdFromReq(req);
    const userId = userIdFromReq(req);
    const b = req.body;
    const data = {
      company_id: companyId,
      airport_id: b.airport_id || null,
      first_name: b.first_name,
      last_name: b.last_name,
      cell_no: b.cell_no,
      email: b.email || null,
      image_path: b.image_path || null,
      user_name: b.user_name || null,
      password: b.password || null,
      last_lat: b.last_lat ?? 0,
      last_lng: b.last_lng ?? 0,
      last_location_time: b.last_location_time ?? 0,
      fcm: b.fcm || null,
      active_status: b.active_status || "Y",
      verified: b.verified || "N",
      blocked: b.blocked || "N",
      entered_by: userId,
      entered_on: new Date(),
    };
    const [result] = await db.promise().query("INSERT INTO drivers SET ?", [data]);
    return res.json({ success: true, id: result.insertId, message: "Driver created" });
  } catch (error) {
    console.error("POST /drivers error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

router.put("/drivers/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = companyIdFromReq(req);
    const data = { ...req.body };
    delete data.id;
    delete data.company_id;
    delete data.entered_by;
    delete data.entered_on;
    delete data.airport_name;
    if (!data.password) delete data.password;

    const [result] = await db.promise().query(
      "UPDATE drivers SET ? WHERE id = ? AND company_id = ?",
      [data, id, companyId]
    );
    if (!result.affectedRows) {
      return res.status(404).json({ success: false, message: "Driver not found" });
    }
    return res.json({ success: true, message: "Driver updated" });
  } catch (error) {
    console.error("PUT /drivers/:id error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

router.delete("/drivers/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = companyIdFromReq(req);
    const [result] = await db.promise().query(
      "DELETE FROM drivers WHERE id = ? AND company_id = ?",
      [id, companyId]
    );
    if (!result.affectedRows) {
      return res.status(404).json({ success: false, message: "Driver not found" });
    }
    return res.json({ success: true, message: "Driver deleted" });
  } catch (error) {
    console.error("DELETE /drivers/:id error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

/* ========================================================
   TRACKING DASHBOARD STATS
   ======================================================== */

router.get("/dashboard-stats", async (req, res) => {
  try {
    const companyId = companyIdFromReq(req);
    const [[jobsCount]] = await db.promise().query(
      "SELECT COUNT(*) AS total FROM jobs WHERE company_id = ?",
      [companyId]
    );
    const [[opsCount]] = await db.promise().query(
      `SELECT COUNT(*) AS total FROM job_operations jo
       INNER JOIN jobs j ON jo.job_id = j.id WHERE j.company_id = ?`,
      [companyId]
    );
    const [[driversCount]] = await db.promise().query(
      "SELECT COUNT(*) AS total FROM drivers WHERE company_id = ? AND active_status = 'Y'",
      [companyId]
    );
    const [[pendingOps]] = await db.promise().query(
      `SELECT COUNT(*) AS total FROM job_operations jo
       INNER JOIN jobs j ON jo.job_id = j.id
       WHERE j.company_id = ? AND (jo.status = 'pending' OR jo.status IS NULL OR jo.status = '')`,
      [companyId]
    );
    return res.json({
      success: true,
      data: {
        jobs: Number(jobsCount.total || 0),
        operations: Number(opsCount.total || 0),
        activeDrivers: Number(driversCount.total || 0),
        pendingOperations: Number(pendingOps.total || 0),
      },
    });
  } catch (error) {
    console.error("GET /dashboard-stats error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

export default router;
