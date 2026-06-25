# MoneyHaven - Backend

The robust, secure Express & MongoDB backend powering the MoneyHaven personal finance platform.

## 🚀 Tech Stack
- **Runtime:** Node.js
- **Framework:** Express.js
- **Database:** MongoDB & Mongoose
- **Authentication:** JWT (JSON Web Tokens)
- **Background Jobs:** node-cron
- **Email Service:** Nodemailer

## ✨ Core Features
- **Secure Authentication:** JWT-based auth with OTP email verification for registration.
- **Transactions & Budgets:** Full CRUD endpoints for managing user finances.
- **Savings Goals:** Track and update progress on financial goals with automatic health status calculation.
- **Automated Jobs:** A robust `node-cron` scheduler that runs daily to check goal deadlines, financial health scores, and generate automated alerts.
- **Analytics Engine:** Aggregates user data to provide actionable insights.
- **HTML Email Engine:** Professionally branded HTML emails for OTP verification and user alerts.

## 🛠️ Getting Started

### Prerequisites
- Node.js (v18 or higher)
- MongoDB (Local or Atlas)

### Installation
1. Clone the repository and navigate to the backend directory.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file in the root with the following essential variables:
   ```env
   PORT=5000
   MONGO_URI=your_mongodb_connection_string
   JWT_SECRET=your_jwt_secret
   EMAIL_USER=your_email@gmail.com
   EMAIL_PASS=your_app_password
   CLOUDINARY_CLOUD_NAME=name
   CLOUDINARY_API_KEY=key
   CLOUDINARY_API_SECRET=secret
   ```
4. Start the development server:
   ```bash
   npm run dev
   ```

## 🏗️ Architecture Notes
- Uses the standard **MVC (Model-View-Controller)** architecture to maintain separation of concerns.
- Routes are heavily protected via custom **JWT middleware**.
- Features a centralized error handler and asynchronous wrapper (`asyncHandler`) for robust controller logic without try/catch bloat.

---
*Built with 💙 for personal finance.*
