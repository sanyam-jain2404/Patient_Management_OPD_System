# Professional OPD Patient Management System

A full-stack, secure, role-based Outpatient Department (OPD) Patient Management System built using React, Vite, Node.js, Express, and MongoDB.

---

## 🌟 Key Features

### 1. 🔐 Role-Based Access Control (RBAC)
- **Patient**: Register/Login, view assigned appointments, track OPD token queue status, check estimated waiting times, and view treatment history.
- **Doctor**: Register (requires Admin verification), manage daily appointment queue, conduct consultations, write digital prescriptions, and recommend follow-ups.
- **Admin**: Complete system control, verify/approve doctor accounts, manage medical departments, monitor OPD-wide workloads, and view audit logs.

### 2. ⚡ Smart Doctor Allocation Algorithm
- Automatically balances patient load across available doctors within a selected medical department.
- Uses **Active Workload** (count of `Booked`, `Waiting`, `In Consultation` appointments) as the primary metric.
- Uses **Estimated Waiting Time** as a tie-breaker.
- Employs **MongoDB Transactions & Atomic Counters** to prevent duplicate token allocation during simultaneous bookings.

### 3. ⏱️ Smart Waiting Time Estimation
- Calculates wait times dynamically using actual consultation start/completion timestamps and average consultation durations per doctor.
- Supports emergency priority queue adjustments.

### 4. 📝 Digital Consultations & Prescriptions
- Doctors record diagnoses, symptoms, treatments, and structured medicine prescriptions (Dosage, Frequency, Duration).
- Automatic follow-up reminder scheduling.

---

## 🛠️ Technology Stack

- **Frontend**: React 19, Vite, Tailwind CSS v4, React Router v7
- **Backend**: Node.js, Express.js v5, MongoDB, Mongoose
- **Security**: JWT, bcryptjs, Helmet, CORS, Custom Validation & Audit Middleware

---

## 🚀 Quick Setup Instructions

### Prerequisites
- Node.js (v18+)
- MongoDB running locally (`mongodb://localhost:27017/opd_patient_management`) or a MongoDB Atlas connection string.

### 1. Backend Setup
```bash
cd backend
npm install

# Create environment configuration
cp .env.example .env

# Start the server (runs on http://localhost:5000)
npm run dev
```

### 2. Seed Initial Admin Account
Run the secure setup script to initialize the first Admin:
```bash
ADMIN_NAME="Super Admin" ADMIN_EMAIL="admin@opd.in" ADMIN_PASSWORD="SuperSecretAdminPassword123!" node scripts/createAdmin.js
```

### 3. Frontend Setup
In a new terminal window:
```bash
# In the project root directory
npm install
npm run dev
```
Open your browser at `http://localhost:5173`.

---

## 📡 Core API Endpoints Overview

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/api/auth/register` | Public | Register new Patient or Doctor |
| `POST` | `/api/auth/login` | Public | Login and receive JWT Token |
| `GET` | `/api/auth/me` | Protected | Fetch logged-in user profile |
| `GET` | `/api/departments` | Protected | List active medical departments |
| `POST` | `/api/appointments` | Patient/Admin | Smart doctor allocation & appointment booking |
| `GET` | `/api/appointments` | Protected | List appointments (filtered by role) |
| `PATCH` | `/api/appointments/:id/status` | Doctor/Admin | Update queue status (`In Consultation`, `Completed`, etc.) |
| `POST` | `/api/consultations` | Doctor | Record diagnosis, treatment & prescription |
| `GET` | `/api/consultations/patient/:patientId` | Protected | View patient treatment history |
| `GET` | `/api/admin/pending-doctors` | Admin | View doctor accounts pending verification |
| `PATCH` | `/api/admin/doctors/:id/verify` | Admin | Approve a doctor account |

---

## 🔒 Security Highlights
- Password hashing with salt factor 12 using `bcryptjs`.
- Stateless JWT-based authentication.
- All sensitive routes are guarded on the backend via role-checking middleware (`authorizeRoles`).
- Non-blocking audit logging records sensitive operations for accountability.
