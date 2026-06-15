<?php
declare(strict_types=1);

header('Content-Type: application/json');

function clean_ff_json_field(string $value): string
{
    return trim(str_replace(["\r", "\n"], ' ', $value));
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode([
        'status' => 'error',
        'message' => 'Invalid request method.',
    ]);
    exit;
}

$phone = isset($_POST['phone']) ? clean_ff_json_field((string) $_POST['phone']) : '';
$email = isset($_POST['email']) ? clean_ff_json_field((string) $_POST['email']) : '';

if ($phone === '' && $email === '') {
    http_response_code(400);
    echo json_encode([
        'status' => 'error',
        'message' => 'Please share your phone number or email.',
    ]);
    exit;
}

$fields = [];
foreach ($_POST as $key => $value) {
    if (is_array($value)) {
        continue;
    }

    $label = ucwords(str_replace(['_', '-'], ' ', (string) $key));
    $fields[] = $label . ': ' . clean_ff_json_field((string) $value);
}

$to = 'familyandflats.adsonline@gmail.com, crm@adsbazaar.in';
$subject = 'New Family&Flats Contact Form Submission';
$message = "A new enquiry was submitted on familyandflats.com.\n\n" . implode("\n", $fields);
$headers = "From: Family&Flats <no-reply@familyandflats.com>\r\n";

if (filter_var($email, FILTER_VALIDATE_EMAIL)) {
    $headers .= 'Reply-To: ' . $email . "\r\n";
}

if (!mail($to, $subject, $message, $headers)) {
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => 'Mail sending failed. Please call us or try again.',
    ]);
    exit;
}

echo json_encode([
    'status' => 'success',
    'message' => 'Thank you! Your message has been sent.',
]);
