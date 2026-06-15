import db from "../config/db.js";

async function grantAccess() {
    const email = "sk@gmail.com";
    const conn = db.promise();
    try {
        // 1. Get user ID
        const [users] = await conn.query("SELECT id FROM super_admins WHERE email = ?", [email]);
        if (users.length === 0) {
            console.error(`User with email ${email} not found.`);
            process.exit(1);
        }
        const userId = users[0].id;

        // 2. Get Owner role ID
        const [roles] = await conn.query("SELECT id FROM super_admin_roles WHERE name = 'Owner'");
        if (roles.length === 0) {
            console.error("Owner role not found. RBAC might not be initialized.");
            process.exit(1);
        }
        const roleId = roles[0].id;

        // 3. Grant access
        await conn.query(
            "INSERT INTO super_admin_user_roles (user_id, role_id) VALUES (?, ?) ON DUPLICATE KEY UPDATE role_id = ?",
            [userId, roleId, roleId]
        );

        console.log(`✅ Successfully granted full access (Owner role) to ${email} (ID: ${userId})`);
    } catch (err) {
        console.error("Error granting access:", err);
    } finally {
        process.exit();
    }
}

grantAccess();
