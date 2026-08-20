const { PNG } = require('pngjs');
const FONT = require('./font');

function createCanvas(w, h, bg = [245, 245, 245, 255]) {
  const buf = new Uint8ClampedArray(w * h * 4);
  for (let i = 0; i < w * h; i++) {
    buf[i * 4] = bg[0];
    buf[i * 4 + 1] = bg[1];
    buf[i * 4 + 2] = bg[2];
    buf[i * 4 + 3] = bg[3];
  }
  return buf;
}

function setPixel(buf, w, h, x, y, color) {
  x = Math.round(x);
  y = Math.round(y);
  if (x < 0 || y < 0 || x >= w || y >= h) return;
  const i = (y * w + x) * 4;
  buf[i] = color[0];
  buf[i + 1] = color[1];
  buf[i + 2] = color[2];
  buf[i + 3] = color[3] ?? 255;
}

function speckle(buf, w, h, count, color) {
  for (let i = 0; i < count; i++) {
    setPixel(buf, w, h, Math.random() * w, Math.random() * h, color);
  }
}

function drawCircle(buf, w, h, cx, cy, r, color) {
  const r2 = r * r;
  const ri = Math.ceil(r);
  for (let y = -ri; y <= ri; y++) {
    for (let x = -ri; x <= ri; x++) {
      if (x * x + y * y <= r2) {
        setPixel(buf, w, h, cx + x, cy + y, color);
      }
    }
  }
}

function drawLine(buf, w, h, x0, y0, x1, y1, color, thickness = 1) {
  x0 = Math.round(x0);
  y0 = Math.round(y0);
  x1 = Math.round(x1);
  y1 = Math.round(y1);
  const dx = Math.abs(x1 - x0);
  const sx = x0 < x1 ? 1 : -1;
  const dy = -Math.abs(y1 - y0);
  const sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  let x = x0;
  let y = y0;
  const half = Math.floor(thickness / 2);
  // eslint-disable-next-line no-constant-condition
  while (true) {
    for (let ox = -half; ox <= half; ox++) {
      for (let oy = -half; oy <= half; oy++) {
        setPixel(buf, w, h, x + ox, y + oy, color);
      }
    }
    if (x === x1 && y === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) {
      err += dy;
      x += sx;
    }
    if (e2 <= dx) {
      err += dx;
      y += sy;
    }
  }
}

function drawNoiseCurve(buf, w, h, color, thickness = 1) {
  const segments = 4 + Math.floor(Math.random() * 3);
  let x0 = Math.random() * w;
  let y0 = Math.random() * h;
  for (let i = 0; i < segments; i++) {
    const x1 = Math.random() * w;
    const y1 = Math.random() * h;
    drawLine(buf, w, h, x0, y0, x1, y1, color, thickness);
    x0 = x1;
    y0 = y1;
  }
}

function fillPolygon(buf, w, h, points, color) {
  const ys = points.map((p) => p[1]);
  const minY = Math.max(0, Math.floor(Math.min(...ys)));
  const maxY = Math.min(h - 1, Math.ceil(Math.max(...ys)));
  for (let y = minY; y <= maxY; y++) {
    const xs = [];
    for (let i = 0; i < points.length; i++) {
      const [x0, y0] = points[i];
      const [x1, y1] = points[(i + 1) % points.length];
      if ((y0 <= y && y1 > y) || (y1 <= y && y0 > y)) {
        const t = (y - y0) / (y1 - y0);
        xs.push(x0 + t * (x1 - x0));
      }
    }
    xs.sort((a, b) => a - b);
    for (let i = 0; i < xs.length; i += 2) {
      const xStart = Math.round(xs[i]);
      const xEnd = Math.round(xs[i + 1] ?? xs[i]);
      for (let x = xStart; x <= xEnd; x++) setPixel(buf, w, h, x, y, color);
    }
  }
}

function regularPolygonPoints(cx, cy, radius, sides, rotationDeg) {
  const pts = [];
  const rad0 = (rotationDeg * Math.PI) / 180;
  for (let i = 0; i < sides; i++) {
    const a = rad0 + (i * 2 * Math.PI) / sides;
    pts.push([cx + radius * Math.cos(a), cy + radius * Math.sin(a)]);
  }
  return pts;
}

function drawGlyph(buf, w, h, cx, cy, cellPx, rotationDeg, char, color) {
  const glyph = FONT[char];
  if (!glyph) return;
  const rad = (rotationDeg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const rows = glyph.length;
  const cols = glyph[0].length;
  const halfW = (cols * cellPx) / 2;
  const halfH = (rows * cellPx) / 2;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (glyph[r][c] !== '#') continue;
      const px0 = c * cellPx - halfW;
      const py0 = r * cellPx - halfH;
      for (let sxp = 0; sxp < cellPx; sxp++) {
        for (let syp = 0; syp < cellPx; syp++) {
          if (Math.random() < 0.06) continue; // dropout: ruído anti-OCR
          const lx = px0 + sxp;
          const ly = py0 + syp;
          const rx = lx * cos - ly * sin;
          const ry = lx * sin + ly * cos;
          setPixel(buf, w, h, cx + rx, cy + ry, color);
        }
      }
    }
  }
}

function generatePositions(count, w, h, minDist, marginX = 30, marginY = 30) {
  const pts = [];
  let guard = 0;
  while (pts.length < count && guard < count * 300) {
    guard++;
    const x = marginX + Math.random() * (w - marginX * 2);
    const y = marginY + Math.random() * (h - marginY * 2);
    if (pts.every((p) => Math.hypot(p.x - x, p.y - y) >= minDist)) {
      pts.push({ x, y });
    }
  }
  while (pts.length < count) {
    pts.push({
      x: marginX + Math.random() * (w - marginX * 2),
      y: marginY + Math.random() * (h - marginY * 2),
    });
  }
  return pts;
}

function toPng(buf, w, h) {
  const png = new PNG({ width: w, height: h });
  png.data = Buffer.from(buf.buffer, buf.byteOffset, buf.byteLength);
  return PNG.sync.write(png);
}

module.exports = {
  createCanvas,
  setPixel,
  speckle,
  drawCircle,
  drawLine,
  drawNoiseCurve,
  fillPolygon,
  regularPolygonPoints,
  drawGlyph,
  generatePositions,
  toPng,
};
