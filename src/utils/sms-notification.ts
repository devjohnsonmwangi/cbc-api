// const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID;
// const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN;
// const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;
// const twilioClient = require('twilio')(twilioAccountSid, twilioAuthToken);
// import { eq } from 'drizzle-orm';
// import { db } from '../db';
// import { users } from '../schema';
// //import { EventDataTypes } from './types'; // Assuming you have this type defined

// export async function sendSmsNotification(userId: number, body: string) {
//     try {
//         const user = await db.select().from(users).where(eq(users.user_id, userId));

//         if (!user || !user[0]) {
//             console.log(`User with ID ${userId} not found.`);
//             return;
//         }

//         const phoneNumber = user[0].phone_number;

//         if (!phoneNumber) {
//             console.log(`Phone number not found for user ${userId}.`);
//             return;
//         }

//         try {
//             const message = await twilioClient.messages.create({
//                 body: body,
//                 to: phoneNumber,
//                 from: twilioPhoneNumber,
//             });
//             console.log('Successfully sent SMS message:', message.sid);
//         } catch (error) {
//             console.error('Error sending SMS message:', error);
//         }
//     } catch (error) {
//         console.error("Error fetching user or sending SMS notification:", error);
//     }
// }