const express = require("express");
const cors = require("cors");
const path = require("path");

const app = express();
const PORT = 8081;

// Enable CORS
app.use(cors());
app.use(express.json());

// Simple function to import and run Netlify functions
async function runNetlifyFunction(functionName, event) {
  try {
    const funcPath = path.join(
      __dirname,
      "netlify",
      "functions",
      `${functionName}.ts`,
    );

    // For development, we'll use a simple require approach
    // In a real setup, you'd want to use ts-node or compile the functions
    const { handler } = require(funcPath.replace(".ts", ".js"));

    if (!handler) {
      throw new Error(`Handler not found in ${functionName}`);
    }

    return await handler(event, {});
  } catch (error) {
    console.error(`Error running function ${functionName}:`, error);
    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({ error: `Function error: ${error.message}` }),
    };
  }
}

// Mock Netlify function routes
app.all("/api/admin/recordings/:id/download", async (req, res) => {
  const event = {
    httpMethod: req.method,
    path: req.path,
    headers: req.headers,
    queryStringParameters: req.query,
    body: JSON.stringify(req.body),
    isBase64Encoded: false,
  };

  const result = await runNetlifyFunction("admin-download", event);

  Object.keys(result.headers || {}).forEach((key) => {
    res.setHeader(key, result.headers[key]);
  });

  res.status(result.statusCode).send(result.body);
});

app.all("/api/admin/recordings", async (req, res) => {
  const event = {
    httpMethod: req.method,
    path: req.path,
    headers: req.headers,
    queryStringParameters: req.query,
    body: JSON.stringify(req.body),
    isBase64Encoded: false,
  };

  const result = await runNetlifyFunction("admin-recordings", event);

  Object.keys(result.headers || {}).forEach((key) => {
    res.setHeader(key, result.headers[key]);
  });

  res.status(result.statusCode).send(result.body);
});

// Add more routes as needed...

app.listen(PORT, () => {
  console.log(
    `🔧 Development Netlify Functions Server running on http://localhost:${PORT}`,
  );
  console.log("📡 Available endpoints:");
  console.log("  - /api/admin/recordings");
  console.log("  - /api/admin/recordings/:id/download");
});
