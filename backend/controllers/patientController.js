import Patient from "../models/Patient.js";
import Doctor from "../models/Doctor.js";
import Appointment from "../models/Appointment.js";
import Consultation from "../models/Consultation.js";
import Discharge from "../models/Discharge.js";
import mongoose from "mongoose";
import { ok, created, badRequest, forbidden, notFound, conflict, serverError } from "../utils/respond.js";

export const getOwnProfile = async (req, res) => {
    try {
        const patient = await Patient.findOne({ userId: req.user._id });

        if (!patient) return notFound(res, "Patient profile not found");

        return ok(res, { data: patient });
    } catch {
        return serverError(res, "Unable to fetch patient profile");
    }
};

export const getDoctorPatients = async (req, res) => {
    try {
        const doctor = await Doctor.findOne({ userId: req.user._id });

        if (!doctor) return notFound(res, "Doctor profile not found");

        const appointments = await Appointment.find({ doctorId: doctor._id })
            .populate("patientId", "name age gender phone address")
            .populate("departmentId", "name")
            .populate({ path: "doctorId", populate: { path: "userId", select: "name" } })
            .sort({ bookedAt: -1 });

        const appointmentIds = appointments.map(a => a._id);

        const consultationIds = await Consultation.distinct("appointmentId", {
            appointmentId: { $in: appointmentIds },
            isDeleted: { $ne: true }
        });

        const dischargedIds = await Discharge.distinct("appointmentId", {
            appointmentId: { $in: appointmentIds }
        });

        const consultationSet = new Set(consultationIds.map(id => id.toString()));
        const dischargedSet = new Set(dischargedIds.map(id => id.toString()));

        const uniquePatients = new Map();

        appointments.forEach((appointment) => {
            const patient = appointment.patientId;
            if (!patient) return;

            const patientId = patient._id.toString();
            const appointmentId = appointment._id.toString();

            const canDischarge =
                consultationSet.has(appointmentId) &&
                !dischargedSet.has(appointmentId) &&
                !["Cancelled", "No Show", "Discharged"].includes(appointment.status);

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
                    disease: appointment.reason || appointment.symptoms || "—",
                    doctor: appointment.doctorId?.userId?.name || "Doctor",
                    department: appointment.departmentId?.name || "Unknown Department",
                    date: appointment.appointmentDate,
                    priority: appointment.priority === "Emergency" ? "Critical" : "Low",
                    appointmentId,
                    appointmentStatus: appointment.status,
                    canDischarge
                });
            }
        });

        const patients = Array.from(uniquePatients.values());

        return ok(res, { count: patients.length, data: patients });

    } catch (error) {
        console.error("Doctor patients error:", error);
        return serverError(res, "Unable to fetch doctor patients");
    }
};

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
            return badRequest(res, "Page must be at least 1 and limit must be between 1 and 100");
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

        if (hasPagination) patientQuery.skip((page - 1) * limit).limit(limit);

        const patients = await patientQuery;

        return ok(res, {
            count: total, total,
            currentPage: hasPagination ? page : 1,
            limit: hasPagination ? limit : total,
            totalPages: hasPagination ? Math.ceil(total / limit) : 1,
            data: patients
        });
    } catch {
        return serverError(res, "Unable to fetch patients");
    }
};

export const getPatientById = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.isValidObjectId(id)) return badRequest(res, "Invalid patient ID");

        const patient = await Patient.findById(id);

        if (!patient) return notFound(res, "Patient not found");

        if (req.user.role === "doctor") {
            const doctor = await Doctor.findOne({ userId: req.user._id });

            if (!doctor) return forbidden(res, "Doctor profile not found");

            const hasAppointment = await Appointment.exists({ patientId: patient._id, doctorId: doctor._id });

            if (!hasAppointment) return forbidden(res, "You are not authorized to view this patient");
        }

        return ok(res, { data: patient });

    } catch (error) {
        console.error("Fetch patient error:", error.message);
        return serverError(res, "Unable to fetch patient");
    }
};

export const createPatient = async (req, res) => {
    try {
        const { name, age, gender, phone, address, bloodGroup, medicalHistory } = req.body;

        if (!name?.trim() || age === undefined || age === null || age === "" || !gender || !phone?.trim()) {
            return badRequest(res, "Name, age, gender and phone are required");
        }

        const existingPatient = await Patient.findOne({ phone: phone.trim() });

        if (existingPatient) return conflict(res, "Patient with this phone number already exists");

        const patient = await Patient.create({
            name: name.trim(),
            age: Number(age),
            gender,
            phone: phone.trim(),
            bloodGroup: bloodGroup || "",
            address: address?.trim() || "",
            medicalHistory: medicalHistory?.trim() || ""
        });

        return created(res, { message: "Patient registered successfully", data: patient });

    } catch (error) {
        console.error("Patient registration error:", error);
        if (error.name === "ValidationError") return badRequest(res, error.message);
        return serverError(res, "Unable to register patient");
    }
};

export const updatePatient = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.isValidObjectId(id)) return badRequest(res, "Invalid patient ID");

        const patient = await Patient.findById(id);

        if (!patient) return notFound(res, "Patient not found");

        const { name, age, gender, phone, address, bloodGroup, medicalHistory } = req.body;

        if (phone && phone.trim() !== patient.phone) {
            const existingPatient = await Patient.findOne({ phone: phone.trim(), _id: { $ne: id } });
            if (existingPatient) return conflict(res, "Phone number already belongs to another patient");
        }

        if (name !== undefined) patient.name = name.trim();
        if (age !== undefined) patient.age = Number(age);
        if (gender !== undefined) patient.gender = gender;
        if (phone !== undefined) patient.phone = phone.trim();
        if (address !== undefined) patient.address = address.trim();
        if (bloodGroup !== undefined) patient.bloodGroup = bloodGroup;
        if (medicalHistory !== undefined) patient.medicalHistory = medicalHistory;

        await patient.save();

        return ok(res, { message: "Patient updated successfully", data: patient });

    } catch (error) {
        console.error("Update patient error:", error);
        if (error.name === "ValidationError") return badRequest(res, error.message);
        return serverError(res, "Unable to update patient");
    }
};
