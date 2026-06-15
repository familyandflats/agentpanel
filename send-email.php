<?php
declare(strict_types=1);

function clean_ff_field(string $value): string
{
    return trim(str_replace(["\r", "\n"], ' ', $value));
}

function ff_post_value(string $key): string
{
    return isset($_POST[$key]) ? clean_ff_field((string) $_POST[$key]) : '';
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo 'Invalid request method.';
    exit;
}

$fields = [];
foreach ($_POST as $key => $value) {
    if (is_array($value)) {
        continue;
    }

    $label = ucwords(str_replace(['_', '-'], ' ', (string) $key));
    $fields[] = $label . ': ' . clean_ff_field((string) $value);
}

$email = ff_post_value('email');
$name = ff_post_value('name');

$to = 'familyandflats.adsonline@gmail.com, crm@adsbazaar.in';
$subject = 'New Family&Flats Enquiry';
$message = "A new enquiry was submitted on familyandflats.com.\n\n" . implode("\n", $fields);

$headers = "From: Family&Flats <no-reply@familyandflats.com>\r\n";
if (filter_var($email, FILTER_VALIDATE_EMAIL)) {
    $replyName = $name !== '' ? $name : 'Family&Flats Enquiry';
    $headers .= 'Reply-To: ' . clean_ff_field($replyName) . ' <' . $email . ">\r\n";
}

if (!mail($to, $subject, $message, $headers)) {
    http_response_code(500);
    echo 'Error! Failed to send message.';
    exit;
}

header('Location: /thank-you.php');
exit;
