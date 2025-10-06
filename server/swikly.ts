import type { Booking } from "@shared/schema";

interface SwiklyConfig {
  apiKey: string;
  apiSecret: string;
  environment: 'production' | 'sandbox';
}

interface SwiklyDepositRequest {
  clientFirstName: string;
  clientLastName: string;
  clientEmail: string;
  clientPhoneNumber?: string;
  clientLanguage: 'FR' | 'EN' | 'NL' | 'DE';
  swikAmount: string;
  swikDescription: string;
  swikEndDay: string;
  swikEndMonth: string;
  swikEndYear: string;
  swikId: string;
  sendEmail: 'true' | 'false';
  swikType: 'security deposit' | 'reservation';
  callbackUrl?: string;
}

interface SwiklyResponse {
  status: 'ok' | 'error';
  acceptUrl?: string;
  message?: string;
  swik?: any;
}

class SwiklyAPI {
  private config: SwiklyConfig;
  private baseUrl: string;

  constructor(config: SwiklyConfig) {
    this.config = config;
    this.baseUrl = config.environment === 'production' 
      ? 'https://api.swikly.com'
      : 'https://api-sandbox.swikly.com';
  }

  async createDeposit(booking: Booking, callbackBaseUrl?: string): Promise<SwiklyResponse> {
    try {
      // Split customer name into first and last name
      const nameParts = booking.customerName.split(' ');
      const firstName = nameParts[0] || 'Client';
      const lastName = nameParts.slice(1).join(' ') || 'Cool\'Slush';

      // Calculate deposit end date (48h after event)
      const eventDate = new Date(booking.date);
      const depositEndDate = new Date(eventDate);
      depositEndDate.setDate(depositEndDate.getDate() + 2); // +2 days after event

      // Create FormData for multipart/form-data request (required by Swikly API)
      const formData = new FormData();
      formData.append('first_name', firstName);
      formData.append('last_name', lastName);
      formData.append('client_email', booking.customerEmail);
      formData.append('phone_number', booking.customerPhone || '');
      formData.append('swik_lang', 'FR');
      formData.append('swik_amount', '500'); // 500€ deposit
      formData.append('swik_description', `Caution - Location machine à granité Cool'Slush`);
      formData.append('swik_end_day', depositEndDate.getDate().toString());
      formData.append('swik_end_month', (depositEndDate.getMonth() + 1).toString());
      formData.append('swik_end_year', depositEndDate.getFullYear().toString());
      formData.append('id', booking.id); // Custom business ID
      formData.append('email', 'true'); // Swikly sends email automatically
      formData.append('swik_type', 'deposit'); // Type: deposit, reservation, or payment
      
      if (callbackBaseUrl) {
        formData.append('callback_url', `${callbackBaseUrl}/api/swikly-callback`);
      }

      const response = await fetch(`${this.baseUrl}/v1_0/newSwik`, {
        method: 'POST',
        headers: {
          'api_key': this.config.apiKey,
          'api_secret': this.config.apiSecret,
        },
        body: formData,
      });

      const data: SwiklyResponse = await response.json();

      if (data.status === 'ok' && data.acceptUrl) {
        console.log('✅ Swikly deposit created:', data.acceptUrl);
        return data;
      } else {
        console.error('❌ Swikly error:', data.message || 'Unknown error');
        throw new Error(data.message || 'Failed to create Swikly deposit');
      }
    } catch (error) {
      console.error('❌ Swikly API error:', error);
      throw error;
    }
  }

  async getDepositStatus(swikId: string): Promise<SwiklyResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/swik/get`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-KEY': this.config.apiKey,
          'X-API-SECRET': this.config.apiSecret,
        },
        body: JSON.stringify({ swikId }),
      });

      const data: SwiklyResponse = await response.json();
      return data;
    } catch (error) {
      console.error('❌ Swikly get status error:', error);
      throw error;
    }
  }

  async releaseDeposit(swikId: string): Promise<SwiklyResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/swik/release`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-KEY': this.config.apiKey,
          'X-API-SECRET': this.config.apiSecret,
        },
        body: JSON.stringify({ swikId }),
      });

      const data: SwiklyResponse = await response.json();
      
      if (data.status === 'ok') {
        console.log('✅ Swikly deposit released for:', swikId);
      }
      
      return data;
    } catch (error) {
      console.error('❌ Swikly release error:', error);
      throw error;
    }
  }
}

// Initialize Swikly API client
let swiklyClient: SwiklyAPI | null = null;

export function getSwiklyClient(): SwiklyAPI {
  if (!swiklyClient) {
    const apiKey = process.env.SWIKLY_API_KEY;
    const apiSecret = process.env.SWIKLY_API_SECRET;

    if (!apiKey || !apiSecret) {
      throw new Error('Swikly API credentials not configured. Please set SWIKLY_API_KEY and SWIKLY_API_SECRET.');
    }

    swiklyClient = new SwiklyAPI({
      apiKey,
      apiSecret,
      environment: process.env.NODE_ENV === 'production' ? 'production' : 'sandbox',
    });
  }

  return swiklyClient;
}

export { SwiklyAPI };
