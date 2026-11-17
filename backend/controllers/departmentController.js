import Department from "../models/Department.js";
import { ok, created, badRequest, serverError } from "../utils/respond.js";

export const getDepartments = async (req, res) => {
    try {
        const departments = await Department.find({ isActive: true }).sort({ name: 1 });
        return ok(res, { count: departments.length, data: departments });
    } catch {
        return serverError(res, "Unable to fetch departments");
    }
};

export const createDepartment = async (req, res) => {
    try {
        const { name, description } = req.body;

        if (!name) return badRequest(res, "Department name is required");

        const department = await Department.create({ name, description });
        return created(res, { data: department });
    } catch {
        return serverError(res, "Unable to create department");
    }
};
