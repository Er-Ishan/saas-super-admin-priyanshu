import transporter from "./mailer.js";

const money = (val) =>
  val !== null && val !== undefined ? `£${Number(val).toFixed(2)}` : "£0.00";

const safe = (val) => (val ? val : "TBC");


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


const sendPaymentSuccessEmail = async (booking) => {
  const {
    email,
    first_name,
    last_name,
    travelling_from,
    ref_no,

    // Travel
    drop_off_date,
    return_date,
    depart_terminal,
    depart_flight,
    return_terminal,
    return_flight,
    passengers,

    // Vehicle
    vehicle_make,
    vehicle_registration,
    vehicle_model,
    vehicle_colour,

    // Contact
    mobile,

    // Product
    product_flexibility,
    product_name,

    // Payment
    quote_amount,
    discount,
    booking_fee,
    addons_total,
    total_payable,
    website_name
  } = booking;

  const companyName = website_name || "Parking Box Parking Services";

  const html = `
  <div style="font-family: Arial, sans-serif; max-width: 720px; margin:auto; color:#333; line-height:1.6">

    <p><strong>Dear ${safe(first_name)} ${safe(last_name)},</strong></p>

    <p>Thank you for booking via <strong>${companyName}</strong>.</p>

    <p>
      We are pleased to confirm your 
      <strong>${travelling_from} Airport parking – Park & Ride service</strong>.
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
    <table width="100%" cellpadding="8" cellspacing="0" style="border-collapse:collapse; border:1px solid #ddd; margin-bottom:18px;">
      <tr><td style="border:1px solid #ddd;"><strong>Parking Service</strong></td><td style="border:1px solid #ddd;">${safe(product_name)}</td></tr>
      <tr><td style="border:1px solid #ddd;"><strong>Parking Reference</strong></td><td style="border:1px solid #ddd;">${safe(ref_no)}</td></tr>
      <tr>
  <td style="border:1px solid #ddd;"><strong>Travel Date (Outbound)</strong></td>
  <td style="border:1px solid #ddd;">${formatEmailDateTime(drop_off_date)}</td>
</tr>
      <tr><td style="border:1px solid #ddd;"><strong>Outbound Terminal</strong></td><td style="border:1px solid #ddd;">${safe(depart_terminal)}</td></tr>
      <tr><td style="border:1px solid #ddd;"><strong>Outbound Flight</strong></td><td style="border:1px solid #ddd;">${safe(depart_flight)}</td></tr>
      <tr>
  <td style="border:1px solid #ddd;"><strong>Return Date</strong></td>
  <td style="border:1px solid #ddd;">${formatEmailDateTime(return_date)}</td>
</tr>
      <tr><td style="border:1px solid #ddd;"><strong>Return Terminal</strong></td><td style="border:1px solid #ddd;">${safe(return_terminal)}</td></tr>
      <tr><td style="border:1px solid #ddd;"><strong>Return Flight</strong></td><td style="border:1px solid #ddd;">${safe(return_flight)}</td></tr>
      <tr>
        <td style="border:1px solid #ddd;"><strong>Number of Passengers</strong></td>
        <td style="border:1px solid #ddd;">${safe(passengers)} <em>(required for Park & Ride service)</em></td>
      </tr>
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
      <tr><td style="border:1px solid #ddd;"><strong>Car Park Contact Number</strong></td><td style="border:1px solid #ddd;"><strong>074 044 50858</strong></td></tr>
    </table>


    <h2 style="margin:0 0 10px 0;">Arrival Procedure </h2>
    <ul style="margin-top:0;">
      <li>Drive to the car park using the address provided in your booking confirmation.</li>
      <li>Enter the car park and follow the signs to Level 1 or Level 2.</li>
      <li>A member of our team will greet you on Level 1. They will assist you with parking and guide to the nearest bus stop or train station for your onward journey to the airport.</li>
      <li>Keep your car keys with you for complete peace of mind.</li>
      <li>Make your way to ${travelling_from} Airport terminals via public transport or taxi services.</li>
     
    </ul>

    <h2 style="margin:0 0 10px 0;">Directions to the Car Park</h2>
    <p style="margin:0 0 8px 0;"><strong>Postcode:</strong> RH10 3HZ</p>

    <h3 style="margin:10px 0 6px 0;">Via M23</h3>
    <ul style="margin-top:0;">
      <li>Leave the M23 at <strong>Junction 10</strong>, signposted to Crawley / East Grinstead</li>
      <li>Take the exit for <strong>East Grinstead (A264 Copthorne Way)</strong></li>
      <li>Go straight over the next roundabout and continue for approximately <strong>1.5 miles</strong></li>
      <li>At the next roundabout, take the <strong>first exit</strong> signposted to Lingfield</li>
      <li>At the following roundabout, turn <strong>left onto the B2037</strong></li>
      <li>After approximately <strong>¼ mile</strong>, pass the <strong>Curious Pig Inn</strong> on your left</li>
      <li><strong>${companyName}</strong> is the next turning on your right</li>
    </ul>

    <h3 style="margin:10px 0 6px 0;">Via M25</h3>
    <ul style="margin-top:0;">
      <li>Exit at <strong>Junction 7</strong> to join the M23, then follow the M23 directions above</li>
    </ul>

    <h3 style="margin:10px 0 6px 0;">Via M25 (From Kent / Dartford Tunnel)</h3>
    <ul style="margin-top:0;">
      <li>Exit the M25 at <strong>Junction 6</strong>, signposted to Godstone</li>
      <li>Follow the <strong>A22</strong> towards East Grinstead for approximately <strong>7.5 miles</strong></li>
      <li>At the roundabout with the <strong>Mormon Temple</strong> directly ahead, take the <strong>3rd exit onto B2028</strong></li>
      <li>Follow the road until the roundabout, then turn <strong>right onto the B2037</strong></li>
      <li>After approximately <strong>¼ mile</strong>, pass the <strong>Curious Pig Inn</strong> on your left</li>
      <li><strong>${companyName}</strong> is the next turning on your right</li>
    </ul>

    <h2 style="margin:0 0 10px 0;">Return Procedure</h2>
    <ul style="margin-top:0;">
      <li>Upon your return to ${travelling_from}, make your way back to the car park using public transport or taxi services. (You will be picked by staff at the Short stay car park if using our shuttle services.)</li>
      <li>Collect your vehicle and continue your journey home.</li>
      <li>A member of our team will meet you at the car park when you arrive.</li>
    </ul>

    <h2 style="margin:0 0 10px 0;">Important Information</h2>
    <ul style="margin-top:0;">
      <li>The correct vehicle registration number must be provided at booking</li>
      <li>Long-wheelbase vans over <strong>5.3 metres</strong> in length are not accepted</li>
    </ul>

    <h2 style="margin:0 0 10px 0;">Terms & Conditions (Summary)</h2>
    <ul style="margin-top:0;">
      <li>${companyName} provides parking services subject to their own terms and conditions</li>
      <li>Customers must call the car park on both <strong>drop-off</strong> and <strong>return</strong> days</li>
      <li>Any claims relating to parking services (vehicle handling, damage, etc.) must be made directly with ${companyName}</li>
      <li>Liability is limited to losses arising from booking processing only</li>
    </ul>

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
      <strong>Helpline:</strong> 074 044 50858<br/>
      <strong>Office Hours:</strong> Monday – Friday, 09:00 - 07:00
    </p>

    <p style="margin:0 0 10px 0;">
      <strong>Address::</strong>5 36 Hamilton road UB33AS<br/>
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
