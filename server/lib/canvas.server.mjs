export function imageDataToBMP(imageData, width, height) {
  const fileHeaderSize = 14;
  const dibHeaderSize = 40;
  const paletteSize = 8; // 2 colors * 4 bytes each
  const bitsPerPixel = 1;

  // Calculate row size with padding to a multiple of 4 bytes
  const rowSize = Math.floor((bitsPerPixel * width + 31) / 32) * 4;
  const pixelArraySize = rowSize * height;
  const fileSize = fileHeaderSize + dibHeaderSize + paletteSize + pixelArraySize;

  const bmpBuffer = Buffer.alloc(fileSize);

  // BMP File Header
  bmpBuffer.write('BM', 0); // Signature
  bmpBuffer.writeUInt32LE(fileSize, 2); // File size
  bmpBuffer.writeUInt16LE(0, 6); // Reserved
  bmpBuffer.writeUInt16LE(0, 8); // Reserved
  bmpBuffer.writeUInt32LE(fileHeaderSize + dibHeaderSize + paletteSize, 10); // Pixel data offset

  // DIB Header (BITMAPINFOHEADER)
  bmpBuffer.writeUInt32LE(dibHeaderSize, 14); // DIB header size
  bmpBuffer.writeInt32LE(width, 18); // Image width
  bmpBuffer.writeInt32LE(height, 22); // Image height
  bmpBuffer.writeUInt16LE(1, 26); // Planes
  bmpBuffer.writeUInt16LE(bitsPerPixel, 28); // Bits per pixel
  bmpBuffer.writeUInt32LE(0, 30); // Compression (BI_RGB)
  bmpBuffer.writeUInt32LE(pixelArraySize, 34); // Image size
  bmpBuffer.writeInt32LE(5110, 38); // X pixels per meter (DPI 130)
  bmpBuffer.writeInt32LE(5110, 42); // Y pixels per meter (DPI 130)
  bmpBuffer.writeUInt32LE(0, 46); // Total colors
  bmpBuffer.writeUInt32LE(0, 50); // Important colors

  // Color Palette (2 colors for monochrome)
  // White (Index 0)
  bmpBuffer.writeUInt8(0xFF, 54); // Blue
  bmpBuffer.writeUInt8(0xFF, 55); // Green
  bmpBuffer.writeUInt8(0xFF, 56); // Red
  bmpBuffer.writeUInt8(0x00, 57); // Reserved
  // Black (Index 1)
  bmpBuffer.writeUInt8(0x00, 58); // Blue
  bmpBuffer.writeUInt8(0x00, 59); // Green
  bmpBuffer.writeUInt8(0x00, 60); // Red
  bmpBuffer.writeUInt8(0x00, 61); // Reserved

  // Pixel Data (packed bits)
  const pixelDataOffset = fileHeaderSize + dibHeaderSize + paletteSize;
  for (let y = 0; y < height; y++) {
    let rowOffset = pixelDataOffset + (height - y - 1) * rowSize;
    let bitBuffer = 0;
    let bitCount = 0;

    for (let x = 0; x < width; x++) {
      const srcIndex = (y * width + x) * 4;
      const r = imageData.data[srcIndex];
      const g = imageData.data[srcIndex + 1];
      const b = imageData.data[srcIndex + 2];
      const a = imageData.data[srcIndex + 3];

      // Handle transparency: treat transparent pixels as white
      let bit;
      if (a < 128) {
        bit = 0; // White
      } else {
        const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
        bit = luminance < 128 ? 1 : 0; // Black if luminance < 128
      }

      bitBuffer = (bitBuffer << 1) | bit;
      bitCount++;

      if (bitCount === 8) {
        bmpBuffer[rowOffset++] = bitBuffer;
        bitBuffer = 0;
        bitCount = 0;
      }
    }

    // If the last byte is not complete, pad it with zeros (white)
    if (bitCount > 0) {
      bitBuffer = bitBuffer << (8 - bitCount);
      bmpBuffer[rowOffset++] = bitBuffer;
    }

    // Padding for 4-byte alignment
    while ((rowOffset - pixelDataOffset) % 4 !== 0) {
      bmpBuffer[rowOffset++] = 0x00;
    }
  }

  return bmpBuffer;
}

export function drawCenteredText(ctx, message, width, height, fontSize = 16, lineSpacing = 1.2) {
  ctx.font = `${fontSize}px 'PixelOperator'`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "black";

  // Split the message into initial words for wrapping
  const words = message.split(/\s+/);
  const lines = [];
  let currentLine = words[0];

  // Word wrapping logic
  for (let i = 1; i < words.length; i++) {
    const word = words[i];
    const testLine = `${currentLine} ${word}`;
    const testWidth = ctx.measureText(testLine).width;

    if (testWidth > width) {
      // If line exceeds the width, push the current line and start a new one
      lines.push(currentLine);
      currentLine = word;

      // Stop if we reach the maximum number of lines
      if (lines.length === 4) { // 4 lines already added, 5th line for truncation check
        currentLine = `${currentLine}...`;
        break;
      }
    } else {
      // Add word to the current line if it fits
      currentLine = testLine;
    }
  }
  lines.push(currentLine); // Push the final line

  // Truncate to a maximum of 5 lines
  if (lines.length > 5) {
    lines[4] = `${lines[4]}...`; // Add ellipsis to the last visible line
    lines.length = 5; // Limit to 5 lines
  }

  // Calculate the height for each line and the total text block height
  const lineHeight = fontSize * lineSpacing;
  const textBlockHeight = lines.length * lineHeight;

  // Start drawing from a vertically centered Y position
  const startY = (height - textBlockHeight) / 2 + lineHeight / 2;

  // Draw each line centered horizontally
  lines.forEach((line, index) => {
    const yPosition = startY + index * lineHeight;
    ctx.fillText(line, width / 2, yPosition);
  });
}
