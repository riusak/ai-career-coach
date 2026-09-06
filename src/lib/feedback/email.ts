import type { UserFeedback } from '@/types/feedback';

const ADMIN_NOTIFICATION_EMAIL = 'effoeakolly@gmail.com';

/**
 * Dispatches an email notification to the administrator (effoeakolly@gmail.com)
 * whenever a new user feedback or support message is submitted.
 *
 * If RESEND_API_KEY is configured in the environment, sends via Resend REST API.
 * Otherwise logs formatted payload for local/staging telemetry without throwing.
 */
export async function sendFeedbackEmailNotification(feedback: UserFeedback): Promise<{
  sent: boolean;
  error?: string;
}> {
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'ForPro AI <notifications@forpro-ai.com>';

  const subjectPrefix = feedback.category === 'bug'
    ? '[ALERTE BUG]'
    : feedback.category === 'feature'
    ? '[SUGGESTION]'
    : feedback.category === 'interview'
    ? '[ENTRETIEN IA]'
    : '[FEEDBACK]';

  const emailSubject = `${subjectPrefix} ${feedback.subject} — (${feedback.userName || feedback.userEmail || 'Utilisateur'})`;

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #0f172a; padding: 24px; }
          .card { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
          .header { background: #0f172a; padding: 20px 24px; color: #ffffff; }
          .header h2 { margin: 0; font-size: 18px; font-weight: 700; color: #ffffff; }
          .header p { margin: 4px 0 0; font-size: 12px; color: #94a3b8; }
          .content { padding: 24px; }
          .meta-item { margin-bottom: 12px; font-size: 13px; color: #475569; }
          .meta-label { font-weight: 600; color: #1e293b; display: inline-block; width: 100px; }
          .badge { display: inline-block; padding: 3px 8px; border-radius: 6px; font-size: 11px; font-weight: 600; text-transform: uppercase; background: #ffedd5; color: #c2410c; }
          .message-box { margin-top: 16px; padding: 16px; background: #f1f5f9; border-radius: 8px; font-size: 14px; line-height: 1.6; color: #1e293b; white-space: pre-wrap; }
          .footer { background: #f8fafc; padding: 16px 24px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b; text-align: center; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="header">
            <h2>Nouveau retour utilisateur — ForPro AI</h2>
            <p>Message reçu le ${new Date(feedback.createdAt).toLocaleString('fr-FR')}</p>
          </div>
          <div class="content">
            <div class="meta-item">
              <span class="meta-label">Catégorie :</span>
              <span class="badge">${feedback.category}</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">Auteur :</span>
              <strong>${feedback.userName || 'Anonyme'}</strong> (${feedback.userEmail || 'Email non fourni'})
            </div>
            ${feedback.rating ? `
            <div class="meta-item">
              <span class="meta-label">Note :</span>
              <strong>${feedback.rating} / 5</strong>
            </div>` : ''}
            ${feedback.pageUrl ? `
            <div class="meta-item">
              <span class="meta-label">Page source :</span>
              <code>${feedback.pageUrl}</code>
            </div>` : ''}
            <div class="meta-item">
              <span class="meta-label">Sujet :</span>
              <strong>${feedback.subject}</strong>
            </div>
            <div class="message-box">${feedback.message}</div>
          </div>
          <div class="footer">
            Ce message s'auto-détruira dans le tableau de bord dans 7 jours.
          </div>
        </div>
      </body>
    </html>
  `;

  if (!apiKey) {
    console.info(`[feedback-email] (Dev/No-Key) Notification to ${ADMIN_NOTIFICATION_EMAIL}: "${emailSubject}" from ${feedback.userEmail || 'unknown'}`);
    return { sent: true };
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [ADMIN_NOTIFICATION_EMAIL],
        subject: emailSubject,
        html: htmlContent,
        reply_to: feedback.userEmail || undefined,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.warn(`[feedback-email] Resend returned HTTP ${res.status}:`, errText);
      return { sent: false, error: errText };
    }

    return { sent: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erreur réseau lors de l’envoi.';
    console.error('[feedback-email] Failed to send email:', msg);
    return { sent: false, error: msg };
  }
}
