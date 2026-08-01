// Avatars are stored inline on the user document, so they are downscaled in the
// browser before upload. 256 px is comfortably larger than the biggest place
// the avatar is rendered (44 px at 2× DPI), and keeps the encoded string small.
const MAX_DIMENSION = 256;
const JPEG_QUALITY = 0.85;

// Rejected before any decoding is attempted — a 40 MB file should fail fast
// with a clear message rather than after the browser tries to decode it.
const MAX_SOURCE_BYTES = 8 * 1024 * 1024;

const ACCEPTED_TYPES = ["image/png", "image/jpeg", "image/jpg", "image/webp"];

/**
 * Reads an image file and returns a downscaled, square-cropped data URL.
 *
 * SVG is deliberately not accepted: it can carry script, and it would be
 * rendered from an <img src> on other users' screens in the admin user list.
 */
export async function fileToAvatarDataUrl(file) {
  if (!file) {
    throw new Error("No file selected.");
  }

  if (!ACCEPTED_TYPES.includes(file.type)) {
    throw new Error("Please choose a PNG, JPEG or WebP image.");
  }

  if (file.size > MAX_SOURCE_BYTES) {
    throw new Error("That image is larger than 8 MB. Please choose a smaller file.");
  }

  const objectUrl = URL.createObjectURL(file);

  try {
    const image = await loadImage(objectUrl);

    // Centre-crop to a square first so the circular avatar never distorts a
    // non-square photo by stretching it.
    const side = Math.min(image.width, image.height);
    const sourceX = (image.width - side) / 2;
    const sourceY = (image.height - side) / 2;
    const targetSide = Math.min(side, MAX_DIMENSION);

    const canvas = document.createElement("canvas");
    canvas.width = targetSide;
    canvas.height = targetSide;

    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("Your browser could not process this image.");
    }

    context.imageSmoothingQuality = "high";
    context.drawImage(image, sourceX, sourceY, side, side, 0, 0, targetSide, targetSide);

    // PNG preserves transparency; everything else is far smaller as JPEG.
    const mimeType = file.type === "image/png" ? "image/png" : "image/jpeg";
    return canvas.toDataURL(mimeType, JPEG_QUALITY);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("That file could not be read as an image."));
    image.src = src;
  });
}
