# Full Code Directory Frontend-Backend Integration Audit

**Date:** November 12, 2026  
**Scope:** Full codebase audit covering frontend (`src/`), backend (`backend/`), API integration (`apiService.js`), routes, database models, role-based workflows, and cross-feature contract matching.  
**Mode:** Read-only audit (no code modifications made).

---

## Executive Summary

The project is an Outpatient Department (OPD) Management Portal comprising:
- **Backend:** Node.js/Express, Mongoose (MongoDB), JWT authentication, Role-based Access Control (`admin`, `doctor`, `patient`).
- **Frontend:** React with Vite, Tailwind CSS, React Router v6.

While core flows (authentication, appointment allocation, doctor queue calling, consultation recording) are conceptually structured, several **critical architectural mismatches, runtime bugs, data discrepancies, and orphaned local-storage fallbacks** exist between frontend components and backend endpoints.

---

## 1. Critical & Blocking Bugs (P0)

### 1.1 `BookAppointment.jsx` passes User ID instead of Patient Document ID
- **Location:** [BookAppointment.jsx](file:///c:/Users/jains/OneDrive/Desktop/pe_project_test/patient-management/src/pages/BookAppointment.jsx#L176) & [appointmentRoutes.js](file:///c:/Users/jains/OneDrive/Desktop/pe_project_test/patient-management/backend/routes/appointmentRoutes.js#L121-L138)
- **Issue:**
  ```javascript
  // BookAppointment.jsx line 176:
  const appointmentData = {
    ...form,
    patientId: user.id, // <-- This is the User._id from auth login!
    ...
  };
  ```
  In `appointmentRoutes.js` (line 104-117), if the caller is a `patient`, the backend resolves `patientId` from `Patient.findOne({ userId: req.user._id })`. However, if the caller is an **`admin`**, `targetPatientId` is taken directly as `Patient.findById(targetPatientId)`.
  When an admin books an appointment using `BookAppointment.jsx`, `user.id` is the admin's `User._id` instead of a patient's `Patient._id`. This fails with `"Patient not found"`. Furthermore, for patients, sending `patientId: user.id` is confusing and redundant.
- **Impact:** Admins cannot book appointments for patients via `BookAppointment.jsx`.

---

### 1.2 `AddPatient.jsx` is Completely Disconnected from Backend API
- **Location:** [AddPatient.jsx](file:///c:/Users/jains/OneDrive/Desktop/pe_project_test/patient-management/src/pages/AddPatient.jsx#L49-L86) vs [patientRoutes.js](file:///c:/Users/jains/OneDrive/Desktop/pe_project_test/patient-management/backend/routes/patientRoutes.js#L274-L323)
- **Issue:**
  The `AddPatient.jsx` page still relies completely on mock `localStorage` keys (`apiPatients`, `patients`):
  ```javascript
  localStorage.setItem("patients", JSON.stringify([...existing, newPatient]));
  ```
  It **never calls** `createApiPatient` or `POST /api/patients`.
- **Impact:** Patients registered via the UI's "Add Patient" route (`/add`) are saved only in browser `localStorage`. They are never persisted to MongoDB, cannot book appointments, cannot be seen by doctors, and disappear on other browsers/sessions.

---

### 1.3 `DoctorVerification.jsx` Missing Verification Flag Update in Doctor Collection
- **Location:** [adminRoutes.js](file:///c:/Users/jains/OneDrive/Desktop/pe_project_test/patient-management/backend/routes/adminRoutes.js#L71-L73) vs [doctorRoutes.js](file:///c:/Users/jains/OneDrive/Desktop/pe_project_test/patient-management/backend/routes/doctorRoutes.js#L17)
- **Issue:**
  In `adminRoutes.js`:
  ```javascript
  const doctor = await User.findOne({ _id: id, role: "doctor" });
  ...
  doctor.isVerified = true;
  await doctor.save();
  ```
  `User.isVerified` is updated to `true`.
  However, in `doctorRoutes.js` (line 17):
  ```javascript
  router.get("/", protect, async (req, res) => {
    ...
    let query = { isVerified: true };
    const doctors = await Doctor.find(query)...
  ```
  Notice that `Doctor` model also has an `isVerified` field in standard doctor queries, or if `Doctor.isVerified` was defaulted to false or undefined, `Doctor.find({ isVerified: true })` does not find doctors whose status was only updated on `User`. Moreover, `Doctor` schema in `Doctor.js` doesn't define `isVerified` (it has `isAvailable`), yet `doctorRoutes.js` line 17 queries `Doctor.find({ isVerified: true })`!
- **Impact:** `GET /api/doctors` returns an empty array `[]` because `Doctor` documents don't have `isVerified: true` stored on the `Doctor` schema (it was only stored on `User`). As a result, doctor directory / doctor listing lookups fail.

---

### 1.4 `MyProfile.jsx` Duplicate & Unreachable Code Bug
- **Location:** [MyProfile.jsx](file:///c:/Users/jains/OneDrive/Desktop/pe_project_test/patient-management/src/pages/MyProfile.jsx#L32-L60)
- **Issue:**
  In `MyProfile.jsx`, the `loadProfile` function has duplicate and out-of-order execution:
  ```javascript
  const loadProfile = async () => {
      const response = await fetchMyPatientProfile();
      setPatient(response.data);

      try {
          const historyResponse = await fetchPatientTreatmentHistory(
              response.data._id
          );
          setHistory(historyResponse.data || []);
      } catch (historyError) {
          ...
      } finally {
          setHistoryLoading(false);
      }
      try {
          setLoading(true);
          setError("");
          const response = await fetchMyPatientProfile();
          setPatient(response.data);
      } catch (err) {
          ...
      } finally {
          setLoading(false);
      }
  };
  ```
  The first fetch runs outside the `try/catch(err)` block without `setLoading(true)`. If the initial `fetchMyPatientProfile()` throws an error (e.g. network error, 401, or 404), it unhandled-rejects before entering the main error handler, causing the page to hang or crash without displaying the error UI.
- **Impact:** Profile fails to load gracefully on network failure or if the patient profile does not exist.

---

## 2. High Severity Integration Issues (P1)

### 2.1 Inconsistent `apiRequest` Error Parsing
- **Location:** [apiService.js](file:///c:/Users/jains/OneDrive/Desktop/pe_project_test/patient-management/src/services/apiService.js#L27-L30)
- **Issue:**
  ```javascript
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || "Something went wrong");
  }
  ```
  The backend sends JSON errors: `{ "success": false, "message": "..." }`.
  Because `apiService.js` reads `response.text()`, `err.message` becomes a raw JSON string like `{"success":false,"message":"Invalid department or patient ID."}`.
  When the UI triggers `toast(err.message, "error")`, users see unsightly raw unparsed JSON strings on screen.
  In contrast, `login` and `register` in `apiService.js` do:
  ```javascript
  const data = await response.json();
  if (!response.ok) throw new Error(data.message);
  ```
- **Impact:** Inconsistent UX; error toasts show raw JSON payloads rather than human-readable messages.

---

### 2.2 `Reports.jsx` (Settings) Uses `localStorage` Instead of Backend DB
- **Location:** [Reports.jsx](file:///c:/Users/jains/OneDrive/Desktop/pe_project_test/patient-management/src/pages/Reports.jsx#L21-L45)
- **Issue:**
  The `Reports.jsx` page (rendered under `/reports` with label "Settings" in the sidebar) stores clinic settings (`hospitalName`, `doctorName`, `capacity`, `doctors`) strictly in `localStorage.getItem("opdSettings")`.
  Neither backend models (`Department.js`, `Doctor.js`) nor API endpoints are connected to this page.
- **Impact:** Any changes made by an admin in "Settings" are purely local to their individual browser and do not affect the actual database departments or doctors.

---

### 2.3 Doctor's Weekly Availability & Exceptions Lack Frontend UI
- **Location:** [doctorRoutes.js](file:///c:/Users/jains/OneDrive/Desktop/pe_project_test/patient-management/backend/routes/doctorRoutes.js#L111-L198)
- **Issue:**
  The backend provides rich APIs:
  - `GET /api/doctors/me/availability`
  - `PUT /api/doctors/me/availability`
  - `PATCH /api/doctors/me`
  However, no frontend page or modal exists for doctors to set their `weeklySchedule`, `availabilityExceptions`, or working hours. Neither `Dashboard.jsx` nor any profile tab allows doctors to manage their calendar.
- **Impact:** Advanced scheduling and queue availability features implemented in backend services cannot be utilized by doctors from the UI.

---

### 2.4 Patient Details View Authorization Gap for Patients
- **Location:** [PatientDetails.jsx](file:///c:/Users/jains/OneDrive/Desktop/pe_project_test/patient-management/src/pages/PatientDetails.jsx#L53-L57) vs [patientRoutes.js](file:///c:/Users/jains/OneDrive/Desktop/pe_project_test/patient-management/backend/routes/patientRoutes.js#L184-L249)
- **Issue:**
  In `patientRoutes.js`, route `GET /api/patients/:id` is restricted to:
  ```javascript
  authorizeRoles("admin", "doctor")
  ```
  In `PatientDetails.jsx`:
  ```javascript
  if (user?.role === "patient") {
    response = await fetchMyPatientProfile(); // calls /api/patients/me
  } else {
    response = await fetchApiPatientById(id);
  }
  ```
  If a patient navigates to `/patient/:id` where `:id` is their own patient document ID (or from a link), `fetchMyPatientProfile()` ignores the URL `:id` parameter and always loads the current user. But if a patient tries to access another patient's ID, they still get their own profile instead of a 403 / not authorized screen.
  Furthermore, in `PatientDetails.jsx` line 234:
  ```javascript
  <button onClick={() => navigate(`/leave/${patient.id}`)} ...>
    🚪 Discharge Patient
  </button>
  ```
  The "Discharge Patient" button is visible to all roles including `patient`! Clicking it routes to `/leave/:id`, which is blocked by `ProtectedRoute` for patients, but should not be shown on UI to patients in the first place.
- **Impact:** Misleading UI controls visible to unauthorized roles; inconsistent route parameter handling.

---

## 3. Medium Severity Issues & Feature Mismatches (P2)

### 3.1 Hardcoded Port & URL in Frontend
- **Location:** [apiService.js](file:///c:/Users/jains/OneDrive/Desktop/pe_project_test/patient-management/src/services/apiService.js#L1)
- **Issue:**
  ```javascript
  const API_BASE_URL = "http://localhost:5000/api";
  ```
  `API_BASE_URL` is hardcoded instead of using Vite's environment variables (`import.meta.env.VITE_API_URL || "http://localhost:5000/api"`).
- **Impact:** Breaks immediately when deploying to staging or production environments.

---

### 3.2 Timezone / Date Consistency Mismatches
- **Location:**
  - `appointmentRoutes.js`: Uses `Asia/Kolkata` with format `YYYY-MM-DD` (`en-CA` locale).
  - `BookAppointment.jsx`: Uses `new Date().toISOString().slice(0, 10)` (UTC date).
  - `Dashboard.jsx`: Uses `toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" })` in doctor view, but UTC `toISOString().slice(0, 10)` in admin view line 410.
- **Impact:** Around midnight UTC / IST (between 12:00 AM and 5:30 AM IST), appointments booked on the frontend could fall on a different calendar date compared to the backend's IST date calculation, leading to queue mismatches and hidden appointments.

---

### 3.3 `callNextPatient` Date Parameter Missing on Default Dashboard Trigger
- **Location:** [Dashboard.jsx](file:///c:/Users/jains/OneDrive/Desktop/pe_project_test/patient-management/src/pages/Dashboard.jsx#L496-L506) vs [Dashboard.jsx](file:///c:/Users/jains/OneDrive/Desktop/pe_project_test/patient-management/src/pages/Dashboard.jsx#L203-L211)
- **Issue:**
  `Dashboard.jsx` has two definitions of `handleCallNext`:
  1. Top-level in `Dashboard` (line 496):
     ```javascript
     const handleCallNext = async () => {
       const result = await callNextPatient(); // passes no date
       ...
     ```
  2. Inner in `DoctorDashboard` (line 203):
     ```javascript
     const handleCallNext = async () => {
       const result = await callNextPatient(selectedDate);
       ...
     ```
  In `DoctorDashboard` line 394, the "Call Next Patient" button at the bottom calls the inner `handleCallNext`, but `onCallNext` passed from the parent is bypassed, creating duplicate and divergent logic.

---

### 3.4 Missing Validation for Consultation Form in `DoctorDashboard`
- **Location:** [Dashboard.jsx](file:///c:/Users/jains/OneDrive/Desktop/pe_project_test/patient-management/src/pages/Dashboard.jsx#L187) & [consultationRoutes.js](file:///c:/Users/jains/OneDrive/Desktop/pe_project_test/patient-management/backend/routes/consultationRoutes.js#L52-L63)
- **Issue:**
  The backend strictly requires:
  ```javascript
  for (const medicine of cleanMedicines) {
    if (!medicine || typeof medicine.name !== "string" || !medicine.name.trim()) {
      return res.status(400).json({ success: false, message: "Every medicine must have a valid name." });
    }
  }
  ```
  In `Dashboard.jsx`, the consultation form initializes `medicines` with an empty medicine object:
  ```javascript
  medicines: [{ name: "", dosage: "", duration: "" }]
  ```
  If the doctor completes the consultation without filling or removing this blank medicine row, the backend rejects it with `400: Every medicine must have a valid name`.

---

### 3.5 Discharged Patient History Does Not Show Appointment Token
- **Location:** [Discharged.jsx](file:///c:/Users/jains/OneDrive/Desktop/pe_project_test/patient-management/src/pages/Discharged.jsx#L89-L100) vs [dischargeRoutes.js](file:///c:/Users/jains/OneDrive/Desktop/pe_project_test/patient-management/backend/routes/dischargeRoutes.js#L127-L133)
- **Issue:**
  `dischargeRoutes.js` populates `patientId` and `doctorId`, but does not populate `appointmentId`. The frontend cannot display which appointment token or date the discharge was associated with.

---

## 4. Feature-by-Feature Integration Matrix

| Feature / Page | Backend Endpoint | Status | Issues Identified |
|---|---|---|---|
| **Auth / Login** (`Login.jsx`) | `POST /api/auth/login` | Working | Works as expected. |
| **Auth / Signup** (`Signup.jsx`) | `POST /api/auth/register` | Working | Patient and Doctor registration functional. |
| **Doctor Verification** (`DoctorVerification.jsx`) | `GET /api/admin/pending-doctors`, `PATCH /api/admin/doctors/:id/verify` | Partial Bug | `isVerified` only updated on `User`, not synced with `Doctor` query in doctorRoutes. |
| **Appointment Booking** (`BookAppointment.jsx`) | `GET /api/departments`, `GET /api/follow-ups`, `POST /api/appointments` | Partial Bug | Admin booking sends `User._id` instead of `Patient._id`. |
| **Patient Directory** (`Home.jsx`) | `GET /api/patients` (Admin), `GET /api/patients/doctor` (Doctor) | Working | Role-based data loading functions correctly. |
| **Patient Registration** (`AddPatient.jsx`) | `POST /api/patients` | **Broken** | Disconnected; writes only to browser `localStorage`. |
| **Patient Details** (`PatientDetails.jsx`) | `GET /api/patients/:id`, `GET /api/patients/me`, `GET /api/consultations/patient/:id` | Working with Minor UI Flaw | Discharge button shown to patients who cannot discharge. |
| **Patient Profile** (`MyProfile.jsx`) | `GET /api/patients/me`, `GET /api/consultations/patient/:id` | Warning | Duplicate fetch call and fragile error handling. |
| **Queue & Consultation** (`Dashboard.jsx`) | `GET /api/appointments`, `POST /api/appointments/call-next`, `POST /api/consultations` | Working with Minor Flaw | Blank medicine input causes 400 validation error on save. |
| **Discharge Patient** (`LeavePatient.jsx`) | `GET /api/patients/:id`, `POST /api/discharges/:patientId` | Working | Correctly links vitals, prescription, and updates appointment status. |
| **Discharged History** (`Discharged.jsx`) | `GET /api/discharges` | Working | Fetches and renders successfully. |
| **Activity Timeline** (`Activity.jsx`) | `GET /api/activities` | Working | Aggregates appointments, consultations, and discharges. |
| **Settings / Reports** (`Reports.jsx`) | No backend endpoint | **Broken** | Pure `localStorage` mockup; does not persist or read backend departments/doctors. |

---

## 5. Recommended Action Plan for Later Fixes

1. **Fix `AddPatient.jsx`:**
   - Replace `localStorage` handlers with `createApiPatient` from `apiService.js`.
2. **Fix `BookAppointment.jsx`:**
   - In admin mode, provide a patient search/select dropdown to send the actual `patient._id`.
3. **Fix Doctor Verification Query:**
   - Ensure `adminRoutes.js` and `doctorRoutes.js` query and update the same model/field consistently.
4. **Clean up `apiService.js` error parsing:**
   - Attempt `await response.json()` first to extract `data.message` before falling back to `response.text()`.
5. **Clean up `MyProfile.jsx`:**
   - Consolidate the double fetch in `useEffect` into a single, clean `try/catch/finally` block.
6. **Sanitize `Dashboard.jsx` Medicines Array:**
   - Filter out empty `{ name: "" }` entries before calling `recordConsultation`.
7. **Introduce Environment Variable for `API_BASE_URL`:**
   - Use `import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api"`.
8. **Hide Doctor/Admin Actions on `PatientDetails.jsx`:**
   - Render the "Discharge Patient" button only when `user.role === "admin" || user.role === "doctor"`.

