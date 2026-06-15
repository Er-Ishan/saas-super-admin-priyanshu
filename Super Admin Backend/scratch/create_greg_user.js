import db from "../config/db.js";
import bcrypt from "bcrypt";

async function run() {
  try {
    const email = "greg@gmail.com";
    const password = "greg123";
    const companyId = 3;
    const name = "Greg Maurice";

    // 1. Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // 2. Insert User
    const [userRes] = await db.promise().query(
      "INSERT INTO users (company_id, name, email, password) VALUES (?, ?, ?, ?)",
      [companyId, name, email, hashedPassword]
    );
    const userId = userRes.insertId;
    console.log(`User created with ID: ${userId}`);

    // 3. Create Admin Role for Company 3
    const [roleRes] = await db.promise().query(
      "INSERT INTO roles (company_id, name, description, is_system_default) VALUES (?, ?, ?, ?)",
      [companyId, "Admin", "Default administrator role", 1]
    );
    const roleId = roleRes.insertId;
    console.log(`Role created with ID: ${roleId}`);

    // 4. Link User to Role
    await db.promise().query(
      "INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)",
      [userId, roleId]
    );
    console.log("User linked to role");

    // 5. Assign Permissions (Copying from role 8)
    const permissions = [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29];
    const permValues = permissions.map(pId => [roleId, pId]);
    await db.promise().query(
      "INSERT INTO role_permissions (role_id, permission_id) VALUES ?",
      [permValues]
    );
    console.log("Permissions assigned to role");

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();
