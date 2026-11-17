import Patient from "../models/Patient.js";
import Doctor from "../models/Doctor.js";
import Appointment from "../models/Appointment.js";
import Consultation from "../models/Consultation.js";
import Discharge from "../models/Discharge.js";
import mongoose from "mongoose";

// GET /me — logged-in patient's own profile
export const getOwnProfile = async (req, res) => {
    try {
        const patient = await Patient.findOne({
            userId: req.user._id
        });

        if (!patient) {
            return res.status(404).json({
                success: false,
                message: "Patient profile not found"
            });
        }

        res.status(200).json({
            success: true,
            data: patient
        });

    } catch {
        res.status(500).json({
            success: false,
            message: "Unable to fetch patient profile"
        });
    }
};

// GET /doctor — doctor sees their patients
export const getDoctorPatients = async (req, res) => {
    try {
        const doctor = await Doctor.findOne({
            userId: req.user._id
        });

        if (!doctor) {
            return res.status(404).json({
                success: false,
                message: "Doctor profile not found"
            });
        }

        const appointments = await Appointment.find({
            doctorId: doctor._id
        })
            .populate("patientId", "name age gender phone address")
            .populate("departmentId", "name")
            .populate({
                path: "doctorId",
                populate: {
                    path: "userId",
                    select: "name"
                }
            })
            .sort({ bookedAt: -1 });

        const appointmentIds = appointments.map(a => a._id);

        // Find appointments with saved consultations
        const consultationIds = await Consultation.distinct(
            "appointmentId",
            {
                appointmentId: { $in: appointmentIds },
                isDeleted: { $ne: true }
            }
        );

        // Find appointments already discharged
        const dischargedIds = await Discharge.distinct(
            "appointmentId",
            {
                appointmentId: { $in: appointmentIds }
            }
        );

        const consultationSet = new Set(
            consultationIds.map(id => id.toString())
        );

        const dischargedSet = new Set(
            dischargedIds.map(id => id.toString())
        );

        // Keep only one entry per patient
        const uniquePatients = new Map();

        appointments.forEach((appointment) => {
            const patient = appointment.patientId;

            if (!patient) return;

            const patientId = patient._id.toString();
            const appointmentId = appointment._id.toString();

            // Latest appointment determines whether
            // discharge button should be visible
            const canDischarge =
                consultationSet.has(appointmentId) &&
                !dischargedSet.has(appointmentId) &&
                !["Cancelled", "No Show", "Discharged"].includes(
                    appointment.status
                );

            if (!uniquePatients.has(patientId)) {
                uniquePatients.set(patientId, {
                    id: patientId,
                    _id: patient._id,
                    name: patient.name,
                    age: patient.age,
                    gender: patient.gender,
                    phone: patient.phone,
                    contact: patient.phone,
                    address: patient.address,

                    disease:
                        appointment.reason ||
                        appointment.symptoms ||
                        "—",

                    doctor:
                        appointment.doctorId?.userId?.name ||
                        "Doctor",

                    // NEW PROPERTY
                    department:
                        appointment.departmentId?.name ||
                        "Unknown Department",

                    date: appointment.appointmentDate,

                    priority:
                        appointment.priority === "Emergency"
                            ? "Critical"
                            : "Low",

                    appointmentId,
                    appointmentStatus: appointment.status,
                    canDischarge
                });
            }
        });

        const patients = Array.from(uniquePatients.values());

        return res.status(200).json({
            success: true,
            count: patients.length,
            data: patients
        });

    } catch (error) {
        console.error("Doctor patients error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to fetch doctor patients"
        });
    }
};

// GET / — admin gets all patients
export const getAllPatients = async (req, res) => {
    try {
        const { page: pageParam, limit: limitParam, search } = req.query;
        const hasPagination = pageParam !== undefined || limitParam !== undefined;
        const page = pageParam === undefined ? 1 : Number.parseInt(pageParam, 10);
        const limit = limitParam === undefined ? 10 : Number.parseInt(limitParam, 10);

        if (
            (hasPagination && (!Number.isInteger(page) || page < 1)) ||
            (hasPagination && (!Number.isInteger(limit) || limit < 1 || limit > 100))
        ) {
            return res.status(400).json({
                success: false,
                message: "Page must be at least 1 and limit must be between 1 and 100"
            });
        }

        const query = {};
        if (search?.trim()) {
            const searchPattern = search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
            query.$or = [
                { name: { $regex: searchPattern, $options: "i" } },
                { phone: { $regex: searchPattern, $options: "i" } },
                { email: { $regex: searchPattern, $options: "i" } }
            ];
        }

        const total = await Patient.countDocuments(query);
        const patientQuery = Patient.find(query).sort({ createdAt: -1 });

        if (hasPagination) {
            patientQuery.skip((page - 1) * limit).limit(limit);
        }

        const patients = await patientQuery;

        res.status(200).json({
            success: true,
            count: total,
            total,
            currentPage: hasPagination ? page : 1,
            limit: hasPagination ? limit : total,
            totalPages: hasPagination ? Math.ceil(total / limit) : 1,
            data: patients
        });
    } catch {
        res.status(500).json({
            success: false,
            message: "Unable to fetch patients"
        });
    }
};

// GET /:id — get a specific patient's profile
export const getPatientById = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid patient ID"
            });
        }

        const patient = await Patient.findById(id);

        if (!patient) {
            return res.status(404).json({
                success: false,
                message: "Patient not found"
            });
        }

        // Doctor can only access patients
        // with whom they have an appointment.
        if (req.user.role === "doctor") {
            const doctor = await Doctor.findOne({
                userId: req.user._id
            });

            if (!doctor) {
                return res.status(403).json({
                    success: false,
                    message: "Doctor profile not found"
                });
            }

            const hasAppointment = await Appointment.exists({
                patientId: patient._id,
                doctorId: doctor._id
            });

            if (!hasAppointment) {
                return res.status(403).json({
                    success: false,
                    message: "You are not authorized to view this patient"
                });
            }
        }

        res.status(200).json({
            success: true,
            data: patient
        });

    } catch (error) {
        console.error("Fetch patient error:", error.message);

        res.status(500).json({
            success: false,
            message: "Unable to fetch patient"
        });
    }
};

// POST / — admin creates a patient
export const createPatient = async (req, res) => {
    try {
        const {
            name,
            age,
            gender,
            phone,
            address,
            bloodGroup,
            medicalHistory
        } = req.body;

        if (
            !name?.trim() ||
            age === undefined ||
            age === null ||
            age === "" ||
            !gender ||
            !phone?.trim()
        ) {
            return res.status(400).json({
                success: false,
                message: "Name, age, gender and phone are required"
            });
        }

        const existingPatient = await Patient.findOne({ phone: phone.trim() });

        if (existingPatient) {
            return res.status(409).json({
                success: false,
                message: "Patient with this phone number already exists"
            });
        }

        const patient = await Patient.create({
            name: name.trim(),
            age: Number(age),
            gender,
            phone: phone.trim(),
            bloodGroup: bloodGroup || "",
            address: address?.trim() || "",
            medicalHistory: medicalHistory?.trim() || ""
        });

        res.status(201).json({
            success: true,
            message: "Patient registered successfully",
            data: patient
        });

    } catch (error) {
        console.error("Patient registration error:", error);

        if (error.name === "ValidationError") {
            return res.status(400).json({
                success: false,
                message: error.message
            });
        }

        res.status(500).json({
            success: false,
            message: "Unable to register patient"
        });
    }
};

// PUT /:id — admin updates existing patient
export const updatePatient = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid patient ID"
            });
        }

        const patient = await Patient.findById(id);

        if (!patient) {
            return res.status(404).json({
                success: false,
                message: "Patient not found"
            });
        }

        const {
            name,
            age,
            gender,
            phone,
            address,
            bloodGroup,
            medicalHistory
        } = req.body;

        // Check whether another patient uses this phone
        if (phone && phone.trim() !== patient.phone) {
            const existingPatient = await Patient.findOne({
                phone: phone.trim(),
                _id: { $ne: id }
            });

            if (existingPatient) {
                return res.status(409).json({
                    success: false,
                    message: "Phone number already belongs to another patient"
                });
            }
        }

        // Update only fields supplied by the frontend
        if (name !== undefined) patient.name = name.trim();
        if (age !== undefined) patient.age = Number(age);
        if (gender !== undefined) patient.gender = gender;
        if (phone !== undefined) patient.phone = phone.trim();
        if (address !== undefined) patient.address = address.trim();
        if (bloodGroup !== undefined) patient.bloodGroup = bloodGroup;
        if (medicalHistory !== undefined) {
            patient.medicalHistory = medicalHistory;
        }

        await patient.save();

        res.status(200).json({
            success: true,
            message: "Patient updated successfully",
            data: patient
        });

    } catch (error) {
        console.error("Update patient error:", error);

        if (error.name === "ValidationError") {
            return res.status(400).json({
                success: false,
                message: error.message
            });
        }

        res.status(500).json({
            success: false,
            message: "Unable to update patient"
        });
    }
};
