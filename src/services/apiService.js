const DISEASES  = ["Hypertension", "Diabetes", "Asthma", "Common Cold", "Influenza", "Gastritis", "Anemia", "Migraine", "Typhoid", "Dermatitis"];
const DOCTORS   = ["General Physician", "Cardiologist", "Dermatologist", "Orthopedic", "Neurologist", "Pediatrician", "ENT Specialist"];
const BLOOD_GROUPS = ["A+", "A−", "B+", "B−", "AB+", "AB−", "O+", "O−"];
const PRIORITIES   = ["Low", "Medium", "High", "Critical"];
const GENDERS      = ["Male", "Female"];

// Fallback static data in case the API is unavailable
const FALLBACK_USERS = [
  { id: 1, name: "Rahul Sharma",    phone: "9876543210" },
  { id: 2, name: "Priya Verma",     phone: "9812345678" },
  { id: 3, name: "Amit Kumar",      phone: "9823456789" },
  { id: 4, name: "Sunita Patel",    phone: "9834567890" },
  { id: 5, name: "Deepak Singh",    phone: "9845678901" },
  { id: 6, name: "Kavya Nair",      phone: "9856789012" },
  { id: 7, name: "Rajesh Gupta",    phone: "9867890123" },
  { id: 8, name: "Ananya Mishra",   phone: "9878901234" },
  { id: 9, name: "Vikram Yadav",    phone: "9889012345" },
  { id: 10, name: "Meera Joshi",    phone: "9890123456" },
];

function mapUsers(users) {
  return users.map(u => ({
    id: 1000 + u.id,
    name: u.name,
    age: Math.floor(Math.random() * 60) + 18,
    gender: GENDERS[Math.floor(Math.random() * GENDERS.length)],
    blood: BLOOD_GROUPS[Math.floor(Math.random() * BLOOD_GROUPS.length)],
    contact: String(u.phone).replace(/[^\d+]/g, "").slice(0, 10),
    disease: DISEASES[Math.floor(Math.random() * DISEASES.length)],
    doctor: DOCTORS[Math.floor(Math.random() * DOCTORS.length)],
    date: new Date().toISOString().slice(0, 10),
    priority: PRIORITIES[Math.floor(Math.random() * PRIORITIES.length)],
    notes: "Fetched from external clinical registry.",
  }));
}

export const fetchApiPatients = async () => {
  try {
    const response = await fetch("https://jsonplaceholder.typicode.com/users");
    if (!response.ok) throw new Error(`API responded with ${response.status}`);
    const users = await response.json();
    return mapUsers(users);
  } catch (error) {
    console.warn("API unavailable, using local fallback data.", error.message);
    return mapUsers(FALLBACK_USERS);   // ← always works offline
  }
};
