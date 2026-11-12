const API_BASE_URL = "http://localhost:5000/api";

const getHeaders = () => {
  const token = localStorage.getItem("token");
  const headers = {
    "Content-Type": "application/json",
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
};

export const apiRequest = async (endpoint, method = "GET", data = null) => {
  const config = {
    method,
    headers: getHeaders(),
  };

  if (data) {
    config.body = JSON.stringify(data);
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, config);

  // Check for HTTP errors before parsing JSON
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || "Something went wrong");
  }

  const result = await response.json();
  return result;
};

// Auth services
export const login = async (credentials) => {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(credentials),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message);
  return data;
};

export const register = async (userData) => {
  const response = await fetch(`${API_BASE_URL}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(userData),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message);
  return data;
};

export const fetchMe = async () => {
  return await apiRequest("/auth/me");
};

// Appointment services
export const bookAppointment = async (appointmentData) => {
  return await apiRequest("/appointments", "POST", appointmentData);
};

export const fetchAppointments = async (params = {}) => {
  let endpoint = "/appointments";
  const query = new URLSearchParams(params).toString();
  if (query) endpoint += `?${query}`;
  return await apiRequest(endpoint);
};

export const updateAppointmentStatus = async (id, statusData) => {
  return await apiRequest(`/appointments/${id}/status`, "PATCH", statusData);
};
export const callNextPatient = async (date) => {
    return await apiRequest(
        "/appointments/call-next",
        "POST",
        date ? { date } : {}
    );
};


// Department services
export const fetchDepartments = async () => {
  return await apiRequest("/departments");
};

// Doctor services
export const fetchDoctors = async (params = {}) => {
  let endpoint = "/doctors";
  const query = new URLSearchParams(params).toString();
  if (query) endpoint += `?${query}`;
  return await apiRequest(endpoint);
};

export const fetchMyDoctorProfile = async () => {
  return await apiRequest("/doctors/me");
};

// Consultation services
export const recordConsultation = async (consultationData) => {
  return await apiRequest("/consultations", "POST", consultationData);
};

export const fetchPatientTreatmentHistory = async (patientId) => {
  return await apiRequest(`/consultations/patient/${patientId}`);
};

// Follow-up services
export const fetchMyFollowUps = async () => {
  return await apiRequest("/follow-ups");
};
// Patient services

export const fetchApiPatients = async () => {
  return await apiRequest("/patients");
};

export const fetchDoctorPatients = async () => {
  return await apiRequest("/patients/doctor");
};

export const createApiPatient = async (patientData) => {
  return await apiRequest("/patients", "POST", patientData);
};

export const fetchApiPatientById = async (id) => {
  return await apiRequest(`/patients/${id}`);
};

// Fetch logged-in patient's own profile
export const fetchMyPatientProfile = async () => {
  return await apiRequest("/patients/me");
};

export const updateApiPatient = async (id, patientData) => {
  return await apiRequest(`/patients/${id}`, "PUT", patientData);
};

export const deleteApiPatient = async (id) => {
  return await apiRequest(`/patients/${id}`, "DELETE");
};

// Activity services
export const fetchActivities = async () => {
  return await apiRequest("/activities");
};

export const createDischarge = async (patientId, dischargeData) => {
  return await apiRequest(`/discharges/${patientId}`, "POST", dischargeData);
};

export const fetchDischargedPatients = async () => {
  return await apiRequest("/discharges");
};
