import express from "express";
import db from "../config/db.js";
import moment from "moment";
import { getCache, setCache } from "../utils/cache.js";

const router = express.Router();



// Calculate days difference (inclusive)
const calculateDays = (start, end) => {
    const s = moment(start);
    const e = moment(end);
    return e.diff(s, "days") + 1;
};

router.post("/calculate-price", async (req, res) => {
    try {
        const { product_id, dropoff_date, return_date } = req.body;

        if (!product_id || !dropoff_date || !return_date) {
            return res.status(400).json({ success: false });
        }

        const cacheKey = `price:${product_id}:${dropoff_date}:${return_date}:${req.companyId || 1}`;

        // ✅ 1. CACHE CHECK
        const cached = getCache(cacheKey);
        if (cached) {
            return res.json({
                success: true,
                ...cached,
                cached: true
            });
        }

        // 🔽 YOUR EXISTING LOGIC (UNCHANGED)
        const start = moment(dropoff_date, "YYYY-MM-DD HH:mm");
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
                `SELECT * FROM parking_product_price_bands 
                 WHERE product_id=? AND month=? AND year=? AND company_id=? LIMIT 1`,
                [product_id, monthName, year, req.companyId || 1]
            );

            if (rows.length) {
                bandRow = rows;
                break;
            }

            bandMonth.subtract(1, "month");
        }

        if (!bandRow.length) {
            return res.json({ success: false });
        }

        const bandName = bandRow[0][`day_${dayOfMonth}`];

        const [priceRow] = await db.promise().query(
            `SELECT * FROM parking_product_price_global_bands 
             WHERE product_id=? AND band_name=? AND company_id=? LIMIT 1`,
            [product_id, bandName, req.companyId || 1]
        );

        if (!priceRow.length) {
            return res.json({ success: false });
        }

        const basePrice =
            priceRow[0][`day_${days}`] ?? priceRow[0]["day_31+"];

        const payload = {
            hours,
            days,
            band: bandName,
            total_price: parseFloat(basePrice).toFixed(2)
        };

        // ✅ 2. SAVE TO CACHE (5 minutes)
        setCache(cacheKey, payload, 300);

        res.json({
            success: true,
            ...payload,
            cached: false
        });

    } catch (error) {
        console.error("Pricing error:", error);
        res.status(500).json({ success: false });
    }
});

// router.get("/parking-product", async (req, res) => {
//     const cacheKey = "products:list";

//     const cached = getCache(cacheKey);
//     if (cached) {
//         return res.json({ success: true, data: cached, cached: true });
//     }

//     const sql = `
//         SELECT p.*
//         FROM parking_products p
//         WHERE p.is_active = 1
//           AND EXISTS (
//               SELECT 1 
//               FROM parking_product_price_bands b
//               WHERE b.product_id = p.id
//           )
//     `;

//     db.query(sql, (err, results) => {
//         if (err) {
//             return res.status(500).json({ success: false });
//         }

//         const formatted = results.map(p => {
//             if (p.image_data) {
//                 p.image_data = `data:image/jpeg;base64,${p.image_data.toString("base64")}`;
//             }
//             return p;
//         });

//         // ✅ CACHE FOR 10 MIN
//         setCache(cacheKey, formatted, 600);

//         res.json({ success: true, data: formatted, cached: false });
//     });
// });


// GET SINGLE PRODUCT
router.post("/parking-product", async (req, res) => {
    try {
        const { dropDate, returnDate, airport } = req.body;

        if (!dropDate || !returnDate || !airport) {
            return res.status(400).json({
                success: false,
                message: "Missing dropDate, returnDate or airport"
            });
        }

        // ✅ Extract time only (HH:MM:SS)
        const dropTime = dropDate.split(" ")[1] + ":00";
        const returnTime = returnDate.split(" ")[1] + ":00";

        console.log("Drop Time:", dropTime);
        console.log("Return Time:", returnTime);
        console.log("Airport:", airport);

        const sql = `
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
      AND airport_name = ?
      AND is_active = 1
      AND company_id = ?
    `;

        db.query(
            sql,
            [
                dropTime, dropTime, dropTime,     // For drop time
                returnTime, returnTime, returnTime, // For return time
                airport,
                req.companyId || 1
            ],
            (err, results) => {
                if (err) {
                    console.error("SQL ERROR:", err);
                    return res.status(500).json({
                        success: false,
                        error: err.message
                    });
                }

                const formatted = results.map(p => {
                    if (p.image_data) {
                        p.image_data = `data:image/jpeg;base64,${p.image_data.toString("base64")}`;
                    }
                    return p;
                });

                res.json({
                    success: true,
                    data: formatted
                });
            }
        );

    } catch (error) {
        console.error("SERVER ERROR:", error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});


router.get("/parking-product/:id", async (req, res) => {
    const { id } = req.params;
    const cacheKey = `product:${id}:${req.companyId || 1}`;

    const cached = getCache(cacheKey);
    if (cached) {
        return res.json({ success: true, data: cached, cached: true });
    }

    const sql = "SELECT * FROM parking_products WHERE id=? AND company_id=? LIMIT 1";
    db.query(sql, [id, req.companyId || 1], (err, results) => {
        if (err || !results.length) {
            return res.status(404).json({ success: false });
        }

        const product = results[0];

        product.image_url = product.image_url
            ? `${req.protocol}://${req.get("host")}${product.image_url}`
            : null;

        // ✅ CACHE 10 MIN
        setCache(cacheKey, product, 600);

        res.json({ success: true, data: product, cached: false });
    });
});

router.get("/parking-product/details/:id", (req, res) => {
    const { id } = req.params;

    const sql = `
        SELECT 
            product_name,
            service_provider,
            service_type,
            image_url,
            product_overview,
            dropoff_procedure,
            directions AS return_procedure,
            airport_charges,
            booking_fees,
            recommended,
            product_extra,
            status
        FROM parking_products 
        WHERE id = ? AND company_id = ? LIMIT 1
    `;

    db.query(sql, [id, req.companyId || 1], (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).json({
                success: false,
                message: "Server error"
            });
        }

        if (results.length === 0) {
            return res.status(404).json({
                success: false,
                message: "No product found"
            });
        }

        res.status(200).json({
            success: true,
            product: results[0]
        });
    });
});

// ================= GLOBAL BANDS =================

// GET global bands for a product
router.get("/global-bands/:product_id", async (req, res) => {
    try {
        const { product_id } = req.params;
        const [rows] = await db.promise().query(
            "SELECT * FROM parking_product_price_global_bands WHERE product_id = ?",
            [product_id]
        );
        res.json(rows);
    } catch (error) {
        console.error("GET global-bands error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// POST create global band
router.post("/global-bands", async (req, res) => {
    try {
        const { product_id, band_name, increment_value, days } = req.body;
        const company_id = req.companyId || 1;

        // Map days to day_1 ... day_30
        const dayColumns = [];
        const dayValues = [];
        const placeholders = [];

        // Up to 30 days are handled by parking_product_price_global_bands
        for (let i = 0; i < 30; i++) {
            if (days[i] !== undefined && days[i] !== "") {
                dayColumns.push(`day_${i + 1}`);
                dayValues.push(Number(days[i]));
                placeholders.push("?");
            }
        }

        const sql = `
            INSERT INTO parking_product_price_global_bands 
            (company_id, product_id, band_name, increment_value ${dayColumns.length > 0 ? ", " + dayColumns.join(", ") : ""})
            VALUES (?, ?, ?, ? ${placeholders.length > 0 ? ", " + placeholders.join(", ") : ""})
        `;

        const values = [company_id, product_id, band_name, increment_value || 0, ...dayValues];

        const [result] = await db.promise().query(sql, values);

        res.json({ success: true, id: result.insertId });
    } catch (error) {
        console.error("POST global-bands error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// PUT update global band
router.put("/global-bands/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const { band_name, increment_value, days } = req.body;

        const updates = ["band_name = ?", "increment_value = ?"];
        const values = [band_name, increment_value || 0];

        // Up to 30 days
        for (let i = 0; i < 30; i++) {
            if (days[i] !== undefined && days[i] !== "") {
                updates.push(`day_${i + 1} = ?`);
                values.push(Number(days[i]));
            }
        }

        if (updates.length > 0) {
            const sql = `UPDATE parking_product_price_global_bands SET ${updates.join(", ")} WHERE id = ?`;
            values.push(id);
            await db.promise().query(sql, values);
        }

        res.json({ success: true, message: "Global band updated successfully" });
    } catch (error) {
        console.error("PUT global-bands error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// DELETE global band
router.delete("/global-bands/:id", async (req, res) => {
    try {
        const { id } = req.params;
        await db.promise().query("DELETE FROM parking_product_price_global_bands WHERE id = ?", [id]);
        res.json({ success: true, message: "Global band deleted" });
    } catch (error) {
        console.error("DELETE global-bands error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
});


// ================= PRICE BANDS =================

// GET all price bands for a product
router.get("/price-bands/:product_id", async (req, res) => {
    try {
        const { product_id } = req.params;
        const [rows] = await db.promise().query(
            "SELECT * FROM parking_product_price_bands WHERE product_id = ? ORDER BY year DESC, month ASC",
            [product_id]
        );
        res.json(rows);
    } catch (error) {
        console.error("GET price-bands error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// POST create a new price band (month/year)
router.post("/price-bands", async (req, res) => {
    try {
        const { product_id, month, year } = req.body;
        const company_id = req.companyId || 1;

        const sql = `
            INSERT INTO parking_product_price_bands 
            (product_id, company_id, month, year) 
            VALUES (?, ?, ?, ?)
        `;
        const [result] = await db.promise().query(sql, [product_id, company_id, month, year]);

        res.json({ success: true, id: result.insertId });
    } catch (error) {
        console.error("POST price-bands error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// PUT update price band days
router.put("/price-bands/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const { bandRow } = req.body; // Array of band names like ["A", "B", ...]

        const updates = [];
        const values = [];

        // Up to 31 days
        for (let i = 0; i < 31 && i < bandRow.length; i++) {
            if (bandRow[i] !== undefined && bandRow[i] !== "") {
                updates.push(`day_${i + 1} = ?`);
                values.push(bandRow[i]);
            }
        }

        if (updates.length === 0) {
            return res.json({ success: true, message: "No days updated" });
        }

        const sql = `UPDATE parking_product_price_bands SET ${updates.join(", ")} WHERE id = ?`;
        values.push(id);

        await db.promise().query(sql, values);

        res.json({ success: true, message: "Price band updated successfully" });
    } catch (error) {
        console.error("PUT price-bands error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// DELETE price band
router.delete("/price-bands/:id", async (req, res) => {
    try {
        const { id } = req.params;
        await db.promise().query("DELETE FROM parking_product_price_bands WHERE id = ?", [id]);
        res.json({ success: true, message: "Price band deleted" });
    } catch (error) {
        console.error("DELETE price-bands error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
});

export default router;
