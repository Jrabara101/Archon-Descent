// Minimal inline pure-JS zip reader using standard browser DecompressionStream

export interface ZipExtractedFile {
  filename: string;
  blob: Blob;
}

export async function extractPngsFromZip(zipFile: File): Promise<ZipExtractedFile[]> {
  const buffer = await zipFile.arrayBuffer();
  const view = new DataView(buffer);
  const bytes = new Uint8Array(buffer);
  const results: ZipExtractedFile[] = [];

  let offset = 0;
  const totalLength = buffer.byteLength;

  while (offset + 30 <= totalLength) {
    const signature = view.getUint32(offset, true);

    // Local file header signature 0x04034b50
    if (signature !== 0x04034b50) {
      break;
    }

    const flags = view.getUint16(offset + 6, true);
    const compressionMethod = view.getUint16(offset + 8, true);
    const compressedSize = view.getUint32(offset + 18, true);
    const uncompressedSize = view.getUint32(offset + 22, true);
    const fileNameLength = view.getUint16(offset + 26, true);
    const extraFieldLength = view.getUint16(offset + 28, true);

    const fileNameBytes = bytes.subarray(offset + 30, offset + 30 + fileNameLength);
    const filename = new TextDecoder().decode(fileNameBytes);

    const dataStart = offset + 30 + fileNameLength + extraFieldLength;
    const isPng = filename.toLowerCase().endsWith('.png') && !filename.startsWith('__MACOSX/') && !filename.startsWith('.');

    if (isPng && compressedSize > 0) {
      const compressedData = bytes.subarray(dataStart, dataStart + compressedSize);

      try {
        let fileBlob: Blob;

        if (compressionMethod === 0) {
          // Stored (no compression)
          fileBlob = new Blob([compressedData], { type: 'image/png' });
          results.push({ filename, blob: fileBlob });
        } else if (compressionMethod === 8) {
          // Deflate
          if (typeof DecompressionStream !== 'undefined') {
            const ds = new DecompressionStream('deflate-raw');
            const writer = ds.writable.getWriter();
            writer.write(compressedData);
            writer.close();

            const response = new Response(ds.readable);
            const decompressedBuffer = await response.arrayBuffer();
            fileBlob = new Blob([decompressedBuffer], { type: 'image/png' });
            results.push({ filename, blob: fileBlob });
          } else {
            console.warn('DecompressionStream not available in this browser environment');
          }
        }
      } catch (err) {
        console.warn(`Failed to decompress file ${filename} in zip:`, err);
      }
    }

    offset = dataStart + compressedSize;
  }

  if (results.length === 0) {
    throw new Error('No valid PNG images found in zip or format could not be decompressed. Please drop loose PNG files instead.');
  }

  return results;
}
