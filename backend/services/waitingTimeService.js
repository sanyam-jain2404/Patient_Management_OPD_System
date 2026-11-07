import Appointment from "../models/Appointment.js";
import Doctor from "../models/Doctor.js";
import Delay from "../models/Delay.js";

/**
 * waitingTimeService
 * ------------------
 * Explainable waiting-time estimation.
 *
 * Formula:
 *   estimatedWait = patientsAhead × avgConsultationMinutes
 *   + remaining time of currently-running consultation
 *
 * The estimate is APPROXIMATE and must be displayed as such.
 */

/**
 * Recalculate and persist the estimated wait for every active appointment
 * of a given doctor on a given date.
 */
export async function recalcDoctorQueue(doctorId, date) {
    const doctor = await Doctor.findById(doctorId);
    if (!doctor) return;

    const avgMinutes = doctor.avgConsultationMinutes || doctor.consultationDuration || 10;

    // Currently running consultation
    const running = await Appointment.findOne({
        doctorId,
        appointmentDate: date,
        status: "In Consultation"
    }).sort({ consultationStartedAt: 1 });

    const activeQuery = {
        doctorId,
        appointmentDate: date,
        status: { $in: ["Booked", "Waiting", "In Consultation"] }
    };

    // Get the running token (if any)
    const runningToken = running ? running.tokenNumber : null;

    // Patients ahead = active appointments with token > running token
    // (or all active appointments if none is running)
    let patientsAhead = await Appointment.countDocuments(activeQuery);
    if (runningToken !== null) {
        patientsAhead = await Appointment.countDocuments({
            ...activeQuery,
            tokenNumber: { $gt: runningToken }
        });
    }

    let estimatedMinutes = patientsAhead * avgMinutes;

    // Subtract elapsed time of currently-running consultation
    if (running && running.consultationStartedAt) {
        const elapsed = (Date.now() - running.consultationStartedAt.getTime()) / 60000;
        const remaining = Math.max(avgMinutes - elapsed, 0);
        estimatedMinutes = Math.round(patientsAhead * avgMinutes + remaining);
    }

    // Check for an active delay record for this doctor today
    const activeDelay = await Delay.findOne({
        doctorId,
        createdAt: { $gte: new Date(new Date(date).setHours(0, 0, 0, 0)) }
    }).sort({ createdAt: -1 });

    if (activeDelay && activeDelay.newEstimatedWaitMinutes) {
        estimatedMinutes = activeDelay.newEstimatedWaitMinutes;
    }

    const estimatedStartAt = new Date(Date.now() + estimatedMinutes * 60000);

    // Persist estimates on all active appointments for this doctor/date
    await Appointment.updateMany(activeQuery, {
        $set: {
            estimatedWaitMinutes: estimatedMinutes,
            estimatedStartAt: estimatedStartAt
        }
    });

    return {
        patientsAhead,
        estimatedWaitMinutes: estimatedMinutes,
        estimatedStartAt,
        hasActiveDelay: !!activeDelay,
        delayReason: activeDelay ? activeDelay.reason : null
    };
}

export default { recalcDoctorQueue };