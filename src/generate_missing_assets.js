import fs from 'fs';
import { join } from 'path';
import { createCanvas } from '@napi-rs/canvas';
import { MONSTERS } from './config.js';

const destFolder = join(process.cwd(), 'assets/monster');

// Ensure folder exists
if (!fs.existsSync(destFolder)) {
  fs.mkdirSync(destFolder, { recursive: true });
}

async function generateMissing() {
  console.log('🎨 Checking and generating missing monster assets...');
  
  for (let no = 1; no <= 60; no++) {
    const filePath = join(destFolder, `${no}.png`);
    if (fs.existsSync(filePath)) {
      console.log(`- No.${no} already has an asset image.`);
      continue;
    }

    const monster = MONSTERS[no];
    if (!monster) continue;

    console.log(`✨ Generating asset for No.${no} ${monster.name} (Type: ${monster.type})...`);

    const canvas = createCanvas(250, 250);
    const ctx = canvas.getContext('2d');

    // 1. Draw shiny background aura
    const aura = ctx.createRadialGradient(125, 125, 10, 125, 125, 110);
    aura.addColorStop(0, 'rgba(255, 255, 255, 0.4)');
    aura.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = aura;
    ctx.beginPath();
    ctx.arc(125, 125, 110, 0, 2*Math.PI);
    ctx.fill();

    // 2. Draw creature body based on type
    ctx.save();
    ctx.translate(125, 125);

    const type = monster.type || 'ノーマル';
    ctx.lineWidth = 6;
    ctx.lineJoin = 'round';

    if (type === '水' || type === '氷') {
      // Water / Ice bubble
      const grad = ctx.createRadialGradient(-10, -20, 10, 0, 0, 80);
      grad.addColorStop(0, '#E0F7FA');
      grad.addColorStop(0.5, '#4FC3F7');
      grad.addColorStop(1, '#0288D1');
      ctx.fillStyle = grad;
      ctx.strokeStyle = '#01579B';
      
      ctx.beginPath();
      ctx.arc(0, 10, 75, 0, 2 * Math.PI);
      ctx.fill();
      ctx.stroke();

      // Droplet fins
      ctx.fillStyle = '#80DEEA';
      ctx.beginPath();
      ctx.ellipse(-65, 10, 20, 35, Math.PI / 4, 0, 2 * Math.PI);
      ctx.ellipse(65, 10, 20, 35, -Math.PI / 4, 0, 2 * Math.PI);
      ctx.fill();
      ctx.stroke();

    } else if (type === '炎') {
      // Fire flame
      const grad = ctx.createLinearGradient(0, 80, 0, -80);
      grad.addColorStop(0, '#D84315');
      grad.addColorStop(0.5, '#FF7043');
      grad.addColorStop(1, '#FFEB3B');
      ctx.fillStyle = grad;
      ctx.strokeStyle = '#5D4037';

      ctx.beginPath();
      ctx.moveTo(0, 80);
      ctx.quadraticCurveTo(-70, 70, -60, 10);
      ctx.quadraticCurveTo(-80, -30, -25, -60);
      ctx.quadraticCurveTo(-10, -85, 0, -90);
      ctx.quadraticCurveTo(10, -85, 25, -60);
      ctx.quadraticCurveTo(80, -30, 60, 10);
      ctx.quadraticCurveTo(70, 70, 0, 80);
      ctx.fill();
      ctx.stroke();

      // Flame spark eyebrows
      ctx.fillStyle = '#FFEB3B';
      ctx.beginPath();
      ctx.ellipse(-25, -25, 8, 15, -0.3, 0, 2 * Math.PI);
      ctx.ellipse(25, -25, 8, 15, 0.3, 0, 2 * Math.PI);
      ctx.fill();

    } else if (type === '草') {
      // Grass bulb/leaf
      const grad = ctx.createLinearGradient(0, 80, 0, -80);
      grad.addColorStop(0, '#2E7D32');
      grad.addColorStop(0.5, '#4CAF50');
      grad.addColorStop(1, '#A5D6A7');
      ctx.fillStyle = grad;
      ctx.strokeStyle = '#1B5E20';

      ctx.beginPath();
      ctx.moveTo(0, 80);
      ctx.quadraticCurveTo(-70, 50, -50, -20);
      ctx.quadraticCurveTo(-20, -80, 0, -85);
      ctx.quadraticCurveTo(20, -80, 50, -20);
      ctx.quadraticCurveTo(70, 50, 0, 80);
      ctx.fill();
      ctx.stroke();

      // Cute leaf on head
      ctx.fillStyle = '#81C784';
      ctx.beginPath();
      ctx.ellipse(0, -95, 15, 30, Math.PI / 4, 0, 2 * Math.PI);
      ctx.fill();
      ctx.stroke();

    } else if (type === '電気') {
      // Electric spark/jagged
      const grad = ctx.createRadialGradient(-10, -10, 5, 0, 0, 80);
      grad.addColorStop(0, '#FFF59D');
      grad.addColorStop(0.6, '#FBC02D');
      grad.addColorStop(1, '#F57F17');
      ctx.fillStyle = grad;
      ctx.strokeStyle = '#E65100';

      ctx.beginPath();
      for (let i = 0; i < 8; i++) {
        const angle = (i * Math.PI) / 4;
        const r1 = 80;
        const r2 = 45;
        ctx.lineTo(Math.cos(angle) * r1, Math.sin(angle) * r1);
        ctx.lineTo(Math.cos(angle + Math.PI/8) * r2, Math.sin(angle + Math.PI/8) * r2);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

    } else if (type === '地面' || type === '岩' || type === '鋼' || type === '格闘') {
      // Ground sturdy rock
      const grad = ctx.createLinearGradient(-60, -60, 60, 60);
      grad.addColorStop(0, '#B0BEC5');
      grad.addColorStop(0.5, '#78909C');
      grad.addColorStop(1, '#37474F');
      ctx.fillStyle = grad;
      ctx.strokeStyle = '#212121';

      ctx.beginPath();
      ctx.moveTo(-60, -30);
      ctx.lineTo(0, -75);
      ctx.lineTo(60, -30);
      ctx.lineTo(75, 40);
      ctx.lineTo(0, 80);
      ctx.lineTo(-75, 40);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

    } else if (type === 'ドラゴン') {
      // Dragon majestic head/wings
      const grad = ctx.createRadialGradient(-10, -15, 10, 0, 0, 80);
      grad.addColorStop(0, '#9C27B0');
      grad.addColorStop(0.7, '#673AB7');
      grad.addColorStop(1, '#311B92');
      ctx.fillStyle = grad;
      ctx.strokeStyle = '#1A237E';

      ctx.beginPath();
      ctx.arc(0, 10, 70, 0, 2 * Math.PI);
      ctx.fill();
      ctx.stroke();

      // Dragon horns
      ctx.fillStyle = '#FFD54F';
      ctx.beginPath();
      ctx.moveTo(-35, -55);
      ctx.quadraticCurveTo(-60, -95, -70, -90);
      ctx.quadraticCurveTo(-45, -75, -20, -65);
      ctx.moveTo(35, -55);
      ctx.quadraticCurveTo(60, -95, 70, -90);
      ctx.quadraticCurveTo(45, -75, 20, -65);
      ctx.fill();
      ctx.stroke();

    } else if (type === 'エスパー') {
      // Psychic floating sphere with ring
      const grad = ctx.createRadialGradient(0, 0, 5, 0, 0, 60);
      grad.addColorStop(0, '#F8BBD0');
      grad.addColorStop(0.6, '#EC407A');
      grad.addColorStop(1, '#880E4F');
      ctx.fillStyle = grad;
      ctx.strokeStyle = '#4A148C';

      // Draw planet ring first (back)
      ctx.save();
      ctx.rotate(0.2);
      ctx.strokeStyle = '#D81B60';
      ctx.lineWidth = 12;
      ctx.beginPath();
      ctx.ellipse(0, 0, 95, 25, 0, Math.PI, 2 * Math.PI);
      ctx.stroke();
      ctx.restore();

      // Draw sphere
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.arc(0, 0, 55, 0, 2 * Math.PI);
      ctx.fill();
      ctx.stroke();

      // Draw planet ring (front)
      ctx.save();
      ctx.rotate(0.2);
      ctx.strokeStyle = '#D81B60';
      ctx.lineWidth = 12;
      ctx.beginPath();
      ctx.ellipse(0, 0, 95, 25, 0, 0, Math.PI);
      ctx.stroke();
      ctx.restore();

    } else if (type === '悪' || type === 'ゴースト') {
      // Dark / Ghost shadow blob
      const grad = ctx.createRadialGradient(-5, -10, 5, 0, 0, 75);
      grad.addColorStop(0, '#424242');
      grad.addColorStop(0.7, '#212121');
      grad.addColorStop(1, '#000000');
      ctx.fillStyle = grad;
      ctx.strokeStyle = '#311B92';

      ctx.beginPath();
      ctx.moveTo(0, 75);
      ctx.quadraticCurveTo(-65, 65, -60, 0);
      ctx.quadraticCurveTo(-65, -55, -25, -65);
      ctx.quadraticCurveTo(0, -90, 25, -65);
      ctx.quadraticCurveTo(65, -55, 60, 0);
      ctx.quadraticCurveTo(65, 65, 0, 75);
      ctx.fill();
      ctx.stroke();

      // Horns
      ctx.fillStyle = '#E53935';
      ctx.beginPath();
      ctx.moveTo(-35, -55);
      ctx.lineTo(-55, -75);
      ctx.lineTo(-20, -60);
      ctx.moveTo(35, -55);
      ctx.lineTo(55, -75);
      ctx.lineTo(20, -60);
      ctx.fill();
      ctx.stroke();

    } else {
      // Normal cute round body
      const grad = ctx.createRadialGradient(-10, -20, 10, 0, 0, 75);
      grad.addColorStop(0, '#FFFFFF');
      grad.addColorStop(0.7, '#D7CCC8');
      grad.addColorStop(1, '#8D6E63');
      ctx.fillStyle = grad;
      ctx.strokeStyle = '#4E342E';

      ctx.beginPath();
      ctx.arc(0, 10, 70, 0, 2 * Math.PI);
      ctx.fill();
      ctx.stroke();

      // Fluffy ears
      ctx.fillStyle = '#D7CCC8';
      ctx.beginPath();
      ctx.ellipse(-50, -50, 18, 30, -0.4, 0, 2 * Math.PI);
      ctx.ellipse(50, -50, 18, 30, 0.4, 0, 2 * Math.PI);
      ctx.fill();
      ctx.stroke();
    }

    // 3. Draw cute glowing eyes (type-specific colors)
    let eyeColor = '#000000';
    if (type === '電気') eyeColor = '#E65100';
    if (type === '炎') eyeColor = '#FFF59D';
    if (type === '悪' || type === 'ゴースト') eyeColor = '#FF1744';
    if (type === 'エスパー') eyeColor = '#FFFFFF';

    ctx.fillStyle = eyeColor;
    ctx.beginPath();
    ctx.arc(-22, -10, 8, 0, 2 * Math.PI);
    ctx.arc(22, -10, 8, 0, 2 * Math.PI);
    ctx.fill();

    // Eye highlight
    if (eyeColor !== '#FFFFFF') {
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(-25, -13, 3, 0, 2 * Math.PI);
      ctx.arc(19, -13, 3, 0, 2 * Math.PI);
      ctx.fill();
    }

    // Cute blush cheeks
    ctx.fillStyle = 'rgba(255, 128, 171, 0.6)';
    ctx.beginPath();
    ctx.ellipse(-38, 5, 12, 6, 0, 0, 2 * Math.PI);
    ctx.ellipse(38, 5, 12, 6, 0, 0, 2 * Math.PI);
    ctx.fill();

    // Cute mouth
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(0, 10, 10, 0.1, Math.PI - 0.1);
    ctx.stroke();

    ctx.restore();

    // 4. Save canvas
    const buffer = canvas.toBuffer('image/png');
    fs.writeFileSync(filePath, buffer);
    console.log(`✅ Saved procedurally generated asset for No.${no}.png`);
  }

  console.log('🎉 Checked and populated all 60 monster assets successfully!');
}

generateMissing().catch(console.error);
