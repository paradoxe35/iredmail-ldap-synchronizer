import nodemailer from "nodemailer";
import { Logger } from "./logger";

const PORT = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 587;

// All SMTP must be configured in the environment variables.
if (
  !process.env.SMTP_HOST ||
  !process.env.SMTP_USER ||
  !process.env.SMTP_PASSWORD ||
  !process.env.SMTP_TO
) {
  Logger.error(
    "SMTP configuration is missing. Please set SMTP_HOST, SMTP_USER, SMTP_TO, and SMTP_PASSWORD."
  );
  process.exit(1);
}

// create reusable transporter object using the default SMTP transport
let transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: PORT,
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
});

export default async function send_mail(message: string | Object) {
  // send mail with defined transport object
  let info = await transporter
    .sendMail({
      from: `"iRedMail LDAP Synchronizer 👻" ${process.env.SMTP_FROM}`, // sender address
      to: process.env.SMTP_TO, // list of receivers
      subject: "Synchronizer Warning", // Subject line
      text: JSON.stringify(message) || "Empty Message", // plain text body
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
      },
    })
    .catch(console.error);

  info && Logger.info("Message sent: %s", info?.messageId);

  return info;
}
