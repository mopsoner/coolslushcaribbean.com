import nodemailer from 'nodemailer';
import type { Booking } from '@shared/schema';

// Create transporter with SMTP or fall back to ethereal for testing
let transporter: nodemailer.Transporter;

async function getTransporter() {
  if (transporter) return transporter;

  // If SMTP credentials are provided, use them
  if (process.env.SMTP_HOST && process.env.SMTP_PORT) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT),
      secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
      auth: process.env.SMTP_USER && process.env.SMTP_PASS ? {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      } : undefined,
    });
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
    const fromEmail = process.env.EMAIL_FROM || 'Cool\'Slush Guadeloupe <noreply@coolslush.gp>';

    const bookingDate = new Date(booking.startDate).toLocaleDateString('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const info = await transporter.sendMail({
      from: fromEmail,
      to: booking.customerEmail,
      subject: `✅ Confirmation de réservation Cool'Slush - ${bookingDate}`,
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
              <h1>🍹 Cool'Slush Guadeloupe</h1>
              <p>Votre réservation est confirmée !</p>
            </div>
            
            <div class="content">
              <p>Bonjour ${booking.customerName},</p>
              
              <p>Merci d'avoir réservé avec Cool'Slush ! Nous sommes ravis de vous accompagner pour votre événement.</p>
              
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
                  <span class="detail-value">${booking.machines} machine${booking.machines > 1 ? 's' : ''} EZBASICS</span>
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
                  <strong>Profitez de votre événement</strong> - Régalez vos invités avec de délicieux granités !
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
                <li>Email : <a href="mailto:contact@coolslush.gp">contact@coolslush.gp</a></li>
              </ul>
              
              <p style="margin-top: 30px;">À très bientôt,<br><strong>L'équipe Cool'Slush</strong></p>
            </div>
            
            <div class="footer">
              <p>Cool'Slush Guadeloupe - Location de machines à granité professionnelles</p>
              <p>Guadeloupe, Antilles Françaises</p>
              <p style="font-size: 0.8em; color: #94a3b8;">
                Vous recevez cet email car vous avez effectué une réservation sur coolslush.gp
              </p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
Cool'Slush Guadeloupe - Confirmation de réservation

Bonjour ${booking.customerName},

Merci d'avoir réservé avec Cool'Slush ! Votre réservation est confirmée.

DÉTAILS DE VOTRE RÉSERVATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Numéro : #${booking.id.slice(-8)}
Date : ${bookingDate}
Horaires : ${booking.startHour.toString().padStart(2, '0')}:00 - ${booking.endHour.toString().padStart(2, '0')}:00
Machines : ${booking.machines} machine${booking.machines > 1 ? 's' : ''} EZBASICS
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
Email : contact@coolslush.gp

À très bientôt,
L'équipe Cool'Slush

Cool'Slush Guadeloupe - Guadeloupe, Antilles Françaises
      `,
    });

  } catch (error) {
    console.error('Error sending email:', error);
  }
}

export async function sendReminderEmail(booking: Booking): Promise<void> {
  try {
    const transporter = await getTransporter();
    const fromEmail = process.env.EMAIL_FROM || 'Cool\'Slush Guadeloupe <noreply@coolslush.gp>';

    const bookingDate = new Date(booking.startDate).toLocaleDateString('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    await transporter.sendMail({
      from: fromEmail,
      to: booking.customerEmail,
      subject: `⏰ Rappel : Livraison demain - Cool'Slush`,
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
                <p>Votre machine à granité sera livrée <strong>${bookingDate}</strong> entre ${booking.startHour.toString().padStart(2, '0')}:00 et ${booking.endHour.toString().padStart(2, '0')}:00.</p>
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
              
              <p>À demain !<br><strong>L'équipe Cool'Slush</strong></p>
            </div>
            
            <div class="footer">
              <p>Cool'Slush Guadeloupe</p>
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
    const fromEmail = process.env.EMAIL_FROM || 'Cool\'Slush Guadeloupe <noreply@coolslush.gp>';

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
              <p style="margin-top: 10px; font-size: 1.1em;">Caution Swikly - 500€</p>
            </div>
            
            <div class="content">
              <p>Bonjour ${booking.customerName},</p>
              
              <p>Votre réservation <strong>#${booking.id.slice(-8)}</strong> pour le ${bookingDate} est presque finalisée !</p>
              
              <p><strong>Une dernière étape :</strong> sécurisez votre location avec une empreinte bancaire Swikly de 500€.</p>

              <div class="highlight">
                <p style="margin: 0; font-weight: bold;">⚠️ Important : Aucun débit ne sera effectué</p>
                <p style="margin: 5px 0 0 0; font-size: 0.95em;">Il s'agit uniquement d'une empreinte de sécurité qui sera automatiquement libérée après votre événement.</p>
              </div>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${swiklyLink}" class="button">
                  🔐 Compléter ma caution Swikly
                </a>
              </div>

              <div class="info-box">
                <h3 style="margin-top: 0; color: #6366F1;">Comment fonctionne Swikly ?</h3>
                <ol style="margin: 10px 0; padding-left: 20px;">
                  <li style="margin-bottom: 10px;">Cliquez sur le bouton ci-dessus</li>
                  <li style="margin-bottom: 10px;">Entrez vos coordonnées bancaires de manière sécurisée</li>
                  <li style="margin-bottom: 10px;">Une empreinte de 500€ est créée (aucun débit)</li>
                  <li style="margin-bottom: 10px;">L'empreinte est libérée 48h après votre événement</li>
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
                <li>💰 Total : ${(booking.totalCents / 100).toFixed(2)}€</li>
              </ul>
              
              <p style="margin-top: 25px;"><strong>Besoin d'aide ?</strong></p>
              <p>Notre équipe est disponible :</p>
              <ul>
                <li>📞 Téléphone : <a href="tel:+590690123456" style="color: #0EA5E9;">0690 12 34 56</a></li>
                <li>📧 Email : <a href="mailto:contact@coolslush.gp" style="color: #0EA5E9;">contact@coolslush.gp</a></li>
              </ul>
              
              <p style="margin-top: 30px;">À très bientôt,<br><strong>L'équipe Cool'Slush</strong></p>
            </div>
            
            <div class="footer">
              <p>Cool'Slush Guadeloupe - Location de machines à granité professionnelles</p>
              <p style="font-size: 0.8em; color: #94a3b8; margin-top: 10px;">
                Vous recevez cet email car vous avez effectué une réservation sur coolslush.gp
              </p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
Cool'Slush Guadeloupe - Sécurisez votre réservation

Bonjour ${booking.customerName},

Votre réservation #${booking.id.slice(-8)} pour le ${bookingDate} est presque finalisée !

Une dernière étape : sécurisez votre location avec une empreinte bancaire Swikly de 500€.

⚠️ IMPORTANT : Aucun débit ne sera effectué
Il s'agit uniquement d'une empreinte de sécurité qui sera automatiquement libérée après votre événement.

COMPLÉTER MA CAUTION SWIKLY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Cliquez sur ce lien : ${swiklyLink}

COMMENT FONCTIONNE SWIKLY ?
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. Cliquez sur le lien ci-dessus
2. Entrez vos coordonnées bancaires de manière sécurisée
3. Une empreinte de 500€ est créée (aucun débit)
4. L'empreinte est libérée 48h après votre événement

RÉCAPITULATIF DE VOTRE RÉSERVATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Date : ${bookingDate}
Horaires : ${booking.startHour.toString().padStart(2, '0')}:00 - ${booking.endHour.toString().padStart(2, '0')}:00
Machines : ${booking.machines} machine${booking.machines > 1 ? 's' : ''}
Total : ${(booking.totalCents / 100).toFixed(2)}€

BESOIN D'AIDE ?
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Téléphone : 0690 12 34 56
Email : contact@coolslush.gp

À très bientôt,
L'équipe Cool'Slush

Cool'Slush Guadeloupe - Guadeloupe, Antilles Françaises
      `,
    });

  } catch (error) {
    console.error('Error sending Swikly email:', error);
  }
}

export async function sendFollowUpEmail(booking: Booking): Promise<void> {
  try {
    const transporter = await getTransporter();
    const fromEmail = process.env.EMAIL_FROM || 'Cool\'Slush Guadeloupe <noreply@coolslush.gp>';

    await transporter.sendMail({
      from: fromEmail,
      to: booking.customerEmail,
      subject: `⭐ Merci pour votre confiance - Cool'Slush`,
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
              <p>Nous espérons que votre événement s'est merveilleusement bien passé et que vos invités ont adoré les granités !</p>
              
              <p><strong>Votre avis compte :</strong></p>
              <p>Prenez quelques secondes pour nous laisser un avis et aider d'autres personnes à découvrir Cool'Slush.</p>
              
              <p><strong>💰 Caution Swikly :</strong></p>
              <p>Votre caution a été libérée automatiquement. Vous ne serez pas débité.</p>
              
              <p><strong>🎉 Location future ?</strong></p>
              <p>Profitez de 10% de réduction sur votre prochaine réservation avec le code : <strong>COOLSLUSH10</strong></p>
              
              <p>Au plaisir de vous revoir bientôt,<br><strong>L'équipe Cool'Slush</strong></p>
              
              <p style="text-align: center; margin-top: 30px;">
                <a href="tel:+590690123456" style="color: #0EA5E9;">0690 12 34 56</a> • 
                <a href="mailto:contact@coolslush.gp" style="color: #0EA5E9;">contact@coolslush.gp</a>
              </p>
            </div>
            
            <div class="footer">
              <p>Cool'Slush Guadeloupe</p>
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
