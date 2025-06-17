// // src/payment/payment.controller.ts
// import { Context } from 'hono';
// import {
//   getPaymentByCheckoutRequestID,
//   createPayment,
//   updatePayment,
//   getAllPayments,
//   getPaymentById,
//   getPaymentsByCaseId,
//   deletePayment,
//   updateCasePaymentStatus,
// } from './payment.service';
// import Stripe from 'stripe';
// import axios, { AxiosError } from 'axios';
// import dotenv from 'dotenv';

// dotenv.config();

// // Initialize Stripe with your secret key
// const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
//   apiVersion: '2024-06-20', // Ensure this is the correct version
// });

// // Function to generate a unique payment note
// function generatePaymentNote(): string {
//   return `PAY-${Date.now()}`; // Generates a unique payment note using the current timestamp
// }

// // Generate M-Pesa Access Token
// const generateToken = async (): Promise<string> => {
//   try {
//     const { MPESA_CONSUMER_KEY, MPESA_CONSUMER_SECRET } = process.env;

//     if (!MPESA_CONSUMER_KEY || !MPESA_CONSUMER_SECRET) {
//       throw new Error('🛑 Consumer Key or Secret is missing in environment variables!');
//     }

//     const auth = Buffer.from(`${MPESA_CONSUMER_KEY}:${MPESA_CONSUMER_SECRET}`).toString('base64');
//     const response = await axios.get(
//       'https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials',
//       { headers: { Authorization: `Basic ${auth}` } }
//     );

//     return response.data.access_token;
//   } catch (error: any) {
//     console.error('❌ Error generating token:', error);
//     if (error instanceof Error) {
//       throw new Error(`❌ Error generating token: ${error.message}`);
//     }
//     throw new Error('❌ An unknown error occurred while generating token.');
//   }
// };

// // STK Push Function
// const initiateStkPush = async (phone: string, amount: number): Promise<any> => {
//   try {
//     if (!phone || !amount) throw new Error('📵 Phone number and 💰 Amount are required!');

//     const token = await generateToken();

//     const date = new Date();
//     const timestamp = `${date.getFullYear()}${('0' + (date.getMonth() + 1)).slice(-2)}${('0' + date.getDate()).slice(-2)}${(
//       '0' + date.getHours()
//     ).slice(-2)}${('0' + date.getMinutes()).slice(-2)}${('0' + date.getSeconds()).slice(-2)}`;

//     const { MPESA_PAYBILL, MPESA_PASS_KEY, MPESA_CALLBACK_URL } = process.env;

//     if (!MPESA_PAYBILL || !MPESA_PASS_KEY || !MPESA_CALLBACK_URL) {
//       throw new Error('🛑 Required environment variables are missing!');
//     }

//     const password = Buffer.from(`${MPESA_PAYBILL}${MPESA_PASS_KEY}${timestamp}`).toString('base64');

//     const stkRequest = {
//       BusinessShortCode: MPESA_PAYBILL,
//       Password: password,
//       Timestamp: timestamp,
//       TransactionType: 'CustomerPayBillOnline',
//       Amount: amount,
//       PartyA: `254${phone.substring(1)}`,
//       PartyB: MPESA_PAYBILL,
//       PhoneNumber: `254${phone.substring(1)}`,
//       CallBackURL: MPESA_CALLBACK_URL,
//       AccountReference: 'murigu  and  co-advocates ltd',
//       TransactionDesc: 'legal  services  Payment',
//     };

//     console.log('📡 Sending STK Push request...');
//     const response = await axios.post(
//       'https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest',
//       stkRequest,
//       { headers: { Authorization: `Bearer ${token}` } }
//     );

//     console.log('✅ STK Push Response:', response.data);
//     return response.data;
//   } catch (error: any) {
//     console.error('❌ STK Push Error:', error);
//     if (error instanceof Error) {
//       throw new Error(`💥 STK Push Failed: ${error.message}`);
//     }
//     throw new Error('❌ An unknown error occurred during STK Push.');
//   }
// };

// interface MpesaErrorResponse {
//   requestId: string;
//   errorCode: string;
//   errorMessage: string;
// }

// // Function to query M-Pesa for transaction status
// const queryMpesaTransactionStatus = async (checkoutRequestID: string): Promise<any> => {
//   try {
//     const token = await generateToken();
//     const { MPESA_PAYBILL, MPESA_PASS_KEY } = process.env; // Use same paybill as stk push

//     if (!MPESA_PAYBILL || !MPESA_PASS_KEY) {
//       throw new Error('🛑 Required environment variables are missing!');
//     }

//     const date = new Date();
//     const timestamp = `${date.getFullYear()}${('0' + (date.getMonth() + 1)).slice(-2)}${('0' + date.getDate()).slice(-2)}${(
//       '0' + date.getHours()
//     ).slice(-2)}${('0' + date.getMinutes()).slice(-2)}${('0' + date.getSeconds()).slice(-2)}`;

//     const password = Buffer.from(`${MPESA_PAYBILL}${MPESA_PASS_KEY}${timestamp}`).toString('base64');

//     const requestBody = {
//       BusinessShortCode: MPESA_PAYBILL,
//       Password: password,
//       Timestamp: timestamp,
//       CheckoutRequestID: checkoutRequestID,
//     };
//     console.log('📡 Sending M-Pesa Query request...', requestBody);

//     const response = await axios.post(
//       'https://sandbox.safaricom.co.ke/mpesa/stkpushquery/v1/query',
//       requestBody,
//       { headers: { Authorization: `Bearer ${token}` } }
//     );

//     console.log('✅ M-Pesa Query Response:', response.data);
//     return response.data;
//   } catch (error: any) {
//     console.error('❌ Error querying M-Pesa:', error);

//     if (axios.isAxiosError(error)) {
//       const axiosError = error as AxiosError;
//       console.error('Axios Error Details:', {
//         status: axiosError.response?.status,
//         statusText: axiosError.response?.statusText,
//         headers: axiosError.response?.headers,
//         data: axiosError.response?.data,
//       });

//       let errorMessage = axiosError.message; // Default to Axios message

//       if (axiosError.response?.data) {
//         try {
//           // Attempt to cast to the MpesaErrorResponse interface
//           const mpesaError = axiosError.response.data as MpesaErrorResponse;
//           errorMessage = mpesaError.errorMessage || errorMessage; // Use M-Pesa error if available
//         } catch (e) {
//           console.warn('Could not parse MpesaErrorResponse', e); // Log if parsing fails
//         }
//       }

//       throw new Error(
//         `💥 M-Pesa Query Failed: Request failed with status code ${axiosError.response?.status}: ${errorMessage}`
//       );
//     }

//     throw new Error(`💥 M-Pesa Query Failed: ${error.message}`);
//   }
// };

// // Function to delay execution for a specified time
// const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// // Function to handle the entire M-Pesa payment process
// async function handleMpesaPayment(c: Context) {
//   try {
//     // Extract user payment details from request body
//     const { phoneNumber, amount, user_id, case_id } = await c.req.json();
//     console.log('📩 Received M-Pesa Payment Request:', { phoneNumber, amount, user_id, case_id });

//     // Validate required fields
//     if (!user_id || !case_id || !phoneNumber || amount === undefined) {
//       console.error('❌ Validation Error: Missing required fields', { user_id, case_id, phoneNumber, amount });
//       return c.json(
//         { success: false, message: 'User ID, Case ID, Phone Number, and Amount are required' },
//         400
//       );
//     }

//     // 🔹 **Step 1: Initiate STK Push**
//     const stkResponse = await initiateStkPush(phoneNumber, amount);
//     console.log('📡 STK Push Response:', stkResponse);

//     if (!stkResponse || stkResponse.ResponseCode !== '0') {
//       console.error('❌ STK Push Failed:', stkResponse);
//       return c.json({ success: false, message: 'STK Push initiation failed', response: stkResponse }, 500);
//     }

//     const checkoutRequestID = stkResponse.CheckoutRequestID;
//     console.log(`Checkout Request ID: ${checkoutRequestID}`); // Log the checkoutRequestID

//     // ⏳ **Step 2:  Poll M-Pesa for Transaction Status**
//     const startTime = Date.now();
//     const timeout = 60000; // 1 minute timeout
//     const interval = 2000; // 2 seconds interval

//     while (Date.now() - startTime < timeout) {
//       try {
//         const queryResponse = await queryMpesaTransactionStatus(checkoutRequestID);

//         if (queryResponse && queryResponse.ResultCode === '0') {
//           // Transaction successful
//           const transactionId = queryResponse.MpesaReceiptNumber;
//           const amountPaid = queryResponse.Amount;
//           const phoneNumber = queryResponse.PhoneNumber;

//           const paymentData = {
//             case_id: Number(case_id),
//             user_id: Number(user_id),
//             payment_amount: Number(amount),
//             payment_gateway: 'mpesa',
//             checkout_request_id: checkoutRequestID, // Store CheckoutRequestID
//             transaction_id: transactionId,
//             payment_status: 'completed',
//             payment_note: 'M-Pesa payment successfully processed',
//           };

//           // 💾 Create payment record in the database only if successful
//           await createPayment(paymentData);
//           await updateCasePaymentStatus(Number(case_id));

//           return c.json(
//             {
//               success: true,
//               message: '✅ M-Pesa payment successful!',
//               transactionId,
//               amount: amountPaid,
//               phoneNumber,
//               status: 'completed',
//             },
//             200
//           );
//         } else if (queryResponse && queryResponse.ResultCode !== '0') {
//           // Transaction failed
//           const errorMessage = queryResponse.ResultDesc || 'M-Pesa transaction failed';
//           console.warn('M-Pesa transaction failed:', queryResponse); // Log the full queryResponse
//           return c.json({ success: false, message: errorMessage, status: 'failed' }, 400);
//         } else {
//           // Transaction pending - keep querying
//           console.log('M-Pesa transaction pending.  Querying again in 2 seconds...');
//           await delay(interval);
//         }
//       } catch (queryError: any) {
//         console.error('❌ Error querying M-Pesa:', queryError.message);
//         // Consider whether to break the loop on certain errors or keep retrying.
//         // For now, we retry.
//         await delay(interval);
//       }
//     }

//     // Timeout reached - transaction status still unknown
//     console.log('M-Pesa transaction timeout.');
//     return c.json({ success: false, message: 'M-Pesa transaction timeout', status: 'timeout' }, 408);
//   } catch (error: any) {
//     console.error('💥 M-Pesa Payment Error:', error);
//     const message = error instanceof Error ? error.message : 'Unknown Error';
//     return c.json({ success: false, message }, 500);
//   }
// }

// // Function to handle getting transaction status from the store (deprecated)
// async function getMpesaTransactionStatus(c: Context) {
//   console.warn('⚠️ getMpesaTransactionStatus is no longer recommended');
//   return c.json({ success: false, message: 'Not recommended' }, 400);
// }

// // Exported query url as an endpoint (deprecated)
// async function fetchMpesaTransactionStatus(c: Context) {
//   console.warn('⚠️ fetchMpesaTransactionStatus is no longer recommended');
//   return c.json({ success: false, message: 'Not recommended' }, 400);
// }

// // Handle Stripe Payment
// async function handleStripePayment(c: Context) {
//   const { amount, user_id, case_id } = await c.req.json();

//   // Validate user ID and case ID
//   if (!user_id || !case_id) {
//     return c.json({ success: false, message: 'User ID and Case ID are required' }, 400);
//   }

//   try {
//     // Create a checkout session
//     const session = await stripe.checkout.sessions.create({
//       payment_method_types: ['card'],
//       line_items: [
//         {
//           price_data: {
//             currency: 'usd',
//             product_data: {
//               name: 'Payment for Case ID: ' + case_id,
//             },
//             unit_amount: amount * 100, // Amount in cents
//           },
//           quantity: 1,
//         },
//       ],
//       mode: 'payment',
//       success_url: `${process.env.FRONTEND_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
//       cancel_url: `${process.env.FRONTEND_URL}/cancel`,
//     });

//     return c.json({ success: true, sessionId: session.id });
//   } catch (error: any) {
//     console.error('Stripe Payment Error:', error);
//     const message = error instanceof Error ? error.message : 'Unknown Error';
//     return c.json({ success: false, message }, 500);
//   }
// }

// // Handle Stripe webhook for payment confirmation
// async function stripeWebhook(c: Context) {
//   const sig = c.req.header('stripe-signature') as string;

//   let event;

//   try {
//     const body = await c.req.text(); // Get raw body for webhook verification
//     event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
//   } catch (err: any) {
//     console.error('Webhook signature verification failed.', err);
//     const message = err instanceof Error ? err.message : 'Unknown Error';
//     return c.json({ error: `Webhook Error: ${message}` }, 400);
//   }

//   if (event.type === 'checkout.session.completed') {
//     const session = event.data.object;

//     // Check if metadata exists
//     const caseId = session.metadata?.case_id; // Use optional chaining
//     const userId = session.metadata?.user_id; // Ensure user_id is included

//     // Store payment details in the database
//     const paymentData = {
//       transaction_id: session.id,
//       payment_status: 'completed',
//       payment_note: generatePaymentNote(),
//       case_id: Number(caseId), // Convert to number
//       user_id: Number(userId), // Convert to number
//       payment_amount: session.amount_total ? session.amount_total / 100 : 0, // Convert back to original amount safely
//       payment_gateway: 'stripe', // Specify payment gateway
//     };

//     await createPayment(paymentData);
//     await updateCasePaymentStatus(Number(caseId)); // Update case payment status
//   }

//   return c.json({ received: true });
// }

// // Cash Payment Logic
// async function handleCashPayment(c: Context) {
//   try {
//     const requestBody = await c.req.text(); // Obtain body as text.
//     const parsedBody = JSON.parse(requestBody); // Parse JSON.
//     console.log('Received Payment Request:', parsedBody);

//     const { amount, user_id, case_id } = parsedBody;

//     if (!user_id || !case_id || amount === undefined) {
//       console.error('Validation Error: Missing required fields', { user_id, case_id, amount });
//       return c.json(
//         { success: false, message: 'User ID, Case ID, and Amount are required' },
//         400
//       );
//     }

//     const paymentData = {
//       case_id: Number(case_id),
//       user_id: Number(user_id),
//       payment_amount: Number(amount), // Ensure it's a number
//       payment_gateway: 'cash',
//       transaction_id: `CASH-${Date.now()}`,
//       payment_status: 'completed',
//       payment_note: generatePaymentNote(),
//     };

//     await createPayment(paymentData);
//     await updateCasePaymentStatus(case_id);

//     return c.json({ success: true, payment: paymentData }, 201);
//   } catch (error: any) {
//     console.error('Cash Payment Error:', error);
//     const message = error instanceof Error ? error.message : 'Unknown Error';
//     return c.json({ success: false, message }, 500);
//   }
// }

// // Fetch all payments
// async function fetchAllPayments(c: Context) {
//   try {
//     const payments = await getAllPayments();
//     return c.json({ success: true, payments });
//   } catch (error: any) {
//     console.error('Error fetching payments:', error);
//     const message = error instanceof Error ? error.message : 'Unknown Error';
//     return c.json({ success: false, message }, 500);
//   }
// }

// // Fetch payment by ID
// async function fetchPaymentById(c: Context) {
//   const paymentId = c.req.param('paymentId');

//   try {
//     const payment = await getPaymentById(Number(paymentId));
//     return c.json({ success: true, payment });
//   } catch (error: any) {
//     console.error('Error fetching payment by ID:', error);
//     const message = error instanceof Error ? error.message : 'Unknown Error';
//     return c.json({ success: false, message }, 500);
//   }
// }

// // Fetch payments by case ID
// async function fetchPaymentsByCaseId(c: Context) {
//   const caseId = c.req.param('caseId');

//   try {
//     const payments = await getPaymentsByCaseId(Number(caseId));
//     return c.json({ success: true, payments });
//   } catch (error: any) {
//     console.error('Error fetching payments by case ID:', error);
//     const message = error instanceof Error ? error.message : 'Unknown Error';
//     return c.json({ success: false, message }, 500);
//   }
// }

// // Update a payment
// async function updatePaymentDetails(paymentId: string, paymentUpdates: any) {
//   try {
//     const updatedPayment = await updatePayment(Number(paymentId), paymentUpdates);
//     return updatedPayment;
//   } catch (error: any) {
//     console.error('Error updating payment:', error);
//     throw error; // Re-throw the error to be handled upstream
//   }
// }

// // Delete a payment
// async function removePayment(c: Context) {
//   const paymentId = c.req.param('paymentId');

//   try {
//     const result = await deletePayment(Number(paymentId));
//     return c.json({ success: true, message: `Payment with ID ${result.paymentId} deleted successfully.` });
//   } catch (error: any) {
//     console.error('Error deleting payment:', error);
//     const message = error instanceof Error ? error.message : 'Unknown Error';
//     return c.json({ success: false, message }, 500);
//   }
// }

// // Exporting functions
// export {
//   handleMpesaPayment,
//   handleStripePayment,
//   stripeWebhook,
//   handleCashPayment,
//   fetchAllPayments,
//   fetchPaymentById,
//   fetchPaymentsByCaseId,
//   updatePaymentDetails,
//   removePayment,
//   getMpesaTransactionStatus,
//   fetchMpesaTransactionStatus,
// };