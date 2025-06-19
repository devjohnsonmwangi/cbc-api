import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { Transporter } from 'nodemailer';
import { TUserSelect } from '../drizzle/schema'; // Ensure this path is correct

@Injectable()
export class MailService implements OnModuleInit {
  private transporter: Transporter;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    this.transporter = nodemailer.createTransport({
      host: this.configService.get<string>('MAIL_HOST'),
      port: this.configService.get<number>('MAIL_PORT'),
      secure: this.configService.get<number>('MAIL_PORT') === 465,
      auth: {
        user: this.configService.get<string>('MAIL_USER'),
        pass: this.configService.get<string>('MAIL_PASS'),
      },
    });
  }

  private async sendEmail(to: string, subject: string, html: string) {
    try {
      await this.transporter.sendMail({
        from: this.configService.get<string>('MAIL_FROM'),
        to,
        subject,
        html,
      });
      console.log(`✅ Email sent successfully to ${to}! Subject: ${subject}`);
    } catch (error) {
      console.error('⚠️ Error sending email:', error);
      throw new Error(`Failed to send email. Subject: ${subject}`);
    }
  }

  /**
   * Sends a fancy and attractive password reset email.
   * @param user The user object containing email and full_name.
   * @param resetUrl The full URL for the user to click to reset their password.
   */
  async sendPasswordResetEmail(user: TUserSelect, resetUrl: string) {
    const emailSubject = '🔑 Password Reset Request for Your Account';
    const emailBody = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
              body {
                  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol';
                  margin: 0;
                  padding: 0;
                  background-color: #f4f7f6;
              }
              .container {
                  max-width: 600px;
                  margin: 40px auto;
                  background-color: #ffffff;
                  border-radius: 12px;
                  overflow: hidden;
                  box-shadow: 0 10px 25px rgba(0,0,0,0.1);
                  border: 1px solid #e9ecef;
              }
              .header {
                  background-color: #007bff; /* A standard, trustworthy blue */
                  color: white;
                  padding: 40px;
                  text-align: center;
              }
              .header h1 {
                  margin: 0;
                  font-size: 28px;
                  font-weight: 600;
              }
              .content {
                  padding: 30px 40px;
                  color: #343a40;
                  line-height: 1.6;
              }
              .content h2 {
                  font-size: 22px;
                  color: #212529;
                  margin-top: 0;
              }
              .content p {
                  font-size: 16px;
                  margin-bottom: 20px;
              }
              .button-container {
                  text-align: center;
                  margin: 30px 0;
              }
              .button {
                  display: inline-block;
                  background-color: #007bff;
                  color: #ffffff !important; /* Important to override link styles */
                  padding: 15px 30px;
                  text-decoration: none;
                  border-radius: 8px;
                  font-size: 18px;
                  font-weight: 500;
                  transition: background-color 0.3s;
              }
              .button:hover {
                  background-color: #0056b3;
              }
              .footer {
                  background-color: #f8f9fa;
                  padding: 20px 40px;
                  text-align: center;
                  font-size: 14px;
                  color: #6c757d;
                  border-top: 1px solid #e9ecef;
              }
              .footer p {
                  margin: 5px 0;
              }
              .footer a {
                  color: #007bff;
                  text-decoration: none;
              }
              .note {
                  font-size: 14px;
                  color: #6c757d;
                  text-align: center;
              }
          </style>
      </head>
      <body>
          <div class="container">
              <div class="header">
                  <h1>Password Reset Request</h1>
              </div>
              <div class="content">
                  <h2>Hello, ${user.full_name},</h2>
                  <p>
                      We received a request to reset the password for your account. If you did not make this request, you can safely ignore this email and no changes will be made to your account.
                  </p>
                  <p>
                      To set a new password, please click the button below:
                  </p>
                  <div class="button-container">
                      <a href="${resetUrl}" class="button">Reset Your Password</a>
                  </div>
                  <p class="note">
                      Please note: This link is only valid for the next 30 minutes for security reasons.
                  </p>
              </div>
              <div class="footer">
                  <p>© ${new Date().getFullYear()} School Management Platform. All rights reserved.</p>
                  <p>If you're having trouble with the button, copy and paste this URL into your browser:</p>
                  <p><a href="${resetUrl}">${resetUrl}</a></p>
              </div>
          </div>
      </body>
      </html>
    `;
    await this.sendEmail(user.email, emailSubject, emailBody);
  }

  /**
   * Sends a fancy and attractive welcome email.
   * Directs the user to the login page.
   */
  async sendWelcomeEmail(user: TUserSelect) {
    const loginUrl = `${this.configService.get('FRONTEND_URL')}/login`;
    const emailSubject = '🎉 Welcome to the School Plaza!';
    const emailBody = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
              body {
                  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol';
                  margin: 0;
                  padding: 0;
                  background-color: #f4f7f6;
              }
              .container {
                  max-width: 600px;
                  margin: 40px auto;
                  background-color: #ffffff;
                  border-radius: 12px;
                  overflow: hidden;
                  box-shadow: 0 10px 25px rgba(0,0,0,0.1);
                  border: 1px solid #e9ecef;
              }
              .header {
                  background-color: #4A90E2; /* A nice, friendly blue */
                  color: white;
                  padding: 40px;
                  text-align: center;
              }
              .header h1 {
                  margin: 0;
                  font-size: 28px;
                  font-weight: 600;
              }
              .content {
                  padding: 30px 40px;
                  color: #343a40;
                  line-height: 1.6;
              }
              .content h2 {
                  font-size: 22px;
                  color: #212529;
                  margin-top: 0;
              }
              .content p {
                  font-size: 16px;
                  margin-bottom: 20px;
              }
              .button-container {
                  text-align: center;
                  margin: 30px 0;
              }
              .button {
                  display: inline-block;
                  background-color: #28a745;
                  color: #ffffff !important; /* Important to override link styles */
                  padding: 15px 30px;
                  text-decoration: none;
                  border-radius: 8px;
                  font-size: 18px;
                  font-weight: 500;
                  transition: background-color 0.3s;
              }
              .button:hover {
                  background-color: #218838;
              }
              .footer {
                  background-color: #f8f9fa;
                  padding: 20px 40px;
                  text-align: center;
                  font-size: 14px;
                  color: #6c757d;
                  border-top: 1px solid #e9ecef;
              }
              .footer a {
                  color: #4A90E2;
                  text-decoration: none;
              }
          </style>
      </head>
      <body>
          <div class="container">
              <div class="header">
                  <h1>Welcome Aboard!</h1>
              </div>
              <div class="content">
                  <h2>Hello, ${user.full_name}!</h2>
                  <p>
                      We are thrilled to welcome you to the <strong>School Plaza</strong>. Your account has been successfully created, and you're all set to explore everything we have to offer.
                  </p>
                  <p>
                      Click the button below to sign in to your new account and get started.
                  </p>
                  <div class="button-container">
                      <a href="${loginUrl}" class="button">Go to Login Page</a>
                  </div>
                  <p>
                      If you have any questions, feel free to reply to this email. We're always happy to help!
                  </p>
              </div>
              <div class="footer">
                  <p>© ${new Date().getFullYear()} School Management Platform. All rights reserved.</p>
                  <p><a href="${this.configService.get('FRONTEND_URL')}">Visit our Website</a></p>
              </div>
          </div>
      </body>
      </html>
    `;
    await this.sendEmail(user.email, emailSubject, emailBody);
  }
}