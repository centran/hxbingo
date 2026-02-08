/**
 * Resize and compress an image to appropriate dimensions for a bingo square
 * @param {File|Blob} file - The image file to process
 * @param {number} squareSize - The target square size in pixels (default 200)
 * @returns {Promise<string>} - Data URL of the compressed image
 */
export const compressAndResizeImage = (file, squareSize = 200) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = squareSize;
        canvas.height = squareSize;
        const ctx = canvas.getContext('2d');

        // Fill with white background in case of transparency
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, squareSize, squareSize);

        // Calculate dimensions to fill the square without distortion
        const imgAspect = img.width / img.height;
        let drawWidth = squareSize;
        let drawHeight = squareSize;
        let offsetX = 0;
        let offsetY = 0;

        if (imgAspect > 1) {
          // Image is wider than tall
          drawHeight = squareSize / imgAspect;
          offsetY = (squareSize - drawHeight) / 2;
        } else {
          // Image is taller than wide
          drawWidth = squareSize * imgAspect;
          offsetX = (squareSize - drawWidth) / 2;
        }

        ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);

        // Compress to JPEG with quality setting
        const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.7);
        resolve(compressedDataUrl);
      };
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = event.target.result;
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
};

/**
 * Estimate the size of a data URL in bytes
 * @param {string} dataUrl - The data URL
 * @returns {number} - Approximate size in bytes
 */
export const estimateDataUrlSize = (dataUrl) => {
  // Remove the data URL header to get just the base64 part
  const base64String = dataUrl.split(',')[1];
  if (!base64String) return 0;
  // Base64 is 4/3 the size of the original binary data
  return Math.ceil((base64String.length * 3) / 4);
};

/**
 * Format bytes into a human-readable string
 * @param {number} bytes - Number of bytes
 * @returns {string} - Formatted string
 */
export const formatBytes = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
};
