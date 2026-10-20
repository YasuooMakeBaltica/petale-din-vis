<?php
header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');

// Per-IP limits. The window is a sliding one, so 5 messages in any rolling hour.
const RATE_MAX_PER_WINDOW = 5;
const RATE_WINDOW_SECONDS = 3600;
const MAX_BODY_BYTES = 20000;
const MAX_NAME_LEN = 120;
const MAX_EMAIL_LEN = 254;
const MAX_MESSAGE_LEN = 4000;

function fail(int $status, string $error): void {
    http_response_code($status);
    echo json_encode(['success' => false, 'error' => $error]);
    exit;
}

/**
 * Sliding-window counter kept in a temp file per IP. Fails open: if the
 * filesystem is unavailable we would rather accept a message than break the
 * form for a real customer.
 */
function rate_limit_exceeded(string $ip): bool {
    $dir = sys_get_temp_dir() . '/pdv-ratelimit';
    if (!is_dir($dir) && !@mkdir($dir, 0700, true) && !is_dir($dir)) {
        return false;
    }
    $file = $dir . '/' . hash('sha256', $ip) . '.json';
    $fh = @fopen($file, 'c+');
    if ($fh === false) {
        return false;
    }

    $exceeded = false;
    if (flock($fh, LOCK_EX)) {
        $now = time();
        $cutoff = $now - RATE_WINDOW_SECONDS;
        $stored = json_decode((string) stream_get_contents($fh), true);
        $hits = [];
        if (is_array($stored)) {
            foreach ($stored as $t) {
                if (is_int($t) && $t > $cutoff) {
                    $hits[] = $t;
                }
            }
        }

        $exceeded = count($hits) >= RATE_MAX_PER_WINDOW;
        if (!$exceeded) {
            $hits[] = $now;
        }

        ftruncate($fh, 0);
        rewind($fh);
        fwrite($fh, json_encode($hits));
        fflush($fh);
        flock($fh, LOCK_UN);
    }
    fclose($fh);

    return $exceeded;
}

/** Blocks other sites from posting to this endpoint on a visitor's behalf. */
function origin_allowed(): bool {
    $sent = $_SERVER['HTTP_ORIGIN'] ?? $_SERVER['HTTP_REFERER'] ?? '';
    if ($sent === '') {
        return false;
    }
    // HTTP_HOST carries the port, an Origin header does not, so normalise both
    // through parse_url before comparing.
    $host = parse_url($sent, PHP_URL_HOST);
    $self = parse_url('http://' . (string) ($_SERVER['HTTP_HOST'] ?? ''), PHP_URL_HOST);
    if (!is_string($host) || !is_string($self) || $self === '') {
        return false;
    }
    $host = strtolower($host);
    $self = strtolower($self);

    return $host === $self || $host === 'www.' . $self || 'www.' . $host === $self;
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    fail(405, 'Metodă neacceptată.');
}

if ((int) ($_SERVER['CONTENT_LENGTH'] ?? 0) > MAX_BODY_BYTES) {
    fail(413, 'Mesajul este prea lung.');
}

if (!origin_allowed()) {
    fail(403, 'Cerere respinsă.');
}

$ip = (string) ($_SERVER['REMOTE_ADDR'] ?? '');
if ($ip !== '' && rate_limit_exceeded($ip)) {
    header('Retry-After: ' . RATE_WINDOW_SECONDS);
    fail(429, 'Ai trimis deja câteva mesaje. Încearcă din nou peste o oră.');
}

$configPath = __DIR__ . '/config.php';
if (!file_exists($configPath)) {
    fail(500, 'Serverul nu este configurat încă pentru trimiterea de mesaje.');
}
require $configPath;

$name = trim((string) ($_POST['name'] ?? ''));
$email = trim((string) ($_POST['email'] ?? ''));
$message = trim((string) ($_POST['message'] ?? ''));
$company = trim((string) ($_POST['company'] ?? '')); // honeypot, should stay empty

if ($company !== '') {
    // Likely a bot - pretend success without sending anything.
    echo json_encode(['success' => true]);
    exit;
}

if ($name === '' || $email === '' || $message === ''
    || mb_strlen($name) > MAX_NAME_LEN
    || mb_strlen($email) > MAX_EMAIL_LEN
    || mb_strlen($message) > MAX_MESSAGE_LEN
    || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    fail(422, 'Completează numele, un email valid și un mesaj.');
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
    fail(502, 'Nu am putut trimite mesajul. Încearcă din nou mai târziu sau scrie-ne direct pe email.');
}

echo json_encode(['success' => true]);
