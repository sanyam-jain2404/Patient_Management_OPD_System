import SystemSetting from "../models/SystemSetting.js";
import { ok, badRequest, serverError } from "../utils/respond.js";

export const getSettings = async (req, res) => {
    try {
        const settings = await SystemSetting.findOne({ key: "default" }).lean();
        return ok(res, {
            data: settings || {
                hospitalName: "City OPD Clinic",
                doctorName: "Dr. Sharma",
                city: "New Delhi",
                phone: "",
                capacity: 50,
                doctors: ["General Physician", "Cardiologist", "Dermatologist", "Orthopedic", "Neurologist", "Pediatrician", "ENT Specialist"]
            }
        });
    } catch (error) {
        console.error("Fetch system settings error:", error.message);
        return serverError(res, "Unable to fetch system settings");
    }
};

export const updateSettings = async (req, res) => {
    try {
        const { hospitalName, doctorName, city, phone, capacity, doctors } = req.body;

        if (!hospitalName?.trim() || !doctorName?.trim() || !city?.trim()) {
            return badRequest(res, "Hospital name, doctor name, and city are required");
        }

        if (!Number.isInteger(Number(capacity)) || Number(capacity) < 1) {
            return badRequest(res, "Capacity must be a positive whole number");
        }

        if (!Array.isArray(doctors) || doctors.some(d => typeof d !== "string" || !d.trim())) {
            return badRequest(res, "Doctors must be a list of non-empty names");
        }

        const settings = await SystemSetting.findOneAndUpdate(
            { key: "default" },
            {
                $set: {
                    hospitalName: hospitalName.trim(),
                    doctorName: doctorName.trim(),
                    city: city.trim(),
                    phone: phone?.trim() || "",
                    capacity: Number(capacity),
                    doctors: [...new Set(doctors.map(d => d.trim()))]
                }
            },
            { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
        );

        return ok(res, { message: "Settings saved successfully", data: settings });

    } catch (error) {
        console.error("Update system settings error:", error.message);
        return serverError(res, "Unable to save system settings");
    }
};
