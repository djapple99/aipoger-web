export function mp3Frames(rates=[9,14,7,9]) {
 const kbps=[0,32,40,48,56,64,80,96,112,128,160,192,224,256,320];
 return new Uint8Array(Buffer.concat(rates.map(index=>{const data=Buffer.alloc(Math.floor(144000*kbps[index]/44100));data.set([255,251,index<<4,0]);return data;})));
}
