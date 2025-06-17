// import admin from 'firebase-admin';
// import { eq } from 'drizzle-orm';
// import  db from '../drizzle/db';
// import { userTable } from '../drizzle/schema';

// export async function sendPushNotification(userId: number, title: string, body: string, data?: any) {
//     try {
//         const user = await db.select().from(userTable).where(eq(userTable.user_id, userId));

//         if (!user || !user[0]) {
//             console.log(`User with ID ${userId} not found.`);
//             return;
//         }

//         const fcmToken = user[0].fcm_token;

//         if (!fcmToken) {
//             console.log(`FCM token not found for user ${userId}.`);
//             return;
//         }



//         const message = {
//             notification: {
//                 title: title,
//                 body: body,
//             },
//             data: data,
//             token: fcmToken,
//         };

//         try {
//             const response = await admin.messaging().send(message);
//             console.log('Successfully sent push message:', response);
//         } catch (error) {
//             console.error('Error sending push message:', error);
//         }
//     } catch (error) {
//         console.error("Error fetching user or sending push notification:", error);
//     }
// }