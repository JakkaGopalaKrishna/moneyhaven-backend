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

# Email OTP Setup
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
OTP_EXPIRY_MINUTES=5
```

### Gmail App Password Setup
1. Go to your Google Account -> Security.
2. Enable 2-Step Verification.
3. Search for "App Passwords".
4. Create a new App Password (select "Other" and name it "MoneyHaven").
5. Copy the 16-character password into `EMAIL_PASS`.

## Authentication & OTP Flow
1. **Send OTP:** User submits email to `/api/auth/send-otp`. System checks if email is registered. Generates 6-digit OTP, hashes it, and saves to MongoDB with TTL. Sends email.
2. **Rate Limiting:** Maximum 3 OTP requests per 10 minutes, with a 60-second cooldown between requests.
3. **Verify OTP:** User submits email and OTP to `/api/auth/verify-otp`. System checks attempts (max 5) and matches hash. Marks OTP record as `isVerified: true`.
4. **Register:** User submits full details to `/api/auth/register`. System checks for a verified OTP. If successful, creates user, issues JWT, and deletes OTP record.
5. **Login:** Standard JWT authentication.
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

### Users
All routes below require `Authorization: Bearer <token>` header.
* **GET `/api/users/profile`**
  - Retrieves the current user's profile information.
* **PUT `/api/users/profile`**
  - Updates profile information.
  - Body: `firstName`, `lastName`, `openingBalance` (optional).
* **PUT `/api/users/change-password`**
  - Changes user password.
  - Body: `currentPassword`, `newPassword`.
* **POST `/api/users/avatar`**
  - Uploads a new avatar image.
  - Form-Data: `avatar` (file).
* **DELETE `/api/users/avatar`**
  - Deletes the current avatar image.

### Dashboard
All routes below require `Authorization: Bearer <token>` header.
* **GET `/api/dashboard/summary`**
  - Retrieves aggregated financial summaries (Current Balance, Total Income, etc.) and Health Scores.
* **GET `/api/dashboard/stats`**
  - Retrieves detailed statistical data for charting (e.g., income by category, recent transactions).

### Transactions
All routes below require `Authorization: Bearer <token>` header.
* **POST `/api/transactions`**
  - Create a new transaction. Body: `title`, `amount`, `type`, `category`, `paymentMethod`, `transactionDate`, `description`.
* **GET `/api/transactions`**
  - Get all user transactions with advanced support for `page`, `limit`, `sort`, `startDate`, `endDate`, `minAmount`, `maxAmount`, `search`, `type`, `category`.
* **GET `/api/transactions/stats`**
  - Get numerical transaction statistics (total counts, highest income/expense).
* **GET `/api/transactions/:id`**
  - Get a single transaction by ID.
* **PUT `/api/transactions/:id`**
  - Update a transaction.
* **DELETE `/api/transactions/:id`**
  - Soft-delete a transaction.
