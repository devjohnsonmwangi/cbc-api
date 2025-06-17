// import { Queue, Job } from 'bullmq';
// import { sendPushNotification } from './push-notification';
// import { sendSmsNotification } from './sms-notification';
// import { sendEventReminderEmail } from './nodemailer';
// import { getEventByIdService } from '../event/event.service'; // Import your event service

// const reminderQueue = new Queue('event-reminders', {
//     connection: {
//         host: process.env.REDIS_HOST || 'localhost',
//         port: parseInt(process.env.REDIS_PORT || '6379'),
//         //username: process.env.REDIS_USERNAME, // Uncomment if you have Redis Auth
//         //password: process.env.REDIS_PASSWORD  // Uncomment if you have Redis Auth
//     },
// });

// // Process the reminder job
// reminderQueue.process(async (job: Job) => {
//     const { reminderId, eventId, reminderMessage } = job.data;

//     try {
//         // 1. Fetch the event data (important)
//         const event = await getEventByIdService(eventId);

//         if (!event) {
//             console.log(`Event with ID ${eventId} not found.`);
//             return; // Stop processing
//         }

//         // 2. Send Notifications
//         await sendPushNotification(event.user_id, event.event_title, reminderMessage); // Use the functions from your utils
//         await sendSmsNotification(event.user_id, reminderMessage);        // Use the functions from your utils
//         await sendEventReminderEmail(event, reminderMessage);  // Use the functions from your utils

//         console.log(`Reminder ${reminderId} processed successfully for event ${eventId}`);

//     } catch (error) {
//         console.error(`Error processing reminder ${reminderId} for event ${eventId}:`, error);
//         throw error; // This will retry the job, handle it properly.
//     }
// });

// // Function to schedule a reminder job
// export async function scheduleReminderJob(reminderId: number, eventId: number, reminderTime: Date, reminderMessage: string) {
//     try {
//         const delay = reminderTime.getTime() - Date.now();

//         if (delay <= 0) {
//             console.log(`Reminder time for reminder ${reminderId} is in the past. Skipping.`);
//             return;
//         }

//         await reminderQueue.add(
//             'reminder',
//             {
//                 reminderId: reminderId,
//                 eventId: eventId,
//                 reminderMessage: reminderMessage,
//             },
//             {
//                 delay: delay, // Schedule the job for the future
//                 jobId: `reminder-${reminderId}`, // Unique job ID
//             }
//         );

//         console.log(`Reminder ${reminderId} scheduled successfully for event ${eventId} at ${reminderTime}`);
//     } catch (error) {
//         console.error(`Error scheduling reminder ${reminderId} for event ${eventId}:`, error);
//     }
// }

// // Function to remove a reminder job
// export async function removeReminderJob(reminderId: number) {
//     try {
//         const jobId = `reminder-${reminderId}`;
//         const job = await reminderQueue.getJob(jobId);

//         if (job) {
//             await job.remove();
//             console.log(`Reminder job ${jobId} removed successfully.`);
//         } else {
//             console.log(`Reminder job ${jobId} not found.`);
//         }
//     } catch (error) {
//         console.error(`Error removing reminder job ${reminderId}:`, error);
//     }
// }