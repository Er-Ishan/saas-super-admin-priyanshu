import transporter from "./mailer.js";
import moment from "moment";
import db from "../config/db.js";




export const sendBookingEmail = async ({
    to,
    first_name,
    booking_id,
    product_name,
    drop_off_date,
    return_date,
    total_payable,
    payment_link,
    company_id
}) => {

    const [settingsRows] = await db.promise().query(
        "SELECT website_name FROM website_settings WHERE company_id = ? LIMIT 1",
        [company_id || 1]
    );
    const companyName = settingsRows.length && settingsRows[0].website_name
        ? settingsRows[0].website_name
        : "Parking Box Parking Services";

    const formattedDropOff = moment(drop_off_date).format("ddd, DD MMM YYYY HH:mm");
    const formattedReturn = moment(return_date).format("ddd, DD MMM YYYY HH:mm");

    const htmlTemplate = `
    <div style="font-family: Arial, sans-serif; background:#f4f6f8; padding:20px;">
        <div style="max-width:600px; margin:auto; background:#ffffff; padding:25px; border-radius:6px;">
            
            <h2 style="color:#0a3d62; text-align:center;">
                Booking Created
            </h2>

            <p>Dear <strong>${first_name}</strong>,</p>

            <p>
                Thank you for choosing <strong>${companyName}</strong>.
                Your booking has been successfully created.
            </p>

            <!-- PAYMENT STATUS NOTE -->
            <div style="background:#fff3cd; border:1px solid #ffeeba; padding:15px; border-radius:5px; margin:20px 0;">
                <strong>Payment Status:</strong> 
                <span style="color:#856404;">Pending</span>
                <br>
                <span style="font-size:13px; color:#856404;">
                    Your booking is reserved, but payment is required to fully confirm your parking space.
                </span>
            </div>

            <table width="100%" cellpadding="10" cellspacing="0" 
                style="border-collapse:collapse; margin-top:20px;">
                <tr style="background:#f1f1f1;">
                    <td><strong>Booking Reference</strong></td>
                    <td>${booking_id}</td>
                </tr>
                <tr>
                    <td><strong>Service</strong></td>
                    <td>${product_name}</td>
                </tr>
                <tr style="background:#f1f1f1;">
    <td><strong>Drop-off Date</strong></td>
    <td>${formattedDropOff}</td>
</tr>
<tr>
    <td><strong>Return Date</strong></td>
    <td>${formattedReturn}</td>
</tr>

                <tr style="background:#f1f1f1;">
                    <td><strong>Total Payable</strong></td>
                    <td><strong>£${total_payable}</strong></td>
                </tr>

                <tr style="background:#f1f1f1;">
                    <td><strong>Payment</strong></td>
                    <td><strong>${payment_link}</strong></td>
                </tr>
            </table>

            <p style="margin-top:20px;">
                Please keep this email for your records.
                If you have any questions, simply reply to this email.
            </p>

            <p style="margin-top:30px;">
                Kind regards,<br>
                <strong>${companyName} Team</strong>
            </p>

            <hr style="margin-top:30px;">
            <p style="font-size:12px; color:#777;">
                This is an automated email. Please do not share your booking reference publicly.
            </p>

        </div>
    </div>
    `;

    await transporter.sendMail({
        from: `"${companyName}" <${process.env.SMTP_USER}>`,
        to,
        subject: `🅿️ Booking Created – Payment Pending | ${companyName}`,
        html: htmlTemplate
    });
};
