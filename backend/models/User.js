import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true
        },
        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
            index: true
        },
        password: {
            type: String,
            required: true,
            select: false
        },
        role: {
            type: String,
            enum: ["patient", "doctor", "admin"],
            default: "patient",
            index: true
        },
        isVerified: {
            type: Boolean,
            default: false,
            index: true
        },
        specialization: {
            type: String,
            trim: true,
            required: function () {
                return this.role === "doctor";
            }
        },
        departmentId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Department"
        },
        isAvailable: {
            type: Boolean,
            default: true
        },
        qualification: {
            type: String,
            trim: true,
            default: ""
        },
        experience: {
            type: Number,
            min: 0,
            default: 0
        },
        consultationDuration: {
            type: Number,
            default: 10,
            min: 1
        },
        phone: {
            type: String,
            trim: true,
            default: ""
        },
        avatar: {
            type: String,
            trim: true,
            default: ""
        }
    },
    {
        timestamps: true
    }
);

const User = mongoose.model("User", userSchema);
export default User;