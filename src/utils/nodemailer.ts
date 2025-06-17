// src/services/email.service.ts
import "dotenv/config"; // Ensure env vars are loaded
import nodemailer from 'nodemailer';
import axios from 'axios'; // To fetch the PDF for attachment
import { getEventReminderByIdService } from '../eventreminder/eventreminder.service';
import { getEventByIdService } from '../event/event.service';
import { getUserByIdService } from '../users/user.service';
import { TUserSelect } from "../drizzle/schema"; // Make sure this path is correct for your TUserSelect type
import { ReceiptData } from "../utils/receipt"; // Import from the utility file for better structure

// Create a reusable transporter object
const transporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE || 'gmail', // Use env var for service
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Generic Function to send emails
const sendEmail = async (to: string, subject: string, html: string, attachments?: Array<{ filename: string; content: any; contentType?: string; }>) => {
  try {
    await transporter.sendMail({
      from: `"${process.env.APP_NAME || 'Your Company Name'}" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html,
      attachments, // Add attachments here
    });
    console.log(`✅ Email sent successfully to ${to}! Subject: ${subject}`);
  } catch (error) {
    console.error('⚠️ Error sending email:', error);
    throw new Error('Failed to send email.');
  }
};

// --- Password Reset/Change Emails (Unchanged from your original code) ---
/**
 * Sends a password reset link email.
 */
export const sendPasswordResetEmail = async (user: TUserSelect, token: string) => {
  const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;
  const emailSubject = '🔑 Your Password Reset Request';
  const emailBody = `
      <div style="font-family: Arial, sans-serif; background-color: #f7f9fc; padding: 20px; border-radius: 10px; border: 1px solid #e3e6f0; max-width: 600px; margin: 0 auto; color: #2d3748;">
        <header style="text-align: center; margin-bottom: 20px;">
          <h1 style="color: #2b6cb0; font-size: 24px; margin: 0;">🔑 Password Reset</h1>
        </header>
        <div style="background-color: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 6px rgba(0,0,0,0.1);">
          <h2 style="color: #2c5282; font-size: 20px; margin-bottom: 10px;">Hello, ${user.full_name}!</h2>
          <p style="color: #4a5568; font-size: 16px; line-height: 1.5;">
            We received a request to reset the password for your account associated with this email address. Click the button below to reset your password. This link is valid for 15 minutes.
          </p>
          <div style="text-align: center; margin: 25px 0;">
            <a href="${resetLink}" style="background-color: #3182ce; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-size: 16px; display: inline-block;">Reset Your Password</a>
          </div>
          <p style="color: #4a5568; font-size: 16px; line-height: 1.5;">
            If you did not request a password reset, please ignore this email.
          </p>
        </div>
        <footer style="text-align: center; margin-top: 20px; padding-top: 15px; border-top: 1px solid #e2e8f0;">
          <p style="color: #718096; font-size: 14px;">Thank you for using our service! 💌</p>
        </footer>
      </div>
  `;
  await sendEmail(user.email, emailSubject, emailBody);
};

/**
 * Sends a password change confirmation/link email.
 */
export const sendPasswordChangeRequestEmail = async (user: TUserSelect, token: string) => {
  const changeLink = `${process.env.FRONTEND_URL}/change-password?token=${token}`;
  const emailSubject = '🔒 Confirm Your Password Change Request';
  const emailBody = `
      <div style="font-family: Arial, sans-serif; background-color: #f7f9fc; padding: 20px; border-radius: 10px; border: 1px solid #e3e6f0; max-width: 600px; margin: 0 auto; color: #2d3748;">
        <header style="text-align: center; margin-bottom: 20px;">
          <h1 style="color: #2b6cb0; font-size: 24px; margin: 0;">🔒 Password Change Request</h1>
        </header>
        <div style="background-color: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 6px rgba(0,0,0,0.1);">
          <h2 style="color: #2c5282; font-size: 20px; margin-bottom: 10px;">Hello, ${user.full_name}!</h2>
          <p style="color: #4a5568; font-size: 16px; line-height: 1.5;">
            We received a request to change the password for your account. To confirm this change, please click the button below. This link is valid for 15 minutes.
          </p>
          <div style="text-align: center; margin: 25px 0;">
            <a href="${changeLink}" style="background-color: #3182ce; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-size: 16px; display: inline-block;">Confirm Password Change</a>
          </div>
          <p style="color: #4a5568; font-size: 16px; line-height: 1.5;">
            If you did not request this change, you can safely ignore this email.
          </p>
        </div>
        <footer style="text-align: center; margin-top: 20px; padding-top: 15px; border-top: 1px solid #e2e8f0;">
          <p style="color: #718096; font-size: 14px;">Thank you for using our service! 💌</p>
        </footer>
      </div>
  `;
  await sendEmail(user.email, emailSubject, emailBody);
};


// --- Event Reminder Email Function (Unchanged from your original code) ---
export const sendEventReminderEmail = async (reminder_id: number) => {
  try {
    const reminder = await getEventReminderByIdService(reminder_id);
    if (!reminder) { console.error("⚠️ Reminder not found for ID:", reminder_id); return; }
    const event = await getEventByIdService(reminder.event_id);
    if (!event) { console.error("⚠️ Event not found for ID:", reminder.event_id); return; }
    const user = await getUserByIdService(event.user_id);
    if (!user) { console.error("⚠️ User not found for event:", event.event_title); return; }

    const emailSubject = `✨ Reminder: ${event.event_title} is coming up!`;
    const emailBody = `
      <div style="font-family: Arial, sans-serif; background-color: #f7f9fc; padding: 20px; border-radius: 10px; border: 1px solid #e3e6f0; max-width: 600px; margin: 0 auto; color: #2d3748;">
        <header style="text-align: center; margin-bottom: 20px;">
          <h1 style="color: #2b6cb0; font-size: 24px; margin: 0;">📅 Event Reminder</h1>
        </header>
        <div style="background-color: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 6px rgba(0,0,0,0.1);">
          <h2 style="color: #2c5282; font-size: 20px; margin-bottom: 10px;">Hello, ${user.full_name}!</h2>
          <p style="color: #4a5568; font-size: 16px; line-height: 1.5;">
            🌟 We’re reminding you about your upcoming event: <strong style="color: #2c5282;">${event.event_title}</strong>.
          </p>
          </div>
        <footer style="text-align: center; margin-top: 20px; padding-top: 15px; border-top: 1px solid #e2e8f0;">
          <p style="color: #718096; font-size: 14px;">Thank you for using our service! 💌</p>
        </footer>
      </div>
    `;
    await sendEmail(user.email, emailSubject, emailBody);
    console.log(`🔔 Reminder email sent for event: ${event.event_title} to ${user.email}`);
  } catch (error: any) {
    console.error("⚠️ Error sending event reminder:", error?.message);
  }
};


// --- Payment Receipt Email Function (This is the final, corrected version) ---
/**
 * Sends a payment receipt email with a PDF attachment, with a fallback to HTML.
 * @param toEmail The customer's email address.
 * @param receiptUrl The URL to the hosted PDF receipt.
 * @param receiptData Data used to build the email content.
 * @param receiptHtmlContent Optional raw HTML content to use as a fallback attachment.
 */
export const sendPaymentReceiptEmail = async (
  toEmail: string,
  receiptUrl: string,
  receiptData: ReceiptData,
  receiptHtmlContent?: string
) => {
  const emailSubject = `🧾 Your Payment Receipt - ${receiptData.companyName || process.env.APP_NAME || 'Legal Services'}`;
  const formattedAmount = `${receiptData.currency || 'KES'} ${receiptData.payment_amount.toFixed(2)}`;

  const emailBody = `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f7f6; padding: 25px; border-radius: 12px; border: 1px solid #d1d9e6; max-width: 650px; margin: 20px auto; color: #333;">
      <header style="text-align: center; margin-bottom: 25px; padding-bottom:15px; border-bottom: 2px solid #007bff;">
        <h1 style="color: #0056b3; font-size: 26px; margin: 0;">Payment Confirmation</h1>
        <p style="color: #555; font-size: 16px; margin-top: 5px;">Thank you for your payment!</p>
      </header>
      <div style="background-color: #ffffff; padding: 20px 25px; border-radius: 8px; box-shadow: 0 3px 10px rgba(0,0,0,0.07);">
        <h2 style="color: #0056b3; font-size: 20px; margin-bottom: 15px;">Dear ${receiptData.clientName || 'Customer'},</h2>
        <p style="color: #454545; font-size: 16px; line-height: 1.6;">
          This email confirms your recent payment of <strong>${formattedAmount}</strong> for legal services related to Case Number <strong>${receiptData.caseNumber || receiptData.case_id}</strong>.
        </p>
        <p style="color: #454545; font-size: 16px; line-height: 1.6;">
          Your official receipt is attached to this email. You can also view it online using the button below.
        </p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${receiptUrl}" target="_blank" style="background-color: #28a745; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-size: 17px; display: inline-block; font-weight: 500; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">View Receipt PDF</a>
        </div>
      </div>
      <footer style="text-align: center; margin-top: 25px; padding-top: 20px; border-top: 1px solid #d1d9e6;">
        <p style="color: #777; font-size: 14px;">
          ${receiptData.companyName || process.env.COMPANY_NAME || 'Murigu and Co-Advocates Ltd'}<br>
          ${receiptData.companyAddress || process.env.COMPANY_ADDRESS || '123 Law Street, Advocate Plaza, Nairobi, Kenya'}<br>
          ${receiptData.companyContact || process.env.COMPANY_CONTACT || 'Phone: +254 7XX XXX XXX | Email: info@muriguco.com'}
        </p>
      </footer>
    </div>
  `;

  const attachments: Array<{ filename: string; content: any; contentType: string; }> = [];
  
  try {
    // Priority: Fetch the PDF to attach
    console.log(`⬇️ Fetching PDF receipt for attachment from: ${receiptUrl}`);
    const response = await axios.get(receiptUrl, {
      responseType: 'arraybuffer'
    });
    
    attachments.push({
      filename: `Receipt_${receiptData.transaction_id}.pdf`,
      content: Buffer.from(response.data),
      contentType: 'application/pdf'
    });
    console.log(`✅ PDF receipt attached successfully.`);

  } catch (error: any) {
    // Fallback: If PDF fetch fails, use the provided HTML
    console.error(`⚠️ Failed to fetch PDF for attachment. Error: ${error.message}`);
    if (receiptHtmlContent) {
      console.log(`🔁 Falling back to attaching HTML content.`);
      attachments.push({
        filename: `Receipt_${receiptData.transaction_id}.html`,
        content: receiptHtmlContent,
        contentType: 'text/html'
      });
    }
  }

  // Send the email with whichever attachment was successfully prepared
  await sendEmail(toEmail, emailSubject, emailBody, attachments.length > 0 ? attachments : undefined);
};