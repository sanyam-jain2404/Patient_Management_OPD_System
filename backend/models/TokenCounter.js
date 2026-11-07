import mongoose from "mongoose";

/**
 * TokenCounter
 * Stores the last token number issued per doctor per day.
 * This makes token allocation atomic and race-safe when used with
 * MongoDB's `findAndModify` (findOneAndUpdate) inside a transaction.
 */
const tokenCounterSchema = new mongoose.Schema(
    {
        doctorId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Doctor",
            required: true,
            index: true
        },
        date: {
            type: String, // YYYY-MM-DD (local date)
            required: true,
            index: true
        },
        lastToken: {
            type: Number,
            required: true,
            default: 0
        }
    },
    {
        timestamps: true
    }
);

// Compound unique index: one counter row per doctor per day
tokenCounterSchema.index({ doctorId: 1, date: 1 }, { unique: true });

const TokenCounter = mongoose.model("TokenCounter", tokenCounterSchema);
export default TokenCounter;