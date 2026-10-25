import "dotenv/config";
import app from "./app.js";
import connectDB from "./config/db.js";

const port = Number.parseInt(process.env.PORT || "5003", 10);

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  console.error("JWT_SECRET must be set to a random secret of at least 32 characters.");
  process.exit(1);
}

try {
  await connectDB();
  app.listen(port, () => console.log(`Appointment Booking API listening on port ${port}`));
} catch (error) {
  console.error("Unable to start Appointment Booking API:", error.message);
  process.exit(1);
}
