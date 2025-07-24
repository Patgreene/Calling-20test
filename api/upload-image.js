// File: /api/upload-image.js

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { imageData, fileName = "id-photo.jpg" } = req.body;

    if (!imageData) {
      return res.status(400).json({ error: "No image data provided" });
    }

    // Remove data URL prefix if present (data:image/jpeg;base64,)
    const base64Data = imageData.replace(/^data:image\/[a-z]+;base64,/, "");

    // For now, we'll use a simple approach with Cloudinary
    // You can replace this with your preferred image hosting service
    
    // Option 1: Upload to Cloudinary (recommended)
    if (process.env.CLOUDINARY_URL) {
      const cloudinary = require('cloudinary').v2;
      
      try {
        const result = await cloudinary.uploader.upload(
          `data:image/jpeg;base64,${base64Data}`,
          {
            folder: "vouch-ids",
            public_id: `id-${Date.now()}`,
            resource_type: "image"
          }
        );
        
        return res.status(200).json({ 
          success: true, 
          url: result.secure_url,
          publicId: result.public_id
        });
      } catch (cloudinaryError) {
        console.error("Cloudinary upload failed:", cloudinaryError);
        // Fall through to base64 data URL approach
      }
    }

    // Option 2: Convert to data URL (fallback - not ideal for production)
    const dataUrl = `data:image/jpeg;base64,${base64Data}`;
    
    // For a production app, you'd want to upload to a proper storage service
    // This is a temporary solution that just returns the data URL
    return res.status(200).json({ 
      success: true, 
      url: dataUrl,
      note: "Using data URL - consider setting up Cloudinary for production"
    });

  } catch (error) {
    console.error("Error processing image:", error);
    return res.status(500).json({ 
      error: "Failed to process image", 
      details: error.message 
    });
  }
}
