<?php
header("Content-Type: application/json"); // Return JSON to JS

if ($_SERVER["REQUEST_METHOD"] === "POST") {
    $phone = $_POST["phone"] ?? '';
    $email = $_POST["email"] ?? '';

    if (empty($phone)) {
        echo json_encode([
            "status" => "error",
            "message" => "Phone number is required."
        ]);
        exit;
    }

    $to = "familyandflats.adsonline@gmail.com"; // Your email
    $subject = "New Contact Form Submission";
    $message = "Phone Number: " . $phone . "\nEmail Address: " . $email;
    $headers = "From: Ireo-Skyon@familyandflats.com";

    if (mail($to, $subject, $message, $headers)) {
        echo json_encode([
            "status" => "success",
            "message" => "Thank you! Your message has been sent."
        ]);
    } else {
        echo json_encode([
            "status" => "error",
            "message" => "Mail sending failed. Please try again."
        ]);
    }
} else {
    echo json_encode([
        "status" => "error",
        "message" => "Invalid request method."
    ]);
}
