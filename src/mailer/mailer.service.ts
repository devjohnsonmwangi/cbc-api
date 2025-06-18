// src/mail/mail.service.ts

import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { Transporter } from 'nodemailer';

// --- NEW IMPORTS ---
// These are needed for template processing
import * as fs from 'fs';
import { join } from 'path';
import * as handlebars from 'handlebars';
import juice from 'juice';

@Injectable()
export class MailService implements OnModuleInit {
  private transporter: Transporter;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    this.transporter = nodemailer.createTransport({
      host: this.configService.get<string>('MAIL_HOST'),
      port: this.configService.get<number>('MAIL_PORT'),
      secure: false, // Use 'true' for port 465, 'false' for others like 587
      auth: {
        user: this.configService.get<string>('MAIL_USER'),
        pass: this.configService.get<string>('MAIL_PASS'),
      },
    });
  }

  // --- NEW PRIVATE HELPER METHOD ---
  /**
   * This is the core logic for sending any templated email.
   * It reads the template, compiles it with data, inlines the CSS, and sends it.
   * @param to The recipient's email.
   * @param subject The email subject.
   * @param templateName The name of the .hbs file in the templates folder.
   * @param context The data object to fill the template placeholders (e.g., { name, url }).
   */
  private async sendTemplatedEmail(
    to: string,
    subject: string,
    templateName: string,
    context: object,
  ): Promise<void> {
    // 1. Construct the path to the template file. `__dirname` points to the current directory (`src/mail`).
    const templatePath = join(__dirname, 'templates', `${templateName}.hbs`);
    
    // 2. Read the template file content.
    const templateSource = fs.readFileSync(templatePath, 'utf-8');
    
    // 3. Compile the template using Handlebars.
    const compiledTemplate = handlebars.compile(templateSource);
    
    // 4. Inject the data (context) into the template.
    const htmlWithData = compiledTemplate(context);
    
    // 5. Use Juice to inline all CSS styles. This is CRUCIAL for email clients.
    const finalHtml = juice(htmlWithData);

    // 6. Set up the mail options.
    const mailOptions = {
      from: this.configService.get<string>('MAIL_FROM'),
      to,
      subject,
      html: finalHtml, // Use the fully processed HTML
    };

    try {
      // 7. Send the email.
      await this.transporter.sendMail(mailOptions);
      console.log(`${subject} email sent successfully to ${to}`);
    } catch (error) {
      console.error(`Failed to send ${subject} email to ${to}:`, error);
      throw new Error(`Could not send email: ${subject}`);
    }
  }

  // --- NEW PUBLIC METHODS TO SEND SPECIFIC EMAILS ---

  /**
   * Sends the fancy password reset email.
   */
  async sendPasswordResetEmail(to: string, name: string, url: string): Promise<void> {
    await this.sendTemplatedEmail(
      to,
      'Your Password Reset Request',
      'password-reset-fancy', // This must match the filename `password-reset-fancy.hbs`
      { name, url },
    );
  }

  /**
   * Sends the welcome and account verification email.
   */
  async sendWelcomeEmail(to: string, name: string, verificationUrl: string): Promise<void> {
    await this.sendTemplatedEmail(
      to,
      'Welcome to Our App!',
      'welcome-email', // This must match the filename `welcome-email.hbs`
      { name, url: verificationUrl }, // Note: We map `verificationUrl` to `url` to match the template placeholder
    );
  }

  // Your old sendEmail method is no longer needed, as sendTemplatedEmail replaces it.
  // You can keep it if you need to send simple, non-templated emails.
}