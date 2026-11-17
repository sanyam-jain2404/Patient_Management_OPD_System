import Department from "../models/Department.js";

export const getDepartments = async (req, res) => {
    try {
        const departments = await Department.find({ isActive: true }).sort({ name: 1 });
        res.status(200).json({
            success: true,
            count: departments.length,
            data: departments
        });
    } catch {
        res.status(500).json({
            success: false,
            message: "Unable to fetch departments"
        });
    }
};

export const createDepartment = async (req, res) => {
    try {
        const { name, description } = req.body;
        if (!name) {
            return res.status(400).json({
                success: false,
                message: "Department name is required"
                }
            );
        }
        const department = await Department.create({ name, description });
        res.status(201).json({
            success: true,
            data: department
        });
    } catch {
        res.status(500).json({
            success: false,
            message: "Unable to create department"
        });
    }
};
