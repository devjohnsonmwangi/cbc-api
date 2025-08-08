// developed    with  NestJS and Nodemailer
// developed  by   senior  developer   Eng Johnson Mwangi
// this   code  is  part  of  a  school management system API
// this   file is the central service for sending all transactional emails.
// any  issues  or   bugs  should    be  reported  to   the   developer  team:  senior developer Eng Johnson Mwangi
// my   email: johnsonthuraniramwangi@gmail.com
// or our   developer  team email: jomulimited2@gmail.com

import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { Transporter } from 'nodemailer';
import { TUserSelect, TEventSelect } from '../drizzle/schema'; // Ensure TEventSelect is exported from your schema file
// Define PaymentReceiptData type or import it from the correct module
type PaymentReceiptData = {
  invoice_id: string | number;
  payment_amount: number | string;
  payment_date: Date;
  payment_gateway: string;
  transaction_id: string;
  invoice: {
    student: {
      full_name: string;
      admission_number: string;
    };
    amount_due: number | string;
  };
  school: {
    school_logo_url?: string;
    name: string;
    address: string;
    contact_phone: string;
    contact_email: string;
  };
};

@Injectable()
export class MailService implements OnModuleInit {
  private transporter: Transporter;
  private readonly logger = new Logger(MailService.name);

  constructor(private readonly configService: ConfigService) {}

  /**
   * Initializes the nodemailer transporter when the module is loaded.
   * This ensures the service is ready to send emails as soon as the application starts.
   */
  onModuleInit() {
    this.transporter = nodemailer.createTransport({
      host: this.configService.get<string>('MAIL_HOST'),
      port: this.configService.get<number>('MAIL_PORT'),
      secure: this.configService.get<number>('MAIL_PORT') === 465, // Use secure connection for port 465
      auth: {
        user: this.configService.get<string>('MAIL_USER'),
        pass: this.configService.get<string>('MAIL_PASS'),
      },
    });
    this.logger.log('MailService transporter initialized successfully.');
  }

  /**
   * The core private method for sending an email. It includes robust error handling.
   * @param to The recipient's email address.
   * @param subject The subject line of the email.
   * @param html The full HTML content of the email.
   */
  private async sendEmail(to: string, subject: string, html: string): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: `"${this.configService.get<string>('MAIL_FROM_NAME', 'School Plaza')}" <${this.configService.get<string>('MAIL_FROM')}>`,
        to,
        subject,
        html,
      });
      this.logger.log(`✅ Email sent successfully to ${to}! Subject: ${subject}`);
    } catch (error) {
      this.logger.error(`⚠️ Error sending email to ${to}:`, error);
      // We throw a new error to ensure the calling service knows the operation failed,
      // without exposing raw nodemailer error details.
      throw new Error(`Failed to send email. Subject: ${subject}`);
    }
  }

  /**
   * Sends a fancy and attractive password reset email.
   * This email provides clear instructions and a secure, time-sensitive link for the user.
   * @param user The user object containing email and full_name.
   * @param resetUrl The full URL for the user to click to reset their password.
   */
  async sendPasswordResetEmail(user: TUserSelect, resetUrl: string): Promise<void> {
    const emailSubject = '🔑 Password Reset Request for Your Account';
    const emailBody = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 0; background-color: #f4f7f6; }
              .container { max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.1); border: 1px solid #e9ecef; }
              .header { background-color: #007bff; color: white; padding: 40px; text-align: center; }
              .header h1 { margin: 0; font-size: 28px; }
              .content { padding: 30px 40px; color: #343a40; line-height: 1.6; }
              .content h2 { font-size: 22px; color: #212529; margin-top: 0; }
              .content p { font-size: 16px; margin-bottom: 20px; }
              .button-container { text-align: center; margin: 30px 0; }
              .button { display: inline-block; background-color: #007bff; color: #ffffff !important; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-size: 18px; font-weight: 500; }
              .footer { background-color: #f8f9fa; padding: 20px 40px; text-align: center; font-size: 14px; color: #6c757d; }
              .note { font-size: 14px; color: #6c757d; text-align: center; }
          </style>
      </head>
      <body>
          <div class="container">
              <div class="header"><h1>Password Reset Request</h1></div>
              <div class="content">
                  <h2>Hello, ${user.full_name},</h2>
                  <p>We received a request to reset the password for your account. If you did not make this request, you can safely ignore this email.</p>
                  <p>To set a new password, please click the button below:</p>
                  <div class="button-container"><a href="${resetUrl}" class="button">Reset Your Password</a></div>
                  <p class="note">This link is only valid for the next 30 minutes for security reasons.</p>
              </div>
              <div class="footer">
                  <p>© ${new Date().getFullYear()} School Management Platform. All rights reserved.</p>
                  <p>If you're having trouble, copy and paste this URL into your browser: <br/> <a href="${resetUrl}">${resetUrl}</a></p>
              </div>
          </div>
      </body>
      </html>`;
    await this.sendEmail(user.email, emailSubject, emailBody);
  }

  /**
   * Sends a fancy and attractive welcome email to new users.
   * This email provides a warm welcome and a clear call-to-action to log in.
   * @param user The user object containing email and full_name.
   */
  async sendWelcomeEmail(user: TUserSelect): Promise<void> {
    const loginUrl = `${this.configService.get('FRONTEND_URL')}/login`;
    const emailSubject = '🎉 Welcome to the School Plaza!';
    const emailBody = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 0; background-color: #f4f7f6; }
              .container { max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.1); }
              .header { background-color: #4A90E2; color: white; padding: 40px; text-align: center; }
              .header h1 { margin: 0; font-size: 28px; }
              .content { padding: 30px 40px; color: #343a40; line-height: 1.6; }
              .content h2 { font-size: 22px; color: #212529; margin-top: 0; }
              .content p { font-size: 16px; margin-bottom: 20px; }
              .button-container { text-align: center; margin: 30px 0; }
              .button { display: inline-block; background-color: #28a745; color: #ffffff !important; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-size: 18px; font-weight: 500; }
              .footer { background-color: #f8f9fa; padding: 20px 40px; text-align: center; font-size: 14px; color: #6c757d; }
          </style>
      </head>
      <body>
          <div class="container">
              <div class="header"><h1>Welcome Aboard!</h1></div>
              <div class="content">
                  <h2>Hello, ${user.full_name}!</h2>
                  <p>We are thrilled to welcome you to the <strong>School Plaza</strong>. Your account has been successfully created and you're all set to explore everything our platform has to offer.</p>
                  <p>Click the button below to sign in to your new account:</p>
                  <div class="button-container"><a href="${loginUrl}" class="button">Go to Login Page</a></div>
              </div>
              <div class="footer">
                  <p>© ${new Date().getFullYear()} School Management Platform. All rights reserved.</p>
              </div>
          </div>
      </body>
      </html>`;
    await this.sendEmail(user.email, emailSubject, emailBody);
  }

  /**
   * [NEW METHOD]
   * Sends a highly appealing, intuitive, and informative event reminder email.
   * This email uses a sophisticated design to clearly convey all event details.
   * @param recipient The user object containing the recipient's email and full_name.
   * @param event The event object containing all the details of the upcoming event.
   */
  async sendEventReminderEmail(recipient: TUserSelect, event: TEventSelect): Promise<void> {
    const emailSubject = `⏰ Reminder: Upcoming Event - ${event.title}`;
    
    // Format the date and time for better readability.
    const eventDate = new Intl.DateTimeFormat('en-US', { dateStyle: 'full' }).format(event.start_time);
    const eventTime = new Intl.DateTimeFormat('en-US', { timeStyle: 'short' }).format(event.start_time);
    
    const emailBody = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 0; background-color: #f8f9fa; color: #212529; }
              .container { max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.07); border: 1px solid #e9ecef; }
              .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px; text-align: center; }
              .header-icon { font-size: 48px; margin-bottom: 10px; }
              .header h1 { margin: 0; font-size: 26px; font-weight: 600; }
              .content { padding: 30px 40px; line-height: 1.7; }
              .content h2 { font-size: 22px; color: #212529; margin-top: 0; }
              .details-box { background-color: #f8f9fa; border-left: 4px solid #764ba2; padding: 20px; margin: 25px 0; border-radius: 0 8px 8px 0; }
              .details-box p { margin: 10px 0; font-size: 16px; display: flex; align-items: center; }
              .details-box .icon { font-size: 20px; margin-right: 15px; color: #764ba2; width: 24px; text-align: center; }
              .description { background-color: #fff; border: 1px solid #e9ecef; padding: 20px; border-radius: 8px; margin-top: 20px; }
              .footer { background-color: #e9ecef; padding: 20px 40px; text-align: center; font-size: 14px; color: #6c757d; }
          </style>
      </head>
      <body>
          <div class="container">
              <div class="header">
                  <div class="header-icon">🗓️</div>
                  <h1>Event Reminder</h1>
              </div>
              <div class="content">
                  <h2>Hello, ${recipient.full_name},</h2>
                  <p>This is a friendly reminder for an upcoming school event. We wanted to ensure you have all the necessary information.</p>
                  <div class="details-box">
                      <p><span class="icon">🏆</span> <strong>Event:</strong> &nbsp;${event.title}</p>
                      <p><span class="icon">📅</span> <strong>Date:</strong> &nbsp;${eventDate}</p>
                      <p><span class="icon">🕒</span> <strong>Time:</strong> &nbsp;${eventTime}</p>
                      ${event.location ? `<p><span class="icon">📍</span> <strong>Location:</strong> &nbsp;${event.location}</p>` : ''}
                  </div>
                  <div class="description">
                      <h3>Event Details</h3>
                      <p>${event.description || 'No additional description has been provided for this event.'}</p>
                  </div>
              </div>
              <div class="footer">
                  <p>© ${new Date().getFullYear()} School Management Platform</p>
                  <p>This is an automated notification. Please do not reply.</p>
              </div>
          </div>
      </body>
      </html>`;
    await this.sendEmail(recipient.email, emailSubject, emailBody);
  }


  /*
   * Sends a fancy, professional, and intensive payment receipt email.
   * This email serves as an official confirmation of a successful payment,
   * providing a clear breakdown of the transaction details.
   *
   * @param recipient The user object for the parent/guardian who made the payment.
   * @param receiptData The composite object containing full details of the payment,
   *                    invoice, student, and school.
   */
  async sendPaymentReceiptEmail(recipient: TUserSelect, receiptData: PaymentReceiptData): Promise<void> {
    const emailSubject = `✅ Payment Confirmation & Receipt for ${receiptData.invoice.student.full_name}`;
    
    // Format currency and dates for a professional look
    const paymentAmountFormatted = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(receiptData.payment_amount));
    const amountDueFormatted = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(receiptData.invoice.amount_due));
    const paymentDateFormatted = new Intl.DateTimeFormat('en-US', { dateStyle: 'long', timeStyle: 'short' }).format(receiptData.payment_date);

    const emailBody = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 0; background-color: #f8f9fa; color: #212529; }
              .container { max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.05); border: 1px solid #dee2e6; }
              .header { background-color: #28a745; color: white; padding: 30px; text-align: center; }
              .header-icon { font-size: 48px; margin-bottom: 10px; }
              .header h1 { margin: 0; font-size: 28px; font-weight: 600; }
              .content { padding: 30px 40px; }
              .content h2 { font-size: 22px; color: #212529; margin-top: 0; }
              .receipt-details { border: 1px solid #dee2e6; border-radius: 8px; margin-top: 25px; }
              .receipt-details .item { display: flex; justify-content: space-between; padding: 15px 20px; border-bottom: 1px solid #e9ecef; }
              .receipt-details .item:last-child { border-bottom: none; }
              .receipt-details .item strong { color: #495057; }
              .total { background-color: #f8f9fa; font-weight: bold; font-size: 18px; color: #28a745; }
              .school-info { text-align: center; margin-top: 30px; }
              .school-info img { max-width: 100px; margin-bottom: 10px; }
              .footer { background-color: #343a40; color: #adb5bd; padding: 20px 40px; text-align: center; font-size: 14px; }
              .footer a { color: #ffffff; text-decoration: none; }
          </style>
      </head>
      <body>
          <div class="container">
              <div class="header">
                  <div class="header-icon">✔️</div>
                  <h1>Payment Successful</h1>
              </div>
              <div class="content">
                  <h2>Hello, ${recipient.full_name},</h2>
                  <p>Thank you for your payment. We have successfully received it. This email serves as your official receipt.</p>
                  
                  <div class="receipt-details">
                      <div class="item">
                          <span><strong>Student Name:</strong></span>
                          <span>${receiptData.invoice.student.full_name}</span>
                      </div>
                      <div class="item">
                          <span><strong>Admission Number:</strong></span>
                          <span>${receiptData.invoice.student.admission_number}</span>
                      </div>
                      <div class="item">
                          <span><strong>Invoice Number:</strong></span>
                          <span>INV-${receiptData.invoice_id}</span>
                      </div>
                      <div class="item">
                          <span><strong>Payment Date:</strong></span>
                          <span>${paymentDateFormatted}</span>
                      </div>
                      <div class="item">
                          <span><strong>Payment Method:</strong></span>
                          <span style="text-transform: capitalize;">${receiptData.payment_gateway}</span>
                      </div>
                      <div class="item">
                          <span><strong>Transaction ID:</strong></span>
                          <span>${receiptData.transaction_id}</span>
                      </div>
                      <div class="item total">
                          <span><strong>Amount Paid:</strong></span>
                          <span>${paymentAmountFormatted}</span>
                      </div>
                  </div>

                  <div class="school-info">
                      ${receiptData.school.school_logo_url ? `<img src="${receiptData.school.school_logo_url}" alt="School Logo">` : ''}
                      <h3>${receiptData.school.name}</h3>
                      <p>${receiptData.school.address}</p>
                      <p>${receiptData.school.contact_phone} | ${receiptData.school.contact_email}</p>
                  </div>
              </div>
              <div class="footer">
                  <p>© ${new Date().getFullYear()} School Management Platform. All rights reserved.</p>
              </div>
          </div>
      </body>
      </html>`;
    await this.sendEmail(recipient.email, emailSubject, emailBody);
  }

}