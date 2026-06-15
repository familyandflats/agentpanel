<?php
if ($_SERVER["REQUEST_METHOD"] == "POST") {
    // Form fields
    $phone = htmlspecialchars($_POST["phone"]);
    $email = htmlspecialchars($_POST["email"]);

    // Receiver Email Address
    $to = "familyandflats.adsonline@gmail.com"; // अपना ईमेल डालें
    $subject = "New Inquiry from Popup Form";

    // Email Message Body
    $message = "You have received a new inquiry.\n\n";
    $message .= "📞 Phone: $phone\n";
    $message .= "✉ Email: $email\n";
    
    // Email Headers
    $headers = "From: Ireo-Skyon@familyandflats.com\r\n";
    $headers .= "Reply-To: $email\r\n";
    
    // Send Email
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
