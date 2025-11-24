import { Router, type Request, type Response } from 'express';
import {
  checkEsn,
  checkCarrierLock,
  checkSamsungCarrierInfo,
  isAppleDeviceHint,
  isSamsungDeviceHint,
} from '../services/phonecheck';
import { sendEmail } from '../services/email';
import { EMAIL_TEMPLATES, replaceEmailVariables } from '../helpers/emailTemplates';

export function createImeiRouter() {
  const router = Router();

  router.post('/check-esn', async (req: Request, res: Response) => {
    const {
      imei,
      orderId,
      customerName,
      customerEmail,
      carrier,
      deviceType,
      brand,
      checkAll,
    } = req.body || {};

    if (!imei || !orderId) {
      return res.status(400).json({ error: 'IMEI and Order ID are required.' });
    }

    try {
      let checkAllFlag = false;
      if (typeof checkAll === 'boolean') {
        checkAllFlag = checkAll;
      } else if (typeof checkAll === 'number') {
        checkAllFlag = checkAll !== 0;
      } else if (typeof checkAll === 'string') {
        checkAllFlag = ['1', 'true', 'yes'].includes(checkAll.trim().toLowerCase());
      }

      const trimmedImei = String(imei).trim();
      
      // Check ESN/IMEI
      const esnResult = await checkEsn({
        imei: trimmedImei,
        carrier,
        deviceType,
        brand,
        checkAll: checkAllFlag,
      });

      let carrierLockResult = null;
      const appleHintValues = [
        brand,
        deviceType,
        esnResult?.normalized?.brand,
        esnResult?.normalized?.model,
        esnResult?.normalized?.deviceName,
      ];

      // Check carrier lock for Apple devices
      if (isAppleDeviceHint(...appleHintValues)) {
        try {
          carrierLockResult = await checkCarrierLock({
            imei: trimmedImei,
            deviceType: 'Apple',
          });
        } catch (carrierError) {
          console.error(`Carrier lock lookup failed for order ${orderId}:`, carrierError);
        }
      }

      let samsungCarrierInfoResult = null;
      const samsungHintValues = [
        brand,
        deviceType,
        esnResult?.normalized?.brand,
        esnResult?.normalized?.model,
        esnResult?.normalized?.deviceName,
      ];

      // Check Samsung carrier info
      if (isSamsungDeviceHint(...samsungHintValues)) {
        try {
          samsungCarrierInfoResult = await checkSamsungCarrierInfo({
            identifier: trimmedImei,
          });
        } catch (samsungError) {
          console.error(`Samsung carrier info lookup failed for order ${orderId}:`, samsungError);
        }
      }

      // Combine all results
      const normalized: any = {
        ...(carrierLockResult?.normalized || {}),
        ...esnResult.normalized,
      };

      if (samsungCarrierInfoResult?.normalized) {
        normalized.samsungCarrierInfo = samsungCarrierInfoResult.normalized;
        
        if (!normalized.model && samsungCarrierInfoResult.normalized.model) {
          normalized.model = samsungCarrierInfoResult.normalized.model;
        }
        if (!normalized.carrier && samsungCarrierInfoResult.normalized.carrier) {
          normalized.carrier = samsungCarrierInfoResult.normalized.carrier;
        }
      }

      const rawResponses: any = { esn: esnResult.raw };
      if (carrierLockResult) {
        rawResponses.carrierLock = carrierLockResult.raw;
      }
      if (samsungCarrierInfoResult) {
        rawResponses.samsungCarrier = samsungCarrierInfoResult.raw;
      }
      normalized.raw = rawResponses;

      // TODO: Update order in database with IMEI check results
      // const updateData = {
      //   imei: trimmedImei,
      //   imeiChecked: true,
      //   imeiCheckedAt: new Date(),
      //   imeiCheckResult: normalized,
      //   status: normalized.blacklisted ? 'blacklisted' : 'imei_checked',
      // };
      // await updateOrder(orderId, updateData);

      // Send blacklist notification email if device is blacklisted
      if (normalized.blacklisted && customerEmail) {
        const statusReason = normalized.summary || normalized.remarks || 'Blacklisted';
        
        try {
          await sendEmail({
            to: customerEmail,
            subject: replaceEmailVariables(EMAIL_TEMPLATES.BLACKLISTED.subject, {
              ORDER_ID: orderId,
            }),
            html: replaceEmailVariables(EMAIL_TEMPLATES.BLACKLISTED.html, {
              CUSTOMER_NAME: customerName || 'Customer',
              ORDER_ID: orderId,
              STATUS_REASON: statusReason,
            }),
          });
        } catch (emailError) {
          console.error(`Failed to send blacklist notification for order ${orderId}:`, emailError);
        }
      }

      res.json(normalized);
    } catch (error: any) {
      console.error('Error during IMEI check:', error);
      if (error.message?.includes('PhoneCheck')) {
        return res.status(502).json({ error: error.message });
      }
      res.status(500).json({ error: 'Failed to perform IMEI check.' });
    }
  });

  return router;
}
