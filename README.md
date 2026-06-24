# MoneyHaven Backend API

This is the Express backend for MoneyHaven, featuring a robust JWT-based authentication system.

## Project Structure
```text
src/
├── config/        # Database and other configurations
├── controllers/   # Request handlers (e.g., authController.js)
├── middleware/    # Custom Express middlewares (errorHandler.js, authMiddleware.js)
├── models/        # Mongoose schemas (User.js)
├── routes/        # Express routers (authRoutes.js)
├── services/      # Business logic and external API integrations
├── utils/         # Helper functions (asyncHandler.js, generateToken.js, sanitizeUser.js)
├── validations/   # Request validation logic (authValidation.js)
└── app.js         # Express app configuration
server.js          # Entry point
```

## Environment Variables
Create a `.env` file in the root directory:
```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/moneyhaven
JWT_SECRET=supersecretjwtkey123
```

## Authentication Flow
1. **Register/Login:** The user sends credentials to `/api/auth/register` or `/api/auth/login`.
2. **Token Generation:** Upon success, the server returns a JWT in the JSON response (along with the sanitized user object).
3. **Storage:** The frontend stores the JWT in Redux Persist + localStorage (no cookies are used).
4. **Subsequent Requests:** The frontend attaches the token in the `Authorization: Bearer <token>` header.
5. **Validation:** The `protect` middleware verifies the token and attaches `req.user` for protected routes.

## API Endpoints

### Auth
* **POST `/api/auth/register`**
  - Registers a new user.
  - Body: `firstName`, `lastName`, `email`, `password`, `openingBalance` (optional, default 0).
* **POST `/api/auth/login`**
  - Authenticates a user.
  - Body: `email`, `password`.
* **GET `/api/auth/me`**
  - Returns the current logged-in user. Requires `Authorization: Bearer <token>` header.
* **POST `/api/auth/logout`**
  - Logs out the user (primarily handled client-side).
