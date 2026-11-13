// A valid 1x1 RGBA PNG generated in memory for upload tests, not a user photo.
const {deflateSync}=require('node:zlib');
function crc32(data){let crc=0xffffffff;for(const byte of data){crc^=byte;for(let n=0;n<8;n++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}return (crc^0xffffffff)>>>0;}
function chunk(type,data){const name=Buffer.from(type),length=Buffer.alloc(4),crc=Buffer.alloc(4);length.writeUInt32BE(data.length);crc.writeUInt32BE(crc32(Buffer.concat([name,data])));return Buffer.concat([length,name,data,crc]);}
const header=Buffer.alloc(13);header.writeUInt32BE(1,0);header.writeUInt32BE(1,4);header[8]=8;header[9]=6;
module.exports=Buffer.concat([Buffer.from('89504e470d0a1a0a','hex'),chunk('IHDR',header),chunk('IDAT',deflateSync(Buffer.from([0,104,152,93,255]))),chunk('IEND',Buffer.alloc(0))]);
