export const handler = async (event: any, context: any) => {
  // Handle CORS preflight
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
      },
      body: "",
    };
  }

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  try {
    const requestBody = JSON.parse(event.body || "{}");
    const { name, email } = requestBody;
    const message: string = requestBody.message ?? requestBody.comment ?? "";

    if (!name || !email || !message) {
      return {
        statusCode: 400,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
        body: JSON.stringify({
          error: "Name, email, and message are required",
        }),
      };
    }

    const payload = {
      name,
      email,
      message: String(message),
      source: "site-contact",
      timestamp: new Date().toISOString(),
    };

    const webhookUrl = process.env.CONTACT_WEBHOOK_URL;

    if (webhookUrl) {
      const resp = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!resp.ok) {
        const text = await resp.text().catch(() => "");
        throw new Error(`Webhook failed: ${resp.status} ${text}`);
      }
    } else {
      console.warn("CONTACT_WEBHOOK_URL not set; received contact submission", payload);
    }

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
      },
      body: JSON.stringify({
        success: true,
        message: "Thank you for your message. We'll get back to you soon!",
      }),
    };
  } catch (error: any) {
    console.error("💥 Contact form error:", error);
    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({
        error: "Failed to submit contact form",
        message: error.message,
      }),
    };
  }
};
