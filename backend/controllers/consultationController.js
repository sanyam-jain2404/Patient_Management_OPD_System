import mongoose from "mongoose";
import Consultation from "../models/Consultation.js";
import Appointment from "../models/Appointment.js";
import FollowUp from "../models/FollowUp.js";
import Doctor from "../models/Doctor.js";
import { recalculateDoctorQueue } from "../services/queueService.js";

export const recordConsultation = async (req, res) => {
    const session = await mongoose.startSession();

    try {
        const {
            appointmentId,
            diagnosis,
            treatment,
            notes,
            medicines,
            followUpRecommendation,
            followUpDate,
            doctorNotes
        } = req.body;

        // Basic validation
        if (!appointmentId || !diagnosis?.trim()) {
            return res.status(400).json({
                success: false,
                message: "Appointment ID and diagnosis are required."
            });
        }

        if (!mongoose.isValidObjectId(appointmentId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid appointment ID."
            });
        }

        if (medicines !== undefined && !Array.isArray(medicines)) {
            return res.status(400).json({
                success: false,
                message: "Medicines must be an array."
            });
        }

        const cleanMedicines = medicines || [];

        for (const medicine of cleanMedicines) {
            if (
                !medicine ||
                typeof medicine.name !== "string" ||
                !medicine.name.trim()
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Every medicine must have a valid name."
                });
            }
        }

        let parsedFollowUpDate;

        if (followUpDate) {
            parsedFollowUpDate = new Date(followUpDate);

            if (
                Number.isNaN(parsedFollowUpDate.getTime()) ||
                parsedFollowUpDate <= new Date()
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Follow-up date must be a valid future date."
                });
            }
        }

        const doctorRecord = await Doctor.findOne({
            userId: req.user._id
        });

        if (!doctorRecord) {
            return res.status(404).json({
                success: false,
                message: "Doctor profile not found."
            });
        }

        let savedConsultation;
        let completedDoctorId;
        let completedAppointmentDate;

        // Database transaction
        await session.withTransaction(async () => {

            const appointment = await Appointment.findOne({
                _id: appointmentId,
                doctorId: doctorRecord._id
            }).session(session);

            if (!appointment) {
                const error = new Error(
                    "Appointment not found or not assigned to you."
                );
                error.statusCode = 404;
                throw error;
            }
            // Prevent consultation before scheduled appointment date
            const today = new Date().toLocaleDateString("en-CA", {
                timeZone: "Asia/Kolkata"
            });

            if (appointment.appointmentDate > today) {
                const error = new Error(
                    "Cannot complete consultation before the scheduled appointment date."
                );
                error.statusCode = 403;
                throw error;
            }

            // Patient must already be called by the doctor
            if (appointment.status !== "In Consultation") {
                const error = new Error(
                    "Patient must be in consultation before completing it."
                );
                error.statusCode = 409;
                throw error;
            }

            const existing = await Consultation.findOne({
                appointmentId
            }).session(session);

            if (existing) {
                const error = new Error(
                    "Consultation already exists for this appointment."
                );
                error.statusCode = 409;
                throw error;
            }

            // Create consultation record
            const [consultation] = await Consultation.create(
                [{
                    patientId: appointment.patientId,
                    doctorId: doctorRecord._id,
                    appointmentId: appointment._id,
                    departmentId: appointment.departmentId,
                    consultationDate: new Date(),
                    symptoms: appointment.symptoms || "",
                    diagnosis: diagnosis.trim(),
                    treatment: treatment?.trim() || "",
                    notes: (notes ?? doctorNotes)?.trim() || "",
                    medicines: cleanMedicines.map(medicine => ({
                        name: medicine.name.trim(),
                        dosage: medicine.dosage || "",
                        duration: medicine.duration || "",
                        frequency: medicine.frequency || "",
                        instructions: medicine.instructions || ""
                    })),
                    followUpRecommendation:
                        followUpRecommendation?.trim() || "",
                    followUpDate: parsedFollowUpDate
                }],
                { session }
            );

            // Complete appointment
            appointment.status = "Completed";
            appointment.consultationEndedAt = new Date();

            await appointment.save({ session });

            // Complete linked follow-up record
            if (appointment.followUpOf || appointment.followUpId) {
                const followUpFilter = appointment.followUpId
                    ? {
                        _id: appointment.followUpId,
                        appointmentId: appointment._id
                    }
                    : {
                        appointmentId: appointment._id
                    };

                const completedFollowUp =
                    await FollowUp.findOneAndUpdate(
                        {
                            ...followUpFilter,
                            patientId: appointment.patientId,
                            doctorId: doctorRecord._id,
                            status: "Appointment Booked"
                        },
                        {
                            $set: {
                                status: "Completed",
                                completedAt: new Date()
                            }
                        },
                        {
                            new: true,
                            session
                        }
                    );

                if (!completedFollowUp) {
                    const error = new Error(
                        "Linked follow-up record not found or already updated."
                    );
                    error.statusCode = 409;
                    throw error;
                }
            }


            // Save details for queue recalculation
            completedDoctorId = appointment.doctorId;
            completedAppointmentDate = appointment.appointmentDate;

            // Create follow-up reminder if required
            if (parsedFollowUpDate) {
                await FollowUp.create(
                    [{
                        patientId: appointment.patientId,
                        doctorId: doctorRecord._id,
                        consultationId: consultation._id,
                        instructions:
                            followUpRecommendation?.trim() ||
                            "Follow-up visit recommended",
                        dueDate: parsedFollowUpDate
                    }],
                    { session }
                );
            }

            savedConsultation = consultation;
        });

        // Recalculate queue after successful transaction
        try {
            await recalculateDoctorQueue(
                completedDoctorId,
                completedAppointmentDate
            );
        } catch (queueError) {
            console.error(
                "Queue recalculation failed:",
                queueError.message
            );
        }

        return res.status(201).json({
            success: true,
            message: "Consultation completed successfully.",
            data: savedConsultation
        });

    } catch (error) {
        console.error("Record consultation error:", error);

        return res.status(error.statusCode || 500).json({
            success: false,
            message: error.statusCode
                ? error.message
                : "Unable to record consultation."
        });

    } finally {
        await session.endSession();
    }
};

export const getPatientHistory = async (req, res) => {
    try {
        const { patientId } = req.params;

        if (!mongoose.isValidObjectId(patientId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid patient ID."
            });
        }

        // Patient can only view their own history
        if (req.user.role === "patient") {
            const Patient = (await import("../models/Patient.js")).default;

            const patientRecord = await Patient.findOne({
                userId: req.user._id
            });

            if (!patientRecord || patientRecord._id.toString() !== patientId) {
                return res.status(403).json({
                    success: false,
                    message: "Access denied."
                });
            }
        }

        // Doctor can only view patients assigned to them
        if (req.user.role === "doctor") {
            const doctorRecord = await Doctor.findOne({
                userId: req.user._id
            });

            if (!doctorRecord) {
                return res.status(403).json({
                    success: false,
                    message: "Doctor profile not found."
                });
            }

            const hasAppointment = await Appointment.exists({
                patientId,
                doctorId: doctorRecord._id
            });

            if (!hasAppointment) {
                return res.status(403).json({
                    success: false,
                    message: "You are not authorized to view this history."
                });
            }
        }

        const {
            page: pageParam,
            limit: limitParam
        } = req.query;
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

        const query = {
            patientId,
            isDeleted: false
        };
        const total = await Consultation.countDocuments(query);
        const consultationQuery = Consultation.find(query)
            .populate({
                path: "doctorId",
                populate: {
                    path: "userId",
                    select: "name"
                }
            })
            .populate("departmentId", "name")
            .sort({ consultationDate: -1 });

        if (hasPagination) {
            consultationQuery.skip((page - 1) * limit).limit(limit);
        }

        const consultations = await consultationQuery;

        return res.status(200).json({
            success: true,
            count: total,
            total,
            currentPage: hasPagination ? page : 1,
            limit: hasPagination ? limit : total,
            totalPages: hasPagination ? Math.ceil(total / limit) : 1,
            data: consultations
        });

    } catch (error) {
        console.error("Fetch treatment history error:", error.message);

        return res.status(500).json({
            success: false,
            message: "Unable to fetch treatment history."
        });
    }
};
