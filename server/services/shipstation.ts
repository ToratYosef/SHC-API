import axios from 'axios';

export interface ShipStationCredentials {
  key: string;
  secret: string;
}

export interface ShipStationAddress {
  name: string;
  company?: string;
  phone: string;
  street1: string;
  street2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

export interface ShipStationLabelResponse {
  trackingNumber: string;
  labelData: string; // Base64 encoded PDF
  shipmentId: string;
  carrierCode?: string;
  serviceCode?: string;
  status?: string;
}

function getShipStationCredentials(): ShipStationCredentials {
  const key = process.env.SHIPSTATION_KEY;
  const secret = process.env.SHIPSTATION_SECRET;

  if (!key || !secret) {
    throw new Error('ShipStation credentials not configured. Set SHIPSTATION_KEY and SHIPSTATION_SECRET.');
  }

  return { key, secret };
}

function buildAuthHeader(credentials: ShipStationCredentials): string {
  return `Basic ${Buffer.from(`${credentials.key}:${credentials.secret}`).toString('base64')}`;
}

export async function createShipStationLabel(
  fromAddress: ShipStationAddress,
  toAddress: ShipStationAddress,
  carrierCode: string,
  serviceCode: string,
  packageCode: string = 'package',
  weightInOunces: number = 8,
  testLabel: boolean = false,
  orderId?: string
): Promise<ShipStationLabelResponse> {
  const credentials = getShipStationCredentials();
  const authHeader = buildAuthHeader(credentials);
  const today = new Date().toISOString().split('T')[0];

  const payload = {
    carrierCode,
    serviceCode,
    packageCode,
    shipDate: today,
    weight: {
      value: weightInOunces,
      units: 'ounces',
    },
    shipFrom: fromAddress,
    shipTo: toAddress,
    testLabel,
  };

  try {
    const response = await axios.post(
      'https://ssapi.shipstation.com/shipments/createlabel',
      payload,
      {
        headers: {
          Authorization: authHeader,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        timeout: 30000,
      }
    );

    return {
      trackingNumber: response.data.trackingNumber,
      labelData: response.data.labelData,
      shipmentId: response.data.shipmentId,
      carrierCode: response.data.carrierCode,
      serviceCode: response.data.serviceCode,
      status: response.data.status,
    };
  } catch (error: any) {
    console.error('Error creating ShipStation label:', error.response?.data || error.message);
    throw new Error(
      `Failed to create ShipStation label: ${error.response?.data?.ExceptionMessage || error.message}`
    );
  }
}

export async function fetchShipStationTracking(params: {
  trackingNumber: string;
  carrierCode?: string;
}): Promise<any> {
  if (!params.trackingNumber) {
    throw new Error('Tracking number is required to request ShipStation tracking data.');
  }

  const credentials = getShipStationCredentials();
  const authHeader = buildAuthHeader(credentials);

  const queryParams: any = { trackingNumber: params.trackingNumber };
  if (params.carrierCode) {
    queryParams.carrierCode = params.carrierCode;
  }

  try {
    const response = await axios.get('https://ssapi.shipstation.com/shipments/tracking', {
      params: queryParams,
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    });

    return response.data;
  } catch (error: any) {
    console.error('Error fetching ShipStation tracking:', error.message);
    throw error;
  }
}
