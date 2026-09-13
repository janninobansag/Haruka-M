import nodemailer from "nodemailer";

const configured = () => Boolean(process.env.SMTP_HOST && process.env.SMTP_PORT && process.env.SMTP_USER && process.env.SMTP_PASS && process.env.SMTP_FROM);

export async function sendPasswordResetEmail({ to, resetUrl }) {
  if (!configured()) throw new Error("Password reset email is not configured.");

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: process.env.SMTP_SECURE === "true",
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
  });

  await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to,
    subject: "Reset your Haruka password",
    text: `We received a request to reset your Haruka password. Set a new password here: ${resetUrl}\n\nThis link expires in 30 minutes. If you did not request it, you can ignore this email.`,
    html: `<p>We received a request to reset your Haruka password.</p><p><a href="${resetUrl}">Set a new password</a></p><p>This link expires in 30 minutes. If you did not request it, you can ignore this email.</p>`
  });
}
