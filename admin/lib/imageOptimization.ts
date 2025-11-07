/**
 * Image Optimization Utilities for Admin Dashboard
 *
 * Provides functions to compress and optimize images before uploading
 * to Firebase Storage, including WebP conversion and thumbnail generation.
 */

/**
 * Compress image to specified quality
 */
export async function compressImage(
  file: File,
  options: {
    maxWidth?: number;
    maxHeight?: number;
    quality?: number;
    format?: 'webp' | 'jpeg' | 'png';
  } = {}
): Promise<Blob> {
  const {
    maxWidth = 1200,
    maxHeight = 1200,
    quality = 0.8,
    format = 'webp',
  } = options;

  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const img = new Image();

      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;

        // Calculate new dimensions while maintaining aspect ratio
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = width * ratio;
          height = height * ratio;
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }

        // Draw image on canvas
        ctx.drawImage(img, 0, 0, width, height);

        // Convert to blob
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Failed to create blob'));
            }
          },
          `image/${format}`,
          quality
        );
      };

      img.onerror = () => {
        reject(new Error('Failed to load image'));
      };

      img.src = e.target?.result as string;
    };

    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };

    reader.readAsDataURL(file);
  });
}

/**
 * Generate thumbnail from image
 */
export async function generateThumbnail(
  file: File,
  size: number = 150
): Promise<Blob> {
  return compressImage(file, {
    maxWidth: size,
    maxHeight: size,
    quality: 0.7,
    format: 'webp',
  });
}

/**
 * Convert image to WebP format
 */
export async function convertToWebP(file: File, quality: number = 0.8): Promise<Blob> {
  return compressImage(file, {
    quality,
    format: 'webp',
  });
}

/**
 * Validate image file
 */
export function validateImageFile(file: File): { valid: boolean; error?: string } {
  const maxSize = 10 * 1024 * 1024; // 10MB
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: 'Invalid file type. Please upload a JPEG, PNG, or WebP image.',
    };
  }

  if (file.size > maxSize) {
    return {
      valid: false,
      error: 'File size exceeds 10MB. Please upload a smaller image.',
    };
  }

  return { valid: true };
}

/**
 * Get image dimensions
 */
export async function getImageDimensions(
  file: File
): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const img = new Image();

      img.onload = () => {
        resolve({
          width: img.width,
          height: img.height,
        });
      };

      img.onerror = () => {
        reject(new Error('Failed to load image'));
      };

      img.src = e.target?.result as string;
    };

    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };

    reader.readAsDataURL(file);
  });
}

/**
 * Process image upload: compress, convert to WebP, generate thumbnail
 */
export async function processImageUpload(
  file: File
): Promise<{
  optimizedImage: Blob;
  thumbnail: Blob;
  dimensions: { width: number; height: number };
}> {
  // Validate file
  const validation = validateImageFile(file);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  // Get original dimensions
  const dimensions = await getImageDimensions(file);

  // Compress and convert to WebP
  const optimizedImage = await compressImage(file, {
    maxWidth: 1200,
    maxHeight: 1200,
    quality: 0.85,
    format: 'webp',
  });

  // Generate thumbnail
  const thumbnail = await generateThumbnail(file, 150);

  return {
    optimizedImage,
    thumbnail,
    dimensions,
  };
}

/**
 * Create object URL from blob (for preview)
 */
export function createPreviewUrl(blob: Blob): string {
  return URL.createObjectURL(blob);
}

/**
 * Revoke object URL to free memory
 */
export function revokePreviewUrl(url: string): void {
  URL.revokeObjectURL(url);
}
