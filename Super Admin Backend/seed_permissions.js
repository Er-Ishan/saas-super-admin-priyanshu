import db from "./config/db.js";

const PERMISSIONS = [
  { name: "access_dashboard",            description: "Access the Dashboard tab",              module: "Dashboard" },
  { name: "access_add_bookings",         description: "Access the Add Bookings tab",           module: "Add Bookings" },
  { name: "access_all_bookings",         description: "Access All Bookings sub-tab",           module: "Bookings" },
  { name: "access_cancelled_bookings",   description: "Access Cancelled Bookings sub-tab",     module: "Bookings" },
  { name: "access_website_bookings",     description: "Access Website Bookings sub-tab",       module: "Website" },
  { name: "access_admin_bookings",       description: "Access Admin Booking sub-tab",          module: "Website" },
  { name: "access_incomplete_bookings",  description: "Access Incomplete Booking sub-tab",     module: "Website" },
  { name: "access_refunded_bookings",    description: "Access Refunded Date Bookings sub-tab", module: "Website" },
  { name: "access_invoice",             description: "Access Invoice sub-tab",                module: "Website" },
  { name: "access_supplier_bookings",    description: "Access Supplier Booking sub-tab",       module: "Supplier" },
  { name: "access_supplier_list",        description: "Access Supplier List sub-tab",          module: "Supplier" },
  { name: "access_supplier_report",      description: "Access Supplier Report sub-tab",        module: "Supplier" },
  { name: "access_supplier_invoice",     description: "Access Supplier Invoice sub-tab",       module: "Supplier" },
  { name: "access_depart_report",        description: "Access Depart Report sub-tab",          module: "Report" },
  { name: "access_return_report",        description: "Access Return Report sub-tab",          module: "Report" },
  { name: "access_depart_return_report", description: "Access Depart & Return Report sub-tab", module: "Report" },
  { name: "access_depart_cards_report",  description: "Access Depart Cards Only sub-tab",      module: "Report" },
  { name: "access_products",            description: "Access the Product tab",                module: "Product" },
  { name: "access_promo_codes",          description: "Access the Promo Codes tab",            module: "Promo Codes" },
  { name: "access_support_tickets",      description: "Access the Support Ticket tab",         module: "Support Ticket" },
  { name: "access_website_settings",     description: "Access Website Settings sub-tab",       module: "Settings" },
  { name: "access_airport_settings",     description: "Access Airport Settings sub-tab",       module: "Settings" },
  { name: "access_admin_settings",       description: "Access Admin Settings sub-tab",         module: "Settings" },
  { name: "access_access_control",       description: "Access the Access Control tab",         module: "Access Control" },
  { name: "access_tracking_dashboard",         description: "Access Tracking Dashboard",              module: "Tracking" },
  { name: "access_tracking_system_settings",   description: "Access Tracking System Settings",        module: "Tracking" },
  { name: "access_tracking_label_settings",    description: "Access Tracking Label Settings",         module: "Tracking" },
  { name: "access_tracking_terminals",         description: "Access Tracking Terminals",              module: "Tracking" },
  { name: "access_tracking_parking_yards",     description: "Access Tracking Parking Yards",          module: "Tracking" },
  { name: "access_jobs",                       description: "Access the Tracking / Jobs tab",         module: "Tracking" },
  { name: "access_job_operations",             description: "Access Job Operations",                  module: "Tracking" },
  { name: "access_tracking_drivers",           description: "Access Tracking Drivers",                module: "Tracking" },
  { name: "access_tracking_driver_schedules",  description: "Access Tracking Driver Schedules",       module: "Tracking" },
];

async function seed() {
  const conn = db.promise();

  try {
    // 1. Clear old permissions + role_permissions
    await conn.query("DELETE FROM role_permissions");
    await conn.query("DELETE FROM permissions");

    // 2. Insert new permissions
    for (const p of PERMISSIONS) {
      await conn.query(
        "INSERT INTO permissions (name, description, module) VALUES (?, ?, ?)",
        [p.name, p.description, p.module]
      );
    }

    // 3. Get all permission IDs
    const [allPerms] = await conn.query("SELECT id FROM permissions");
    const permIds = allPerms.map((r) => r.id);

    // 4. Get the Admin role(s) for company_id = 1
    const [adminRoles] = await conn.query(
      "SELECT id FROM roles WHERE LOWER(name) = 'admin' AND company_id = 1"
    );

    // 5. Assign ALL permissions to every Admin role
    for (const role of adminRoles) {
      for (const pid of permIds) {
        await conn.query(
          "INSERT INTO role_permissions (role_id, permission_id) VALUES (?, ?)",
          [role.id, pid]
        );
      }
    }

    console.log(`✅ Seeded ${PERMISSIONS.length} permissions.`);
    console.log(`✅ Assigned all permissions to ${adminRoles.length} Admin role(s).`);
  } catch (err) {
    console.error("❌ Seed error:", err);
  } finally {
    process.exit();
  }
}

seed();
