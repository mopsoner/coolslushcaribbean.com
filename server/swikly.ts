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
  firstName?: string;
  lastName?: string;
  email?: string;
  phoneNumber?: string;
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

      // Use real booking dates: deposit starts with the rental, ends 1 day after
      const depositStartDate = new Date(booking.startDate);
      const depositEndDate = new Date(booking.endDate);
      depositEndDate.setDate(depositEndDate.getDate() + 1); // Add 1 day buffer after rental ends

      const requestBody: SwiklyDepositRequest = {
        customId: booking.id,
        description: `Location machine à granité Cool'Slush - ${booking.offer}`,
        language: 'fr',
        firstName: firstName,
        lastName: lastName,
        email: booking.customerEmail,
        phoneNumber: booking.customerPhone || undefined,
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
      console.error('❌ Missing Swikly credentials:', {
        hasApiKey: !!apiToken,
        hasAccountId: !!accountId,
        nodeEnv: process.env.NODE_ENV
      });
      throw new Error('Swikly API credentials not configured. Please set SWIKLY_API_KEY and SWIKLY_ACCOUNT_ID.');
    }

    // Determine environment: use production if explicitly set or if NODE_ENV is production
    const isProduction = process.env.NODE_ENV === 'production' || process.env.SWIKLY_ENV === 'production';
    
    console.log('🔧 Initializing Swikly client:', {
      accountId: accountId.substring(0, 8) + '...',
      environment: isProduction ? 'production' : 'sandbox'
    });

    swiklyClient = new SwiklyAPI({
      apiToken,
      accountId,
      environment: isProduction ? 'production' : 'sandbox',
    });
  }

  return swiklyClient;
}

export { SwiklyAPI };
