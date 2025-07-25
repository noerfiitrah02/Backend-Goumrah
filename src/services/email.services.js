const nodemailer = require("nodemailer");
const mailConfig = require("../config/mail.config");

// Konfigurasi transporter
const transporter = nodemailer.createTransport({
  host: mailConfig.host,
  port: mailConfig.port,
  secure: mailConfig.secure,
  auth: {
    user: mailConfig.auth.user,
    pass: mailConfig.auth.pass,
  },
});

// Mengirim email menggunakan transporter yang telah dikonfigurasi.
exports.sendEmail = async ({ to, subject, html }) => {
  try {
    await transporter.sendMail({
      from: mailConfig.from,
      to,
      subject,
      html,
    });
    return true;
  } catch (error) {
    console.error("Error sending email:", error);
    return false;
  }
};
