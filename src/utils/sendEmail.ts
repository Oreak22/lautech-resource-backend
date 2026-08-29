import nodemailer from "nodemailer";

export const sendEmail = async (options: {
  email: string;
  subject: string;
  message: string;
}) => {
  const transporter = nodemailer.createTransport({
    service: "Gmail", // Or use SMTP settings from your .env
    auth: {
      user: process.env.SMTP_EMAIL,
      pass: process.env.SMTP_PASSWORD, // App Password if using Gmail
    },
  });

  const message = {
    from: `${process.env.FROM_NAME} <${process.env.FROM_EMAIL}>`,
    to: options.email,
    subject: options.subject,
    html: options.message, // Send HTML for a better UI
  };

  await transporter.sendMail(message);
};


