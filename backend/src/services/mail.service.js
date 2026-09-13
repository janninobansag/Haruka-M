import nodemailer from "nodemailer";
import dns from "node:dns/promises";

const configured = () => Boolean(process.env.SMTP_HOST && process.env.SMTP_PORT && process.env.SMTP_USER && process.env.SMTP_PASS && process.env.SMTP_FROM);

export async function sendPasswordResetEmail({ to, resetUrl }) {
  if (!configured()) throw new Error("Password reset email is not configured.");
  const smtpHost = process.env.SMTP_HOST;
  // Render's outbound network may not have an IPv6 route. Resolve an IPv4
  // address explicitly while retaining the hostname for TLS verification.
  const [smtpIpv4] = await dns.resolve4(smtpHost);

  const transporter = nodemailer.createTransport({
    host: smtpIpv4,
    port: Number(process.env.SMTP_PORT),
    secure: process.env.SMTP_SECURE === "true",
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    tls: { servername: smtpHost },
    connectionTimeout: 15_000,
    greetingTimeout: 15_000,
    socketTimeout: 30_000
  });

  await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to,
    subject: "Reset your Haruka password",
    text: `We received a request to reset your Haruka password. Set a new password here: ${resetUrl}\n\nThis link expires in 30 minutes. If you did not request it, you can ignore this email.`,
    html: `<p>We received a request to reset your Haruka password.</p><p><a href="${resetUrl}">Set a new password</a></p><p>This link expires in 30 minutes. If you did not request it, you can ignore this email.</p>`
  });
}
