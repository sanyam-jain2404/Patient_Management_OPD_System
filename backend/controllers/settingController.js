import SystemSetting from "../models/SystemSetting.js";

export const getSettings = async (req, res) => {
    try {
        const settings = await SystemSetting.findOne({ key: "default" }).lean();
        return res.status(200).json({
            success: true,
            data: settings || {
                hospitalName: "City OPD Clinic",
                doctorName: "Dr. Sharma",
                city: "New Delhi",
                phone: "",
                capacity: 50,
                doctors: [
                    "General Physician",
                    "Cardiologist",
                    "Dermatologist",
                    "Orthopedic",
                    "Neurologist",
                    "Pediatrician",
                    "ENT Specialist"
                ]
            }
        });
    } catch (error) {
        console.error("Fetch system settings error:", error.message);
        return res.status(500).json({
            success: false,
            message: "Unable to fetch system settings"
        });
    }
};

export const updateSettings = async (req, res) => {
    try {
        const { hospitalName, doctorName, city, phone, capacity, doctors } = req.body;

        if (!hospitalName?.trim() || !doctorName?.trim() || !city?.trim()) {
            return res.status(400).json({
                success: false,
                message: "Hospital name, doctor name, and city are required"
            });
        }

        if (!Number.isInteger(Number(capacity)) || Number(capacity) < 1) {
            return res.status(400).json({
                success: false,
                message: "Capacity must be a positive whole number"
            });
        }

        if (
            !Array.isArray(doctors) ||
            doctors.some((doctor) => typeof doctor !== "string" || !doctor.trim())
        ) {
            return res.status(400).json({
                success: false,
                message: "Doctors must be a list of non-empty names"
            });
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
                    doctors: [...new Set(doctors.map((doctor) => doctor.trim()))]
                }
            },
            {
                new: true,
                upsert: true,
                runValidators: true,
                setDefaultsOnInsert: true
            }
        );

        return res.status(200).json({
            success: true,
            message: "Settings saved successfully",
            data: settings
        });
    } catch (error) {
        console.error("Update system settings error:", error.message);
        return res.status(500).json({
            success: false,
            message: "Unable to save system settings"
        });
    }
};
