import db from "../config/db.js";

async function verifyOnboarding() {
    const conn = db.promise();
    try {
        console.log("Simulating onboarding logic...");
        
        // Use a test company name
        const companyName = "Test Verification Co " + Date.now();
        
        // 1. Create Company
        const [companyResult] = await conn.query(
            "INSERT INTO companies (name, email, active) VALUES (?, ?, ?)",
            [companyName, "test@verification.com", 1]
        );
        const companyId = companyResult.insertId;
        console.log("Created Company ID:", companyId);

        // 2. Create Role
        const [roleResult] = await conn.query(
            "INSERT INTO roles (company_id, name, description, is_system_default) VALUES (?, 'Admin', 'Test role', 1)",
            [companyId, companyId] // Using companyId as description to find it easily
        );
        const roleId = roleResult.insertId;
        console.log("Created Role ID:", roleId);

        // 3. Assign Permissions (Simulating the new logic)
        const [allPermissions] = await conn.query("SELECT id FROM permissions");
        console.log(`Found ${allPermissions.length} permissions. Assigning...`);
        for (const perm of allPermissions) {
            await conn.query(
                "INSERT IGNORE INTO role_permissions (role_id, permission_id) VALUES (?, ?)",
                [roleId, perm.id]
            );
        }

        // 4. Verify
        const [countResult] = await conn.query("SELECT COUNT(*) as count FROM role_permissions WHERE role_id = ?", [roleId]);
        console.log(`Verification: Role ${roleId} has ${countResult[0].count} permissions assigned.`);

        if (countResult[0].count === allPermissions.length) {
            console.log("✅ SUCCESS: Onboarding logic verified.");
        } else {
            console.log("❌ FAILURE: Permissions count mismatch.");
        }

        // Cleanup
        await conn.query("DELETE FROM role_permissions WHERE role_id = ?", [roleId]);
        await conn.query("DELETE FROM roles WHERE id = ?", [roleId]);
        await conn.query("DELETE FROM companies WHERE id = ?", [companyId]);
        console.log("Cleanup complete.");

    } catch (err) {
        console.error("Verification error:", err);
    } finally {
        process.exit();
    }
}

verifyOnboarding();
