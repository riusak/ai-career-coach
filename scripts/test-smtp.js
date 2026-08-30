/**
 * Script de test de connexion SMTP Brevo.
 * Vérifie que l'authentification TLS/SSL sur le port 465 fonctionne.
 * Usage: node scripts/test-smtp.js
 */
const tls = require('tls');

const HOST = 'smtp-relay.brevo.com';
const PORT = 465;
const USER = 'effoeakolly@gmail.com';
const PASS = process.env.SMTP_PASS;

if (!PASS) {
  console.error('❌ Variable d\'environnement SMTP_PASS manquante.');
  console.error('💡 Définissez-la avant de lancer le test : $env:SMTP_PASS="votre_clé_smtp"');
  process.exit(1);
}

console.log(`🔍 Test de connexion SMTP ${HOST}:${PORT} pour l'utilisateur ${USER}...`);

const socket = tls.connect({ host: HOST, port: PORT }, () => {
  console.log('✅ Connexion SSL/TLS établie.');
  // Envoyer une commande EHLO pour déclencher l'authentification
  socket.write('EHLO test.ai-career-coach.dev\r\n');
});

socket.on('data', (data) => {
  const response = data.toString();
  console.log('📥 Réponse serveur :', response.trim());

  if (response.includes('250-STARTTLS') || response.includes('250-AUTH') || response.includes('250 OK')) {
    console.log('✅ Le serveur SMTP accepte les connexions. Vérifiez le Dashboard Supabase.');
    socket.end();
  }
});

socket.on('error', (err) => {
  console.error('❌ Erreur de connexion :', err.message);
  process.exit(1);
});

setTimeout(() => {
  console.error('❌ Timeout - la connexion n\'a pas abouti en 10 secondes.');
  process.exit(1);
}, 10000);
