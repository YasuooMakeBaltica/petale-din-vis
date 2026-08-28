<?php
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Metodă neacceptată.']);
    exit;
}

$configPath = __DIR__ . '/config.php';
if (!file_exists($configPath)) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Serverul nu este configurat încă pentru trimiterea de mesaje.']);
    exit;
}
require $configPath;

$name = trim($_POST['name'] ?? '');
$email = trim($_POST['email'] ?? '');
$message = trim($_POST['message'] ?? '');
$company = trim($_POST['company'] ?? ''); // honeypot field, should stay empty

if ($company !== '') {
    // Likely a bot — pretend success without sending anything.
    echo json_encode(['success' => true]);
    exit;
}

if ($name === '' || $email === '' || $message === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    http_response_code(422);
    echo json_encode(['success' => false, 'error' => 'Completează numele, un email valid și un mesaj.']);
    exit;
}

$payload = [
    'sender' => ['name' => CONTACT_FROM_NAME, 'email' => CONTACT_FROM_EMAIL],
    'to' => [['email' => CONTACT_TO_EMAIL, 'name' => CONTACT_TO_NAME]],
    'replyTo' => ['email' => $email, 'name' => $name],
    'subject' => 'Mesaj nou de pe petaledinvis.ro',
    'textContent' => "Nume: {$name}\nEmail: {$email}\n\nMesaj:\n{$message}",
];

$ch = curl_init('https://api.brevo.com/v3/smtp/email');
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST => true,
    CURLOPT_HTTPHEADER => [
        'accept: application/json',
        'api-key: ' . BREVO_API_KEY,
        'content-type: application/json',
    ],
    CURLOPT_POSTFIELDS => json_encode($payload),
    CURLOPT_TIMEOUT => 15,
]);
$response = curl_exec($ch);
$status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curlError = curl_error($ch);
curl_close($ch);

if ($curlError !== '' || $status < 200 || $status >= 300) {
    error_log('Brevo send failed: status=' . $status . ' curl_error=' . $curlError . ' response=' . $response);
    http_response_code(502);
    echo json_encode(['success' => false, 'error' => 'Nu am putut trimite mesajul. Încearcă din nou mai târziu sau scrie-ne direct pe email.']);
    exit;
}

echo json_encode(['success' => true]);
