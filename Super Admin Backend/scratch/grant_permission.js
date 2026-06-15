import db from "../config/db.js";

async function grantPermission() {
  const email = 'greg@gmail.com';
  const permissionsToGrant = ['access_jobs', 'access_job_operations'];

  try {
    // 1. Find the user
    const [userRows] = await db.promise().query('SELECT id FROM users WHERE email = ?', [email]);
    if (userRows.length === 0) {
      console.log(`User ${email} not found.`);
      process.exit(1);
    }
    const userId = userRows[0].id;
    console.log(`Found user ${email} with ID: ${userId}`);

    // 2. Ensure permissions exist in the permissions table
    for (const perm of permissionsToGrant) {
      const [permRows] = await db.promise().query('SELECT id FROM permissions WHERE name = ?', [perm]);
      if (permRows.length === 0) {
        console.log(`Permission ${perm} not found. Creating it...`);
        await db.promise().query('INSERT INTO permissions (name) VALUES (?)', [perm]);
      }
    }

    // 3. Grant permissions to the user
    // First, check how user permissions are stored. Is it user_roles or a direct table?
    // Let's check table list again. 'user_roles' and 'role_permissions' suggest RBAC.
    // However, some apps have a 'user_permissions' table or similar.
    
    // Let's check if there is a 'user_permissions' table.
    // Based on previous node get_tables.js, there is NO 'user_permissions' table.
    // There are 'user_roles' and 'role_permissions'.
    
    // Let's check if the user has a role.
    const [userRoleRows] = await db.promise().query('SELECT role_id FROM user_roles WHERE user_id = ?', [userId]);
    let roleId;
    if (userRoleRows.length === 0) {
      console.log(`User ${email} has no role. Assigning 'Admin' role if it exists...`);
      const [roleRows] = await db.promise().query("SELECT id FROM roles WHERE role_name = 'Admin' OR role_name = 'Administrator' LIMIT 1");
      if (roleRows.length > 0) {
        roleId = roleRows[0].id;
        await db.promise().query('INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)', [userId, roleId]);
        console.log(`Assigned role ID ${roleId} to user.`);
      } else {
        console.log("No Admin role found. Please create a role first.");
        process.exit(1);
      }
    } else {
      roleId = userRoleRows[0].role_id;
      console.log(`User has role ID: ${roleId}`);
    }

    // 4. Assign permissions to the role
    for (const perm of permissionsToGrant) {
      const [permRows] = await db.promise().query('SELECT id FROM permissions WHERE name = ?', [perm]);
      const permId = permRows[0].id;

      const [rolePermRows] = await db.promise().query('SELECT * FROM role_permissions WHERE role_id = ? AND permission_id = ?', [roleId, permId]);
      if (rolePermRows.length === 0) {
        console.log(`Granting ${perm} to role ${roleId}...`);
        await db.promise().query('INSERT INTO role_permissions (role_id, permission_id) VALUES (?, ?)', [roleId, permId]);
      } else {
        console.log(`Role ${roleId} already has permission ${perm}.`);
      }
    }

    console.log("Permissions granted successfully.");
    process.exit(0);
  } catch (error) {
    console.error("Error granting permissions:", error);
    process.exit(1);
  }
}

grantPermission();
