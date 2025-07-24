// File: /api/submit-vouch.js

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // Extract data sent from the front end
    const { vouchForm, vouchSummary, vouchID } = req.body;

    // Log the received data for debugging
    console.log("Received data from frontend:", {
      vouchForm,
      vouchSummary: vouchSummary
        ? `${vouchSummary.substring(0, 100)}...`
        : "empty",
      vouchID: vouchID ? "present" : "not present",
    });

    // Prepare comprehensive data payload for Make.com
    const payload = {
      // Form data with individual fields
      fullName: vouchForm?.fullName || "",
      yourEmail: vouchForm?.yourEmail || "",
      vouchingFor: vouchForm?.vouchingFor || "",
      theirEmail: vouchForm?.theirEmail || "",

      // Complete form object for flexibility
      vouchForm: vouchForm || {},

      // Vouch summary/transcript
      vouchSummary: vouchSummary || "",

      // ID photo (base64 data or empty string)
      vouchID: vouchID || "",

      // Metadata
      timestamp: new Date().toISOString(),
      source: "vouch-app",
    };

    console.log("Sending payload to Make.com:", {
      ...payload,
      vouchSummary: payload.vouchSummary
        ? `${payload.vouchSummary.substring(0, 100)}...`
        : "empty",
      vouchID: payload.vouchID ? "present" : "not present",
    });

    // Send the data to your Make.com webhook
    const makeWebhookUrl =
      "https://hook.eu2.make.com/6u7fsl4v8twtk92xr42pvxm3l922rm7q";

    const makeResponse = await fetch(makeWebhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const responseText = await makeResponse.text();
    console.log("Make.com response:", makeResponse.status, responseText);

    if (!makeResponse.ok) {
      throw new Error(
        `Make.com responded with status ${makeResponse.status}: ${responseText}`,
      );
    }

    return res.status(200).json({ success: true, makeResponse: responseText });
  } catch (error) {
    console.error("Error submitting to Make.com:", error);
    return res
      .status(500)
      .json({ error: "Failed to submit data", details: error.message });
  }
}
