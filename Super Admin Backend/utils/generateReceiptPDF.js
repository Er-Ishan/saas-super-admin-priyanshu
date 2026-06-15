import PDFDocument from "pdfkit";

export const generateReceiptPDF = (data) => {
    return new Promise((resolve) => {
        const doc = new PDFDocument({ size: "A4", margin: 50 });
        const buffers = [];

        doc.on("data", buffers.push.bind(buffers));
        doc.on("end", () => {
            resolve(Buffer.concat(buffers));
        });

        doc.fontSize(20).text("Payment Receipt", { align: "center" });
        doc.moveDown();

        doc.fontSize(12);
        doc.text(`Booking Reference: ${data.booking_id}`);
        doc.text(`Customer Name: ${data.first_name}`);
        doc.text(`Service: ${data.product_name}`);
        doc.text(`Drop-off Date: ${data.drop_off_date}`);
        doc.text(`Return Date: ${data.return_date}`);
        doc.moveDown();

        doc.text(`Amount Paid: £${data.total_payable}`, { bold: true });
        doc.text(`Payment Status: PAID`);
        doc.text(`Payment Date: ${new Date().toLocaleString()}`);

        doc.moveDown(2);
        doc.text(`Thank you for choosing ${data.website_name || "Parking Box Parking Services"}.`, {
            align: "center"
        });

        doc.end();
    });
};
