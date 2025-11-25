import "dotenv/config";
import { storage } from "./server/storage";
import bcrypt from "bcrypt";

async function createAdmin() {
  console.log("Creating admin user...");

  try {
    // Check if admin already exists
    const existing = await storage.getUserByEmail("admin1@secondhandcell.com");
    if (existing) {
      console.log("Admin user already exists. Updating...");
      const adminPassword = await bcrypt.hash("Admin1234!", 10);
      await storage.updateUser(existing.id, {
        passwordHash: adminPassword,
        role: "super_admin",
        isActive: true,
      });
      console.log("Admin user updated successfully!");
      console.log("Email: admin1@secondhandcell.com");
      console.log("Password: Admin1234!");
      return;
    }

    const adminPassword = await bcrypt.hash("Admin1234!", 10);
    const adminUser = await storage.createUser({
      name: "Admin User",
      email: "admin1@secondhandcell.com",
      passwordHash: adminPassword,
      role: "super_admin",
      phone: "+1-555-0100",
      isActive: true,
    });

    console.log("Admin user created successfully!");
    console.log("ID:", adminUser.id);
    console.log("Email: admin@secondhandcell.com");
    console.log("Password: Admin123!");
  } catch (error) {
    console.error("Error creating admin:", error);
    throw error;
  }
}

createAdmin()
  .then(() => {
    console.log("Done!");
    process.exit(0);
  })
  .catch((err) => {
    console.error("Failed:", err);
    process.exit(1);
  });
