import db from "../config/db.js";

db.query("SELECT * FROM airports", (err, results) => {
    if (err) console.error("Error:", err);
    else console.log(results);
    process.exit();
});
