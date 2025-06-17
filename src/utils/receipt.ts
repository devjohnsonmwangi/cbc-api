// src/utils/receipt.ts

import * as fs from 'fs';
import * as path from 'path';

// The data structure is now what the generator function EXPECTS to receive, fully populated.
export interface ReceiptData {
    payment_id: number;
    transaction_id: string;
    payment_amount: number;
    payment_date: Date;
    payment_gateway: string;
    user_id: number;
    case_id: number;
    clientName?: string; // Now provided from the controller
    caseNumber?: string; // Now provided from the controller
    companyName?: string;
    companyAddress?: string;
    companyContact?: string;
    currency?: string;
}

function getLogoAsBase64(): string | null {
    try {
        const logoPath = path.join(__dirname, '../assets/firm logo 2.png');
        const logoBuffer = fs.readFileSync(logoPath);
        return `data:image/png;base64,${logoBuffer.toString('base64')}`;
    } catch (error) {
        console.warn("Could not find or read 'firm logo 2.png'. The receipt will be generated without a logo.");
        return null;
    }
}

/**
 * Generates the raw HTML content for the receipt from a complete data object.
 * This function no longer performs any database lookups.
 * @param data The complete receipt data, with all optional fields pre-populated.
 * @returns An HTML string.
 */
export function generateReceiptHtml(data: ReceiptData): string {
    const paymentDateFormatted = data.payment_date.toLocaleDateString('en-US', {
        year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
    const currency = data.currency || 'KES';
    const logoDataUri = getLogoAsBase64();

    // The HTML template remains exactly the same as before
    return `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <title>Legal Services Payment Receipt</title>
            <style>
                body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; margin: 0; padding: 20px; color: #343a40; }
                .receipt-container { background-color: #ffffff; padding: 35px; max-width: 700px; margin: 0 auto; border: 1px solid #dee2e6; }
                
                .header { 
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 25px; 
                    border-bottom: 2px solid #007bff;
                    padding-bottom: 15px;
                }
                .logo-img { 
                    max-height: 70px;
                    max-width: 150px;
                }
                .header-content { text-align: left; }
                .header-content h1 { margin: 0; color: #007bff; font-size: 28px; font-weight: 600; }
                .header-content p { font-size: 16px; color: #495057; margin-top: 5px; }
                
                .company-details { text-align: center; margin-bottom: 25px; font-size: 14px; color: #6c757d; }
                .company-details strong { color: #343a40; }
                .payment-details table { width: 100%; border-collapse: collapse; margin-bottom: 25px; }
                .payment-details th, .payment-details td { text-align: left; padding: 12px 15px; border-bottom: 1px solid #e9ecef; }
                .payment-details th { background-color: #f1f3f5; font-weight: 600; color: #495057; text-transform: uppercase; font-size: 13px; }
                .payment-details td { font-size: 15px; }
                .total { text-align: right; font-size: 20px; font-weight: bold; margin-top: 25px; color: #28a745; padding-top:15px; border-top: 2px solid #e9ecef;}
                .footer { text-align: center; margin-top: 35px; font-size: 13px; color: #6c757d; }
            </style>
        </head>
        <body>
            <div class="receipt-container">
                <div class="header">
                    <div class="header-content">
                        <h1>Payment Receipt</h1>
                        <p>Legal Services Payment</p>
                    </div>
                    ${logoDataUri ? `<img src="${logoDataUri}" alt="Company Logo" class="logo-img">` : ''}
                </div>
                <div class="company-details">
                    <strong>${data.companyName || process.env.COMPANY_NAME || 'Murigu and Co-Advocates Ltd'}</strong><br>
                    ${data.companyAddress || process.env.COMPANY_ADDRESS || '143-10300, Kerugoya, Kenya'}<br>
                    ${data.companyContact || process.env.COMPANY_CONTACT || 'Phone: +254 722 851 945 | Email: info@muriguco.com'}
                </div>
                <div class="payment-details">
                    <table>
                        <tr><th>Receipt For:</th><td>${data.clientName || 'N/A'}</td></tr>
                        <tr><th>Case Number:</th><td>${data.caseNumber || 'N/A'}</td></tr>
                        <tr><th>Payment Date:</th><td>${paymentDateFormatted}</td></tr>
                        <tr><th>Transaction ID:</th><td>${data.transaction_id}</td></tr>
                        <tr><th>Payment Method:</th><td>${data.payment_gateway.toUpperCase()}</td></tr>
                        <tr><th>Amount Paid:</th><td>${currency} ${data.payment_amount.toFixed(2)}</td></tr>
                        <tr><th>Description:</th><td>Payment for legal services related to case ${data.caseNumber || `ID ${data.case_id}`}</td></tr>
                    </table>
                </div>
                <div class="total">
                    Total Paid: ${currency} ${data.payment_amount.toFixed(2)}
                </div>
                <div class="footer">
                    Thank you for your payment. This is an automated receipt.
                    <br/>If you have any questions, please contact us.
                </div>
            </div>
        </body>
        </html>
    `;
}

// The old generateReceiptHtmlWithData function has been removed.