import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { User } from '../user/entities/user.entity';

@Injectable()
export class WhatsAppService {
  private readonly logger = new Logger(WhatsAppService.name);
  private readonly accessToken: string;
  private readonly phoneNumberId: string;
  private readonly apiVersion: string;
  private readonly groupInviteLink: string;
  private readonly baseUrl: string;

  constructor(private configService: ConfigService) {
    // WhatsApp Business API (Meta Graph API) configuration
    this.accessToken = this.configService.get<string>('WHATSAPP_ACCESS_TOKEN') || '';
    this.phoneNumberId = this.configService.get<string>('WHATSAPP_PHONE_NUMBER_ID') || '';
    this.apiVersion = this.configService.get<string>('WHATSAPP_API_VERSION') || 'v22.0';
    this.groupInviteLink = this.configService.get<string>('WHATSAPP_GROUP_LINK') || '';
    
    // Construct Graph API base URL
    this.baseUrl = `https://graph.facebook.com/${this.apiVersion}/${this.phoneNumberId}/messages`;

    if (!this.accessToken || !this.phoneNumberId) {
      this.logger.warn('WhatsApp Business API credentials not configured. WhatsApp messages will not be sent.');
    } else {
      this.logger.log(`WhatsApp Business API configured for phone number ID: ${this.phoneNumberId}`);
    }
  }

  /**
   * Send WhatsApp invite link to user using WhatsApp Business API (Meta Graph API)
   */
  async sendInviteLink(user: User): Promise<boolean> {
    try {
      // Check if credentials are configured
      if (!this.accessToken || !this.phoneNumberId) {
        if (this.groupInviteLink) {
          this.logger.log(
            `WhatsApp API not configured. Group link: ${this.groupInviteLink}. User: ${user.name} (${user.whatsappNumber})`,
          );
        } else {
          this.logger.warn('WhatsApp API and group link not configured, skipping invite');
        }
        return false;
      }

      if (!this.groupInviteLink) {
        this.logger.warn('WhatsApp group invite link not configured');
        return false;
      }

      // Format phone number (WhatsApp Business API requires international format without +)
      const formattedPhone = this.formatPhoneNumber(user.whatsappNumber);
      
      // Build the message
      const message = this.buildInviteMessage(user.name, this.groupInviteLink);

      // Send message using WhatsApp Business API
      try {
        const response = await axios.post(
          this.baseUrl,
          {
            messaging_product: 'whatsapp',
            to: formattedPhone,
            type: 'text',
            text: {
              body: message,
            },
          },
          {
            headers: {
              'Authorization': `Bearer ${this.accessToken}`,
              'Content-Type': 'application/json',
            },
            timeout: 15000, // 15 second timeout
          },
        );

        this.logger.log(`WhatsApp invite sent successfully to ${formattedPhone}. Message ID: ${response.data.messages?.[0]?.id || 'N/A'}`);
        return true;
      } catch (apiError: any) {
        const errorMessage = apiError.response?.data?.error?.message || apiError.message;
        const errorCode = apiError.response?.data?.error?.code;
        const errorType = apiError.response?.data?.error?.type;
        
        this.logger.error(
          `Failed to send WhatsApp message via Business API: ${errorMessage} (Code: ${errorCode}, Type: ${errorType})`,
        );
        
        // Log full error details for debugging
        if (apiError.response?.data) {
          this.logger.debug(`WhatsApp API Error Details: ${JSON.stringify(apiError.response.data)}`);
        }
        
        return false;
      }
    } catch (error: any) {
      this.logger.error(
        `Failed to send WhatsApp invite: ${error.message}`,
        error.stack,
      );
      return false;
    }
  }

  /**
   * Send a custom text message using WhatsApp Business API
   */
  async sendMessage(phoneNumber: string, message: string): Promise<boolean> {
    try {
      if (!this.accessToken || !this.phoneNumberId) {
        this.logger.warn('WhatsApp Business API not configured');
        return false;
      }

      const formattedPhone = this.formatPhoneNumber(phoneNumber);

      const response = await axios.post(
        this.baseUrl,
        {
          messaging_product: 'whatsapp',
          to: formattedPhone,
          type: 'text',
          text: {
            body: message,
          },
        },
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
          timeout: 15000,
        },
      );

      this.logger.log(`WhatsApp message sent successfully to ${formattedPhone}`);
      return true;
    } catch (error: any) {
      const errorMessage = error.response?.data?.error?.message || error.message;
      this.logger.error(`Failed to send WhatsApp message: ${errorMessage}`);
      return false;
    }
  }

  /**
   * Send a template message (for pre-approved templates)
   */
  async sendTemplateMessage(
    phoneNumber: string,
    templateName: string,
    languageCode: string = 'en_US',
    parameters?: Array<{ type: string; text: string }>,
  ): Promise<boolean> {
    try {
      if (!this.accessToken || !this.phoneNumberId) {
        this.logger.warn('WhatsApp Business API not configured');
        return false;
      }

      const formattedPhone = this.formatPhoneNumber(phoneNumber);

      const templatePayload: any = {
        messaging_product: 'whatsapp',
        to: formattedPhone,
        type: 'template',
        template: {
          name: templateName,
          language: {
            code: languageCode,
          },
        },
      };

      // Add parameters if provided
      if (parameters && parameters.length > 0) {
        templatePayload.template.components = [
          {
            type: 'body',
            parameters: parameters,
          },
        ];
      }

      const response = await axios.post(
        this.baseUrl,
        templatePayload,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
          timeout: 15000,
        },
      );

      this.logger.log(`WhatsApp template message sent successfully to ${formattedPhone}`);
      return true;
    } catch (error: any) {
      const errorMessage = error.response?.data?.error?.message || error.message;
      this.logger.error(`Failed to send WhatsApp template message: ${errorMessage}`);
      if (error.response?.data) {
        this.logger.debug(`Template Error Details: ${JSON.stringify(error.response.data)}`);
      }
      return false;
    }
  }

  /**
   * Build the invite message
   */
  private buildInviteMessage(userName: string, inviteLink: string): string {
    return `Hello ${userName}! 🎮

Welcome to our exclusive eFootball gaming community!

Your subscription is now active. Click the link below to join our WhatsApp group:

${inviteLink}

Thank you for subscribing! Enjoy the content! 🎉`;
  }

  /**
   * Format phone number to international format (required by WhatsApp Business API)
   * Format: Country code + number without + or 0 prefix
   * Example: 254712345678 (Kenya)
   */
  private formatPhoneNumber(phone: string): string {
    // Remove any spaces, dashes, or other characters
    let cleaned = phone.replace(/\D/g, '');

    // If starts with 0, replace with 254 (Kenya country code)
    if (cleaned.startsWith('0')) {
      cleaned = '254' + cleaned.substring(1);
    }
    // If doesn't start with 254, add it (assuming Kenya)
    else if (!cleaned.startsWith('254')) {
      cleaned = '254' + cleaned;
    }

    // WhatsApp Business API requires format without + sign
    return cleaned;
  }

  /**
   * Verify WhatsApp webhook signature (for receiving messages)
   * This can be implemented if you need to receive messages from users
   */
  verifyWebhookSignature(payload: string, signature: string, secret: string): boolean {
    const crypto = require('crypto');
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');
    
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature),
    );
  }
}
