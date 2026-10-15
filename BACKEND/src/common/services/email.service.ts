import nodemailer, { type Transporter } from 'nodemailer';
import dotenv from 'dotenv';
import { ENV } from '../../config/env.js';

class EmailService {
  private getTransporterConfig(): { transporter: Transporter; fromEmail: string } | null {
    dotenv.config();
    const user = (process.env.SMTP_USER || ENV.SMTP_USER || '').trim();
    const pass = (process.env.SMTP_PASS || ENV.SMTP_PASS || '').replace(/\s+/g, '');

    if (!user || !pass) {
      return null;
    }

    const isResend = pass.startsWith('re_');

    if (isResend) {
      const transporter = nodemailer.createTransport({
        host: 'smtp.resend.com',
        port: 465,
        secure: true,
        auth: {
          user: 'resend',
          pass: pass,
        },
      });

      return {
        transporter,
        fromEmail: `"Oakland International School" <onboarding@resend.dev>`,
      };
    }

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user,
        pass,
      },
    });

    return {
      transporter,
      fromEmail: `"Oakland International School" <${user}>`,
    };
  }

  /**
   * Generates a prestigious, institutional Oakland School HTML email wrapper.
   */
  private renderOaklandWrapper(params: {
    categoryBadge: string;
    badgeColor?: string;
    headline: string;
    recipientName: string;
    contentHtml: string;
    ctaText?: string;
    ctaUrl?: string;
    secondaryNote?: string;
    includeExecutiveSignature?: boolean;
  }): string {
    const badgeColor = params.badgeColor || '#0f3a3e';
    const currentYear = new Date().getFullYear();

    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${params.headline}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; color: #1e293b;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f1f5f9; padding: 32px 16px;">
    <tr>
      <td align="center">
        <!-- Main Email Container -->
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 620px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(15, 23, 42, 0.08), 0 8px 10px -6px rgba(15, 23, 42, 0.04); border: 1px solid #e2e8f0;">
          
          <!-- Top Accent Gold & Crimson Bar -->
          <tr>
            <td style="height: 5px; background: linear-gradient(90deg, #b3141f 0%, #d4af37 50%, #0f3a3e 100%);"></td>
          </tr>

          <!-- Prestigious Institutional Header -->
          <tr>
            <td style="background-color: #092327; padding: 32px 28px; text-align: center;">
              <!-- Crest & Monogram Badge -->
              <table border="0" cellspacing="0" cellpadding="0" align="center" style="margin: 0 auto 14px auto;">
                <tr>
                  <td align="center" style="width: 52px; height: 52px; background-color: #0f3a3e; border: 2px solid #d4af37; border-radius: 14px; text-align: center; vertical-align: middle;">
                    <span style="font-family: Georgia, serif; font-size: 26px; font-weight: bold; color: #ffffff; letter-spacing: 1px;">O</span>
                  </td>
                </tr>
              </table>

              <h1 style="color: #ffffff; margin: 0 0 6px 0; font-size: 20px; font-weight: 800; text-transform: uppercase; letter-spacing: 2.5px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                Oakland International School
              </h1>
              <p style="color: #94a3b8; font-size: 11px; margin: 0 0 10px 0; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 600;">
                Excellence &bull; Integrity &bull; Leadership
              </p>
              <div style="display: inline-block; padding: 4px 14px; background-color: rgba(255, 255, 255, 0.08); border: 1px solid rgba(255, 255, 255, 0.15); border-radius: 20px;">
                <span style="color: #e2e8f0; font-size: 10.5px; font-weight: 600; letter-spacing: 0.8px; text-transform: uppercase;">
                  Office of the Proprietor & Governing Council
                </span>
              </div>
            </td>
          </tr>

          <!-- Category Banner -->
          <tr>
            <td style="background-color: #f8fafc; padding: 14px 28px; border-bottom: 1px solid #e2e8f0; text-align: center;">
              <span style="display: inline-block; padding: 4px 12px; background-color: #eaf3f3; color: ${badgeColor}; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; border-radius: 6px; border: 1px solid rgba(15, 58, 62, 0.15);">
                ${params.categoryBadge}
              </span>
            </td>
          </tr>

          <!-- Email Body -->
          <tr>
            <td style="padding: 32px 32px 24px 32px;">
              <p style="color: #0f172a; font-size: 16px; font-weight: 700; margin: 0 0 16px 0;">
                Dear ${params.recipientName},
              </p>

              <div style="color: #334155; font-size: 14.5px; line-height: 1.7; margin: 0 0 24px 0;">
                ${params.contentHtml}
              </div>

              ${params.ctaText && params.ctaUrl ? `
              <!-- CTA Button Section -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin: 28px 0 20px 0;">
                <tr>
                  <td align="center">
                    <a href="${params.ctaUrl}" style="background-color: #0f3a3e; color: #ffffff; padding: 15px 34px; border-radius: 10px; text-decoration: none; font-weight: 700; font-size: 14px; letter-spacing: 0.5px; display: inline-block; border: 1px solid #164e53; box-shadow: 0 4px 12px rgba(15, 58, 62, 0.25);">
                      ${params.ctaText} &rarr;
                    </a>
                  </td>
                </tr>
              </table>

              <p style="color: #64748b; font-size: 12px; line-height: 1.5; margin: 0 0 24px 0; text-align: center;">
                If the button above does not open, sign in at:<br/>
                <a href="${params.ctaUrl}" style="color: #0284c7; word-break: break-all; text-decoration: underline; font-family: monospace;">${params.ctaUrl}</a>
              </p>
              ` : ''}

              ${params.secondaryNote ? `
              <div style="background-color: #f8fafc; border-left: 3px solid #94a3b8; padding: 12px 16px; border-radius: 4px; margin-bottom: 24px;">
                <p style="margin: 0; font-size: 12px; color: #475569; line-height: 1.5;">
                  ${params.secondaryNote}
                </p>
              </div>
              ` : ''}

              ${params.includeExecutiveSignature ? `
              <!-- Formal Executive Signature Seal -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="border-top: 1px solid #e2e8f0; padding-top: 20px; margin-top: 24px;">
                <tr>
                  <td>
                    <p style="color: #64748b; font-size: 12px; font-style: italic; margin: 0 0 6px 0;">
                      Office of the Proprietor,
                    </p>
                    <p style="color: #0f172a; font-size: 15px; font-weight: 800; margin: 0;">
                      School Proprietor
                    </p>
                    <p style="color: #b3141f; font-size: 12px; font-weight: 700; margin: 2px 0 0 0; text-transform: uppercase;">
                      Founder & Proprietor
                    </p>
                    <p style="color: #64748b; font-size: 11px; margin: 2px 0 0 0;">
                      Oakland International School
                    </p>
                  </td>
                  <td align="right" valign="top">
                  </td>
                </tr>
              </table>
              ` : ''}
            </td>
          </tr>

          <!-- Institutional Footer -->
          <tr>
            <td style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 22px 28px; text-align: center;">
              <p style="color: #64748b; font-size: 11.5px; margin: 0 0 6px 0; font-weight: 600;">
                Oakland International School &bull; Senate Building, Campus Drive, Lagos, Nigeria
              </p>
              <p style="color: #94a3b8; font-size: 10.5px; margin: 0; line-height: 1.5;">
                &copy; ${currentYear} Oakland International School. All rights reserved.<br/>
                This is a confidential communication intended exclusively for the designated recipient.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;
  }

  /**
   * Helper to format a prestigious credentials vault box
   */
  private renderCredentialsBox(params: {
    title: string;
    employeeId: string;
    role: string;
    email: string;
    password: string;
  }): string {
    return `
      <div style="background-color: #0b1f22; border: 1px solid #1a4347; border-radius: 12px; padding: 20px; margin: 24px 0; color: #ffffff;">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 14px; border-bottom: 1px solid #164247; padding-bottom: 10px;">
          <tr>
            <td>
              <span style="color: #d4af37; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 1.5px;">
                ${params.title}
              </span>
            </td>
            <td align="right">
              <span style="background-color: rgba(16, 185, 129, 0.2); color: #34d399; font-size: 10px; font-weight: 800; padding: 2px 8px; border-radius: 4px; border: 1px solid rgba(16, 185, 129, 0.3); text-transform: uppercase;">
                Active Credential
              </span>
            </td>
          </tr>
        </table>

        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="font-size: 13px;">
          <tr>
            <td style="padding: 6px 0; color: #94a3b8; font-weight: 600; width: 140px;">Employee ID:</td>
            <td style="padding: 6px 0; font-family: 'Courier New', Courier, monospace; font-size: 14px; font-weight: 700; color: #38bdf8;">${params.employeeId}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #94a3b8; font-weight: 600;">Executive Mandate:</td>
            <td style="padding: 6px 0; font-weight: 700; color: #ffffff;">${params.role}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #94a3b8; font-weight: 600;">Official Email:</td>
            <td style="padding: 6px 0; font-family: 'Courier New', Courier, monospace; color: #e2e8f0;">${params.email}</td>
          </tr>
          <tr>
            <td style="padding: 10px 0 6px 0; color: #94a3b8; font-weight: 600;" valign="middle">Portal Password:</td>
            <td style="padding: 10px 0 6px 0;">
              <div style="background-color: #064e3b; border: 1px solid #10b981; color: #34d399; font-size: 17px; font-weight: 800; font-family: 'Courier New', Courier, monospace; letter-spacing: 2px; padding: 8px 14px; border-radius: 6px; display: inline-block;">
                ${params.password}
              </div>
            </td>
          </tr>
        </table>
      </div>
    `;
  }

  async sendPrincipalAppointmentEmail(params: {
    to: string;
    principalName: string;
    employeeId: string;
    password: string;
    loginUrl?: string;
  }): Promise<{ sent: boolean; messageId?: string; error?: string }> {
    const config = this.getTransporterConfig();
    const portalUrl = params.loginUrl || `${ENV.FRONTEND_URL}/login?email=${encodeURIComponent(params.to)}`;

    if (!config) {
      console.log(`[EmailService] SMTP credentials not set. Handed credentials slip directly.`);
      return { sent: false, error: 'SMTP credentials not configured in BACKEND/.env' };
    }

    const credentialsHtml = this.renderCredentialsBox({
      title: 'Principal Credential Pass',
      employeeId: params.employeeId,
      role: 'School Principal & Head of Academics',
      email: params.to,
      password: params.password,
    });

    const contentHtml = `
      <p style="margin: 0 0 14px 0;">
        By the supreme authority of the School Governing Council, you have officially been appointed as the <strong>School Principal & Head of Academics</strong> of Oakland International School.
      </p>
      <p style="margin: 0 0 16px 0;">
        As the chief academic officer, you are entrusted with faculty governance, supervision of teaching standards across all classes (JSS 1 – SS 3), daily attendance integrity, and academic vetting of student terminal assessments.
      </p>

      ${credentialsHtml}

      <p style="margin: 0; font-size: 13.5px; color: #475569;">
        Please sign in with the official credentials above to access your executive administration dashboard. For security, do not disclose these credentials to unauthorized persons.
      </p>
    `;

    const html = this.renderOaklandWrapper({
      categoryBadge: 'Executive Leadership Mandate',
      headline: 'Official Appointment: School Principal & Portal Access',
      recipientName: params.principalName,
      contentHtml,
      ctaText: 'Access Principal Portal',
      ctaUrl: portalUrl,
      includeExecutiveSignature: true,
    });

    try {
      const info = await config.transporter.sendMail({
        from: config.fromEmail,
        to: params.to,
        subject: 'Official Mandate: Appointment as School Principal & Portal Access',
        html,
      });
      console.log(`[EmailService] Principal mandate email delivered to ${params.to}. MessageId: ${info.messageId}`);
      return { sent: true, messageId: info.messageId };
    } catch (err: any) {
      console.error(`[EmailService] Failed to send email to ${params.to}:`, err.message);
      return { sent: false, error: err.message };
    }
  }

  async sendBursarAppointmentEmail(params: {
    to: string;
    bursarName: string;
    employeeId: string;
    password: string;
    loginUrl?: string;
  }): Promise<{ sent: boolean; messageId?: string; error?: string }> {
    const config = this.getTransporterConfig();
    const portalUrl = params.loginUrl || `${ENV.FRONTEND_URL}/login?email=${encodeURIComponent(params.to)}`;

    if (!config) {
      console.log(`[EmailService] SMTP credentials not set. Handed credentials slip directly.`);
      return { sent: false, error: 'SMTP credentials not configured in BACKEND/.env' };
    }

    const credentialsHtml = this.renderCredentialsBox({
      title: 'Bursary & Treasury Credential Pass',
      employeeId: params.employeeId,
      role: 'School Bursar & Chief Financial Officer',
      email: params.to,
      password: params.password,
    });

    const contentHtml = `
      <p style="margin: 0 0 14px 0;">
        By executive mandate of the Proprietor, you have officially been appointed as the <strong>School Bursar & Chief Financial Officer</strong> of Oakland International School.
      </p>
      <p style="margin: 0 0 16px 0;">
        You hold sole administrative jurisdiction over the school treasury: overseeing tuition fee collections, campus operating expenditures, staff payroll disbursements, and institutional bank account sweeps.
      </p>

      ${credentialsHtml}

      <p style="margin: 0; font-size: 13.5px; color: #475569;">
        Please sign in with your official bursary credentials above to access the financial ledger and treasury dashboard.
      </p>
    `;

    const html = this.renderOaklandWrapper({
      categoryBadge: 'Treasury Directorate Mandate',
      badgeColor: '#b45309',
      headline: 'Official Mandate: Appointment as School Bursar & Financial Portal Access',
      recipientName: params.bursarName,
      contentHtml,
      ctaText: 'Access Bursar Treasury Portal',
      ctaUrl: portalUrl,
      includeExecutiveSignature: true,
    });

    try {
      const info = await config.transporter.sendMail({
        from: config.fromEmail,
        to: params.to,
        subject: 'Official Mandate: Appointment as School Bursar & Financial Portal Access',
        html,
      });
      console.log(`[EmailService] Bursar mandate email delivered to ${params.to}. MessageId: ${info.messageId}`);
      return { sent: true, messageId: info.messageId };
    } catch (err: any) {
      console.error(`[EmailService] Failed to send bursar email to ${params.to}:`, err.message);
      return { sent: false, error: err.message };
    }
  }

  async sendStaffOnboardingEmail(params: {
    to: string;
    staffName: string;
    role: string;
    employeeId: string;
    password: string;
  }): Promise<{ sent: boolean; messageId?: string; error?: string }> {
    const config = this.getTransporterConfig();
    const loginUrl = `${ENV.FRONTEND_URL}/login?email=${encodeURIComponent(params.to)}`;

    if (!config) {
      return { sent: false, error: 'SMTP credentials not configured in BACKEND/.env' };
    }

    const credentialsHtml = this.renderCredentialsBox({
      title: 'Faculty Credential Pass',
      employeeId: params.employeeId,
      role: params.role,
      email: params.to,
      password: params.password,
    });

    const contentHtml = `
      <p style="margin: 0 0 14px 0;">
        Welcome to the distinguished faculty of Oakland International School. You have been officially onboarded as <strong>${params.role}</strong>.
      </p>
      <p style="margin: 0 0 16px 0;">
        Your official faculty credentials have been issued. Through the staff portal, you will log classroom attendance, compile student continuous assessment scores, and submit term marks for academic vetting.
      </p>

      ${credentialsHtml}
    `;

    const html = this.renderOaklandWrapper({
      categoryBadge: 'Faculty Onboarding',
      headline: `Welcome to Oakland Schools — Staff Portal Credentials (${params.role})`,
      recipientName: params.staffName,
      contentHtml,
      ctaText: 'Sign In to Faculty Portal',
      ctaUrl: loginUrl,
      includeExecutiveSignature: true,
    });

    try {
      const info = await config.transporter.sendMail({
        from: config.fromEmail,
        to: params.to,
        subject: `Welcome to Oakland International School — Portal Credentials (${params.role})`,
        html,
      });
      console.log(`[EmailService] Staff onboarding email sent to ${params.to}. MessageId: ${info.messageId}`);
      return { sent: true, messageId: info.messageId };
    } catch (err: any) {
      console.error(`[EmailService] Failed to send staff email to ${params.to}:`, err.message);
      return { sent: false, error: err.message };
    }
  }

  async sendAbsenteeAlertEmail(params: {
    to: string;
    parentName?: string;
    studentName: string;
    studentClass: string;
    date: string;
  }): Promise<{ sent: boolean; messageId?: string; error?: string }> {
    const config = this.getTransporterConfig();

    if (!config) {
      return { sent: false, error: 'SMTP credentials not configured in BACKEND/.env' };
    }

    const contentHtml = `
      <div style="background-color: #fef2f2; border: 1px solid #fecaca; border-left: 4px solid #b3141f; padding: 14px 16px; border-radius: 8px; margin-bottom: 20px;">
        <p style="color: #991b1b; font-size: 14px; margin: 0; font-weight: 700;">
          Attendance Notice: ${params.studentName} was marked ABSENT during morning roll call on ${params.date}.
        </p>
      </div>

      <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px; margin-bottom: 20px; font-size: 13.5px;">
        <tr>
          <td style="padding: 6px 10px; font-weight: 700; color: #64748b; width: 140px;">Student Name:</td>
          <td style="padding: 6px 10px; font-weight: 700; color: #0f172a;">${params.studentName}</td>
        </tr>
        <tr>
          <td style="padding: 6px 10px; font-weight: 700; color: #64748b;">Class / Homeroom:</td>
          <td style="padding: 6px 10px; color: #0f172a;">${params.studentClass}</td>
        </tr>
        <tr>
          <td style="padding: 6px 10px; font-weight: 700; color: #64748b;">Roll Call Date:</td>
          <td style="padding: 6px 10px; color: #0f172a;">${params.date}</td>
        </tr>
      </table>

      <p style="margin: 0; font-size: 13.5px; color: #475569; line-height: 1.6;">
        Student welfare, discipline, and daily attendance are of paramount importance at Oakland International School. If this absence was planned or due to illness, kindly reply directly to this notice or contact the administrative desk.
      </p>
    `;

    const html = this.renderOaklandWrapper({
      categoryBadge: 'Student Welfare & Attendance Alert',
      badgeColor: '#b3141f',
      headline: `Attendance Alert: ${params.studentName}`,
      recipientName: params.parentName || 'Parent / Guardian',
      contentHtml,
      secondaryNote: 'Oakland Schools Welfare Registry: attendance@oaklandschools.edu &bull; +234 803 000 1122',
      includeExecutiveSignature: false,
    });

    try {
      const info = await config.transporter.sendMail({
        from: config.fromEmail,
        to: params.to,
        subject: `Oakland Attendance Notice: ${params.studentName} marked absent (${params.date})`,
        html,
      });
      console.log(`[EmailService] Absentee alert email sent to parent ${params.to}. MessageId: ${info.messageId}`);
      return { sent: true, messageId: info.messageId };
    } catch (err: any) {
      console.error(`[EmailService] Failed to send absentee alert to ${params.to}:`, err.message);
      return { sent: false, error: err.message };
    }
  }

  async sendReportCardEmail(params: {
    to: string;
    parentName?: string;
    studentName: string;
    studentClass: string;
    term: string;
    academicYear: string;
    position?: string;
    averageScore?: number | string;
    portalUrl?: string;
  }): Promise<{ sent: boolean; messageId?: string; error?: string }> {
    const config = this.getTransporterConfig();
    const resultLink = params.portalUrl || `${ENV.FRONTEND_URL}/login`;

    if (!config) {
      return { sent: false, error: 'SMTP credentials not configured in BACKEND/.env' };
    }

    const contentHtml = `
      <p style="margin: 0 0 14px 0;">
        The official terminal academic assessment for <strong>${params.studentName}</strong> (${params.studentClass}) for <strong>${params.term}, ${params.academicYear}</strong> has been finalized, approved by the Principal, and published.
      </p>

      <div style="background-color: #f8fafc; border: 1px solid #cbd5e1; border-radius: 12px; padding: 20px; margin: 20px 0;">
        <h4 style="margin: 0 0 12px 0; color: #0f3a3e; font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px;">
          Academic Performance Summary
        </h4>
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="font-size: 13.5px;">
          <tr>
            <td style="padding: 6px 0; color: #64748b; font-weight: 600; width: 140px;">Student:</td>
            <td style="padding: 6px 0; font-weight: 700; color: #0f172a;">${params.studentName}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Class / Level:</td>
            <td style="padding: 6px 0; color: #0f172a;">${params.studentClass}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Term & Session:</td>
            <td style="padding: 6px 0; color: #0f172a;">${params.term} (${params.academicYear})</td>
          </tr>
          ${params.averageScore ? `
          <tr>
            <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Cumulative Average:</td>
            <td style="padding: 6px 0; font-weight: 800; color: #059669; font-size: 15px;">${params.averageScore}%</td>
          </tr>` : ''}
          ${params.position ? `
          <tr>
            <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Class Position:</td>
            <td style="padding: 6px 0; font-weight: 800; color: #0f3a3e;">${params.position}</td>
          </tr>` : ''}
        </table>
      </div>

      <p style="margin: 0; font-size: 13px; color: #475569;">
        You can review the full subject breakdown, behavioral ratings, class teacher remarks, and the Principal's executive comments online.
      </p>
    `;

    const html = this.renderOaklandWrapper({
      categoryBadge: 'Academic Examination & Assessment Council',
      badgeColor: '#0f3a3e',
      headline: `Official Academic Report Card: ${params.studentName}`,
      recipientName: params.parentName || 'Parent / Guardian',
      contentHtml,
      ctaText: 'View & Download Official Report Card',
      ctaUrl: resultLink,
      includeExecutiveSignature: true,
    });

    try {
      const info = await config.transporter.sendMail({
        from: config.fromEmail,
        to: params.to,
        subject: `Official Academic Report Card: ${params.studentName} (${params.term} ${params.academicYear})`,
        html,
      });
      console.log(`[EmailService] Report card email sent to parent ${params.to}. MessageId: ${info.messageId}`);
      return { sent: true, messageId: info.messageId };
    } catch (err: any) {
      console.error(`[EmailService] Failed to send report card to ${params.to}:`, err.message);
      return { sent: false, error: err.message };
    }
  }
}

export const emailService = new EmailService();
