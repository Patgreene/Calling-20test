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
    const { voucherName, voucherEmail, voucherPhone, voucheeName } =
      requestBody;

    if (!voucherName || !voucherEmail || !voucheeName) {
      return {
        statusCode: 400,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
        body: JSON.stringify({
          error: "Voucher name, email, and vouchee name are required",
        }),
      };
    }

    // Log the vouch submission
    console.log("🤝 Vouch submission:", {
      voucherName,
      voucherEmail,
      voucherPhone,
      voucheeName,
    });

    // Here you could integrate with database, email service, etc.
    // For now, just return success with a unique code

    const vouchCode = `VOUCH-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

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
        message: "Vouch submitted successfully!",
        vouchCode: vouchCode,
        nextSteps:
          "You will receive an email with instructions to complete your vouch.",
      }),
    };
  } catch (error: any) {
    console.error("💥 Submit vouch error:", error);
    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({
        error: "Failed to submit vouch",
        message: error.message,
      }),
    };
  }
};
