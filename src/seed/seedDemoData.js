import "dotenv/config";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import connectDB from "../config/db.js";
import User from "../models/User.js";
import Slot from "../models/Slot.js";

const demoProviders = [
  { name: "Dr. Asha Raman", email: "asha.provider@example.com" },
  { name: "Dr. Ravi Kumar", email: "ravi.provider@example.com" },
  { name: "Dr. Meera Iyer", email: "meera.provider@example.com" }
];
const demoUser = { name: "Demo User", email: "demo.user@example.com", role: "user" };
const demoPassword = "DemoPass123!";

function nextMonday() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  const daysUntilMonday = ((8 - date.getDay()) % 7) || 7;
  date.setDate(date.getDate() + daysUntilMonday);
  return date;
}

try {
  await connectDB();
  const passwordHash = await bcrypt.hash(demoPassword, Number.parseInt(process.env.BCRYPT_ROUNDS || "12", 10));
  const users = [];
  for (const person of [...demoProviders.map((p) => ({ ...p, role: "provider" })), demoUser]) {
    const user = await User.findOneAndUpdate(
      { email: person.email },
      { $set: { name: person.name, email: person.email, role: person.role, passwordHash } },
      { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
    ).exec();
    users.push(user);
  }

  const providers = users.filter((user) => user.role === "provider");
  const startDay = nextMonday();
  const times = [9, 11, 14];
  let insertedOrUpdated = 0;
  for (const provider of providers) {
    for (let day = 0; day < 5; day += 1) {
      for (const hour of times) {
        const startTime = new Date(startDay);
        startTime.setDate(startTime.getDate() + day);
        startTime.setHours(hour, 0, 0, 0);
        const endTime = new Date(startTime.getTime() + 30 * 60 * 1000);
        await Slot.updateOne(
          { providerId: provider._id, startTime },
          { $setOnInsert: { providerId: provider._id, startTime, endTime, location: "Online", notes: "Demo appointment slot" } },
          { upsert: true }
        ).exec();
        insertedOrUpdated += 1;
      }
    }
  }

  console.log("Demo data ready.");
  console.log("Providers:", demoProviders.map((provider) => provider.email).join(", "));
  console.log("Demo user:", demoUser.email);
  console.log(`Demo password for all seed accounts: ${demoPassword}`);
  console.log(`Prepared up to ${insertedOrUpdated} weekday slots for the next week (existing matching slots are preserved).`);
  console.log("Change or remove these demo credentials before using a non-local environment.");
} catch (error) {
  console.error("Could not seed demo data:", error.message);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
