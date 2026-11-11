
import Appointment from "../models/Appointment.js";
import Doctor from "../models/Doctor.js";

const ACTIVE_STATUSES = [
    "Booked",
    "Waiting",
    "In Consultation"
];

/**
 * Recalculate waiting time for all active appointments
 * of a particular doctor on a particular date.
 */
export async function recalculateDoctorQueue(doctorId, date) {
    const doctor = await Doctor.findById(doctorId);

    if (!doctor) {
        throw new Error("Doctor not found.");
    }

    const avgMinutes =
        doctor.avgConsultationMinutes ||
        doctor.consultationDuration ||
        10;

    const appointments = await Appointment.find({
        doctorId,
        appointmentDate: date,
        status: { $in: ACTIVE_STATUSES }
    });

    // Queue order:
    // 1. Already running consultation
    // 2. Emergency patients
    // 3. Normal patients
    // 4. Token number

    appointments.sort((a, b) => {
        if (a.status === "In Consultation") return -1;
        if (b.status === "In Consultation") return 1;

        if (a.priority !== b.priority) {
            return a.priority === "Emergency" ? -1 : 1;
        }

        return a.tokenNumber - b.tokenNumber;
    });

    const runningAppointment = appointments.find(
        appointment => appointment.status === "In Consultation"
    );

    let remainingMinutes = 0;

    if (runningAppointment) {
        const elapsedMinutes = runningAppointment.consultationStartedAt
            ? (
                Date.now() -
                new Date(
                    runningAppointment.consultationStartedAt
                ).getTime()
            ) / 60000
            : 0;

        remainingMinutes = Math.max(
            0,
            avgMinutes - elapsedMinutes
        );
    }

    let waitingAhead = 0;
    const operations = [];

    for (const appointment of appointments) {
        const isRunning =
            appointment.status === "In Consultation";

        const waitMinutes = isRunning
            ? 0
            : Math.round(
                remainingMinutes + waitingAhead * avgMinutes
            );

        const estimatedStartAt = isRunning
            ? appointment.consultationStartedAt
            : new Date(Date.now() + waitMinutes * 60000);

        operations.push({
            updateOne: {
                filter: { _id: appointment._id },
                update: {
                    $set: {
                        estimatedWaitMinutes: waitMinutes,
                        estimatedStartAt
                    }
                }
            }
        });

        if (!isRunning) {
            waitingAhead++;
        }
    }

    if (operations.length > 0) {
        await Appointment.bulkWrite(operations);
    }

    return {
        success: true,
        updatedCount: operations.length
    };
}

export default recalculateDoctorQueue;
