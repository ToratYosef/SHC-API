import { Router, type Request, type Response, type NextFunction } from 'express';
import crypto from 'crypto';

export function createWebhookRouter() {
  const router = Router();

  // Middleware to verify ShipStation webhook signature
  const verifyShipStationSignature = (req: Request, res: Response, next: NextFunction) => {
    const signature = req.headers['x-shipstation-signature'];
    const secret = process.env.SHIPSTATION_WEBHOOK_SECRET;

    if (!signature) {
      console.error('Webhook received without signature header.');
      return res.status(401).send('Unauthorized: Signature missing.');
    }

    if (!secret) {
      console.error('SHIPSTATION_WEBHOOK_SECRET not configured.');
      return res.status(500).send('Internal Server Error.');
    }

    try {
      const hmac = crypto.createHmac('sha256', secret);
      hmac.update(JSON.stringify(req.body));
      const calculatedSignature = hmac.digest('base64');

      if (calculatedSignature !== signature) {
        console.error('Invalid ShipStation webhook signature.');
        return res.status(401).send('Unauthorized: Invalid signature.');
      }
    } catch (err) {
      console.error('Error verifying ShipStation signature:', err);
      return res.status(500).send('Internal Server Error.');
    }
    next();
  };

  // ShipStation Webhook Endpoint
  router.post('/webhook/shipstation', verifyShipStationSignature, async (req: Request, res: Response) => {
    try {
      const event = req.body;
      console.log('Received ShipStation webhook event:', event);

      // TODO: Implement ShipStation webhook processing
      // - Extract tracking number from event
      // - Find order by tracking number
      // - Map event type to order status
      // - Update order status in database

      res.status(200).send('Webhook received successfully');
    } catch (err) {
      console.error('Error processing ShipStation webhook:', err);
      res.status(500).send('Failed to process webhook');
    }
  });

  return router;
}
