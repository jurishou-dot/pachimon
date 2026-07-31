import fs from 'fs';
import { join } from 'path';
import { createCanvas, loadImage } from '@napi-rs/canvas';

// Configuration of coordinates
const srcFile = 'C:\\Users\\juris\\.gemini\\antigravity-ide\\brain\\5b9581f9-0c80-492b-ac46-afafe80c4087\\media__1785472602184.jpg';
const destFolder = join(process.cwd(), 'assets/monster');

// Mapping grid to monster No
const mapping = [
  { row: 0, col: 0, no: 3, name: 'たかし' },
  { row: 0, col: 1, no: 30, name: 'よしこ' },
  { row: 0, col: 2, no: 16, name: 'けんじ' },
  { row: 0, col: 3, no: 25, name: 'まさる' },
  { row: 1, col: 0, no: 15, name: 'えみ' },
  { row: 1, col: 1, no: 23, name: 'たえこ' },
  { row: 1, col: 2, no: 22, name: 'しげる' },
  { row: 1, col: 3, no: 14, name: 'のりお' },
  { row: 2, col: 0, no: 9, name: 'さとる' },
  { row: 2, col: 1, no: 12, name: 'ひろし' },
  { row: 2, col: 2, no: 8, name: 'じゅんいち' },
  { row: 2, col: 3, no: 17, name: 'のりこ' },
  { row: 3, col: 0, no: 18, name: 'ゆうた' },
  { row: 3, col: 1, no: 27, name: 'あきお' },
  { row: 3, col: 2, no: 20, name: 'ちえこ' },
  { row: 3, col: 3, no: 11, name: 'つよし' }
];

async function cropIcons() {
  try {
    if (!fs.existsSync(srcFile)) {
      throw new Error(`Source image not found: ${srcFile}`);
    }

    console.log('🖼️ Loading source sheet...');
    const image = await loadImage(srcFile);
    const imgW = image.width;
    const imgH = image.height;
    
    const cellW = imgW / 4;
    const cellH = imgH / 4;

    console.log(`Dimensions: ${imgW}x${imgH}. Cell size: ${cellW}x${cellH}`);

    // Make sure dest folder exists
    if (!fs.existsSync(destFolder)) {
      fs.mkdirSync(destFolder, { recursive: true });
    }

    for (const item of mapping) {
      // Calculate crop coordinates
      const sx = item.col * cellW;
      const sy = item.row * cellH;

      // Create a cell canvas
      const canvas = createCanvas(cellW, cellH);
      const ctx = canvas.getContext('2d');

      // Draw the cropped portion
      ctx.drawImage(image, sx, sy, cellW, cellH, 0, 0, cellW, cellH);

      // Write to file as PNG
      const destPath = join(destFolder, `${item.no}.png`);
      const buffer = canvas.toBuffer('image/png');
      fs.writeFileSync(destPath, buffer);
      
      console.log(`✅ Saved ${item.name} -> No.${item.no}.png`);
    }

    console.log('🎉 Successfully cropped all 16 icons!');
  } catch (error) {
    console.error('❌ Failed cropping icons:', error);
  }
}

cropIcons();
