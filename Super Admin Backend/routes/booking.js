import express from "express";
import db from "../config/db.js";

const router = express.Router();

// ✅ FETCH BOOKING BY ID (USED BY RETRY PAYMENT PAGE)
router.get("/booking/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const [rows] = await db.promise().query(
      "SELECT * FROM parking_bookings WHERE id = ?",
      [id]
    );

    if (!rows.length) {
      return res.status(404).json({
        success: false,
        message: "Booking not found"
      });
    }

    return res.json({
      success: true,
      data: rows[0]
    });

  } catch (error) {
    console.error("Fetch booking error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
});

export default router;
