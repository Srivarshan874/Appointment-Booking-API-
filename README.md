# SapphireIQ Appointment Booking API

A REST API for appointment scheduling built to match the supplied SapphireIQ Student Project Guide. Stack: Node.js, Express, MongoDB, Mongoose, JWT, bcryptjs, Joi, Jest and Supertest.

## The five project modules

1. Setup and data modeling: Express server, MongoDB connection, User, Slot and Booking models, indexes, and demo seed script.
2. Authentication and roles: registration, login, bcrypt password hashing, JWT authentication middleware, and separate user/provider permissions.
3. Slots and bookings: create and list slots, view future availability, book a slot, list bookings, and cancel bookings. Cancellation returns the slot to availability.
4. Conflict prevention and validation: Joi request validation, date/time checks, provider overlap checks, and a MongoDB unique partial index preventing two active bookings for the same slot. Duplicate booking attempts return HTTP 409.
5. Error handling and testing: centralized JSON errors and Jest/Supertest integration tests using an in-memory MongoDB server.

## Requirements

- Node.js 18+ and npm
- MongoDB Community Server running locally, or a MongoDB Atlas connection string

## Run on macOS

From this project directory:

~~~bash
npm install
cp .env.example .env
~~~

Edit .env to set MONGODB_URI and a random JWT_SECRET of at least 32 characters. Never commit .env or real credentials; .env is ignored by Git.

Start MongoDB if installed with Homebrew:

~~~bash
brew services start mongodb-community@8.0
~~~

Start the API:

~~~bash
npm run dev
~~~

The default port is 5003. Open http://localhost:5003/health to check the service and database connection. Change PORT in .env if needed.

## Seed demo providers and slots

In a second Terminal window, run:

~~~bash
npm run seed
~~~

The seed script creates or updates three demo provider accounts and one demo user, then prepares weekday 30-minute slots for the upcoming Monday–Friday. Matching slots are preserved.

Local demo accounts (all share a password):
- asha.provider@example.com — provider
- ravi.provider@example.com — provider
- meera.provider@example.com — provider
- demo.user@example.com — user
- Password: DemoPass123!

These credentials are for local testing only. Change or remove them before any non-local deployment.

## API endpoints

Base URL: http://localhost:5003

### Health
- GET /health — API and MongoDB status.

### Authentication
- POST /api/auth/register — body: name, email, password, role. Role is user or provider and defaults to user.
- POST /api/auth/login — body: email and password; returns a JWT and public user information.
- GET /api/auth/me — protected; returns the current user.

Example registration:

~~~bash
curl -X POST http://localhost:5003/api/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"name":"Demo User","email":"demo.user@example.com","password":"DemoPass123!","role":"user"}'
~~~

For protected requests, pass Authorization: Bearer TOKEN.

### Slots
- POST /api/slots — provider only; creates a future slot. Body: startTime, endTime, optional location and notes.
- GET /api/slots/available — public; lists future unbooked slots. Optional query parameters: providerId, from, to and limit (1–100).
- GET /api/slots/mine — provider only; lists the signed-in provider's slots.
- GET /api/slots/:slotId — public; returns a slot and availability flag.

### Bookings
- POST /api/bookings — user only; body: slotId containing a MongoDB ObjectId.
- GET /api/bookings/mine — users see their own bookings; providers see bookings for their slots.
- POST /api/bookings/:bookingId/cancel — the booking's user or its provider can cancel it. Cancellation preserves booking history while freeing the slot.

## Double-booking prevention

Application checks provide early responses, but they alone cannot guarantee correctness during concurrent requests. The Booking model defines a unique partial MongoDB index on slotId where status is booked. The database index ensures two concurrent inserts for the same slot cannot both succeed; the losing request returns HTTP 409 Conflict. Changing a booking to cancelled removes it from the partial index and makes the slot available again.

The server waits for model indexes to initialize before listening. Do not disable index initialization unless you create the required indexes separately.

## Automated tests

~~~bash
npm test
~~~

Tests use Jest, Supertest and mongodb-memory-server, so they do not require the local MongoDB service. The first test run may download a MongoDB test binary depending on your environment and network. The suite covers health, registration/login/JWT, role restrictions, slot creation, simultaneous double-booking, cancellation/re-availability, date overlap validation, authentication errors and not-found behavior.

## Postman

Import postman/Appointment-Booking-API.postman_collection.json into Postman and set baseUrl to http://localhost:5003. Register or log in as a user/provider, then paste the returned JWT into the collection token variable for protected calls.

## Security notes and project scope

- Public registration can select the provider role for this student exercise. A production service should verify provider identity or have an administrator grant that role.
- Demo seed credentials are for local development only.
- Use a strong random JWT_SECRET and never commit .env.
- Payments, reminders, calendar integration and deployment infrastructure are outside the supplied project scope.
