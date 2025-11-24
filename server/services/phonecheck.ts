import axios from 'axios';

const PHONECHECK_BASE_URL = 'https://clientapiv2.phonecheck.com';
const PHONECHECK_SAMSUNG_BASE_URL = 'https://api.phonecheck.com';

export interface PhoneCheckConfig {
  apiKey?: string;
  username?: string;
}

export interface IMEICheckResult {
  blacklisted: boolean;
  summary?: string;
  remarks?: string;
  brand?: string;
  model?: string;
  deviceName?: string;
  carrier?: string;
  warrantyStatus?: string;
  raw?: any;
}

function getPhoneCheckCredentials(): PhoneCheckConfig {
  return {
    apiKey: process.env.PHONECHECK_API_KEY,
    username: process.env.PHONECHECK_USERNAME,
  };
}

export async function checkEsn(params: {
  imei: string;
  carrier?: string;
  deviceType?: string;
  brand?: string;
  checkAll?: boolean;
}): Promise<{ normalized: IMEICheckResult; raw: any }> {
  const credentials = getPhoneCheckCredentials();
  
  if (!credentials.username || !credentials.apiKey) {
    throw new Error('PhoneCheck credentials not configured. Set PHONECHECK_USERNAME and PHONECHECK_API_KEY.');
  }

  try {
    const response = await axios.post(
      `${PHONECHECK_BASE_URL}/api/esn/check`,
      {
        imei: params.imei,
        carrier: params.carrier,
        deviceType: params.deviceType,
        brand: params.brand,
        checkAll: params.checkAll || false,
      },
      {
        headers: {
          'Authorization': `Bearer ${credentials.apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 30000,
      }
    );

    const data = response.data;
    
    // Normalize the response
    const normalized: IMEICheckResult = {
      blacklisted: data.blacklisted || false,
      summary: data.summary,
      remarks: data.remarks,
      brand: data.brand,
      model: data.model,
      deviceName: data.deviceName,
      carrier: data.carrier,
      raw: data,
    };

    return { normalized, raw: data };
  } catch (error: any) {
    console.error('PhoneCheck ESN check failed:', error.message);
    throw new Error(`PhoneCheck ESN lookup failed: ${error.message}`);
  }
}

export async function checkCarrierLock(params: {
  imei: string;
  deviceType: string;
}): Promise<{ normalized: Partial<IMEICheckResult>; raw: any }> {
  const credentials = getPhoneCheckCredentials();
  
  if (!credentials.apiKey) {
    throw new Error('PhoneCheck credentials not configured.');
  }

  try {
    const response = await axios.post(
      `${PHONECHECK_BASE_URL}/api/carrier/lock`,
      {
        imei: params.imei,
        deviceType: params.deviceType,
      },
      {
        headers: {
          'Authorization': `Bearer ${credentials.apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 30000,
      }
    );

    const data = response.data;
    
    return {
      normalized: {
        carrier: data.carrier,
        raw: data,
      },
      raw: data,
    };
  } catch (error: any) {
    console.error('PhoneCheck carrier lock check failed:', error.message);
    throw error;
  }
}

export async function checkSamsungCarrierInfo(params: {
  identifier: string;
}): Promise<{ normalized: Partial<IMEICheckResult>; raw: any }> {
  const credentials = getPhoneCheckCredentials();
  
  if (!credentials.apiKey) {
    throw new Error('PhoneCheck API key not configured for Samsung checks.');
  }

  try {
    const response = await axios.post(
      `${PHONECHECK_SAMSUNG_BASE_URL}/api/samsung/info`,
      {
        identifier: params.identifier,
      },
      {
        headers: {
          'Authorization': `Bearer ${credentials.apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 30000,
      }
    );

    const data = response.data;
    
    return {
      normalized: {
        model: data.modelDescription,
        carrier: data.carrier,
        warrantyStatus: data.warranty,
        raw: data,
      },
      raw: data,
    };
  } catch (error: any) {
    console.error('Samsung carrier info check failed:', error.message);
    throw error;
  }
}

export function isAppleDeviceHint(...values: any[]): boolean {
  const appleRegex = /(apple|iphone|ipad|ipod|ios|watch)/i;
  return values.some((val) => val && appleRegex.test(String(val)));
}

export function isSamsungDeviceHint(...values: any[]): boolean {
  const samsungRegex = /(samsung|galaxy)/i;
  return values.some((val) => val && samsungRegex.test(String(val)));
}
