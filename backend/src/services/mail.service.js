const configured = () => Boolean(process.env.BREVO_API_KEY && process.env.BREVO_SENDER_EMAIL && process.env.BREVO_SENDER_NAME);

export async function sendPasswordResetEmail({ to, resetUrl }) {
  if (!configured()) throw new Error("Password reset email is not configured.");

  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: { "api-key": process.env.BREVO_API_KEY, "content-type": "application/json" },
    body: JSON.stringify({
      sender: { email: process.env.BREVO_SENDER_EMAIL, name: process.env.BREVO_SENDER_NAME },
      to: [{ email: to }],
      subject: "Reset your Haruka password",
      textContent: `We received a request to reset your Haruka password. Set a new password here: ${resetUrl}\n\nThis link expires in 30 minutes. If you did not request it, you can ignore this email.`,
      htmlContent: `<p>We received a request to reset your Haruka password.</p><p><a href="${resetUrl}">Set a new password</a></p><p>This link expires in 30 minutes. If you did not request it, you can ignore this email.</p>`
    })
  });

  if (!response.ok) throw new Error(`Brevo email request failed with status ${response.status}.`);
}
