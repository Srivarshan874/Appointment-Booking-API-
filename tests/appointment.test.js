import request from "supertest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import app from "../src/app.js";
import User from "../src/models/User.js";
import Slot from "../src/models/Slot.js";
import Booking from "../src/models/Booking.js";

process.env.JWT_SECRET = "test-secret-for-appointment-api-at-least-32-characters-long";
process.env.JWT_EXPIRES_IN = "1h";

let mongoServer;

async function registerAccount({ name = "Test User", email, role = "user", password = "Password123!" }) {
  const response = await request(app).post("/api/auth/register").send({ name, email, role, password });
  expect(response.status).toBe(201);
  return response.body;
}

function futureSlotRange(daysAhead = 2, hour = 10) {
  const startTime = new Date();
  startTime.setDate(startTime.getDate() + daysAhead);
  startTime.setHours(hour, 0, 0, 0);
  const endTime = new Date(startTime.getTime() + 30 * 60 * 1000);
  return { startTime: startTime.toISOString(), endTime: endTime.toISOString(), location: "Online" };
}

async function createProviderSlot(token, range = futureSlotRange()) {
  const response = await request(app).post("/api/slots")
    .set("Authorization", "Bearer " + token)
    .send(range);
  expect(response.status).toBe(201);
  return response.body.data;
}

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri(), { dbName: "appointment_booking_test" });
  await Promise.all([User.init(), Slot.init(), Booking.init()]);
}, 60000);

afterEach(async () => {
  await Promise.all([Booking.deleteMany({}), Slot.deleteMany({}), User.deleteMany({})]);
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongoServer) await mongoServer.stop();
}, 60000);

describe("Appointment Booking API", () => {
  test("health check reports MongoDB connected", async () => {
    const response = await request(app).get("/health");
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      status: "ok",
      service: "appointment-booking-api",
      database: "connected"
    });
  });

  test("registers and logs in a user with a JWT", async () => {
    const account = await registerAccount({ email: "user1@example.com" });
    expect(account.user.role).toBe("user");
    expect(account.token).toBeTruthy();
    expect(account.user.passwordHash).toBeUndefined();

    const login = await request(app).post("/api/auth/login")
      .send({ email: "USER1@example.com", password: "Password123!" });
    expect(login.status).toBe(200);
    expect(login.body.token).toBeTruthy();

    const me = await request(app).get("/api/auth/me")
      .set("Authorization", "Bearer " + login.body.token);
    expect(me.status).toBe(200);
    expect(me.body.user.email).toBe("user1@example.com");
  });

  test("blocks users from creating provider slots and permits providers", async () => {
    const user = await registerAccount({ email: "user2@example.com", role: "user" });
    const provider = await registerAccount({ email: "provider1@example.com", role: "provider", name: "Provider One" });

    const forbidden = await request(app).post("/api/slots")
      .set("Authorization", "Bearer " + user.token).send(futureSlotRange());
    expect(forbidden.status).toBe(403);

    const slot = await createProviderSlot(provider.token);
    expect(String(slot.providerId)).toBe(provider.user.id);

    const available = await request(app).get("/api/slots/available");
    expect(available.status).toBe(200);
    expect(available.body.total).toBe(1);
  });

  test("books a slot once; simultaneous double booking returns 409; cancelling releases it", async () => {
    const provider = await registerAccount({ email: "provider2@example.com", role: "provider" });
    const userA = await registerAccount({ email: "booker-a@example.com" });
    const userB = await registerAccount({ email: "booker-b@example.com" });
    const slot = await createProviderSlot(provider.token);

    const attempts = await Promise.all([
      request(app).post("/api/bookings").set("Authorization", "Bearer " + userA.token).send({ slotId: slot._id }),
      request(app).post("/api/bookings").set("Authorization", "Bearer " + userB.token).send({ slotId: slot._id })
    ]);

    expect(attempts.map((item) => item.status).sort()).toEqual([201, 409]);
    const winnerIndex = attempts.findIndex((item) => item.status === 201);
    const winningResponse = attempts[winnerIndex];
    const winningToken = winnerIndex === 0 ? userA.token : userB.token;
    expect(winningResponse.body.data.status).toBe("booked");

    const unavailable = await request(app).get("/api/slots/available");
    expect(unavailable.body.total).toBe(0);

    const cancelled = await request(app).post("/api/bookings/" + winningResponse.body.data._id + "/cancel")
      .set("Authorization", "Bearer " + winningToken);
    expect(cancelled.status).toBe(200);
    expect(cancelled.body.data.status).toBe("cancelled");

    const availableAgain = await request(app).get("/api/slots/available");
    expect(availableAgain.body.total).toBe(1);
  });

  test("validates slot times and rejects overlapping slots for one provider", async () => {
    const provider = await registerAccount({ email: "provider3@example.com", role: "provider" });
    const badRange = futureSlotRange();
    badRange.endTime = new Date(new Date(badRange.startTime).getTime() - 60_000).toISOString();

    const invalid = await request(app).post("/api/slots")
      .set("Authorization", "Bearer " + provider.token).send(badRange);
    expect(invalid.status).toBe(400);

    const firstRange = futureSlotRange(3, 10);
    await createProviderSlot(provider.token, firstRange);
    const overlap = {
      startTime: new Date(new Date(firstRange.startTime).getTime() + 10 * 60_000).toISOString(),
      endTime: new Date(new Date(firstRange.endTime).getTime() + 10 * 60_000).toISOString()
    };
    const response = await request(app).post("/api/slots")
      .set("Authorization", "Bearer " + provider.token).send(overlap);
    expect(response.status).toBe(409);
  });

  test("rejects invalid credentials and unauthenticated booking", async () => {
    const login = await request(app).post("/api/auth/login")
      .send({ email: "missing@example.com", password: "wrong-password" });
    expect(login.status).toBe(401);

    const booking = await request(app).post("/api/bookings").send({ slotId: "507f1f77bcf86cd799439011" });
    expect(booking.status).toBe(401);
  });

  test("returns 400 for invalid booking body and 404 for missing resource", async () => {
    const user = await registerAccount({ email: "user3@example.com" });
    const invalid = await request(app).post("/api/bookings")
      .set("Authorization", "Bearer " + user.token).send({ slotId: "bad-id" });
    expect(invalid.status).toBe(400);

    const missing = await request(app).get("/api/slots/507f1f77bcf86cd799439011");
    expect(missing.status).toBe(404);
  });
});
