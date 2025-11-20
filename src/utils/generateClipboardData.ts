import { Buffer } from 'buffer/';
import _ from 'lodash';
import pako from 'pako';
import struct from 'python-struct';
import { Message, Schema } from '../kiwi/schema';

/**
 * a handy hook to process clipboard data automatically
 * @returns fig data extracted
 */
export const generateClipboardData = (
  uint8FigHeader: Uint8Array,
  schemaSize: number,
  compressedSchema: Uint8Array,
  decodedMeta: any,
  schema: Schema,
  data: Message,
) => {
  /**
   * initialize
   */
  const generated = {
    encodedModifiedData: new Uint8Array([]),
    compressedModifiedData: new Uint8Array([]),
    exportedData: '',
    exportedClipboardData: '',
  };

  //TODO - add more checks
  if (_.isEmpty(schema) || _.isEmpty(data)) {
    return generated;
  }

  // to tell figma it's new data
  decodedMeta.pasteID = 0;

  //STUB - type with pre-extracted schema
  generated.encodedModifiedData = new Uint8Array(schema.encodeMessage(data));

  // write binary fig data
  generated.compressedModifiedData = new Uint8Array(pako.deflateRaw(
    generated.encodedModifiedData,
  ));
  
  // Calculate total size
  const schemaSizePacked = struct.pack('<I', schemaSize);
  const compressedSizePacked = struct.pack('<I', generated.compressedModifiedData.length);
  const totalSize = uint8FigHeader.length + schemaSizePacked.length + compressedSchema.length + 
                    compressedSizePacked.length + generated.compressedModifiedData.length;
  
  // Use Uint8Array to avoid stack overflow
  const toExport = new Uint8Array(totalSize);
  let offset = 0;
  
  toExport.set(uint8FigHeader, offset);
  offset += uint8FigHeader.length;
  
  toExport.set(schemaSizePacked, offset);
  offset += schemaSizePacked.length;
  
  toExport.set(compressedSchema, offset);
  offset += compressedSchema.length;
  
  toExport.set(compressedSizePacked, offset);
  offset += compressedSizePacked.length;
  
  toExport.set(generated.compressedModifiedData, offset);
  
  const exported = Buffer.from(toExport);

  // create base64 fig data
  generated.exportedData = exported.toString('base64');

  console.log('decodedMeta', generated);

  // generate the clipboard data
  generated.exportedClipboardData = `<meta charset='utf-8'><meta charset="utf-8"><span data-metadata="<!--(figmeta)${Buffer.from(
    JSON.stringify(decodedMeta),
  ).toString('base64')}(/figmeta)-->"></span><span data-buffer="<!--(figma)${
    generated.exportedData
  }(/figma)-->"></span><span style="white-space:pre-wrap;"></span>`;

  return generated;
};
