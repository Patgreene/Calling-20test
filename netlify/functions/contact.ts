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
    const { name, email, message } = requestBody;

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

    // Log the contact form submission
    console.log("📧 Contact form submission:", {
      name,
      email,
      message: message.substring(0, 100) + "...",
    });

    // Here you could integrate with email service, save to database, etc.
    // For now, just return success

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
