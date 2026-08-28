<?php
// Copy this file to config.php (same folder) and fill in your real values.
// config.php is gitignored — it must never be committed since it holds a secret key.

// Brevo (formerly Sendinblue) API key. Create one at:
// Brevo dashboard > Settings (gear icon) > SMTP & API > API Keys > Generate a new API key
define('BREVO_API_KEY', 'your-brevo-api-key-here');

// The "from" address the email is sent as. This must be a sender you've
// verified in Brevo (Settings > Senders, Domains & Dedicated IPs > Senders).
define('CONTACT_FROM_EMAIL', 'contact@petaledinvis.ro');
define('CONTACT_FROM_NAME', 'Petale din Vis — formular de contact');

// Where contact-form messages should land.
define('CONTACT_TO_EMAIL', 'contact@petaledinvis.ro');
define('CONTACT_TO_NAME', 'Petale din Vis');
