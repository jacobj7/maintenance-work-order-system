import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_EMAIL = process.env.FROM_EMAIL || "noreply@yourdomain.com";

export async function sendConfirmationEmail(
  to: string,
  workOrderId: string,
  description: string,
): Promise<void> {
  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject: `Work Order Confirmation - #${workOrderId}`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <title>Work Order Confirmation</title>
          </head>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background-color: #f8f9fa; border-radius: 8px; padding: 30px; border: 1px solid #e9ecef;">
              <h1 style="color: #2c3e50; margin-top: 0; font-size: 24px;">Work Order Confirmed</h1>
              <p style="font-size: 16px;">Your work order has been successfully submitted and confirmed.</p>
              
              <div style="background-color: #ffffff; border-radius: 6px; padding: 20px; margin: 20px 0; border: 1px solid #dee2e6;">
                <h2 style="color: #495057; font-size: 18px; margin-top: 0;">Work Order Details</h2>
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 8px 0; font-weight: bold; color: #6c757d; width: 40%;">Work Order ID:</td>
                    <td style="padding: 8px 0; color: #2c3e50;">#${workOrderId}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; font-weight: bold; color: #6c757d; vertical-align: top;">Description:</td>
                    <td style="padding: 8px 0; color: #2c3e50;">${description}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; font-weight: bold; color: #6c757d;">Status:</td>
                    <td style="padding: 8px 0;">
                      <span style="background-color: #d4edda; color: #155724; padding: 3px 10px; border-radius: 12px; font-size: 14px;">Confirmed</span>
                    </td>
                  </tr>
                </table>
              </div>
              
              <p style="color: #6c757d; font-size: 14px;">You will receive further updates as the status of your work order changes. Please keep this email for your records.</p>
              
              <hr style="border: none; border-top: 1px solid #dee2e6; margin: 20px 0;" />
              <p style="color: #adb5bd; font-size: 12px; margin-bottom: 0;">This is an automated message. Please do not reply to this email.</p>
            </div>
          </body>
        </html>
      `,
      text: `Work Order Confirmation\n\nYour work order has been successfully submitted and confirmed.\n\nWork Order ID: #${workOrderId}\nDescription: ${description}\nStatus: Confirmed\n\nYou will receive further updates as the status of your work order changes.\n\nThis is an automated message. Please do not reply to this email.`,
    });
  } catch (error) {
    console.error(
      `Failed to send confirmation email for work order ${workOrderId}:`,
      error,
    );
    throw new Error(
      `Failed to send confirmation email: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}

export async function sendStatusChangeEmail(
  to: string,
  workOrderId: string,
  newStatus: string,
): Promise<void> {
  const statusColors: Record<string, { bg: string; text: string }> = {
    pending: { bg: "#fff3cd", text: "#856404" },
    in_progress: { bg: "#cce5ff", text: "#004085" },
    completed: { bg: "#d4edda", text: "#155724" },
    cancelled: { bg: "#f8d7da", text: "#721c24" },
    on_hold: { bg: "#e2e3e5", text: "#383d41" },
  };

  const statusColor = statusColors[newStatus.toLowerCase()] || {
    bg: "#e2e3e5",
    text: "#383d41",
  };
  const formattedStatus = newStatus
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject: `Work Order Status Update - #${workOrderId}`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <title>Work Order Status Update</title>
          </head>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background-color: #f8f9fa; border-radius: 8px; padding: 30px; border: 1px solid #e9ecef;">
              <h1 style="color: #2c3e50; margin-top: 0; font-size: 24px;">Work Order Status Update</h1>
              <p style="font-size: 16px;">The status of your work order has been updated.</p>
              
              <div style="background-color: #ffffff; border-radius: 6px; padding: 20px; margin: 20px 0; border: 1px solid #dee2e6;">
                <h2 style="color: #495057; font-size: 18px; margin-top: 0;">Update Details</h2>
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 8px 0; font-weight: bold; color: #6c757d; width: 40%;">Work Order ID:</td>
                    <td style="padding: 8px 0; color: #2c3e50;">#${workOrderId}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; font-weight: bold; color: #6c757d;">New Status:</td>
                    <td style="padding: 8px 0;">
                      <span style="background-color: ${statusColor.bg}; color: ${statusColor.text}; padding: 3px 10px; border-radius: 12px; font-size: 14px;">${formattedStatus}</span>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; font-weight: bold; color: #6c757d;">Updated At:</td>
                    <td style="padding: 8px 0; color: #2c3e50;">${new Date().toLocaleString("en-US", { dateStyle: "long", timeStyle: "short" })}</td>
                  </tr>
                </table>
              </div>
              
              <p style="color: #6c757d; font-size: 14px;">If you have any questions about this update, please contact our support team.</p>
              
              <hr style="border: none; border-top: 1px solid #dee2e6; margin: 20px 0;" />
              <p style="color: #adb5bd; font-size: 12px; margin-bottom: 0;">This is an automated message. Please do not reply to this email.</p>
            </div>
          </body>
        </html>
      `,
      text: `Work Order Status Update\n\nThe status of your work order has been updated.\n\nWork Order ID: #${workOrderId}\nNew Status: ${formattedStatus}\nUpdated At: ${new Date().toLocaleString("en-US", { dateStyle: "long", timeStyle: "short" })}\n\nIf you have any questions about this update, please contact our support team.\n\nThis is an automated message. Please do not reply to this email.`,
    });
  } catch (error) {
    console.error(
      `Failed to send status change email for work order ${workOrderId}:`,
      error,
    );
    throw new Error(
      `Failed to send status change email: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}
