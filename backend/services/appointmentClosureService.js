import Appointment from "../models/Appointment.js";
import Doctor from "../models/Doctor.js";

const INDIA_TIME_ZONE = "Asia/Kolkata";
const UNCOMPLETED_STATUSES = [
    "Booked",
    "Waiting"
];

function getIndiaDateTime(date = new Date()) {
    const parts = new Intl.DateTimeFormat("en-GB", {
        timeZone: INDIA_TIME_ZONE,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false
    }).formatToParts(date);

    return Object.fromEntries(
        parts
            .filter(({ type }) => type !== "literal")
            .map(({ type, value }) => [type, value])
    );
}

/**
 * Cancel appointments that are still incomplete after each doctor's OPD closes.
 * Doctors without a configured weekly schedule are left unchanged.
 */
export async function cancelAppointmentsAtOpdClose(now = new Date()) {
    const current = getIndiaDateTime(now);
    const date = `${current.year}-${current.month}-${current.day}`;
    const time = `${current.hour}:${current.minute}`;
    const dayOfWeek = new Date(`${date}T00:00:00.000Z`).getUTCDay();
    const doctors = await Doctor.find({}).select(
        "_id weeklySchedule availabilityExceptions"
    );

    let cancelledCount = 0;

    for (const doctor of doctors) {
        const exception = (doctor.availabilityExceptions || []).find(
            item => item.date === date
        );

        let closingTime;

        if (exception) {
            if (!exception.isAvailable) continue;
            closingTime = exception.endTime;
        } else {
            const schedule = (doctor.weeklySchedule || []).find(
                item => item.dayOfWeek === dayOfWeek
            );

            if (!schedule || !schedule.isWorking) continue;
            closingTime = schedule.endTime;
        }

        if (!closingTime || time < closingTime) continue;

        const result = await Appointment.updateMany(
            {
                doctorId: doctor._id,
                appointmentDate: date,
                status: { $in: UNCOMPLETED_STATUSES }
            },
            {
                $set: {
                    status: "Cancelled",
                    cancelledAt: now,
                    cancelReason: "Automatically cancelled at OPD closing time"
                }
            }
        );

        cancelledCount += result.modifiedCount;
    }

    return {
        date,
        cancelledCount
    };
}

export default cancelAppointmentsAtOpdClose;
