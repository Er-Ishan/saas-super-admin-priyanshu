import transporter from "./mailer.js";

/* ---------------- HELPERS ---------------- */

const money = (val) =>
  val !== null && val !== undefined ? `£${Number(val).toFixed(2)}` : "£0.00";

const safe = (val) => (val ? val : "TBC");

const safeHtml = (val) => {
  if (!val) return "<li>TBC</li>";
  return val; // already stored as HTML (<li>...</li>)
};

const formatEmailDateTime = (value) => {
  if (!value) return "TBC";

  const date = new Date(value);
  if (isNaN(date.getTime())) return value;

  return date.toLocaleString("en-GB", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
};

const getPassengersRow = (service, passengers) => {
  if (String(service).toLowerCase() !== "park & ride") return "";

  return `
    <tr>
      <td style="border:1px solid #ddd;"><strong>Number of Passengers</strong></td>
      <td style="border:1px solid #ddd;">
        ${safe(passengers)} <em>(required for Park & Ride service)</em>
      </td>
    </tr>
  `;
};


const getNonRefundableWarning = (nonflex) => {
  if (String(nonflex).toLowerCase() !== "non-refundable") return "";

  return `
    <div style="
      background:#fffbe6;
      border:1px solid #facc15;
      border-left:6px solid #f59e0b;
      padding:14px 16px;
      margin:18px 0;
      border-radius:6px;
      color:#92400e;
      font-size:14px;
    ">
      ⚠️ <strong>Important Notice:</strong><br/>
      This product is <strong>Non-Refundable</strong>.  
      Once booked, this service cannot be amended, cancelled, or refunded.
    </div>
  `;
};


const getAirportAddressHtml = (travelling_from) => {
  const airport = String(travelling_from || "").toLowerCase();

  if (airport.includes("heathrow")) {
    return `
      Old Rectory Road,
      Horton Road,
      SL3 9NU
    `;
  }

  if (airport.includes("gatwick")) {
    return `
      15 Massetts Road,
      Horley,
      Surrey,
      RH6 7DQ
    `;
  }

  return "TBC";
};


/* ---------------- MAIN EMAIL FUNCTION ---------------- */

const sendPaymentSuccessEmail = async (booking) => {
  const {
    email,
    first_name,
    last_name,
    travelling_from,
    ref_no,

    drop_off_date,
    return_date,
    depart_terminal,
    depart_flight,
    return_terminal,
    return_flight,
    passengers,
    nonflex,

    vehicle_make,
    vehicle_model,
    vehicle_colour,
    vehicle_registration,
    airport_duty_number,

    mobile,

    product_name,
    email_dropoff_procedure,
    email_return_procedure,
    directions,
    email_notes,
    service_type,

    quote_amount,
    discount,
    booking_fee,
    addons_total,
    total_payable,
    website_name
  } = booking;

  const companyName = website_name || "Parking Box Parking Services";

  const html = `
  <div style="font-family:Arial,sans-serif;max-width:720px;margin:auto;color:#333;line-height:1.6">

    <p><strong>Dear ${safe(first_name)} ${safe(last_name)},</strong></p>

    <p>Thank you for booking via <strong>${companyName}</strong>.</p>

    <p>
      We are pleased to confirm your 
      <strong>${product_name} – ${service_type}</strong>.
      Please read and <strong>save the details below carefully</strong> prior to your journey.
    </p>

    <hr/>

    <h2 style="margin:0 0 10px 0;">Booking Reference</h2>
    <p style="margin:0 0 15px 0;">
      <strong>Booking Reference:</strong> <strong>${safe(ref_no)}</strong><br/>
      (Please quote this reference when contacting <strong>${companyName}</strong>)
    </p>

    <hr/>

    <h2 style="margin:0 0 10px 0;">Parking & Travel Details</h2>
    ${getNonRefundableWarning(nonflex)}
    <table width="100%" cellpadding="8" cellspacing="0" style="border-collapse:collapse; border:1px solid #ddd; margin-bottom:18px;">
      <tr><td style="border:1px solid #ddd;"><strong>Parking Service</strong></td><td style="border:1px solid #ddd;">${safe(product_name)}</td></tr>
      <tr><td style="border:1px solid #ddd;"><strong>Parking Service</strong></td><td style="border:1px solid #ddd;">${safe(travelling_from)}</td></tr>
      <tr><td style="border:1px solid #ddd;"><strong>Parking Reference</strong></td><td style="border:1px solid #ddd;">${safe(ref_no)}</td></tr>
      <tr>
  <td style="border:1px solid #ddd;"><strong>Travel Date (Outbound)</strong></td>
  <td style="border:1px solid #ddd;">${formatEmailDateTime(drop_off_date)}</td>
</tr>
      <tr><td style="border:1px solid #ddd;"><strong>Depart Terminal</strong></td><td style="border:1px solid #ddd;">${safe(depart_terminal)}</td></tr>
      <tr><td style="border:1px solid #ddd;"><strong>Depart Flight</strong></td><td style="border:1px solid #ddd;">${safe(depart_flight)}</td></tr>
      <tr>
  <td style="border:1px solid #ddd;"><strong>Return Date</strong></td>
  <td style="border:1px solid #ddd;">${formatEmailDateTime(return_date)}</td>
</tr>
      <tr><td style="border:1px solid #ddd;"><strong>Return Terminal</strong></td><td style="border:1px solid #ddd;">${safe(return_terminal)}</td></tr>
      <tr><td style="border:1px solid #ddd;"><strong>Return Flight</strong></td><td style="border:1px solid #ddd;">${safe(return_flight)}</td></tr>
      ${getPassengersRow(service_type, passengers)}

    </table>

    <h2 style="margin:0 0 10px 0;">Vehicle Information</h2>
    <table width="100%" cellpadding="8" cellspacing="0" style="border-collapse:collapse; border:1px solid #ddd; margin-bottom:18px;">
      <tr><td style="border:1px solid #ddd;"><strong>Vehicle Make</strong></td><td style="border:1px solid #ddd;">${safe(vehicle_make)}</td></tr>
      <tr><td style="border:1px solid #ddd;"><strong>Vehicle Model</strong></td><td style="border:1px solid #ddd;">${safe(vehicle_model)}</td></tr>
      <tr><td style="border:1px solid #ddd;"><strong>Colour</strong></td><td style="border:1px solid #ddd;">${safe(vehicle_colour)}</td></tr>
      <tr><td style="border:1px solid #ddd;"><strong>Registration Number</strong></td><td style="border:1px solid #ddd;">${safe(vehicle_registration)}</td></tr>
    </table>

    <h2 style="margin:0 0 10px 0;">Contact Information</h2>
    <table width="100%" cellpadding="8" cellspacing="0" style="border-collapse:collapse; border:1px solid #ddd; margin-bottom:18px;">
      <tr><td style="border:1px solid #ddd;"><strong>Customer Contact Number</strong></td><td style="border:1px solid #ddd;">${safe(mobile)}</td></tr>
      <tr><td style="border:1px solid #ddd;"><strong>Car Park Contact Number</strong></td><td style="border:1px solid #ddd;"><strong>${airport_duty_number ? airport_duty_number : "---"}</strong></td></tr>
    </table>

    <h2>Arrival Procedure</h2>
    <div>${safeHtml(email_dropoff_procedure)}</div>

    <h2>Return Procedure</h2>
    <div>${safeHtml(email_return_procedure)}</div>

    <h2>Directions</h2>
    <div>${safeHtml(directions)}</div>

    <h2>Additional Notes</h2>
    <div>${safeHtml(email_notes)}</div>

    
    <h2 style="margin:0 0 6px 0;">Read Terms</h2>

<p style="margin:0 0 12px 0;">
  Please read our full <strong>Terms &amp; Conditions</strong> here:
  <br/>
  <a
    href="https://parkingbox.co.uk/termsandconditions"
    target="_blank"
    style="color:#1a73e8; font-weight:600; text-decoration:underline;"
  >
    https://parkingbox.co.uk/termsandconditions
  </a>
</p>
    

    <h2 style="margin:0 0 10px 0;">Payment Summary</h2>
    <table width="100%" cellpadding="8" cellspacing="0" style="border-collapse:collapse; border:1px solid #ddd; margin-bottom:18px;">
      <tr><td style="border:1px solid #ddd;">Booking Quote</td><td style="border:1px solid #ddd;">${money(quote_amount)}</td></tr>
      <tr><td style="border:1px solid #ddd;">Discount</td><td style="border:1px solid #ddd;">- ${money(discount)}</td></tr>
      <tr><td style="border:1px solid #ddd;">Booking Fee</td><td style="border:1px solid #ddd;">${money(booking_fee)}</td></tr>
      <tr><td style="border:1px solid #ddd;">Optional Charges</td><td style="border:1px solid #ddd;">${money(addons_total)}</td></tr>
      <tr style="background:#f1f8e9;">
        <td style="border:1px solid #ddd;"><strong>Total Paid</strong></td>
        <td style="border:1px solid #ddd;"><strong>${money(total_payable)}</strong></td>
      </tr>
    </table>

    <hr/>

    <p style="margin:0 0 10px 0;">
      ❗ <strong>Please do not reply to this email</strong>. This inbox is not monitored.
    </p>

    <p style="margin:0 0 10px 0;">
      ❗ <strong>Please-note:</strong> This inbox is not monitored. You can use our drop off service to and back from airport with additional charges payable at the carpark itself. 
    </p>

    <p style="margin:0 0 10px 0;">
      <strong>Office Hours:</strong> Monday – Friday, 09.00 am to 07.00 pm
    </p>

    <p style="margin:0 0 10px 0;">
  <strong>Address:</strong><br/>
  684 West College St. Sun City, USA
</p>

    <p style="font-size:12px; color:#777; margin:0;">
      © ${new Date().getFullYear()} <strong>${companyName}</strong>. All Rights Reserved.
    </p>


  </div>
  `;

  await transporter.sendMail({
    from: `"${companyName}" <${process.env.SMTP_USER}>`,
    to: email,
    cc: "bookings@parkingbox.co.uk",
    subject: `Booking Confirmed – ${safe(ref_no)}`,
    html,
  });
};

export default sendPaymentSuccessEmail;
