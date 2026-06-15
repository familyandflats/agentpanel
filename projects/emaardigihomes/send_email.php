<?php
if ($_SERVER["REQUEST_METHOD"] == "POST") {
    $phone = $_POST["phone"];
    $email = $_POST["email"];

    $to = "familyandflats.adsonline@gmail.com, crm@adsbazaar.in"; // ✅ Yaha apna email daala hai
    $subject = "New Contact Form Submission";
    $message = "Phone Number: " . $phone . "\nEmail Address: " . $email;
    $headers = "From: Ireo-Grand-Arch@familyandflats.com";

    if (mail($to, $subject, $message, $headers)) {
        header("Location: thank-you.php"); // ✅ Redirect to Thank You Page
        exit();
    } else {
        echo "Error! Failed to send message.";
    }
} else {
    echo "Invalid Request!";
}
?>

