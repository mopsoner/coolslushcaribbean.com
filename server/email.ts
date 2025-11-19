import nodemailer from 'nodemailer';
import type { Booking } from '@shared/schema';
import { computeCautionAmount, formatEuro } from '@shared/utils';

// Create transporter with SMTP or fall back to ethereal for testing
let transporter: nodemailer.Transporter;

async function getTransporter() {
  if (transporter) return transporter;

  // If SMTP credentials are provided, use them
  if (process.env.SMTP_HOST && process.env.SMTP_PORT) {
    // Workaround for Replit Secrets truncation issue
    // If SMTP_USER is truncated, reconstruct the full email
    let smtpUser = process.env.SMTP_USER || '';
    if (smtpUser === 'contact@coolslushlemonad') {
      smtpUser = 'contact@coolslushlemonade.com';
      console.log('📧 Reconstructed full email address from truncated secret');
    }
    
    console.log('🔍 SMTP Configuration:');
    console.log('  Username:', smtpUser);
    console.log('  Password length:', process.env.SMTP_PASS?.length);
    
    const config: any = {
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT),
      secure: process.env.SMTP_SECURE === 'true',
      auth: smtpUser && process.env.SMTP_PASS ? {
        user: smtpUser,
        pass: process.env.SMTP_PASS,
      } : undefined,
      authMethod: 'LOGIN',
      tls: {
        rejectUnauthorized: true,
        minVersion: 'TLSv1.2'
      },
      debug: true,
      logger: true
    };
    
    transporter = nodemailer.createTransport(config);
    
    // Verify connection
    try {
      await transporter.verify();
      console.log('✅ SMTP connection verified successfully');
    } catch (error: any) {
      console.error('❌ SMTP verification failed:', error.message);
      console.error('SMTP Config:', {
        host: config.host,
        port: config.port,
        secure: config.secure,
        user: config.auth?.user,
        userLength: config.auth?.user?.length
      });
    }
  } else {
    // For development/testing, create ethereal email account
    try {
      const testAccount = await nodemailer.createTestAccount();
      transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });
    } catch (error: any) {
      console.error('Failed to create Ethereal test account:', error.message);
      // Return a dummy transporter that does nothing
      transporter = nodemailer.createTransport({
        streamTransport: true,
        newline: 'unix',
      });
    }
  }

  return transporter;
}

export async function sendBookingConfirmation(booking: Booking): Promise<void> {
  try {
    const transporter = await getTransporter();
    const fromEmail = process.env.EMAIL_FROM || 'Cool Slush <contact@coolslushlemonade.com>';

    const bookingDate = new Date(booking.startDate).toLocaleDateString('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const info = await transporter.sendMail({
      from: fromEmail,
      to: booking.customerEmail,
      subject: `✅ Confirmation de réservation Cool Slush - ${bookingDate}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #0EA5E9 0%, #0369A1 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f8fafc; padding: 30px; border-radius: 0 0 10px 10px; }
            .booking-details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #0EA5E9; }
            .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e2e8f0; }
            .detail-label { font-weight: bold; color: #64748b; }
            .detail-value { color: #0f172a; }
            .total { font-size: 1.5em; font-weight: bold; color: #0EA5E9; text-align: right; margin-top: 15px; }
            .next-steps { background: #e0f2fe; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .step { padding: 10px 0; }
            .step-number { display: inline-block; width: 30px; height: 30px; background: #0EA5E9; color: white; border-radius: 50%; text-align: center; line-height: 30px; margin-right: 10px; }
            .footer { text-align: center; padding: 20px; color: #64748b; font-size: 0.9em; }
            .button { display: inline-block; padding: 15px 30px; background: #0EA5E9; color: white; text-decoration: none; border-radius: 8px; margin: 10px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🍹 Cool Slush</h1>
              <p>Votre réservation est confirmée !</p>
            </div>
            
            <div class="content">
              <p>Bonjour ${booking.customerName},</p>
              
              <p>Merci d'avoir réservé avec Cool Slush ! Nous sommes ravis de vous accompagner pour votre événement.</p>
              
              <div class="booking-details">
                <h2 style="margin-top: 0; color: #0EA5E9;">📋 Détails de votre réservation</h2>
                <div class="detail-row">
                  <span class="detail-label">Numéro de réservation</span>
                  <span class="detail-value">#${booking.id.slice(-8)}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Date</span>
                  <span class="detail-value">${bookingDate}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Horaires</span>
                  <span class="detail-value">${booking.startHour.toString().padStart(2, '0')}:00 - ${booking.endHour.toString().padStart(2, '0')}:00</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Nombre de machines</span>
                  <span class="detail-value">${booking.machines} machine${booking.machines > 1 ? 's' : ''} Ninja</span>
                </div>
                <div class="detail-row" style="border: none;">
                  <span class="detail-label">Contact</span>
                  <span class="detail-value">${booking.customerPhone}</span>
                </div>
                <div class="total">Total: ${(booking.totalCents / 100).toFixed(2)}€</div>
              </div>
              
              <div class="next-steps">
                <h3 style="margin-top: 0; color: #0EA5E9;">🎯 Prochaines étapes</h3>
                <div class="step">
                  <span class="step-number">1</span>
                  <strong>Préparez vos ingrédients</strong> - Consultez notre guide de recettes ci-joint
                </div>
                <div class="step">
                  <span class="step-number">2</span>
                  <strong>Attendez la livraison</strong> - Nous livrerons le ${bookingDate} à l'heure convenue
                </div>
                <div class="step">
                  <span class="step-number">3</span>
                  <strong>Profitez de votre événement</strong> - Régalez vos invités avec de délicieux Slushies !
                </div>
                <div class="step">
                  <span class="step-number">4</span>
                  <strong>Reprise de la machine</strong> - Nous récupérerons la machine le lendemain
                </div>
              </div>
              
              <p><strong>💡 Conseils d'utilisation :</strong></p>
              <ul>
                <li>Préparez vos mélanges à l'avance et réfrigérez-les</li>
                <li>Utilisez des sirops de qualité pour un meilleur résultat</li>
                <li>La machine nécessite environ 30 minutes pour atteindre la température optimale</li>
                <li>Nettoyez régulièrement les cuves pendant l'utilisation</li>
              </ul>
              
              <p><strong>📞 Besoin d'aide ?</strong></p>
              <p>Notre équipe est disponible 7j/7 :</p>
              <ul>
                <li>Téléphone : <a href="tel:+590690123456">0690 12 34 56</a></li>
                <li>Email : <a href="mailto:contact@coolslushlemonade.com">contact@coolslushlemonade.com</a></li>
              </ul>
              
              <p style="margin-top: 30px;">À très bientôt,<br><strong>L'équipe Cool Slush</strong></p>
            </div>
            
            <div class="footer">
              <p>Cool Slush - Location de machines à Slushie professionnelles</p>
              <p style="font-size: 0.8em; color: #94a3b8;">
                Vous recevez cet email car vous avez effectué une réservation sur coolslushlemonade.com
              </p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
Cool Slush - Confirmation de réservation

Bonjour ${booking.customerName},

Merci d'avoir réservé avec Cool Slush ! Votre réservation est confirmée.

DÉTAILS DE VOTRE RÉSERVATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Numéro : #${booking.id.slice(-8)}
Date : ${bookingDate}
Horaires : ${booking.startHour.toString().padStart(2, '0')}:00 - ${booking.endHour.toString().padStart(2, '0')}:00
Machines : ${booking.machines} machine${booking.machines > 1 ? 's' : ''} Ninja
Contact : ${booking.customerPhone}
Total : ${(booking.totalCents / 100).toFixed(2)}€

PROCHAINES ÉTAPES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. Préparez vos ingrédients (voir guide de recettes)
2. Attendez la livraison le ${bookingDate}
3. Profitez de votre événement !
4. Reprise de la machine le lendemain

BESOIN D'AIDE ?
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Téléphone : 0690 12 34 56
Email : contact@coolslushlemonade.com

À très bientôt,
L'équipe Cool Slush

Cool Slush - Location de machines à Slushie
      `,
    });

  } catch (error) {
    console.error('Error sending email:', error);
  }
}

export async function sendReminderEmail(booking: Booking): Promise<void> {
  try {
    const transporter = await getTransporter();
    const fromEmail = process.env.EMAIL_FROM || 'Cool Slush <contact@coolslushlemonade.com>';

    const bookingDate = new Date(booking.startDate).toLocaleDateString('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    await transporter.sendMail({
      from: fromEmail,
      to: booking.customerEmail,
      subject: `⏰ Rappel : Livraison demain - Cool Slush`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #F59E0B 0%, #D97706 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f8fafc; padding: 30px; border-radius: 0 0 10px 10px; }
            .reminder-box { background: #FEF3C7; border-left: 4px solid #F59E0B; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .footer { text-align: center; padding: 20px; color: #64748b; font-size: 0.9em; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>⏰ Rappel de livraison</h1>
            </div>
            
            <div class="content">
              <p>Bonjour ${booking.customerName},</p>
              
              <div class="reminder-box">
                <h2 style="margin-top: 0; color: #D97706;">📦 Livraison demain !</h2>
                <p>Votre machine à Slushie sera livrée <strong>${bookingDate}</strong> entre ${booking.startHour.toString().padStart(2, '0')}:00 et ${booking.endHour.toString().padStart(2, '0')}:00.</p>
              </div>
              
              <p><strong>✅ Checklist avant la livraison :</strong></p>
              <ul>
                <li>Préparez un espace dégagé pour installer la machine</li>
                <li>Vérifiez que vous avez une prise électrique à proximité</li>
                <li>Ayez vos ingrédients prêts (sirops, fruits, etc.)</li>
                <li>Assurez-vous d'être disponible pour réceptionner la machine</li>
              </ul>
              
              <p><strong>Réservation #${booking.id.slice(-8)}</strong></p>
              <p>📞 Questions ? Appelez-nous au 0690 12 34 56</p>
              
              <p>À demain !<br><strong>L'équipe Cool Slush</strong></p>
            </div>
            
            <div class="footer">
              <p>Cool Slush</p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

  } catch (error) {
    console.error('Error sending reminder email:', error);
  }
}

export async function sendSwiklyDepositEmail(booking: Booking): Promise<void> {
  try {
    const transporter = await getTransporter();
    const fromEmail = process.env.EMAIL_FROM || 'Cool Slush <contact@coolslushlemonade.com>';

    const bookingDate = new Date(booking.startDate).toLocaleDateString('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    // Swikly URL should be set when booking is created
    const swiklyLink = booking.swiklyUrl || '#';

    await transporter.sendMail({
      from: fromEmail,
      to: booking.customerEmail,
      subject: `🔒 Sécurisez votre réservation - Caution Swikly`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #8B5CF6 0%, #6366F1 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f8fafc; padding: 30px; border-radius: 0 0 10px 10px; }
            .info-box { background: #F3F4F6; border-left: 4px solid #8B5CF6; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .button { display: inline-block; padding: 15px 30px; background: linear-gradient(135deg, #8B5CF6 0%, #6366F1 100%); color: white; text-decoration: none; border-radius: 8px; margin: 20px 0; font-weight: bold; }
            .footer { text-align: center; padding: 20px; color: #64748b; font-size: 0.9em; }
            .highlight { background: #FEF3C7; padding: 15px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #F59E0B; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🔒 Sécurisez votre réservation</h1>
              <p style="margin-top: 10px; font-size: 1.1em;">Caution Swikly - ${formatEuro(computeCautionAmount(booking.machines))} (150€ par machine)</p>
            </div>
            
            <div class="content">
              <p>Bonjour ${booking.customerName},</p>
              
              <p>Votre réservation <strong>#${booking.id.slice(-8)}</strong> pour le ${bookingDate} est presque finalisée !</p>
              
              <p><strong>Étape 2/2 : Caution Swikly</strong><br>
              Votre paiement de ${formatEuro(booking.totalCents)} a été validé ✅. Il ne reste plus qu'à sécuriser votre location avec une empreinte bancaire Swikly de ${formatEuro(computeCautionAmount(booking.machines))} (150€ par machine, aucun débit).</p>

              <div class="highlight">
                <p style="margin: 0; font-weight: bold;">⚠️ Important : Aucun débit ne sera effectué</p>
                <p style="margin: 5px 0 0 0; font-size: 0.95em;">Il s'agit uniquement d'une empreinte de sécurité qui sera automatiquement libérée après votre événement.</p>
              </div>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${swiklyLink}" class="button">
                  🔐 Valider la caution (Étape 2/2)
                </a>
              </div>

              <div class="info-box">
                <h3 style="margin-top: 0; color: #6366F1;">Le processus complet :</h3>
                <ol style="margin: 10px 0; padding-left: 20px;">
                  <li style="margin-bottom: 10px;">✅ Paiement Stripe de ${formatEuro(booking.totalCents)} effectué</li>
                  <li style="margin-bottom: 10px;">Validez l'empreinte bancaire Swikly (aucun débit)</li>
                  <li style="margin-bottom: 10px;">Réservation confirmée et email de confirmation envoyé</li>
                  <li style="margin-bottom: 10px;">L'empreinte bancaire sera libérée 48h après votre événement</li>
                </ol>
              </div>

              <div style="background: #E0F2FE; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 0;"><strong>✅ Avantages Swikly :</strong></p>
                <ul style="margin: 10px 0; padding-left: 20px;">
                  <li>100% sécurisé et conforme RGPD</li>
                  <li>Aucun impact sur votre plafond de carte</li>
                  <li>Libération automatique de la caution</li>
                  <li>Processus rapide (2 minutes)</li>
                </ul>
              </div>

              <p><strong>📋 Récapitulatif de votre réservation :</strong></p>
              <ul style="list-style: none; padding: 0;">
                <li>📅 Date : ${bookingDate}</li>
                <li>🕐 Horaires : ${booking.startHour.toString().padStart(2, '0')}:00 - ${booking.endHour.toString().padStart(2, '0')}:00</li>
                <li>❄️ Machines : ${booking.machines} machine${booking.machines > 1 ? 's' : ''}</li>
                <li>💰 Total : ${formatEuro(booking.totalCents)}</li>
              </ul>
              
              <p style="margin-top: 25px;"><strong>Besoin d'aide ?</strong></p>
              <p>Notre équipe est disponible :</p>
              <ul>
                <li>📞 Téléphone : <a href="tel:+590690123456" style="color: #0EA5E9;">0690 12 34 56</a></li>
                <li>📧 Email : <a href="mailto:contact@coolslushlemonade.com" style="color: #0EA5E9;">contact@coolslushlemonade.com</a></li>
              </ul>
              
              <p style="margin-top: 30px;">À très bientôt,<br><strong>L'équipe Cool Slush</strong></p>
            </div>
            
            <div class="footer">
              <p>Cool Slush - Location de machines à Slushie professionnelles</p>
              <p style="font-size: 0.8em; color: #94a3b8; margin-top: 10px;">
                Vous recevez cet email car vous avez effectué une réservation sur coolslushlemonade.com
              </p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
Cool Slush - Sécurisez votre réservation

Bonjour ${booking.customerName},

Votre réservation #${booking.id.slice(-8)} pour le ${bookingDate} est presque finalisée !

ÉTAPE 2/2 : Caution Swikly
Votre paiement de ${formatEuro(booking.totalCents)} a été validé ✅. Il ne reste plus qu'à sécuriser votre location avec une empreinte bancaire Swikly de 150€ par machine, soit ${formatEuro(computeCautionAmount(booking.machines))} au total (aucun débit).

⚠️ IMPORTANT : Aucun débit ne sera effectué
Il s'agit uniquement d'une empreinte de sécurité qui sera automatiquement libérée après votre événement.

COMPLÉTER MA CAUTION SWIKLY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Cliquez sur ce lien : ${swiklyLink}

LE PROCESSUS COMPLET
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. ✅ Paiement Stripe de ${formatEuro(booking.totalCents)} effectué
2. Cliquez sur le lien ci-dessus
3. Entrez vos coordonnées bancaires de manière sécurisée
4. Une empreinte bancaire de 150€ par machine, soit ${formatEuro(computeCautionAmount(booking.machines))} au total, est créée (aucun débit)
5. L'empreinte sera libérée 48h après votre événement

RÉCAPITULATIF DE VOTRE RÉSERVATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Date : ${bookingDate}
Horaires : ${booking.startHour.toString().padStart(2, '0')}:00 - ${booking.endHour.toString().padStart(2, '0')}:00
Machines : ${booking.machines} machine${booking.machines > 1 ? 's' : ''}
Total : ${formatEuro(booking.totalCents)}

BESOIN D'AIDE ?
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Téléphone : 0690 12 34 56
Email : contact@coolslushlemonade.com

À très bientôt,
L'équipe Cool Slush

Cool Slush - Location de machines à Slushie
      `,
    });

  } catch (error) {
    console.error('Error sending Swikly email:', error);
  }
}

export async function sendBookingStatusChangeEmail(booking: Booking, oldStatus: string, newStatus: string): Promise<void> {
  try {
    const transporter = await getTransporter();
    const fromEmail = process.env.EMAIL_FROM || 'Cool Slush <contact@coolslushlemonade.com>';
    
    const bookingDate = new Date(booking.startDate).toLocaleDateString('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    let subject = '';
    let statusMessage = '';
    let statusColor = '';
    let statusIcon = '';

    switch (newStatus) {
      case 'CONFIRMED':
        subject = `✅ Réservation confirmée - Cool Slush`;
        statusMessage = 'Votre réservation est maintenant confirmée';
        statusColor = '#10B981';
        statusIcon = '✅';
        break;
      case 'CANCELLED':
        subject = `❌ Réservation annulée - Cool Slush`;
        statusMessage = 'Votre réservation a été annulée';
        statusColor = '#EF4444';
        statusIcon = '❌';
        break;
      case 'PENDING':
        subject = `⏳ Statut de votre réservation - Cool Slush`;
        statusMessage = 'Votre réservation est en attente';
        statusColor = '#F59E0B';
        statusIcon = '⏳';
        break;
      default:
        subject = `Mise à jour de votre réservation - Cool Slush`;
        statusMessage = `Le statut de votre réservation a changé`;
        statusColor = '#0EA5E9';
        statusIcon = 'ℹ️';
    }

    await transporter.sendMail({
      from: fromEmail,
      to: booking.customerEmail,
      subject,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #10B981 0%, #059669 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f8fafc; padding: 30px; border-radius: 0 0 10px 10px; }
            .status-badge { display: inline-block; padding: 10px 20px; background: ${statusColor}; color: white; border-radius: 20px; font-weight: bold; margin: 20px 0; }
            .booking-details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e2e8f0; }
            .footer { text-align: center; padding: 20px; color: #64748b; font-size: 0.9em; }
            .cta-button { display: inline-block; padding: 12px 30px; background: #0EA5E9; color: white; text-decoration: none; border-radius: 8px; margin: 20px 0; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>${statusIcon} ${statusMessage}</h1>
            </div>
            
            <div class="content">
              <p>Bonjour ${booking.customerName},</p>
              
              <p>Nous vous informons que le statut de votre réservation a changé.</p>
              
              <div class="status-badge">
                Nouveau statut : ${newStatus === 'CONFIRMED' ? 'Confirmée' : newStatus === 'CANCELLED' ? 'Annulée' : 'En attente'}
              </div>
              
              <div class="booking-details">
                <h3>Détails de votre réservation</h3>
                <div class="detail-row">
                  <span>Numéro de réservation</span>
                  <strong>#${booking.id.slice(-8)}</strong>
                </div>
                <div class="detail-row">
                  <span>Date</span>
                  <strong>${bookingDate}</strong>
                </div>
                <div class="detail-row">
                  <span>Horaires</span>
                  <strong>${booking.startHour.toString().padStart(2, '0')}:00 - ${booking.endHour.toString().padStart(2, '0')}:00</strong>
                </div>
                <div class="detail-row">
                  <span>Machines</span>
                  <strong>${booking.machines} machine${booking.machines > 1 ? 's' : ''}</strong>
                </div>
                <div class="detail-row">
                  <span>Total</span>
                  <strong>${formatEuro(booking.totalCents)}</strong>
                </div>
              </div>
              
              ${newStatus === 'CONFIRMED' ? `
                <p><strong>Prochaines étapes :</strong></p>
                <ul>
                  <li>✅ Votre paiement est validé</li>
                  <li>✅ Votre caution Swikly est confirmée</li>
                  <li>📦 Nous livrerons les machines le jour de votre événement</li>
                </ul>
              ` : newStatus === 'CANCELLED' ? `
                <p><strong>Informations importantes :</strong></p>
                <ul>
                  <li>Votre paiement sera remboursé sous 5-7 jours ouvrés</li>
                  <li>La caution Swikly sera automatiquement libérée</li>
                </ul>
              ` : ''}
              
              <p><strong>Besoin d'aide ?</strong></p>
              <p>Notre équipe est disponible :</p>
              <ul>
                <li>📞 Téléphone : <a href="tel:+590690123456" style="color: #0EA5E9;">0690 12 34 56</a></li>
                <li>📧 Email : <a href="mailto:contact@coolslushlemonade.com" style="color: #0EA5E9;">contact@coolslushlemonade.com</a></li>
              </ul>
              
              <p style="margin-top: 30px;">À très bientôt,<br><strong>L'équipe Cool Slush</strong></p>
            </div>
            
            <div class="footer">
              <p>Cool Slush - Location de machines à Slushie professionnelles</p>
              <p style="font-size: 0.8em; color: #94a3b8; margin-top: 10px;">
                Vous recevez cet email car vous avez effectué une réservation sur coolslushlemonade.com
              </p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
Cool Slush - Mise à jour de votre réservation

Bonjour ${booking.customerName},

${statusMessage}

NOUVEAU STATUT : ${newStatus === 'CONFIRMED' ? 'CONFIRMÉE' : newStatus === 'CANCELLED' ? 'ANNULÉE' : 'EN ATTENTE'}

DÉTAILS DE VOTRE RÉSERVATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Numéro : #${booking.id.slice(-8)}
Date : ${bookingDate}
Horaires : ${booking.startHour.toString().padStart(2, '0')}:00 - ${booking.endHour.toString().padStart(2, '0')}:00
Machines : ${booking.machines} machine${booking.machines > 1 ? 's' : ''}
Total : ${formatEuro(booking.totalCents)}

${newStatus === 'CONFIRMED' ? `
PROCHAINES ÉTAPES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Votre paiement est validé
✅ Votre caution Swikly est confirmée
📦 Nous livrerons les machines le jour de votre événement
` : newStatus === 'CANCELLED' ? `
INFORMATIONS IMPORTANTES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- Votre paiement sera remboursé sous 5-7 jours ouvrés
- La caution Swikly sera automatiquement libérée
` : ''}

BESOIN D'AIDE ?
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Téléphone : 0690 12 34 56
Email : contact@coolslushlemonade.com

À très bientôt,
L'équipe Cool Slush

Cool Slush - Location de machines à Slushie
      `,
    });

  } catch (error) {
    console.error('Error sending booking status change email:', error);
  }
}

export async function sendFollowUpEmail(booking: Booking): Promise<void> {
  try {
    const transporter = await getTransporter();
    const fromEmail = process.env.EMAIL_FROM || 'Cool Slush <contact@coolslushlemonade.com>';

    await transporter.sendMail({
      from: fromEmail,
      to: booking.customerEmail,
      subject: `⭐ Merci pour votre confiance - Cool Slush`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #10B981 0%, #059669 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f8fafc; padding: 30px; border-radius: 0 0 10px 10px; }
            .footer { text-align: center; padding: 20px; color: #64748b; font-size: 0.9em; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>⭐ Merci ${booking.customerName} !</h1>
            </div>
            
            <div class="content">
              <p>Nous espérons que votre événement s'est merveilleusement bien passé et que vos invités ont adoré les Slushies !</p>
              
              <p><strong>Votre avis compte :</strong></p>
              <p>Prenez quelques secondes pour nous laisser un avis et aider d'autres personnes à découvrir Cool Slush.</p>
              
              <p><strong>💰 Caution Swikly :</strong></p>
              <p>Votre caution a été libérée automatiquement. Vous ne serez pas débité.</p>
              
              <p><strong>🎉 Location future ?</strong></p>
              <p>Profitez de 10% de réduction sur votre prochaine réservation avec le code : <strong>COOLSLUSH10</strong></p>
              
              <p>Au plaisir de vous revoir bientôt,<br><strong>L'équipe Cool Slush</strong></p>
              
              <p style="text-align: center; margin-top: 30px;">
                <a href="tel:+590690123456" style="color: #0EA5E9;">0690 12 34 56</a> • 
                <a href="mailto:contact@coolslushlemonade.com" style="color: #0EA5E9;">contact@coolslushlemonade.com</a>
              </p>
            </div>
            
            <div class="footer">
              <p>Cool Slush</p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

  } catch (error) {
    console.error('Error sending follow-up email:', error);
  }
}
