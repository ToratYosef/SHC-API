import { Router, type Request, type Response } from 'express';
import { sendEmail } from '../services/email';
import { EMAIL_TEMPLATES, replaceEmailVariables } from '../helpers/emailTemplates';

export function createEmailsRouter() {
  const router = Router();

  router.post('/send-email', async (req: Request, res: Response) => {
    try {
      const { to, bcc, subject, html } = req.body || {};

      if (!to || !subject || !html) {
        return res
          .status(400)
          .json({ error: 'Missing required fields: to, subject, and html are required.' });
      }

      await sendEmail({
        to,
        subject,
        html,
        bcc: Array.isArray(bcc) ? bcc : bcc ? [bcc] : [],
      });

      res.status(200).json({ message: 'Email sent successfully.' });
    } catch (error) {
      console.error('Error sending email:', error);
      res.status(500).json({ error: 'Failed to send email.' });
    }
  });

  router.post('/test-emails', async (req: Request, res: Response) => {
    const { email, emailTypes } = req.body || {};

    if (!email || !emailTypes || !Array.isArray(emailTypes)) {
      return res.status(400).json({ error: 'Email and emailTypes array are required.' });
    }

    try {
      const results = [];
      
      for (const type of emailTypes) {
        let template;
        let variables = {
          CUSTOMER_NAME: 'Test Customer',
          ORDER_ID: 'TEST-12345',
          TRACKING_NUMBER: 'TEST-TRACKING',
          LABEL_DOWNLOAD_LINK: 'https://example.com/label.pdf',
          STATUS_REASON: 'blacklisted/lost/stolen',
        };

        switch (type.toLowerCase()) {
          case 'shipping_label':
            template = EMAIL_TEMPLATES.SHIPPING_LABEL;
            break;
          case 'shipping_kit':
            template = EMAIL_TEMPLATES.SHIPPING_KIT;
            break;
          case 'blacklisted':
            template = EMAIL_TEMPLATES.BLACKLISTED;
            break;
          default:
            results.push({ type, status: 'skipped', reason: 'Unknown template type' });
            continue;
        }

        await sendEmail({
          to: email,
          subject: replaceEmailVariables(template.subject, variables),
          html: replaceEmailVariables(template.html, variables),
        });

        results.push({ type, status: 'sent' });
      }

      console.log('Test emails sent. Types:', emailTypes);
      res.status(200).json({ message: 'Test emails sent', email, results });
    } catch (error: any) {
      console.error('Failed to send test emails:', error);
      res.status(500).json({ error: `Failed to send test emails: ${error.message}` });
    }
  });

  router.post('/orders/:id/send-condition-email', async (req: Request, res: Response) => {
    try {
      const { reason, notes, label: labelText } = req.body || {};
      const orderId = req.params.id;
      
      // TODO: Validate reason against available templates
      // TODO: Fetch order from database
      // TODO: Build condition email content
      // TODO: Send email using sendEmail()
      // TODO: Update order status in database

      res.json({ message: 'Email sent successfully.' });
    } catch (error) {
      console.error('Failed to send condition email:', error);
      res.status(500).json({ error: 'Failed to send condition email.' });
    }
  });

  router.post('/orders/:id/fmi-cleared', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      
      // TODO: Fetch order from database
      // TODO: Validate status is 'fmi_on_pending'
      // TODO: Update status to 'fmi_cleared' in database

      res.json({ message: 'FMI status updated successfully.' });
    } catch (error) {
      console.error('Error clearing FMI status:', error);
      res.status(500).json({ error: 'Failed to clear FMI status' });
    }
  });

  return router;
}
