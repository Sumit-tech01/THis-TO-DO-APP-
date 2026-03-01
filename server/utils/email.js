import sgMail from "@sendgrid/mail";
import { env } from "../config/env.js";

sgMail.setApiKey(env.SENDGRID_API_KEY);

export const sendEmail = async ({ to, subject, html }) => {
  await sgMail.send({
    from: env.EMAIL_FROM,
    to,
    subject,
    html,
  });
};
