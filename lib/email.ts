const RESEND_API_KEY = process.env.RESEND_API_KEY!;
const FROM_EMAIL = process.env.FROM_EMAIL || "noreply@yourdomain.com";
const RESEND_API_URL = "https://api.resend.com/emails";

async function sendEmail(payload: {
  from: string;
  to: string | string[];
  subject: string;
  html: string;
}): Promise<void> {
  const response = await fetch(RESEND_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      `Failed to send email: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`,
    );
  }
}

export async function sendAssignmentEmail(
  to: string,
  workOrderTitle: string,
  technicianName: string,
): Promise<void> {
  await sendEmail({
    from: FROM_EMAIL,
    to,
    subject: `Work Order Assigned: ${workOrderTitle}`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>Work Order Assignment</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #f8f9fa; border-radius: 8px; padding: 30px; border-left: 4px solid #0070f3;">
            <h1 style="color: #0070f3; margin-top: 0; font-size: 24px;">Work Order Assigned</h1>
            <p style="font-size: 16px;">Hello <strong>${technicianName}</strong>,</p>
            <p style="font-size: 16px;">You have been assigned a new work order:</p>
            <div style="background-color: #ffffff; border-radius: 6px; padding: 20px; margin: 20px 0; border: 1px solid #e0e0e0;">
              <h2 style="margin: 0; color: #333; font-size: 18px;">${workOrderTitle}</h2>
            </div>
            <p style="font-size: 16px;">Please log in to the system to view the full details and get started.</p>
            <p style="font-size: 14px; color: #666; margin-top: 30px;">
              If you have any questions, please contact your supervisor.
            </p>
          </div>
          <p style="font-size: 12px; color: #999; text-align: center; margin-top: 20px;">
            This is an automated message. Please do not reply to this email.
          </p>
        </body>
      </html>
    `,
  });
}

export async function sendCompletionEmail(
  to: string,
  workOrderTitle: string,
): Promise<void> {
  await sendEmail({
    from: FROM_EMAIL,
    to,
    subject: `Work Order Completed: ${workOrderTitle}`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>Work Order Completed</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #f8f9fa; border-radius: 8px; padding: 30px; border-left: 4px solid #28a745;">
            <h1 style="color: #28a745; margin-top: 0; font-size: 24px;">Work Order Completed</h1>
            <p style="font-size: 16px;">Good news! The following work order has been marked as completed:</p>
            <div style="background-color: #ffffff; border-radius: 6px; padding: 20px; margin: 20px 0; border: 1px solid #e0e0e0;">
              <h2 style="margin: 0; color: #333; font-size: 18px;">${workOrderTitle}</h2>
            </div>
            <p style="font-size: 16px;">
              The work order has been successfully completed. You can log in to the system to view the completion details and any notes added by the technician.
            </p>
            <p style="font-size: 14px; color: #666; margin-top: 30px;">
              If you have any questions or concerns about this work order, please contact the assigned technician or your supervisor.
            </p>
          </div>
          <p style="font-size: 12px; color: #999; text-align: center; margin-top: 20px;">
            This is an automated message. Please do not reply to this email.
          </p>
        </body>
      </html>
    `,
  });
}
