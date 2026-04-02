declare module 'nodemailer' {
  export interface SMTPTransportOptions {
    host?: string;
    port?: number;
    secure?: boolean;
    auth?: {
      user?: string;
      pass?: string;
    };
  }

  export interface MailOptions {
    from?: string;
    to: string;
    subject: string;
    html?: string;
    text?: string;
  }

  export interface SentMessageInfo {
    messageId: string;
    response: string;
    envelope: {
      from: string;
      to: string[];
    };
  }

  export interface Transporter {
    sendMail(mailOptions: MailOptions): Promise<SentMessageInfo>;
  }

  export function createTransport(options?: SMTPTransportOptions): Transporter;
}
