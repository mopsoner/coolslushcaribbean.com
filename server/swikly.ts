import type { Booking } from "@shared/schema";

interface SwiklyConfig {
  apiToken: string;
  accountId: string;
  environment: 'production' | 'sandbox';
}

interface SwiklyDepositRequest {
  customId: string;
  description: string;
  language: string;
  callbackUrl?: string;
  endUser: {
    email: string;
    firstName: string;
    lastName: string;
    language: string;
    phoneNumber?: string;
  };
  deposit: {
    amount: number;
    description: string;
    startDate: string;
    endDate: string;
  };
}

interface SwiklyResponse {
  request?: {
    id: string;
    link: string;
    deposit?: {
      amount: number;
      status: string;
    };
  };
  message?: string;
  code?: string;
}

class SwiklyAPI {
  private config: SwiklyConfig;
  private baseUrl: string;

  constructor(config: SwiklyConfig) {
    this.config = config;
    this.baseUrl = config.environment === 'production' 
      ? 'https://api.v2.swikly.com/v1'
      : 'https://api.sandbox.swikly.com/v1';
  }

  async createDeposit(booking: Booking, callbackBaseUrl?: string): Promise<SwiklyResponse> {
    try {
      const nameParts = booking.customerName.split(' ');
      const firstName = nameParts[0] || 'Client';
      const lastName = nameParts.slice(1).join(' ') || 'Cool\'Slush';

      const eventDate = new Date(booking.date);
      const depositStartDate = new Date(eventDate);
      depositStartDate.setDate(depositStartDate.getDate() - 1);
      const depositEndDate = new Date(eventDate);
      depositEndDate.setDate(depositEndDate.getDate() + 2);

      const requestBody: SwiklyDepositRequest = {
        customId: booking.id,
        description: `Location machine à granité Cool'Slush - ${booking.date}`,
        language: 'fr',
        endUser: {
          email: booking.customerEmail,
          firstName: firstName,
          lastName: lastName,
          language: 'fr',
          phoneNumber: booking.customerPhone || undefined,
        },
        deposit: {
          amount: 50000,
          description: `Caution - Location machine à granité Cool'Slush`,
          startDate: depositStartDate.toISOString().split('T')[0],
          endDate: depositEndDate.toISOString().split('T')[0],
        },
      };

      if (callbackBaseUrl && !callbackBaseUrl.includes('localhost')) {
        requestBody.callbackUrl = `${callbackBaseUrl}/api/swikly-callback`;
      }

      const response = await fetch(
        `${this.baseUrl}/accounts/${this.config.accountId}/requests`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.config.apiToken}`,
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        }
      );

      const data: SwiklyResponse = await response.json();

      if (data.request?.link) {
        console.log('✅ Swikly deposit created:', data.request.link);
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

  async getDepositStatus(requestId: string): Promise<SwiklyResponse> {
    try {
      const response = await fetch(
        `${this.baseUrl}/accounts/${this.config.accountId}/requests/${requestId}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${this.config.apiToken}`,
            'Accept': 'application/json',
          },
        }
      );

      const data: SwiklyResponse = await response.json();
      return data;
    } catch (error) {
      console.error('❌ Swikly get status error:', error);
      throw error;
    }
  }

  async releaseDeposit(requestId: string): Promise<SwiklyResponse> {
    try {
      const response = await fetch(
        `${this.baseUrl}/accounts/${this.config.accountId}/requests/${requestId}/release`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.config.apiToken}`,
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          },
        }
      );

      const data: SwiklyResponse = await response.json();
      
      if (data.request) {
        console.log('✅ Swikly deposit released for:', requestId);
      }
      
      return data;
    } catch (error) {
      console.error('❌ Swikly release error:', error);
      throw error;
    }
  }
}

let swiklyClient: SwiklyAPI | null = null;

export function getSwiklyClient(): SwiklyAPI {
  if (!swiklyClient) {
    const apiToken = process.env.SWIKLY_API_KEY;
    const accountId = process.env.SWIKLY_ACCOUNT_ID;

    if (!apiToken || !accountId) {
      throw new Error('Swikly API credentials not configured. Please set SWIKLY_API_KEY and SWIKLY_ACCOUNT_ID.');
    }

    swiklyClient = new SwiklyAPI({
      apiToken,
      accountId,
      environment: process.env.NODE_ENV === 'production' ? 'production' : 'sandbox',
    });
  }

  return swiklyClient;
}

export { SwiklyAPI };
