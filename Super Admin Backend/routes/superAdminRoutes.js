import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import db from "../config/db.js";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY
    ? Buffer.from(process.env.ENCRYPTION_KEY, 'hex')
    : crypto.scryptSync('saas-super-admin-secret', 'parking-salt', 32);

function encryptField(text) {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-gcm', ENCRYPTION_KEY, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag().toString('hex');
    return { iv: iv.toString('hex'), encrypted: encrypted + ':' + authTag };
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure multer for company logo uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = path.join(__dirname, "../uploads/tmp");
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'logo-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || "super-admin-secret-key";

// --- AUTH ---

// --- RBAC INITIALIZATION ---

const initRBAC = async () => {
    try {
        const connection = await db.promise().getConnection();
        try {
            // 1. Create super_admin_permissions table
            await connection.query(`
                CREATE TABLE IF NOT EXISTS super_admin_permissions (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    name VARCHAR(100) NOT NULL UNIQUE,
                    description TEXT,
                    module VARCHAR(100)
                )
            `);

            // 2. Create super_admin_roles table
            await connection.query(`
                CREATE TABLE IF NOT EXISTS super_admin_roles (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    name VARCHAR(100) NOT NULL UNIQUE,
                    description TEXT,
                    is_system_default TINYINT(1) DEFAULT 0
                )
            `);

            // 3. Create super_admin_role_permissions table
            await connection.query(`
                CREATE TABLE IF NOT EXISTS super_admin_role_permissions (
                    role_id INT,
                    permission_id INT,
                    PRIMARY KEY (role_id, permission_id),
                    FOREIGN KEY (role_id) REFERENCES super_admin_roles(id) ON DELETE CASCADE,
                    FOREIGN KEY (permission_id) REFERENCES super_admin_permissions(id) ON DELETE CASCADE
                )
            `);

            // 4. Create super_admin_user_roles table
            await connection.query(`
                CREATE TABLE IF NOT EXISTS super_admin_user_roles (
                    user_id INT,
                    role_id INT,
                    PRIMARY KEY (user_id, role_id),
                    FOREIGN KEY (user_id) REFERENCES super_admins(id) ON DELETE CASCADE,
                    FOREIGN KEY (role_id) REFERENCES super_admin_roles(id) ON DELETE CASCADE
                )
            `);

            // 5. Seed Permissions
            const permissions = [
                { name: 'access_overview', description: 'Access Overview Dashboard', module: 'System' },
                { name: 'access_field_mappings', description: 'Access Field Mappings', module: 'System' },
                { name: 'access_companies', description: 'Manage Companies', module: 'Management' },
                { name: 'access_bookings', description: 'View Company Bookings', module: 'Management' },
                { name: 'access_suppliers', description: 'Manage Suppliers', module: 'Management' },
                { name: 'access_airports', description: 'Manage Global Airports', module: 'Management' },
                { name: 'access_access_control', description: 'Manage Super Admin RBAC', module: 'System' },
                { name: 'access_users', description: 'Manage Super Admin Users', module: 'System' },
            ];

            for (const p of permissions) {
                await connection.query(
                    "INSERT IGNORE INTO super_admin_permissions (name, description, module) VALUES (?, ?, ?)",
                    [p.name, p.description, p.module]
                );
            }

            // 6. Seed Default "Owner" Role if not exists
            const [roleRows] = await connection.query("SELECT id FROM super_admin_roles WHERE name = 'Owner' LIMIT 1");
            let ownerRoleId;
            if (roleRows.length === 0) {
                const [result] = await connection.query(
                    "INSERT INTO super_admin_roles (name, description, is_system_default) VALUES ('Owner', 'System Owner with full access', 1)"
                );
                ownerRoleId = result.insertId;

                // Assign all permissions to Owner role
                const [allPerms] = await connection.query("SELECT id FROM super_admin_permissions");
                for (const perm of allPerms) {
                    await connection.query(
                        "INSERT IGNORE INTO super_admin_role_permissions (role_id, permission_id) VALUES (?, ?)",
                        [ownerRoleId, perm.id]
                    );
                }
            } else {
                ownerRoleId = roleRows[0].id;
            }

            // Always ensure Owner role has ALL permissions (including newly added ones)
            const [allPerms] = await connection.query("SELECT id FROM super_admin_permissions");
            for (const perm of allPerms) {
                await connection.query(
                    "INSERT IGNORE INTO super_admin_role_permissions (role_id, permission_id) VALUES (?, ?)",
                    [ownerRoleId, perm.id]
                );
            }

            // 7. Assign Owner role to existing super admins if they have no role
            const [admins] = await connection.query("SELECT id FROM super_admins");
            for (const admin of admins) {
                const [adminRoles] = await connection.query("SELECT role_id FROM super_admin_user_roles WHERE user_id = ?", [admin.id]);
                if (adminRoles.length === 0) {
                    await connection.query("INSERT IGNORE INTO super_admin_user_roles (user_id, role_id) VALUES (?, ?)", [admin.id, ownerRoleId]);
                }
            }

        } finally {
            connection.release();
        }
    } catch (error) {
        console.error("RBAC Init Error:", error);
    }
};

// Initialize on start
initRBAC();

// --- AUTH ---

router.post("/login", async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ success: false, message: "Email and password are required" });
    }

    try {
        const [rows] = await db.promise().query("SELECT * FROM super_admins WHERE email = ? LIMIT 1", [email]);

        if (rows.length === 0) {
            // Check for temporary bypass if production login fails
            if (email === "superadmin@parking.com" && password === "admin123") {
                // Ensure bypass user has a role assigned in our new system
                // (Note: This might fail if user_id 1 doesn't exist, but it's a bypass)
                const [bypassUser] = await db.promise().query("SELECT id FROM super_admins LIMIT 1");
                const userId = bypassUser.length > 0 ? bypassUser[0].id : 1;

                const token = jwt.sign({ id: userId, email: email, role: 'super_admin' }, JWT_SECRET, { expiresIn: '1d' });
                
                // Get permissions for owner role
                const [perms] = await db.promise().query(`
                    SELECT DISTINCT p.name 
                    FROM super_admin_permissions p
                    JOIN super_admin_role_permissions rp ON p.id = rp.permission_id
                    JOIN super_admin_roles r ON rp.role_id = r.id
                    WHERE r.name = 'Owner'
                `);

                return res.json({
                    success: true,
                    token,
                    user: { id: userId, name: "Super Admin", email: email, permissions: perms.map(p => p.name) }
                });
            }
            return res.status(401).json({ success: false, message: "Invalid credentials" });
        }

        const admin = rows[0];
        let isMatch = false;
        if (admin.password.startsWith("$2b$") || admin.password.startsWith("$2a$")) {
            isMatch = await bcrypt.compare(password, admin.password);
        } else {
            isMatch = (password === admin.password);
        }

        if (!isMatch) {
            return res.status(401).json({ success: false, message: "Invalid credentials" });
        }

        // Fetch permissions for the user
        const [perms] = await db.promise().query(`
            SELECT DISTINCT p.name 
            FROM super_admin_permissions p
            JOIN super_admin_role_permissions rp ON p.id = rp.permission_id
            JOIN super_admin_user_roles ur ON rp.role_id = ur.role_id
            WHERE ur.user_id = ?
        `, [admin.id]);

        const token = jwt.sign({ id: admin.id, email: admin.email, role: 'super_admin' }, JWT_SECRET, { expiresIn: '1d' });

        res.json({
            success: true,
            token,
            user: { 
                id: admin.id, 
                name: admin.name, 
                email: admin.email,
                permissions: perms.map(p => p.name)
            }
        });
    } catch (error) {
        console.error("Super Admin Login Error:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
});

router.get("/my-permissions", async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ success: false, message: "Unauthorized" });

    const token = authHeader.split(" ")[1];
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        const [perms] = await db.promise().query(`
            SELECT DISTINCT p.name 
            FROM super_admin_permissions p
            JOIN super_admin_role_permissions rp ON p.id = rp.permission_id
            JOIN super_admin_user_roles ur ON rp.role_id = ur.role_id
            WHERE ur.user_id = ?
        `, [decoded.id]);

        res.json({ success: true, permissions: perms.map(p => p.name) });
    } catch (error) {
        res.status(401).json({ success: false, message: "Invalid token" });
    }
});

// --- RBAC MANAGEMENT ---

router.get("/access-control/permissions", async (req, res) => {
    try {
        const [rows] = await db.promise().query("SELECT * FROM super_admin_permissions ORDER BY module, id");
        res.json({ success: true, data: rows });
    } catch (error) {
        res.status(500).json({ success: false, message: "Failed to fetch permissions" });
    }
});

router.get("/access-control/roles", async (req, res) => {
    try {
        const [roles] = await db.promise().query("SELECT * FROM super_admin_roles ORDER BY id");
        
        for (const role of roles) {
            const [perms] = await db.promise().query(
                "SELECT permission_id FROM super_admin_role_permissions WHERE role_id = ?",
                [role.id]
            );
            role.permissions = perms.map(p => p.permission_id);
        }

        res.json({ success: true, data: roles });
    } catch (error) {
        res.status(500).json({ success: false, message: "Failed to fetch roles" });
    }
});

router.post("/access-control/roles", async (req, res) => {
    const { name, description, permissions = [] } = req.body;
    if (!name) return res.status(400).json({ success: false, message: "Name is required" });

    try {
        const [result] = await db.promise().query(
            "INSERT INTO super_admin_roles (name, description) VALUES (?, ?)",
            [name, description || null]
        );
        const roleId = result.insertId;

        for (const pid of permissions) {
            await db.promise().query(
                "INSERT INTO super_admin_role_permissions (role_id, permission_id) VALUES (?, ?)",
                [roleId, pid]
            );
        }

        res.json({ success: true, message: "Role created successfully" });
    } catch (error) {
        res.status(500).json({ success: false, message: "Failed to create role" });
    }
});

router.put("/access-control/roles/:id", async (req, res) => {
    const { id } = req.params;
    const { name, description, permissions = [] } = req.body;

    try {
        await db.promise().query(
            "UPDATE super_admin_roles SET name = ?, description = ? WHERE id = ?",
            [name, description || null, id]
        );

        await db.promise().query("DELETE FROM super_admin_role_permissions WHERE role_id = ?", [id]);
        for (const pid of permissions) {
            await db.promise().query(
                "INSERT INTO super_admin_role_permissions (role_id, permission_id) VALUES (?, ?)",
                [id, pid]
            );
        }

        res.json({ success: true, message: "Role updated successfully" });
    } catch (error) {
        res.status(500).json({ success: false, message: "Failed to update role" });
    }
});

router.delete("/access-control/roles/:id", async (req, res) => {
    const { id } = req.params;
    try {
        const [role] = await db.promise().query("SELECT is_system_default FROM super_admin_roles WHERE id = ?", [id]);
        if (!role.length) return res.status(404).json({ success: false, message: "Role not found" });
        if (role[0].is_system_default) return res.status(403).json({ success: false, message: "Cannot delete system default role" });

        await db.promise().query("DELETE FROM super_admin_role_permissions WHERE role_id = ?", [id]);
        await db.promise().query("DELETE FROM super_admin_user_roles WHERE role_id = ?", [id]);
        await db.promise().query("DELETE FROM super_admin_roles WHERE id = ?", [id]);

        res.json({ success: true, message: "Role deleted successfully" });
    } catch (error) {
        res.status(500).json({ success: false, message: "Failed to delete role" });
    }
});

// --- USER MANAGEMENT ---

router.get("/users", async (req, res) => {
    try {
        const [users] = await db.promise().query(`
            SELECT u.id, u.name, u.email, u.created_at, r.name as role_name, r.id as role_id
            FROM super_admins u
            LEFT JOIN super_admin_user_roles ur ON u.id = ur.user_id
            LEFT JOIN super_admin_roles r ON ur.role_id = r.id
            ORDER BY u.id DESC
        `);
        res.json({ success: true, data: users });
    } catch (error) {
        console.error("Fetch Users Error:", error);
        res.status(500).json({ success: false, message: "Failed to fetch users" });
    }
});

router.post("/users", async (req, res) => {
    const { name, email, password, role_id } = req.body;

    if (!name || !email || !password || !role_id) {
        return res.status(400).json({ success: false, message: "All fields are required" });
    }

    const connection = await db.promise().getConnection();
    try {
        await connection.beginTransaction();

        const hashedPassword = await bcrypt.hash(password, 10);
        
        const [userResult] = await connection.query(
            "INSERT INTO super_admins (name, email, password) VALUES (?, ?, ?)",
            [name, email, hashedPassword]
        );
        const userId = userResult.insertId;

        await connection.query(
            "INSERT INTO super_admin_user_roles (user_id, role_id) VALUES (?, ?)",
            [userId, role_id]
        );

        await connection.commit();
        res.json({ success: true, message: "User created successfully" });
    } catch (error) {
        await connection.rollback();
        console.error("Create User Error:", error);
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ success: false, message: "Email already exists" });
        }
        res.status(500).json({ success: false, message: "Failed to create user" });
    } finally {
        connection.release();
    }
});

router.delete("/users/:id", async (req, res) => {
    const { id } = req.params;
    
    // Auth check should ideally be in middleware, but extracting here for now
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ success: false, message: "Unauthorized" });
    
    try {
        const token = authHeader.split(" ")[1];
        const decoded = jwt.verify(token, JWT_SECRET);
        
        if (parseInt(id) === parseInt(decoded.id)) {
            return res.status(400).json({ success: false, message: "You cannot delete your own account" });
        }

        await db.promise().query("DELETE FROM super_admin_user_roles WHERE user_id = ?", [id]);
        await db.promise().query("DELETE FROM super_admins WHERE id = ?", [id]);

        res.json({ success: true, message: "User deleted successfully" });
    } catch (error) {
        console.error("Delete User Error:", error);
        res.status(500).json({ success: false, message: "Failed to delete user" });
    }
});


// --- FIELD MAPPINGS ---

router.get("/field-mappings", async (req, res) => {
    try {
        const [rows] = await db.promise().query("SELECT * FROM field_mappings ORDER BY id ASC");

        // Parse JSON strings for aliases
        const mappings = rows.map(row => {
            let alias = [];
            try {
                const parsed = JSON.parse(row.alias || "[]");
                alias = Array.isArray(parsed) ? parsed : [];
            } catch (_) {
                alias = [];
            }
            return { ...row, alias };
        });

        res.json({ success: true, data: mappings });
    } catch (error) {
        console.error("Fetch Field Mappings Error:", error);
        res.status(500).json({ success: false, message: "Failed to fetch field mappings" });
    }
});

router.get("/available-columns", async (req, res) => {
    try {
        // 1. Get all columns from parking_bookings
        const [columns] = await db.promise().query("SHOW COLUMNS FROM parking_bookings");
        const allColumns = columns.map(c => c.Field);

        // 2. Get currently mapped columns
        const [mappings] = await db.promise().query("SELECT db_column FROM field_mappings");
        const mappedColumns = mappings.map(m => m.db_column);

        // 3. Filter out mapped and system columns
        const systemColumns = ['id', 'created_at', 'updated_at', 'status', 'company_id'];
        const available = allColumns.filter(col => 
            !mappedColumns.includes(col) && 
            !systemColumns.includes(col.toLowerCase())
        );

        res.json({ success: true, data: available });
    } catch (error) {
        console.error("Fetch Available Columns Error:", error);
        res.status(500).json({ success: false, message: "Failed to fetch available columns" });
    }
});

router.post("/field-mappings/add", async (req, res) => {
    const { db_column } = req.body;

    if (!db_column) {
        return res.status(400).json({ success: false, message: "Database column is required" });
    }

    try {
        await db.promise().query("INSERT INTO field_mappings (db_column, alias) VALUES (?, '[]')", [db_column]);
        res.json({ success: true, message: "Field mapping added successfully" });
    } catch (error) {
        console.error("Add Field Mapping Error:", error);
        res.status(500).json({ success: false, message: "Failed to add field mapping" });
    }
});

router.post("/field-mappings/update", async (req, res) => {
    const { id, aliases } = req.body; // aliases is an array

    if (!id || !Array.isArray(aliases)) {
        return res.status(400).json({ success: false, message: "Invalid request data" });
    }

    try {
        const aliasString = JSON.stringify(aliases);
        await db.promise().query("UPDATE field_mappings SET alias = ? WHERE id = ?", [aliasString, id]);
        res.json({ success: true, message: "Field mapping updated successfully" });
    } catch (error) {
        console.error("Update Field Mapping Error:", error);
        res.status(500).json({ success: false, message: "Failed to update field mapping" });
    }
});

// --- COMPANIES ---

router.get("/companies", async (req, res) => {
    try {
        const [rows] = await db.promise().query("SELECT * FROM companies ORDER BY id DESC");
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error("Fetch Companies Error:", error);
        res.status(500).json({ success: false, message: "Failed to fetch companies" });
    }
});

router.get("/companies/:id", async (req, res) => {
    const { id } = req.params;
    try {
        // 1. Fetch Company basic details
        const [companyRows] = await db.promise().query("SELECT * FROM companies WHERE id = ?", [id]);
        if (companyRows.length === 0) {
            return res.status(404).json({ success: false, message: "Company not found" });
        }
        const company = companyRows[0];

        // 2. Fetch Email Parsing info
        const [emailParsingRows] = await db.promise().query("SELECT * FROM company_parsing_email WHERE company_id = ?", [id]);
        company.parsing_info = emailParsingRows[0] || null;

        // 3. Fetch Company Suppliers
        const [supplierRows] = await db.promise().query(`
            SELECT cs.*, s.supplier_name, s.supplier_email, s.supplier_contact, s.from_email_address as master_from_email
            FROM company_suppliers cs
            JOIN suppliers s ON cs.supplier_id = s.supplier_id
            WHERE cs.company_id = ?
            ORDER BY cs.id DESC
        `, [id]);
        const [[{ total_fields }]] = await db.promise().query("SELECT COUNT(*) as total_fields FROM field_mappings");
        company.suppliers = supplierRows.map(row => {
            let hasMappedFields = false;
            let mappedCount = 0;
            try {
                const mapping = typeof row.email_mapping === 'string'
                    ? JSON.parse(row.email_mapping)
                    : (row.email_mapping || {});
                const values = Object.values(mapping).filter(v => typeof v === 'string' && v.trim().length > 0);
                mappedCount = values.length;
                hasMappedFields = mappedCount > 0;
            } catch (_) {}
            return { ...row, has_mapping: hasMappedFields, mapped_count: mappedCount, total_fields };
        });

        res.json({ success: true, data: company });
    } catch (error) {
        console.error("Fetch Company Details Error:", error);
        res.status(500).json({ success: false, message: "Failed to fetch company details" });
    }
});

router.patch("/companies/:id", async (req, res) => {
    const { id } = req.params;
    const {
        name, email, domain, mobile_no, address,
        support_email_address, support_contact_no,
        business_type, business_catrgory, office_hours, ref_prefix,
        registration_no, owner_name
    } = req.body;

    try {
        await db.promise().query(
            `UPDATE companies
             SET name = ?, email = ?, domain = ?, mobile_no = ?, address = ?,
                 support_email_address = ?, support_contact_no = ?,
                 business_type = ?, business_catrgory = ?, office_hours = ?,
                 ref_prefix = ?, registration_no = ?, owner_name = ?
             WHERE id = ?`,
            [
                name, email, domain || null, mobile_no || null, address || null,
                support_email_address || null, support_contact_no || null,
                business_type || 'individual', business_catrgory || 'portal',
                office_hours || null, ref_prefix || 'BKG',
                registration_no || null, owner_name || null, id
            ]
        );
        res.json({ success: true, message: "Company updated successfully" });
    } catch (error) {
        console.error("Update Company Error:", error);
        res.status(500).json({ success: false, message: "Failed to update company" });
    }
});

router.get("/companies/:id/email-settings", async (req, res) => {
    const { id } = req.params;
    try {
        const [rows] = await db.promise().query(
            `SELECT id, smtp_host, smtp_port, smtp_username, smtp_encryption,
                    from_email, from_name, reply_email, cc_email, bcc_email, active
             FROM company_email_settings WHERE company_id = ? LIMIT 1`,
            [id]
        );
        res.json({ success: true, data: rows[0] || null });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

router.put("/companies/:id/email-settings", async (req, res) => {
    const { id } = req.params;
    const { smtp_host, smtp_port, smtp_username, smtp_password, smtp_encryption, from_email, from_name, reply_email, cc_email, bcc_email } = req.body;

    try {
        const [existing] = await db.promise().query("SELECT id FROM company_email_settings WHERE company_id = ?", [id]);
        const nonSecretFields = [smtp_host, smtp_port || 587, smtp_username, smtp_encryption || 'tls', from_email, from_name || null, reply_email || null, cc_email || null, bcc_email || null];

        if (existing.length > 0) {
            if (smtp_password) {
                const { iv: passIv, encrypted: passEnc } = encryptField(smtp_password);
                await db.promise().query(
                    `UPDATE company_email_settings SET smtp_host=?, smtp_port=?, smtp_username=?, smtp_password=?, smtp_password_iv=?, smtp_encryption=?, from_email=?, from_name=?, reply_email=?, cc_email=?, bcc_email=? WHERE company_id=?`,
                    [...nonSecretFields.slice(0, 3), passEnc, passIv, ...nonSecretFields.slice(3), id]
                );
            } else {
                await db.promise().query(
                    `UPDATE company_email_settings SET smtp_host=?, smtp_port=?, smtp_username=?, smtp_encryption=?, from_email=?, from_name=?, reply_email=?, cc_email=?, bcc_email=? WHERE company_id=?`,
                    [...nonSecretFields, id]
                );
            }
        } else {
            const { iv: passIv, encrypted: passEnc } = encryptField(smtp_password || '');
            await db.promise().query(
                `INSERT INTO company_email_settings (company_id, smtp_host, smtp_port, smtp_username, smtp_password, smtp_password_iv, smtp_encryption, from_email, from_name, reply_email, cc_email, bcc_email, active, entered_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Y', 0)`,
                [id, smtp_host, smtp_port || 587, smtp_username, passEnc, passIv, smtp_encryption || 'tls', from_email, from_name || null, reply_email || null, cc_email || null, bcc_email || null]
            );
        }
        res.json({ success: true, message: "Email settings updated successfully" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

router.get("/companies/:id/payment-gateway", async (req, res) => {
    const { id } = req.params;
    try {
        const [rows] = await db.promise().query(
            "SELECT id, acc_name, public_key, mode, active FROM company_payment_gateway WHERE company_id = ? LIMIT 1",
            [id]
        );
        res.json({ success: true, data: rows[0] || null });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

router.put("/companies/:id/payment-gateway", async (req, res) => {
    const { id } = req.params;
    const { acc_name, public_key, key_secret, webhook_secret, mode } = req.body;

    try {
        const [existing] = await db.promise().query("SELECT id FROM company_payment_gateway WHERE company_id = ?", [id]);

        if (existing.length > 0) {
            if (key_secret) {
                const { iv: secretIv, encrypted: secretEnc } = encryptField(key_secret);
                let webhookEnc = null, webhookIv = null;
                if (webhook_secret) {
                    const { iv, encrypted } = encryptField(webhook_secret);
                    webhookEnc = encrypted; webhookIv = iv;
                }
                await db.promise().query(
                    `UPDATE company_payment_gateway SET acc_name=?, public_key=?, key_secret=?, key_secret_iv=?, webhook_secret=?, webhook_secret_iv=?, mode=? WHERE company_id=?`,
                    [acc_name || 'stripe', public_key, secretEnc, secretIv, webhookEnc, webhookIv, mode || 'test', id]
                );
            } else {
                await db.promise().query(
                    "UPDATE company_payment_gateway SET acc_name=?, public_key=?, mode=? WHERE company_id=?",
                    [acc_name || 'stripe', public_key, mode || 'test', id]
                );
            }
        } else {
            const { iv: secretIv, encrypted: secretEnc } = encryptField(key_secret || '');
            let webhookEnc = null, webhookIv = null;
            if (webhook_secret) {
                const { iv, encrypted } = encryptField(webhook_secret);
                webhookEnc = encrypted; webhookIv = iv;
            }
            await db.promise().query(
                `INSERT INTO company_payment_gateway (acc_name, public_key, key_secret, key_secret_iv, webhook_secret, webhook_secret_iv, mode, active, company_id, entered_by) VALUES (?, ?, ?, ?, ?, ?, ?, 'N', ?, 0)`,
                [acc_name || 'stripe', public_key, secretEnc, secretIv, webhookEnc, webhookIv, mode || 'test', id]
            );
        }
        res.json({ success: true, message: "Payment gateway updated successfully" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

router.patch("/companies/:id/status", async (req, res) => {
    const { id } = req.params;
    const { active, email_parsing } = req.body;

    try {
        // Ensure necessary columns exist
        const [columns] = await db.promise().query("SHOW COLUMNS FROM companies");
        const colNames = columns.map(c => c.Field.toLowerCase());
        
        if (!colNames.includes('active')) {
            await db.promise().query("ALTER TABLE companies ADD COLUMN active TINYINT(1) DEFAULT 1");
        }
        if (!colNames.includes('email_parsing')) {
            await db.promise().query("ALTER TABLE companies ADD COLUMN email_parsing TINYINT(1) DEFAULT 0");
        }

        const updates = [];
        const values = [];

        if (active !== undefined) {
            updates.push("active = ?");
            values.push(active ? 1 : 0);
        }

        if (email_parsing !== undefined) {
            updates.push("email_parsing = ?");
            values.push(email_parsing ? 1 : 0);
        }

        if (updates.length > 0) {
            values.push(id);
            const query = `UPDATE companies SET ${updates.join(", ")} WHERE id = ?`;
            await db.promise().query(query, values);
        }

        res.json({ success: true, message: "Updated successfully" });
    } catch (error) {
        console.error("PATCH companies error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
});

router.delete("/companies/:id", async (req, res) => {
    const { id } = req.params;
    const connection = await db.promise().getConnection();
    try {
        await connection.beginTransaction();

        // 1. Remove user↔role links for all users belonging to this company
        await connection.query(
            "DELETE ur FROM user_roles ur INNER JOIN users u ON ur.user_id = u.id WHERE u.company_id = ?", [id]
        );
        // 2. Delete company users
        await connection.query("DELETE FROM users WHERE company_id = ?", [id]);
        // 3. Delete company roles (and any remaining role↔permission links if no ON DELETE CASCADE)
        await connection.query("DELETE FROM user_roles WHERE role_id IN (SELECT id FROM roles WHERE company_id = ?)", [id]);
        await connection.query("DELETE FROM roles WHERE company_id = ?", [id]);
        // 4. Delete all other company-specific data
        await connection.query("DELETE FROM company_email_settings WHERE company_id = ?", [id]);
        await connection.query("DELETE FROM company_payment_gateway WHERE company_id = ?", [id]);
        await connection.query("DELETE FROM company_suppliers WHERE company_id = ?", [id]);
        await connection.query("DELETE FROM company_parsing_email WHERE company_id = ?", [id]);
        // 5. Finally delete the company itself
        const [result] = await connection.query("DELETE FROM companies WHERE id = ?", [id]);
        if (result.affectedRows === 0) {
            await connection.rollback();
            return res.status(404).json({ success: false, message: "Company not found" });
        }
        await connection.commit();
        res.json({ success: true, message: "Company deleted successfully" });
    } catch (error) {
        await connection.rollback();
        console.error("Delete Company Error:", error);
        res.status(500).json({ success: false, message: "Failed to delete company" });
    } finally {
        connection.release();
    }
});

router.put("/companies/:id/parsing-info", async (req, res) => {
    const { id } = req.params;
    const { company_parsing_email, email_password, email_host } = req.body;

    if (!company_parsing_email || !email_password || !email_host) {
        return res.status(400).json({ success: false, message: "All parsing fields are required" });
    }

    try {
        // Check if company exists first
        const [company] = await db.promise().query("SELECT id FROM companies WHERE id = ?", [id]);
        if (company.length === 0) {
            return res.status(404).json({ success: false, message: "Company not found" });
        }

        // Check if parsing info already exists
        const [existing] = await db.promise().query("SELECT id FROM company_parsing_email WHERE company_id = ?", [id]);

        if (existing.length > 0) {
            // Update
            await db.promise().query(
                "UPDATE company_parsing_email SET company_parsing_email = ?, email_password = ?, email_host = ? WHERE company_id = ?",
                [company_parsing_email, email_password, email_host, id]
            );
        } else {
            // Insert
            await db.promise().query(
                "INSERT INTO company_parsing_email (company_id, company_parsing_email, email_password, email_host) VALUES (?, ?, ?, ?)",
                [id, company_parsing_email, email_password, email_host]
            );
        }

        res.json({ success: true, message: "Parsing information updated successfully" });
    } catch (error) {
        console.error("PUT parsing-info error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
});

router.patch("/companies/:id/logo", upload.single('logo'), async (req, res) => {
    const { id } = req.params;
    
    if (!req.file) {
        return res.status(400).json({ success: false, message: "No logo file uploaded" });
    }

    try {
        const fileData = fs.readFileSync(req.file.path);
        const base64Image = `data:${req.file.mimetype};base64,${fileData.toString('base64')}`;
        const logo_url = base64Image;

        // Cleanup: Delete the temporary uploaded file
        fs.unlinkSync(req.file.path);

        // Optional: Delete old logo from disk if it was a file path
        const [oldRows] = await db.promise().query("SELECT logo_url FROM companies WHERE id = ?", [id]);
        if (oldRows.length > 0 && oldRows[0].logo_url && oldRows[0].logo_url.startsWith('/assets/')) {
            const oldPath = path.join(__dirname, "../../ParkingBoxFrontendAdmin/public", oldRows[0].logo_url);
            if (fs.existsSync(oldPath)) {
                fs.unlinkSync(oldPath);
            }
        }

        await db.promise().query("UPDATE companies SET logo_url = ? WHERE id = ?", [logo_url, id]);
        res.json({ success: true, message: "Logo updated successfully", logo_url });
    } catch (error) {
        console.error("Update Logo Error:", error);
        // Ensure temp file is removed even on error
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
        res.status(500).json({ success: false, message: "Failed to update logo" });
    }
});

router.post("/onboard-company", upload.single('logo'), async (req, res) => {
    const {
        name, email, domain, mobile_no, address,
        support_email_address, support_contact_no,
        business_type, business_catrgory, office_hours, ref_prefix,
        registration_no, owner_name
    } = req.body;

    let emailSettings = null;
    let paymentGateway = null;
    try { emailSettings = req.body.emailSettings ? JSON.parse(req.body.emailSettings) : null; } catch (e) {}
    try { paymentGateway = req.body.paymentGateway ? JSON.parse(req.body.paymentGateway) : null; } catch (e) {}

    let logo_url = null;

    if (req.file) {
        try {
            const fileData = fs.readFileSync(req.file.path);
            logo_url = `data:${req.file.mimetype};base64,${fileData.toString('base64')}`;
            
            // Check if logo exceeds 1.5MB (conservative check for max_allowed_packet)
            if (logo_url.length > 1.5 * 1024 * 1024) {
                fs.unlinkSync(req.file.path);
                return res.status(400).json({ 
                    success: false, 
                    message: "The company logo is too large. Please upload an image smaller than 1MB." 
                });
            }
            
            fs.unlinkSync(req.file.path);
        } catch (err) {
            console.error("Error processing onboarding logo:", err);
            // Don't fail the whole request if just the logo fails, but we should log it
        }
    }

    if (!name || !email) {
        return res.status(400).json({ success: false, message: "Company name and admin email are required" });
    }

    const connection = await db.promise().getConnection();
    try {
        await connection.beginTransaction();

        // 1. Create the company
        let companyId;
        try {
            const [companyResult] = await connection.query(
                `INSERT INTO companies
                 (name, email, domain, mobile_no, address, logo_url, active,
                  support_email_address, support_contact_no,
                  business_type, business_catrgory, office_hours, ref_prefix,
                  registration_no, owner_name)
                 VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    name, email, domain || null, mobile_no || null, address || null, logo_url,
                    support_email_address || null, support_contact_no || null,
                    business_type || 'individual', business_catrgory || 'portal',
                    office_hours || null, ref_prefix || 'BKG',
                    registration_no || null, owner_name || null
                ]
            );
            companyId = companyResult.insertId;
        } catch (err) {
            if (err.code === 'ER_DUP_ENTRY') {
                if (err.sqlMessage.includes('custom_domain')) {
                    throw new Error("This domain is already registered by another company.");
                }
                throw new Error("This company email or details already exist.");
            }
            throw err;
        }

        // 2. Create the default admin user
        const defaultPassword = "Welcome123!";
        const hashedPassword = await bcrypt.hash(defaultPassword, 10);

        let userId;
        try {
            const [userResult] = await connection.query(
                "INSERT INTO users (company_id, name, email, password) VALUES (?, ?, ?, ?)",
                [companyId, "Company Admin", email, hashedPassword]
            );
            userId = userResult.insertId;
        } catch (err) {
            if (err.code === 'ER_DUP_ENTRY') {
                throw new Error("The admin email address is already in use by another user.");
            }
            throw err;
        }

        // 3. Create/Get 'Admin' role for the company
        let [roleRows] = await connection.query("SELECT id FROM roles WHERE company_id = ? AND name = 'Admin' LIMIT 1", [companyId]);
        let roleId;
        if (roleRows.length > 0) {
            roleId = roleRows[0].id;
        } else {
            const [roleResult] = await connection.query("INSERT INTO roles (company_id, name, description, is_system_default) VALUES (?, 'Admin', 'Default administrator role', 1)", [companyId]);
            roleId = roleResult.insertId;
        }

        // 4. Link user to role
        await connection.query("INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)", [userId, roleId]);

        // 5. Grant all permissions to this role
        const [allPermissions] = await connection.query("SELECT id FROM permissions");
        if (allPermissions.length > 0) {
            const values = allPermissions.map(perm => [roleId, perm.id]);
            await connection.query(
                "INSERT IGNORE INTO role_permissions (role_id, permission_id) VALUES ?",
                [values]
            );
        }

        // 6. Insert email settings if provided
        if (emailSettings && emailSettings.smtp_host && emailSettings.smtp_password) {
            const { iv: passIv, encrypted: passEnc } = encryptField(emailSettings.smtp_password);
            await connection.query(
                `INSERT INTO company_email_settings
                 (company_id, smtp_host, smtp_port, smtp_username, smtp_password, smtp_password_iv,
                  smtp_encryption, from_email, from_name, reply_email, cc_email, bcc_email, active, entered_by)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Y', 0)`,
                [
                    companyId, emailSettings.smtp_host, emailSettings.smtp_port || 587,
                    emailSettings.smtp_username, passEnc, passIv,
                    emailSettings.smtp_encryption || 'tls', emailSettings.from_email,
                    emailSettings.from_name || null, emailSettings.reply_email || null,
                    emailSettings.cc_email || null, emailSettings.bcc_email || null
                ]
            );
        }

        // 7. Insert payment gateway if provided
        if (paymentGateway && paymentGateway.public_key && paymentGateway.key_secret) {
            const { iv: secretIv, encrypted: secretEnc } = encryptField(paymentGateway.key_secret);
            let webhookEnc = null, webhookIv = null;
            if (paymentGateway.webhook_secret) {
                const { iv, encrypted } = encryptField(paymentGateway.webhook_secret);
                webhookEnc = encrypted;
                webhookIv = iv;
            }
            await connection.query(
                `INSERT INTO company_payment_gateway
                 (acc_name, public_key, key_secret, key_secret_iv, webhook_secret, webhook_secret_iv,
                  mode, active, company_id, entered_by)
                 VALUES (?, ?, ?, ?, ?, ?, ?, 'N', ?, 0)`,
                [
                    paymentGateway.acc_name || 'stripe', paymentGateway.public_key,
                    secretEnc, secretIv, webhookEnc, webhookIv,
                    paymentGateway.mode || 'test', companyId
                ]
            );
        }

        await connection.commit();

        res.status(201).json({
            success: true,
            message: "Company and admin account created successfully",
            companyId,
            defaultUser: { email, password: defaultPassword }
        });

    } catch (error) {
        await connection.rollback();
        console.error("Onboard Company Error:", error);
        
        // Map specific error messages to 400 status
        const knownErrors = [
            "This domain is already registered",
            "admin email address is already in use",
            "company email or details already exist"
        ];
        
        const isKnown = knownErrors.some(msg => error.message.includes(msg));
        
        res.status(isKnown ? 400 : 500).json({ 
            success: false, 
            message: error.message || "Failed to onboard company" 
        });
    } finally {
        connection.release();
    }
});

// --- SUPPLIERS ---

router.get("/suppliers", async (req, res) => {
    try {
        const [rows] = await db.promise().query(`
            SELECT s.*, 
                   (SELECT GROUP_CONCAT(supplier_from_email SEPARATOR '||') 
                    FROM company_suppliers 
                    WHERE supplier_id = s.supplier_id) as assigned_emails
            FROM suppliers s 
            ORDER BY s.supplier_id DESC
        `);

        const data = rows.map(row => {
            let masterEmails = [];
            try {
                masterEmails = typeof row.from_email_address === 'string' 
                    ? JSON.parse(row.from_email_address) 
                    : (row.from_email_address || []);
            } catch (e) { 
                masterEmails = row.from_email_address ? [row.from_email_address] : []; 
            }

            if (!Array.isArray(masterEmails)) masterEmails = masterEmails ? [masterEmails] : [];

            let assignedEmails = [];
            if (row.assigned_emails) {
                row.assigned_emails.split('||').forEach(e => {
                    try {
                        const parsed = JSON.parse(e);
                        if (Array.isArray(parsed)) assignedEmails.push(...parsed);
                        else assignedEmails.push(e);
                    } catch (err) { 
                        if (e) assignedEmails.push(e); 
                    }
                });
            }

            // Combine and unique
            const allEmails = [...new Set([...masterEmails, ...assignedEmails])].filter(Boolean);
            
            return {
                ...row,
                from_email_address: masterEmails, // Global record emails
                all_sender_emails: allEmails      // Aggregated for display
            };
        });

        res.json({ success: true, data });
    } catch (error) {
        console.error("Fetch Suppliers Error:", error);
        res.status(500).json({ success: false, message: "Failed to fetch suppliers" });
    }
});

router.post("/add-supplier", async (req, res) => {
    const {
        supplier_name,
        from_email_address,
        commission,
    } = req.body;

    if (!supplier_name || !from_email_address) {
        return res.status(400).json({ success: false, message: "Supplier Name and Parsing Email are required" });
    }

    try {
        const finalFromEmail = Array.isArray(from_email_address)
            ? JSON.stringify(from_email_address)
            : JSON.stringify([from_email_address]);

        const [result] = await db.promise().query(
            `INSERT INTO suppliers (
                supplier_name, from_email_address, commission, supplier_active
            ) VALUES (?, ?, ?, 1)`,
            [supplier_name, finalFromEmail, parseFloat(commission || 0)]
        );

        res.json({ success: true, message: "Supplier added to registry successfully", supplierId: result.insertId });
    } catch (error) {
        console.error("Add Supplier Error:", error);
        res.status(500).json({ success: false, message: "Failed to add supplier to registry" });
    }
});

router.get("/suppliers/:id", async (req, res) => {
    const { id } = req.params;
    try {
        const [rows] = await db.promise().query(
            "SELECT * FROM suppliers WHERE supplier_id = ? LIMIT 1",
            [id]
        );
        if (!rows.length) return res.status(404).json({ success: false, message: "Supplier not found" });
        const row = rows[0];
        try {
            row.from_email_address = typeof row.from_email_address === 'string'
                ? JSON.parse(row.from_email_address)
                : row.from_email_address;
        } catch (e) { /* leave as-is */ }
        res.json({ success: true, data: row });
    } catch (error) {
        console.error("Get Supplier Error:", error);
        res.status(500).json({ success: false, message: "Failed to fetch supplier" });
    }
});

router.put("/suppliers/:id", async (req, res) => {
    const { id } = req.params;
    const { supplier_name, from_email_address, commission } = req.body;

    if (!supplier_name || !from_email_address) {
        return res.status(400).json({ success: false, message: "Supplier Name and Parsing Email are required" });
    }

    try {
        const finalFromEmail = Array.isArray(from_email_address)
            ? JSON.stringify(from_email_address)
            : JSON.stringify([from_email_address]);

        await db.promise().query(
            "UPDATE suppliers SET supplier_name = ?, from_email_address = ?, commission = ? WHERE supplier_id = ?",
            [supplier_name, finalFromEmail, parseFloat(commission || 0), id]
        );

        res.json({ success: true, message: "Supplier updated successfully" });
    } catch (error) {
        console.error("Update Supplier Error:", error);
        res.status(500).json({ success: false, message: "Failed to update supplier" });
    }
});

router.delete("/suppliers/:id", async (req, res) => {
    const { id } = req.params;
    try {
        await db.promise().query("DELETE FROM suppliers WHERE supplier_id = ?", [id]);
        res.json({ success: true, message: "Supplier deleted from registry" });
    } catch (error) {
        console.error("Delete Supplier Error:", error);
        res.status(500).json({ success: false, message: "Failed to delete supplier" });
    }
});

// --- COMPANY SUPPLIER ASSOCIATIONS ---

router.get("/companies/:companyId/suppliers", async (req, res) => {
    const { companyId } = req.params;
    try {
        const [rows] = await db.promise().query(`
            SELECT cs.*, s.supplier_name, s.supplier_email, s.supplier_contact
            FROM company_suppliers cs
            JOIN suppliers s ON cs.supplier_id = s.supplier_id
            WHERE cs.company_id = ?
            ORDER BY cs.id DESC
        `, [companyId]);
        const [[{ total_fields }]] = await db.promise().query("SELECT COUNT(*) as total_fields FROM field_mappings");
        const data = rows.map(row => {
            let hasMappedFields = false;
            let mappedCount = 0;
            try {
                const mapping = typeof row.email_mapping === 'string'
                    ? JSON.parse(row.email_mapping)
                    : (row.email_mapping || {});
                const values = Object.values(mapping).filter(v => typeof v === 'string' && v.trim().length > 0);
                mappedCount = values.length;
                hasMappedFields = mappedCount > 0;
            } catch (_) {}
            return { ...row, has_mapping: hasMappedFields, mapped_count: mappedCount, total_fields };
        });
        res.json({ success: true, data });
    } catch (error) {
        console.error("Fetch Company Suppliers Error:", error);
        res.status(500).json({ success: false, message: "Failed to fetch company suppliers" });
    }
});

router.post("/company-suppliers/assign", async (req, res) => {
    const { company_id, supplier_id, supplier_from_email, commission, data_from, syncToRegistry } = req.body;

    if (!company_id || !supplier_id || !supplier_from_email) {
        return res.status(400).json({ success: false, message: "Company ID, Supplier ID, and Supplier From Email are required" });
    }

    try {
        const emailsToAssign = Array.isArray(supplier_from_email) 
            ? supplier_from_email 
            : [supplier_from_email];
        
        const finalEmailJson = JSON.stringify(emailsToAssign);

        // 1. Perform assignment
        const [result] = await db.promise().query(
            `INSERT INTO company_suppliers (company_id, supplier_id, supplier_from_email, active, data_from, commission, booking_count) 
             VALUES (?, ?, ?, 1, ?, ?, 0)`,
            [company_id, supplier_id, finalEmailJson, data_from || 'both', commission || 0]
        );

        // 2. Optional Sync to Master Registry
        if (syncToRegistry) {
            const [sRows] = await db.promise().query("SELECT from_email_address FROM suppliers WHERE supplier_id = ?", [supplier_id]);
            if (sRows.length > 0) {
                let currentMasterEmails = [];
                try {
                    currentMasterEmails = typeof sRows[0].from_email_address === 'string' 
                        ? JSON.parse(sRows[0].from_email_address) 
                        : (sRows[0].from_email_address || []);
                } catch (e) {
                    currentMasterEmails = sRows[0].from_email_address ? [sRows[0].from_email_address] : [];
                }

                if (!Array.isArray(currentMasterEmails)) currentMasterEmails = [currentMasterEmails];

                // Merge new emails into master list
                const updatedMasterEmails = [...new Set([...currentMasterEmails, ...emailsToAssign])].filter(Boolean);
                
                await db.promise().query(
                    "UPDATE suppliers SET from_email_address = ? WHERE supplier_id = ?",
                    [JSON.stringify(updatedMasterEmails), supplier_id]
                );
            }
        }

        res.json({ success: true, message: "Supplier assigned and synced successfully", assignmentId: result.insertId });
    } catch (error) {
        console.error("Assign Supplier Error:", error);
        res.status(500).json({ success: false, message: "Failed to assign supplier to company" });
    }
});

router.put("/company-suppliers/:id", async (req, res) => {
    const { id } = req.params;
    const { active, commission, data_from, supplier_from_email } = req.body;

    try {
        const finalEmail = Array.isArray(supplier_from_email) 
            ? JSON.stringify(supplier_from_email) 
            : JSON.stringify([supplier_from_email]);

        await db.promise().query(
            `UPDATE company_suppliers 
             SET active = ?, commission = ?, data_from = ?, supplier_from_email = ?
             WHERE id = ?`,
            [active, commission, data_from, finalEmail, id]
        );
        res.json({ success: true, message: "Assignment updated successfully" });
    } catch (error) {
        console.error("Update Assignment Error:", error);
        res.status(500).json({ success: false, message: "Failed to update assignment" });
    }
});

router.delete("/company-suppliers/:id", async (req, res) => {
    const { id } = req.params;
    try {
        await db.promise().query("DELETE FROM company_suppliers WHERE id = ?", [id]);
        res.json({ success: true, message: "Supplier unassigned successfully" });
    } catch (error) {
        console.error("Delete Assignment Error:", error);
        res.status(500).json({ success: false, message: "Failed to unassign supplier" });
    }
});

// --- EMAIL MAPPING ---

router.get("/company-suppliers/:id/mapping", async (req, res) => {
    const { id } = req.params;
    try {
        // --- AUTO-MIGRATION CHECK ---
        // Check if the column exists, if not, create it.
        const [columns] = await db.promise().query("SHOW COLUMNS FROM company_suppliers LIKE 'email_mapping'");
        if (columns.length === 0) {
            console.log("Auto-migrating: Adding 'email_mapping' column...");
            await db.promise().query("ALTER TABLE company_suppliers ADD COLUMN email_mapping JSON DEFAULT NULL AFTER commission");
        }
        // ----------------------------

        // DEBUG: Check all columns
        const [allCols] = await db.promise().query("SHOW COLUMNS FROM company_suppliers");
        const columnNames = allCols.map(c => c.Field);

        // 1. Get current mapping
        // We use the column name we created, but check if it's there first
        const columnToUse = columnNames.includes('email_mapping') ? 'email_mapping' : (columnNames.includes('email_parsing') ? 'email_parsing' : null);

        if (!columnToUse) {
            throw new Error("Neither 'email_mapping' nor 'email_parsing' column found. Table columns: " + columnNames.join(', '));
        }

        const [csRows] = await db.promise().query(`SELECT ${columnToUse} as email_mapping FROM company_suppliers WHERE id = ?`, [id]);
        if (csRows.length === 0) return res.status(404).json({ success: false, message: "Association not found" });

        // 2. Get all field mapping keys
        const [fmRows] = await db.promise().query("SELECT db_column FROM field_mappings ORDER BY id ASC");

        res.json({
            success: true,
            mapping: (() => { try { return typeof csRows[0].email_mapping === 'string' ? JSON.parse(csRows[0].email_mapping) : (csRows[0].email_mapping || {}); } catch (_) { return {}; } })(),
            fields: fmRows.map(row => row.db_column),
            debug_columns: columnNames // Send this so we can see it in logs/UI
        });
    } catch (error) {
        console.error("Fetch Mapping Error:", error);
        res.status(500).json({ success: false, message: "Failed to fetch mapping: " + error.message });
    }
});

router.post("/company-suppliers/:id/mapping", async (req, res) => {
    const { id } = req.params;
    const { mapping } = req.body;

    const connection = await db.promise().getConnection();
    try {
        await connection.beginTransaction();

        // Detect column name
        const [allCols] = await connection.query("SHOW COLUMNS FROM company_suppliers");
        const columnNames = allCols.map(c => c.Field);
        const columnToUse = columnNames.includes('email_mapping') ? 'email_mapping' : (columnNames.includes('email_parsing') ? 'email_parsing' : null);

        if (!columnToUse) {
            throw new Error("No suitable mapping column found in company_suppliers");
        }

        // 1. Update company_suppliers
        const [updateResult] = await connection.query(`UPDATE company_suppliers SET ${columnToUse} = ? WHERE id = ?`, [JSON.stringify(mapping), id]);

        // 2. Update global field_mappings
        let fmUpdatedCount = 0;
        for (const [dbColumn, wordings] of Object.entries(mapping)) {
            if (!wordings || typeof wordings !== 'string') continue;

            const newAliases = wordings.split(',').map(s => s.trim()).filter(s => s.length > 0);
            if (newAliases.length === 0) continue;

            const [rows] = await connection.query("SELECT id, alias FROM field_mappings WHERE db_column = ?", [dbColumn]);
            if (rows.length > 0) {
                let currentAliases = [];
                try {
                    const parsed = JSON.parse(rows[0].alias || "[]");
                    currentAliases = Array.isArray(parsed) ? parsed : [];
                } catch (_) {
                    currentAliases = [];
                }
                let updated = false;

                newAliases.forEach(alias => {
                    if (!currentAliases.some(a => a.toLowerCase() === alias.toLowerCase())) {
                        currentAliases.push(alias);
                        updated = true;
                    }
                });

                if (updated) {
                    await connection.query("UPDATE field_mappings SET alias = ? WHERE id = ?", [JSON.stringify(currentAliases), rows[0].id]);
                    fmUpdatedCount++;
                }
            }
        }

        await connection.commit();
        res.json({
            success: true,
            message: `Mapping updated successfully. Rows affected: ${updateResult.affectedRows}. Global fields updated: ${fmUpdatedCount}`,
            debug: { columnUsed: columnToUse, affectedRows: updateResult.affectedRows }
        });
    } catch (error) {
        if (connection) await connection.rollback();
        console.error("Update Mapping Error:", error);
        res.status(500).json({ success: false, message: "Failed to update mapping: " + error.message });
    } finally {
        if (connection) connection.release();
    }
});

// --- AIRPORTS ---

router.get("/airports", async (req, res) => {
    try {
        const [rows] = await db.promise().query("SELECT * FROM airports ORDER BY airport_name ASC");
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error("Fetch Airports Error:", error);
        res.status(500).json({ success: false, message: "Failed to fetch airports" });
    }
});

router.post("/airports", async (req, res) => {
    const { airport_name, iata_code, icao_code, country, city, total_terminals, airport_type, website } = req.body;
    if (!airport_name || !iata_code) {
        return res.status(400).json({ success: false, message: "Airport name and IATA code are required" });
    }
    try {
        const [result] = await db.promise().query(
            `INSERT INTO airports (airport_name, iata_code, icao_code, country, city, total_terminals, airport_type, website, is_active) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`,
            [airport_name, iata_code, icao_code || null, country || null, city || null, total_terminals || 0, airport_type || 'international', website || null]
        );
        res.json({ success: true, message: "Airport added successfully", id: result.insertId });
    } catch (error) {
        console.error("Add Airport Error:", error);
        res.status(500).json({ success: false, message: "Failed to add airport" });
    }
});

router.put("/airports/:id", async (req, res) => {
    const { id } = req.params;
    const { airport_name, iata_code, icao_code, country, city, total_terminals, airport_type, website, is_active } = req.body;
    try {
        await db.promise().query(
            `UPDATE airports SET airport_name = ?, iata_code = ?, icao_code = ?, country = ?, city = ?, total_terminals = ?, airport_type = ?, website = ?, is_active = ?
             WHERE airport_id = ?`,
            [airport_name, iata_code, icao_code, country, city, total_terminals, airport_type, website, is_active, id]
        );
        res.json({ success: true, message: "Airport updated successfully" });
    } catch (error) {
        console.error("Update Airport Error:", error);
        res.status(500).json({ success: false, message: "Failed to update airport" });
    }
});

router.delete("/airports/:id", async (req, res) => {
    const { id } = req.params;
    try {
        await db.promise().query("DELETE FROM airports WHERE airport_id = ?", [id]);
        res.json({ success: true, message: "Airport deleted successfully" });
    } catch (error) {
        console.error("Delete Airport Error:", error);
        res.status(500).json({ success: false, message: "Failed to delete airport" });
    }
});

export default router;