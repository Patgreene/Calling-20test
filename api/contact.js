// File: /api/contact.js

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { name, email, comment } = req.body;

    // Basic validation
    if (!name || !email || !comment) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: "Invalid email format" });
    }

    // Log the contact form submission
    console.log("Contact form submission:", {
      name,
      email,
      comment,
      timestamp: new Date().toISOString(),
    });

    // For now, we'll use your Make.com webhook to send the email
    // You can set up a Make.com scenario to receive contact form data and send emails
    const makeWebhookUrl = process.env.CONTACT_WEBHOOK_URL;

    if (makeWebhookUrl) {
      const payload = {
        type: "contact_form",
        name: name,
        email: email,
        message: comment,
        timestamp: new Date().toISOString(),
        recipient: "patrick@vouchprofile.com",
      };

      try {
        const makeResponse = await fetch(makeWebhookUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });

        const responseText = await makeResponse.text();
        console.log("Make.com contact response:", makeResponse.status, responseText);

        if (makeResponse.ok) {
          return res.status(200).json({ message: "Message sent successfully" });
        } else {
          console.error("Make.com error:", responseText);
          // Still return success to user, but log the error
          return res.status(200).json({ 
            message: "Message received successfully",
            note: "Email delivery pending"
          });
        }
      } catch (makeError) {
        console.error("Error sending to Make.com:", makeError);
        // Still return success to user, but log the error
        return res.status(200).json({ 
          message: "Message received successfully",
          note: "Email delivery pending"
        });
      }
    }

    // If no webhook URL is configured, just log and return success
    return res.status(200).json({ 
      message: "Message received successfully",
      note: "Contact form logged, email setup pending"
    });

  } catch (error) {
    console.error("Error processing contact form:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
