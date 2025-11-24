import nodemailer from 'nodemailer';

// Email transporter singleton
let transporter: nodemailer.Transporter | null = null;

export function getEmailTransporter(): nodemailer.Transporter {
  if (!transporter) {
    const emailUser = process.env.EMAIL_USER;
    const emailPass = process.env.EMAIL_PASS;

    if (!emailUser || !emailPass) {
      throw new Error('Email credentials not configured. Set EMAIL_USER and EMAIL_PASS environment variables.');
    }

    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: emailUser,
        pass: emailPass,
      },
    });
  }

  return transporter;
}

export interface MailOptions {
  from?: string;
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  bcc?: string | string[];
  attachments?: Array<{
    filename: string;
    content: Buffer | string;
    contentType?: string;
  }>;
}

export async function sendEmail(mailOptions: MailOptions): Promise<void> {
  try {
    const transporter = getEmailTransporter();
    const defaultFrom = process.env.EMAIL_FROM || `SecondHandCell <${process.env.EMAIL_USER}>`;
    
    await transporter.sendMail({
      from: mailOptions.from || defaultFrom,
      ...mailOptions,
    });
    console.log('Email sent successfully to:', mailOptions.to);
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
}
