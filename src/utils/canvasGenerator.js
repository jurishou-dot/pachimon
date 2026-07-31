import { createCanvas, Image, loadImage, GlobalFonts } from '@napi-rs/canvas';
import { join } from 'path';
import { existsSync } from 'fs';
import { MONSTERS, AREAS, WEATHERS } from '../config.js';

// Register Japanese font and Emoji font with system aliases to prevent tofu characters
if (process.platform === 'win32') {
  const winFonts = join(process.env.windir || 'C:\\Windows', 'Fonts');
  const meiryoPath = join(winFonts, 'meiryo.ttc');
  if (existsSync(meiryoPath)) {
    try {
      GlobalFonts.registerFromPath(meiryoPath, 'Segoe UI');
      GlobalFonts.registerFromPath(meiryoPath, 'Arial');
      GlobalFonts.registerFromPath(meiryoPath, 'sans-serif');
    } catch (err) {
      console.error('[CanvasGenerator] Failed to register Meiryo font:', err);
    }
  }
  const emojiPath = join(winFonts, 'seguiemj.ttf');
  if (existsSync(emojiPath)) {
    try {
      GlobalFonts.registerFromPath(emojiPath, 'Segoe UI Emoji');
    } catch (err) {
      console.error('[CanvasGenerator] Failed to register Segoe UI Emoji font:', err);
    }
  }
}

// Text wrapping utility
function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  const words = text.split(''); // Splitting by character for Japanese text
  let line = '';
  let currentY = y;

  for (let n = 0; n < words.length; n++) {
    const testLine = line + words[n];
    const metrics = ctx.measureText(testLine);
    const testWidth = metrics.width;
    
    if (testWidth > maxWidth && n > 0) {
      ctx.fillText(line, x, currentY);
      line = words[n];
      currentY += lineHeight;
    } else {
      line = testLine;
    }
  }
  ctx.fillText(line, x, currentY);
  return currentY;
}

/**
 * Safe image loading helper
 */
async function tryLoadLocalImage(filePath) {
  try {
    if (existsSync(filePath)) {
      return await loadImage(filePath);
    }
  } catch (err) {
    console.error(`[CanvasGenerator] Failed to load image asset: ${filePath}`, err);
  }
  return null;
}

/**
 * Draws a cute pixel-art style/parody representation of a monster based on its number
 */
async function drawMonsterSprite(ctx, monsterNo, cx, cy, size) {
  ctx.save();
  ctx.translate(cx, cy);

  // Background aura/shadow
  const shadowGrad = ctx.createRadialGradient(0, size * 0.3, size * 0.1, 0, size * 0.3, size * 0.5);
  shadowGrad.addColorStop(0, 'rgba(0, 0, 0, 0.25)');
  shadowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = shadowGrad;
  ctx.beginPath();
  ctx.ellipse(0, size * 0.3, size * 0.4, size * 0.15, 0, 0, 2 * Math.PI);
  ctx.fill();
  ctx.restore();

  // Try to load local asset image first
  const imgPath = join(process.cwd(), 'assets', 'monster', `${monsterNo}.png`);
  const img = await tryLoadLocalImage(imgPath);

  if (img) {
    // Draw the loaded pixel-art PNG centered
    ctx.drawImage(img, cx - size / 2, cy - size / 2, size, size);
    return;
  }

  // Fallback: draw programmatic vector art
  ctx.save();
  ctx.translate(cx, cy);

  switch (monsterNo) {
    case 1: // タマネギマキ (Onion)
      // Body
      ctx.fillStyle = '#C2E1A2';
      ctx.strokeStyle = '#2E5A1C';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(0, -size * 0.4);
      ctx.quadraticCurveTo(size * 0.3, 0, 0, size * 0.3);
      ctx.quadraticCurveTo(-size * 0.3, 0, 0, -size * 0.4);
      ctx.fill();
      ctx.stroke();
      
      // Top sprouts
      ctx.fillStyle = '#4CAF50';
      ctx.beginPath();
      ctx.ellipse(-size * 0.1, -size * 0.4, size * 0.08, size * 0.2, -0.3, 0, 2 * Math.PI);
      ctx.ellipse(size * 0.1, -size * 0.4, size * 0.08, size * 0.2, 0.3, 0, 2 * Math.PI);
      ctx.fill();
      ctx.stroke();

      // Cute crying eyes
      ctx.fillStyle = '#000000';
      ctx.beginPath();
      ctx.arc(-size * 0.08, -size * 0.05, 3, 0, 2 * Math.PI);
      ctx.arc(size * 0.08, -size * 0.05, 3, 0, 2 * Math.PI);
      ctx.fill();
      // Tears
      ctx.fillStyle = '#2196F3';
      ctx.beginPath();
      ctx.arc(-size * 0.08, size * 0.05, 4, 0, 2 * Math.PI);
      ctx.arc(size * 0.08, size * 0.05, 4, 0, 2 * Math.PI);
      ctx.fill();
      break;

    case 2: // コンセントラ (Plug Tiger)
      // Yellow body bag
      ctx.fillStyle = '#FDD835';
      ctx.strokeStyle = '#F57F17';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.roundRect(-size * 0.3, -size * 0.3, size * 0.6, size * 0.6, 20);
      ctx.fill();
      ctx.stroke();

      // Ears (crooked/paper look)
      ctx.fillStyle = '#FDD835';
      ctx.beginPath();
      ctx.moveTo(-size * 0.2, -size * 0.3);
      ctx.lineTo(-size * 0.25, -size * 0.55);
      ctx.lineTo(-size * 0.05, -size * 0.3);
      ctx.moveTo(size * 0.2, -size * 0.3);
      ctx.lineTo(size * 0.15, -size * 0.5);
      ctx.lineTo(size * 0.05, -size * 0.3);
      ctx.fill();
      ctx.stroke();

      // Black ear tips
      ctx.fillStyle = '#212121';
      ctx.beginPath();
      ctx.moveTo(-size * 0.22, -size * 0.45);
      ctx.lineTo(-size * 0.25, -size * 0.55);
      ctx.lineTo(-size * 0.15, -size * 0.45);
      ctx.fill();

      // Fake red cheeks (drawn crudely)
      ctx.fillStyle = '#E53935';
      ctx.beginPath();
      ctx.arc(-size * 0.18, size * 0.1, size * 0.08, 0, 2 * Math.PI);
      ctx.arc(size * 0.18, size * 0.1, size * 0.08, 0, 2 * Math.PI);
      ctx.fill();

      // Sharp eyes & mouth
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 3;
      ctx.beginPath();
      // Left eye ^ Left eye
      ctx.moveTo(-size * 0.18, -size * 0.1); ctx.lineTo(-size * 0.1, -size * 0.15); ctx.lineTo(-size * 0.05, -size * 0.1);
      // Right eye
      ctx.moveTo(size * 0.05, -size * 0.1); ctx.lineTo(size * 0.1, -size * 0.15); ctx.lineTo(size * 0.18, -size * 0.1);
      // Zigzag mouth
      ctx.moveTo(-size * 0.1, size * 0.1); ctx.lineTo(0, size * 0.05); ctx.lineTo(size * 0.1, size * 0.1);
      ctx.stroke();
      break;

    case 3: // たかし (Takashi in box)
      // Cardboard box
      ctx.fillStyle = '#D7CCC8';
      ctx.strokeStyle = '#8D6E63';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.roundRect(-size * 0.35, -size * 0.1, size * 0.7, size * 0.45, 8);
      ctx.fill();
      ctx.stroke();

      // Flaps of the cardboard box open
      ctx.fillStyle = '#BCAAA4';
      ctx.beginPath();
      // Left flap
      ctx.moveTo(-size * 0.35, -size * 0.1);
      ctx.lineTo(-size * 0.5, -size * 0.25);
      ctx.lineTo(-size * 0.15, -size * 0.1);
      // Right flap
      ctx.moveTo(size * 0.35, -size * 0.1);
      ctx.lineTo(size * 0.5, -size * 0.25);
      ctx.lineTo(size * 0.15, -size * 0.1);
      ctx.fill();
      ctx.stroke();

      // Black eyes peering from inside the box crease
      ctx.fillStyle = '#212121';
      ctx.beginPath();
      ctx.roundRect(-size * 0.25, -size * 0.05, size * 0.5, size * 0.1, 4);
      ctx.fill();
      // Glowing yellow pupil dots
      ctx.fillStyle = '#FFEB3B';
      ctx.beginPath();
      ctx.arc(-size * 0.1, 0, 4, 0, 2 * Math.PI);
      ctx.arc(size * 0.1, 0, 4, 0, 2 * Math.PI);
      ctx.fill();
      break;

    case 5: // ミズモチ (Water Mochi Slime)
      // Blue spherical body
      ctx.fillStyle = '#03A9F4';
      ctx.strokeStyle = '#0288D1';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(0, 0, size * 0.38, 0, 2 * Math.PI);
      ctx.fill();
      ctx.stroke();

      // White face belly
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(0, size * 0.08, size * 0.28, 0, 2 * Math.PI);
      ctx.fill();
      ctx.stroke();

      // Red nose
      ctx.fillStyle = '#E53935';
      ctx.beginPath();
      ctx.arc(0, -size * 0.05, size * 0.07, 0, 2 * Math.PI);
      ctx.fill();

      // White eyes with weird pupils
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.ellipse(-size * 0.08, -size * 0.18, size * 0.06, size * 0.08, 0, 0, 2 * Math.PI);
      ctx.ellipse(size * 0.08, -size * 0.18, size * 0.06, size * 0.08, 0, 0, 2 * Math.PI);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#000000';
      ctx.beginPath();
      ctx.arc(-size * 0.06, -size * 0.16, 3, 0, 2 * Math.PI);
      ctx.arc(size * 0.06, -size * 0.16, 3, 0, 2 * Math.PI);
      ctx.fill();
      break;

    default: // Generic placeholder creature (mystery silhouette)
      ctx.fillStyle = '#455A64';
      ctx.strokeStyle = '#263238';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(0, -size * 0.15, size * 0.25, 0, 2 * Math.PI);
      ctx.roundRect(-size * 0.3, -size * 0.05, size * 0.6, size * 0.45, 15);
      ctx.fill();
      ctx.stroke();

      // Glow eyes
      ctx.fillStyle = '#E0F7FA';
      ctx.beginPath();
      ctx.arc(-size * 0.1, -size * 0.1, 6, 0, 2 * Math.PI);
      ctx.arc(size * 0.1, -size * 0.1, 6, 0, 2 * Math.PI);
      ctx.fill();
      
      // Question mark emblem
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 36px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('?', 0, size * 0.15);
      break;
  }

  ctx.restore();
}

/**
 * Renders the wild encounter image card
 */
export async function generateEncounterCard(wildMonster, areaId, weatherId) {
  const canvas = createCanvas(600, 400);
  const ctx = canvas.getContext('2d');
  const area = AREAS[areaId] || AREAS.FOREST;
  const weather = WEATHERS[weatherId] || WEATHERS.Sunny;

  // Try to load background image
  const bgPath = join(process.cwd(), 'assets', 'background', `${areaId}.png`);
  const bgImg = await tryLoadLocalImage(bgPath);

  if (bgImg) {
    ctx.drawImage(bgImg, 0, 0, 600, 400);
  } else {
    // Biome-based background gradient fallback
    const grad = ctx.createLinearGradient(0, 0, 0, 400);
    if (areaId === 'FOREST') {
      grad.addColorStop(0, '#1E4620');
      grad.addColorStop(1, '#0C200C');
    } else if (areaId === 'SHOPPING_STREET') {
      grad.addColorStop(0, '#ECEFF1');
      grad.addColorStop(1, '#90A4AE');
    } else if (areaId === 'ABANDONED_FACTORY') {
      grad.addColorStop(0, '#37474F');
      grad.addColorStop(1, '#1A237E');
    } else if (areaId === 'BEACH') {
      grad.addColorStop(0, '#E0F7FA');
      grad.addColorStop(1, '#00838F');
    } else if (areaId === 'MOUNTAIN') {
      grad.addColorStop(0, '#78909C');
      grad.addColorStop(1, '#37474F');
    } else if (areaId === 'UNDERGROUND') {
      grad.addColorStop(0, '#212121');
      grad.addColorStop(1, '#000000');
    } else if (areaId === 'CYBER_SPACE') {
      grad.addColorStop(0, '#00E5FF');
      grad.addColorStop(1, '#010020');
    } else if (areaId === 'HOT_SPRING') {
      grad.addColorStop(0, '#FFE0B2');
      grad.addColorStop(1, '#E65100');
    } else if (areaId === 'MARKET') {
      grad.addColorStop(0, '#4A148C');
      grad.addColorStop(1, '#1A0033');
    } else {
      grad.addColorStop(0, '#263238');
      grad.addColorStop(1, '#0F171A');
    }
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 600, 400);

    // Draw grid helper (cyber look)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 600; i += 40) {
      ctx.beginPath();
      ctx.moveTo(i, 0); ctx.lineTo(i, 400);
      ctx.moveTo(0, i); ctx.lineTo(600, i);
      ctx.stroke();
    }
  }

  // Draw framing border
  ctx.strokeStyle = '#FFD700';
  ctx.lineWidth = 6;
  ctx.strokeRect(10, 10, 580, 380);

  // Area text overlay
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 20px "Segoe UI", "Segoe UI Emoji", Arial, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(`${area.emoji} ${area.name} 探索中...`, 30, 45);

  // Weather overlay
  ctx.textAlign = 'right';
  ctx.fillText(`${weather.emoji} ${weather.name}`, 570, 45);

  // Draw wild Pachimon sprite
  await drawMonsterSprite(ctx, wildMonster.monster_no, 300, 200, 180);

  // Name & Level Panel
  ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
  ctx.strokeStyle = '#FFD700';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(30, 300, 540, 75, 10);
  ctx.fill();
  ctx.stroke();

  // Name
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 22px "Segoe UI", Arial, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(`No.${String(wildMonster.monster_no).padStart(3, '0')} ${wildMonster.name}`, 50, 335);

  // Level
  ctx.fillStyle = '#FFEB3B';
  ctx.font = 'bold 18px "Segoe UI", Arial, sans-serif';
  ctx.fillText(`Lv.${wildMonster.level}`, 50, 360);

  // Caution meter
  ctx.fillStyle = '#B0BEC5';
  ctx.font = '16px "Segoe UI", Arial, sans-serif';
  ctx.fillText('警戒度:', 300, 335);

  // Caution gauge background
  ctx.fillStyle = '#37474F';
  ctx.beginPath();
  ctx.roundRect(360, 323, 180, 16, 8);
  ctx.fill();

  // Caution gauge fill
  const cautionColor = wildMonster.caution > 75 ? '#F44336' : (wildMonster.caution > 40 ? '#FF9800' : '#4CAF50');
  ctx.fillStyle = cautionColor;
  ctx.beginPath();
  ctx.roundRect(360, 323, Math.max(8, 180 * (wildMonster.caution / 100)), 16, 8);
  ctx.fill();

  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 12px Arial';
  ctx.textAlign = 'center';
  ctx.fillText(`${wildMonster.caution}%`, 450, 336);

  // Personality tag
  ctx.fillStyle = '#00E676';
  ctx.beginPath();
  ctx.roundRect(360, 348, 180, 20, 4);
  ctx.fill();
  ctx.fillStyle = '#000000';
  ctx.font = 'bold 12px "Segoe UI", Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`性格: ${wildMonster.personality}`, 450, 363);

  return canvas.toBuffer('image/png');
}

/**
 * Renders the player dashboard/profile card
 */
export async function generateProfileCard(player, rankName, party, zukanCount) {
  const canvas = createCanvas(600, 350);
  const ctx = canvas.getContext('2d');

  // Gradient background
  const grad = ctx.createLinearGradient(0, 0, 600, 350);
  grad.addColorStop(0, '#1A237E');
  grad.addColorStop(1, '#006064');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 600, 350);

  // Frame
  ctx.strokeStyle = '#00E5FF';
  ctx.lineWidth = 4;
  ctx.strokeRect(10, 10, 580, 330);

  // Glassmorphic panel left
  ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
  ctx.beginPath();
  ctx.roundRect(25, 25, 260, 300, 15);
  ctx.fill();

  // Glassmorphic panel right
  ctx.beginPath();
  ctx.roundRect(310, 25, 265, 300, 15);
  ctx.fill();

  // Left Side: Trainer Info
  ctx.fillStyle = '#00E5FF';
  ctx.font = 'bold 20px "Segoe UI", Arial, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('調査員ライセンス', 45, 55);

  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 26px "Segoe UI", Arial, sans-serif';
  ctx.fillText(player.username, 45, 95);

  ctx.font = '16px "Segoe UI", Arial, sans-serif';
  ctx.fillStyle = '#B2DFDB';
  ctx.fillText('現在の調査ランク:', 45, 140);
  
  ctx.fillStyle = '#FFD700';
  ctx.font = 'bold 22px "Segoe UI", Arial, sans-serif';
  ctx.fillText(rankName, 45, 170);

  ctx.fillStyle = '#B2DFDB';
  ctx.font = '16px "Segoe UI", Arial, sans-serif';
  ctx.fillText('図鑑完成数:', 45, 215);
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 20px "Segoe UI", Arial, sans-serif';
  ctx.fillText(`${zukanCount} / 30 種`, 45, 240);

  ctx.fillStyle = '#B2DFDB';
  ctx.font = '16px "Segoe UI", Arial, sans-serif';
  ctx.fillText('所持金:', 45, 280);
  ctx.fillStyle = '#FFEB3B';
  ctx.font = 'bold 20px "Segoe UI", Arial, sans-serif';
  ctx.fillText(`$${player.money.toLocaleString()}`, 45, 305);

  // Right Side: Party Details
  ctx.fillStyle = '#00E5FF';
  ctx.font = 'bold 20px "Segoe UI", Arial, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('手持ちパチモン', 330, 55);

  // Render 3 slots
  for (let i = 0; i < 3; i++) {
    const yOffset = 80 + i * 75;
    const monster = party[i];

    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.beginPath();
    ctx.roundRect(330, yOffset, 225, 65, 8);
    ctx.fill();

    if (monster) {
      // Monster info
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 15px "Segoe UI", Arial, sans-serif';
      ctx.fillText(monster.nickname, 395, yOffset + 27);
      
      ctx.fillStyle = '#FFEB3B';
      ctx.font = 'bold 12px Arial';
      ctx.fillText(`Lv.${monster.level}`, 395, yOffset + 48);

      ctx.fillStyle = '#E0F2F1';
      ctx.font = '11px "Segoe UI", Arial, sans-serif';
      ctx.fillText(`HP: ${monster.hp}/${monster.max_hp}`, 465, yOffset + 48);

      // Draw small circle icon for sprite
      await drawMonsterSprite(ctx, monster.monster_no, 360, yOffset + 32, 45);
    } else {
      // Empty slot
      ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.font = 'italic 14px "Segoe UI", Arial, sans-serif';
      ctx.fillText('空きスロット', 395, yOffset + 38);
    }
  }

  return canvas.toBuffer('image/png');
}

/**
 * Renders a detailed monster zukan/status page
 */
export async function generateMonsterDetailCard(monsterTemplate, playerMonsterObj = null, zukanStatus = 'PROTECTED') {
  const canvas = createCanvas(600, 400);
  const ctx = canvas.getContext('2d');
  
  // Theme styling colors based on type
  const typeColors = {
    '草': '#4CAF50',
    '電気': '#FFEB3B',
    'ノーマル': '#9E9E9E',
    'エスパー': '#E91E63',
    '水': '#2196F3',
    '闘': '#FF5722',
    '鋼': '#607D8B',
    'ゴースト': '#673AB7',
    '炎': '#FF9800',
    '悪': '#212121',
    '飛行': '#03A9F4',
    '地面': '#795548',
    'ドラゴン': '#9C27B0',
    '氷': '#00BCD4',
    '虫': '#8BC34A'
  };
  const themeColor = typeColors[monsterTemplate.type] || '#607D8B';

  // Backdrop gradient
  const grad = ctx.createLinearGradient(0, 0, 0, 400);
  grad.addColorStop(0, '#263238');
  grad.addColorStop(1, '#0F171A');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 600, 400);

  // Type highlight accent bar
  ctx.fillStyle = themeColor;
  ctx.fillRect(10, 10, 10, 380);

  // Framer
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
  ctx.lineWidth = 2;
  ctx.strokeRect(10, 10, 580, 380);

  // No. and Name Header
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 26px "Segoe UI", Arial, sans-serif';
  ctx.fillText(`No.${String(monsterTemplate.no).padStart(3, '0')}  ${monsterTemplate.name}`, 35, 45);

  // Sprite Panel (left side)
  ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
  ctx.beginPath();
  ctx.roundRect(35, 75, 220, 220, 12);
  ctx.fill();

  if (zukanStatus === 'SEEN') {
    // Greyscale seen state
    ctx.save();
    await drawMonsterSprite(ctx, monsterTemplate.no, 145, 185, 160);
    // Draw a dark mask
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.beginPath();
    ctx.roundRect(35, 75, 220, 220, 12);
    ctx.fill();
    ctx.fillStyle = '#B0BEC5';
    ctx.font = 'bold 24px "Segoe UI", Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('UNPROTECTED', 145, 190);
    ctx.restore();
  } else {
    // Normal colored state
    await drawMonsterSprite(ctx, monsterTemplate.no, 145, 185, 160);
  }

  // Right Side: Info Panel
  ctx.fillStyle = '#B0BEC5';
  ctx.font = '14px "Segoe UI", Arial, sans-serif';
  
  // Classification
  ctx.fillText(`分類:`, 280, 95);
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 15px "Segoe UI", Arial, sans-serif';
  ctx.fillText(monsterTemplate.classification, 330, 95);

  // Type Tag
  ctx.fillStyle = '#B0BEC5';
  ctx.font = '14px "Segoe UI", Arial, sans-serif';
  ctx.fillText(`タイプ:`, 280, 130);
  ctx.fillStyle = themeColor === '#FFEB3B' ? '#000000' : '#FFFFFF';
  ctx.beginPath();
  ctx.roundRect(335, 114, 80, 22, 4);
  ctx.fill();
  ctx.fillStyle = themeColor === '#FFEB3B' ? '#000000' : '#FFFFFF';
  ctx.font = 'bold 12px "Segoe UI", Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(monsterTemplate.type, 375, 130);

  // Favorite Food
  ctx.fillStyle = '#B0BEC5';
  ctx.font = '14px "Segoe UI", Arial, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(`好物:`, 280, 165);
  ctx.fillStyle = '#FFA726';
  ctx.font = 'bold 15px "Segoe UI", Arial, sans-serif';
  ctx.fillText(monsterTemplate.favoriteFood, 330, 165);

  // Draw Stats or Description
  if (playerMonsterObj) {
    // If it's a specific raised monster, display its current stats
    ctx.fillStyle = '#B0BEC5';
    ctx.font = 'bold 15px "Segoe UI", Arial, sans-serif';
    ctx.fillText('個別ステータス', 280, 205);

    // Lv, Exp details
    ctx.fillStyle = '#FFEB3B';
    ctx.font = 'bold 14px Arial';
    ctx.fillText(`Lv.${playerMonsterObj.level}`, 280, 225);
    ctx.fillStyle = '#B2DFDB';
    ctx.font = '12px Arial';
    ctx.fillText(`EXP: ${playerMonsterObj.exp}`, 340, 225);

    const stats = ['hp', 'attack', 'defense', 'speed', 'intelligence', 'charm'];
    const statLabels = { hp: 'HP', attack: '攻撃', defense: '防御', speed: '素早', intelligence: '知能', charm: '愛嬌' };
    const statColors = { hp: '#EF5350', attack: '#FF7043', defense: '#26A69A', speed: '#29B6F6', intelligence: '#AB47BC', charm: '#EC407A' };

    for (let i = 0; i < stats.length; i++) {
      const st = stats[i];
      const val = playerMonsterObj[st];
      const maxStatVal = 150; // Reference max for drawing bar
      const barW = 120;
      const x = i < 3 ? 280 : 440;
      const y = 245 + (i % 3) * 22;

      ctx.fillStyle = '#B0BEC5';
      ctx.font = '11px "Segoe UI", Arial, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(`${statLabels[st]}:`, x, y + 10);

      // Value number
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 11px Arial';
      ctx.fillText(val, x + 30, y + 10);

      // Stat bar back
      ctx.fillStyle = '#37474F';
      ctx.fillRect(x + 55, y + 2, barW - 40, 8);
      // Stat bar fill
      ctx.fillStyle = statColors[st];
      ctx.fillRect(x + 55, y + 2, Math.max(2, (barW - 40) * (val / maxStatVal)), 8);
    }
  } else {
    // Zukan generic mode: Display description
    ctx.fillStyle = '#B0BEC5';
    ctx.font = 'bold 15px "Segoe UI", Arial, sans-serif';
    ctx.fillText('図鑑説明文', 280, 205);

    ctx.fillStyle = '#ECEFF1';
    ctx.font = '14px "Segoe UI", Arial, sans-serif';
    if (zukanStatus === 'SEEN') {
      ctx.fillStyle = '#78909C';
      ctx.fillText('保護に成功すると、詳細な説明文が開放されます。', 280, 235);
    } else {
      wrapText(ctx, monsterTemplate.description, 280, 235, 290, 22);
    }

    // Base Stats preview (small summary)
    ctx.fillStyle = '#B0BEC5';
    ctx.font = '12px "Segoe UI", Arial, sans-serif';
    ctx.fillText(`種族値目安:`, 280, 310);
    
    const base = monsterTemplate.baseStats;
    ctx.fillStyle = '#81C784';
    ctx.font = 'bold 11px Arial';
    ctx.fillText(`HP:${base.hp}  ATK:${base.attack}  DEF:${base.defense}  SPD:${base.speed}  INT:${base.intelligence}  CHM:${base.charm}`, 280, 335);
  }

  // Footer label
  ctx.fillStyle = '#78909C';
  ctx.font = 'italic 11px Arial';
  ctx.textAlign = 'right';
  ctx.fillText('Pachimon Battle Project Ver 0.3', 570, 380);

  return canvas.toBuffer('image/png');
}
