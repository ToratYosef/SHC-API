import { Router, type Request, type Response } from 'express';
import { createShipStationLabel, type ShipStationAddress } from '../services/shipstation';
import { sendEmail } from '../services/email';
import { EMAIL_TEMPLATES, replaceEmailVariables } from '../helpers/emailTemplates';

// SHC receiving address - customers send devices TO us
const SHC_RECEIVING_ADDRESS: ShipStationAddress = {
  name: 'SHC',
  company: 'SecondHandCell',
  phone: '2015551234',
  street1: '1206 McDonald Ave',
  street2: 'Ste Rear',
  city: 'Brooklyn',
  state: 'NY',
  postalCode: '11230',
  country: 'US',
};

export function createLabelsRouter() {
  const router = Router();

  // Generate initial shipping label(s) and send email to buyer
  router.post('/generate-label/:id', async (req: Request, res: Response) => {
    try {
      const orderId = req.params.id;
      
      // TODO: Fetch order from database
      // For now, using dummy data
      const order = {
        id: orderId,
        shippingPreference: 'Email Label Requested',
        shippingInfo: {
          fullName: 'Test Customer',
          email: 'customer@example.com',
          streetAddress: '123 Main St',
          city: 'New York',
          state: 'NY',
          zipCode: '10001',
        },
      };

      const buyerAddress: ShipStationAddress = {
        name: order.shippingInfo.fullName,
        phone: '5555555555',
        street1: order.shippingInfo.streetAddress,
        city: order.shippingInfo.city,
        state: order.shippingInfo.state,
        postalCode: order.shippingInfo.zipCode,
        country: 'US',
      };

      let mainTrackingNumber = '';
      let labelType = '';

      if (order.shippingPreference === 'Shipping Kit Requested') {
        // Generate both outbound (kit to customer) and inbound (customer to us) labels
        const [outboundLabel, inboundLabel] = await Promise.all([
          createShipStationLabel(
            SHC_RECEIVING_ADDRESS,
            buyerAddress,
            'stamps_com',
            'usps_ground_advantage',
            'package',
            8,
            false,
            order.id
          ),
          createShipStationLabel(
            buyerAddress,
            SHC_RECEIVING_ADDRESS,
            'stamps_com',
            'usps_ground_advantage',
            'package',
            8,
            false,
            order.id
          ),
        ]);

        mainTrackingNumber = outboundLabel.trackingNumber;
        labelType = 'kit';

        // TODO: Upload labels to cloud storage
        // TODO: Update order in database with both tracking numbers

        // Send kit email to customer
        await sendEmail({
          to: order.shippingInfo.email,
          subject: replaceEmailVariables(EMAIL_TEMPLATES.SHIPPING_KIT.subject, {
            ORDER_ID: order.id,
          }),
          html: replaceEmailVariables(EMAIL_TEMPLATES.SHIPPING_KIT.html, {
            CUSTOMER_NAME: order.shippingInfo.fullName,
            ORDER_ID: order.id,
            TRACKING_NUMBER: outboundLabel.trackingNumber,
          }),
        });
      } else {
        // Generate single inbound label (customer to us)
        const customerLabel = await createShipStationLabel(
          buyerAddress,
          SHC_RECEIVING_ADDRESS,
          'stamps_com',
          'usps_ground_advantage',
          'package',
          8,
          false,
          order.id
        );

        mainTrackingNumber = customerLabel.trackingNumber;
        labelType = 'email';

        // TODO: Upload label to cloud storage
        // TODO: Update order in database with tracking number

        // Send label email to customer
        await sendEmail({
          to: order.shippingInfo.email,
          subject: replaceEmailVariables(EMAIL_TEMPLATES.SHIPPING_LABEL.subject, {
            ORDER_ID: order.id,
          }),
          html: replaceEmailVariables(EMAIL_TEMPLATES.SHIPPING_LABEL.html, {
            CUSTOMER_NAME: order.shippingInfo.fullName,
            ORDER_ID: order.id,
            TRACKING_NUMBER: customerLabel.trackingNumber,
            LABEL_DOWNLOAD_LINK: 'https://example.com/label.pdf', // TODO: Replace with actual URL
          }),
        });
      }

      res.json({ 
        message: `Label(s) generated successfully (${labelType})`, 
        orderId,
        trackingNumber: mainTrackingNumber,
      });
    } catch (err: any) {
      console.error('Error generating label:', err.message || err);
      res.status(500).json({ error: 'Failed to generate label' });
    }
  });

  router.post('/orders/:id/return-label', async (req: Request, res: Response) => {
    try {
      const orderId = req.params.id;
      
      // TODO: Fetch order from database
      const order = {
        id: orderId,
        shippingInfo: {
          fullName: 'Test Customer',
          email: 'customer@example.com',
          streetAddress: '123 Main St',
          city: 'New York',
          state: 'NY',
          zipCode: '10001',
        },
      };

      const buyerAddress: ShipStationAddress = {
        name: order.shippingInfo.fullName,
        phone: '5555555555',
        street1: order.shippingInfo.streetAddress,
        city: order.shippingInfo.city,
        state: order.shippingInfo.state,
        postalCode: order.shippingInfo.zipCode,
        country: 'US',
      };

      // Generate return label (SHC to customer)
      const returnLabel = await createShipStationLabel(
        SHC_RECEIVING_ADDRESS,
        buyerAddress,
        'stamps_com',
        'usps_ground_advantage',
        'package',
        8,
        false,
        `return-${order.id}`
      );

      // TODO: Upload return label to cloud storage
      // TODO: Update order with return tracking number

      // Send return label email
      await sendEmail({
        to: order.shippingInfo.email,
        subject: `Your SecondHandCell Return Label for Order #${order.id}`,
        html: `
          <p>Hello ${order.shippingInfo.fullName},</p>
          <p>As requested, here is your return shipping label for Order #${order.id}.</p>
          <p>Return Tracking Number: <strong>${returnLabel.trackingNumber}</strong></p>
          <p>Thank you,<br>The SecondHandCell Team</p>
        `,
      });

      res.json({
        message: 'Return label generated successfully.',
        orderId,
        trackingNumber: returnLabel.trackingNumber,
      });
    } catch (err: any) {
      console.error('Error generating return label:', err);
      res.status(500).json({ error: 'Failed to generate return label' });
    }
  });

  return router;
}
