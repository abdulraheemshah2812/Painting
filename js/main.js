

// ====== yahan badlo ======
const CAPTION = "";                              // painting ke neeche likha aayega, jaise "Meri jaan ❤" ("" = kuch nahi)
const START_TITLE = "Apka liye ek chotu sa surprise";    // shuru ki screen ka title
const START_TEXT  = "Necha Button Pr Tap kraye ";
const SPEED = parseFloat(new URLSearchParams(location.search).get("speed")) || 1;   // 2 = double tez
// =========================

const $ = id => document.getElementById(id);
const LOW = matchMedia("(pointer: coarse)").matches || Math.min(innerWidth, innerHeight) < 600 || (navigator.hardwareConcurrency || 8) <= 4;   // mobile / kamzor phone
const view = $("paint"), vctx = view.getContext("2d"), brushCv = $("brush"), bctx = brushCv.getContext("2d");

// ---------- dil ke sprites: ek baar banao, baar baar copy karo ----------
const heartSprites = {};
function heartSprite(h) {
  const k = Math.round(h / 6) * 6; if (heartSprites[k]) return heartSprites[k];
  const S = 64, pad = 22, cv = document.createElement("canvas"); cv.width = cv.height = S + pad * 2;
  const c = cv.getContext("2d"), x = pad + S / 2, y = pad, s = S;
  c.fillStyle = `hsl(${k},90%,66%)`; c.shadowColor = `hsl(${k},100%,60%)`; c.shadowBlur = 18;
  c.beginPath(); c.moveTo(x, y + s * 0.3); c.bezierCurveTo(x, y, x - s * 0.5, y, x - s * 0.5, y + s * 0.3); c.bezierCurveTo(x - s * 0.5, y + s * 0.6, x, y + s * 0.8, x, y + s);
  c.bezierCurveTo(x, y + s * 0.8, x + s * 0.5, y + s * 0.6, x + s * 0.5, y + s * 0.3); c.bezierCurveTo(x + s * 0.5, y, x, y, x, y + s * 0.3); c.fill();
  return (heartSprites[k] = cv);
}
function drawHeartSprite(c, h, x, y, size, alpha) {
  const sp = heartSprite(h), k = size / 64; c.globalAlpha = alpha;
  c.drawImage(sp, x - 54 * k, y - 22 * k, sp.width * k, sp.height * k);
}
// ---------- start screen: tairte hue dil ----------
const fxCv = $("fx"), fxc = fxCv.getContext("2d"); let fxOn = true, fxH = [], fxLast = 0;
function fxInit() {
  const d = Math.min(window.devicePixelRatio || 1, LOW ? 1.25 : 2); fxCv.width = innerWidth * d; fxCv.height = innerHeight * d; fxc.setTransform(d, 0, 0, d, 0, 0);
  fxH = []; for (let i = 0; i < (LOW ? 14 : 34); i++) fxH.push({ x: Math.random() * innerWidth, y: Math.random() * innerHeight, s: 9 + Math.random() * 26, v: 10 + Math.random() * 30, ph: Math.random() * 6.28, a: 0.12 + Math.random() * 0.42, h: 335 + Math.random() * 28 });
}
function fxLoop(t) {
  if (!fxOn) return;
  requestAnimationFrame(fxLoop);
  if (LOW && t - fxLast < 33) return;
  const dt = Math.min(0.06, (t - fxLast) / 1000 || 0.016); fxLast = t;
  fxc.clearRect(0, 0, innerWidth, innerHeight);
  for (const h of fxH) {
    h.y -= h.v * dt; if (h.y < -40) { h.y = innerHeight + 30; h.x = Math.random() * innerWidth; }
    drawHeartSprite(fxc, h.h, h.x + Math.sin(t / 1100 + h.ph) * 14, h.y, h.s, h.a);
  }
  fxc.globalAlpha = 1;
}
fxInit(); requestAnimationFrame(fxLoop); window.addEventListener("resize", () => { if (fxOn) fxInit(); });
let photo = null, strokes = [], CW = 0, CH = 0, pw = 0, ph = 0, ready = false, playToken = 0;
const PAPER = [239, 232, 216];
let BASE = PAPER;                // canvas ka shuruati rang: kaagaz aur photo ke average ka mel
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const nextFrame = () => new Promise(r => requestAnimationFrame(() => r()));

// ---------- photo chunna ----------
function loadImage(src) {
  return new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = rej; im.src = src; });
}
$("file").addEventListener("change", async e => {
  const f = e.target.files && e.target.files[0];
  if (!f) return;
  $("sMsg").textContent = "";
  try {
    const url = URL.createObjectURL(f);
    photo = await loadImage(url);
    $("thumb").src = url; $("thumb").style.display = "block";
    $("go").style.display = "inline-block";
    $("pick").textContent = "📷 Doosri photo chuno";
  } catch (err) {
    $("sMsg").textContent = "Ye photo khul nahi rahi. JPG ya PNG try karo.";
  }
});
function getPhotoSrc() {      // server par assets/photo.jpg, file:// par js/photo-data.js
  return new Promise(res => {
    if (location.protocol !== "file:") return res("assets/photo.jpg");
    const t = document.createElement("script"); t.src = "js/photo-data.js";
    t.onload = () => res(window.PHOTO_DATA || ""); t.onerror = () => res(""); document.head.appendChild(t);
  });
}
getPhotoSrc().then(src => {
  $("sTitle").textContent = START_TITLE; $("sText").textContent = START_TEXT;
  const showPick = () => { $("pick").style.display = "inline-block"; $("go").style.display = "none"; };
  if (!src) return showPick();
  $("go").style.display = "inline-block"; $("go").textContent = "Idr Tap kraye meri jaaan ❤";
  loadImage(src).then(im => { photo = im; }).catch(() => { $("sMsg").textContent = "Photo load nahi hui."; showPick(); });
});

// ---------- image processing ----------
function boxBlur(data, w, h, r) {
  const tmp = new Float32Array(w * h * 3), out = new Uint8ClampedArray(w * h * 4), d = 2 * r + 1;
  for (let y = 0; y < h; y++) {
    const row = y * w;
    for (let c = 0; c < 3; c++) {
      let sum = 0;
      for (let i = -r; i <= r; i++) sum += data[(row + clamp(i, 0, w - 1)) * 4 + c];
      for (let x = 0; x < w; x++) {
        tmp[(row + x) * 3 + c] = sum / d;
        sum += data[(row + Math.min(w - 1, x + r + 1)) * 4 + c] - data[(row + Math.max(0, x - r)) * 4 + c];
      }
    }
  }
  for (let x = 0; x < w; x++) {
    for (let c = 0; c < 3; c++) {
      let sum = 0;
      for (let i = -r; i <= r; i++) sum += tmp[(clamp(i, 0, h - 1) * w + x) * 3 + c];
      for (let y = 0; y < h; y++) {
        out[(y * w + x) * 4 + c] = sum / d;
        sum += tmp[(Math.min(h - 1, y + r + 1) * w + x) * 3 + c] - tmp[(Math.max(0, y - r) * w + x) * 3 + c];
      }
    }
  }
  for (let i = 3; i < out.length; i += 4) out[i] = 255;
  return out;
}

function rgbStr(c) { return `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})`; }

function bf(src, w, h, r) {      // float array ka box blur (ek pass)
  const tmp = new Float32Array(w * h), out = new Float32Array(w * h), d = 2 * r + 1;
  for (let y = 0; y < h; y++) {
    const row = y * w; let sum = 0;
    for (let i = -r; i <= r; i++) sum += src[row + clamp(i, 0, w - 1)];
    for (let x = 0; x < w; x++) { tmp[row + x] = sum / d; sum += src[row + Math.min(w - 1, x + r + 1)] - src[row + Math.max(0, x - r)]; }
  }
  for (let x = 0; x < w; x++) {
    let sum = 0;
    for (let i = -r; i <= r; i++) sum += tmp[clamp(i, 0, h - 1) * w + x];
    for (let y = 0; y < h; y++) { out[y * w + x] = sum / d; sum += tmp[Math.min(h - 1, y + r + 1) * w + x] - tmp[Math.max(0, y - r) * w + x]; }
  }
  return out;
}
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

// photo ki roshni/rang theek karo (andheri ya phiki photo bhi painting mein jaan aa jaye)
function grade(data) {
  const n = data.length / 4, hist = new Uint32Array(256); let sum = 0;
  for (let i = 0; i < n; i++) { const L = (0.299 * data[i * 4] + 0.587 * data[i * 4 + 1] + 0.114 * data[i * 4 + 2]) | 0; hist[L]++; sum += L; }
  let acc = 0, lo = 0, hi = 255;
  for (let v = 0; v < 256; v++) { acc += hist[v]; if (acc >= n * 0.01) { lo = v; break; } }
  acc = 0; for (let v = 255; v >= 0; v--) { acc += hist[v]; if (acc >= n * 0.01) { hi = v; break; } }
  if (hi - lo < 70) { lo = Math.max(0, lo - 25); hi = Math.min(255, hi + 25); }
  const mean = clamp(((sum / n) - lo) / Math.max(1, hi - lo), 0.08, 0.92);
  const gam = clamp(Math.log(0.47) / Math.log(mean), 0.68, 1.12), sat = 1.12, lut = new Uint8Array(256);
  for (let v = 0; v < 256; v++) lut[v] = Math.round(255 * Math.pow(clamp((v - lo) / (hi - lo), 0, 1), gam));
  for (let i = 0; i < n; i++) {
    let r = lut[data[i * 4]], g = lut[data[i * 4 + 1]], b = lut[data[i * 4 + 2]];
    const L = 0.299 * r + 0.587 * g + 0.114 * b;
    data[i * 4] = clamp(L + (r - L) * sat, 0, 255); data[i * 4 + 1] = clamp(L + (g - L) * sat, 0, 255); data[i * 4 + 2] = clamp(L + (b - L) * sat, 0, 255);
  }
}

// halka ghoomta hua "bahao" (flat jagah par strokes ek saath bahein, bikhre hue nahi)
function makeFlow() {
  const cs = Math.max(60, Math.min(pw, ph) * 0.3), gx = Math.ceil(pw / cs) + 2, gy = Math.ceil(ph / cs) + 2, vx = [], vy = [];
  for (let i = 0; i < gx * gy; i++) { const a = -0.55 + (Math.random() - 0.5) * 1.8; vx.push(Math.cos(a)); vy.push(Math.sin(a)); }
  const FX = new Float32Array(pw * ph), FY = new Float32Array(pw * ph);
  for (let y = 0; y < ph; y++) for (let x = 0; x < pw; x++) {
    const fx = x / cs, fy = y / cs, ix = Math.floor(fx), iy = Math.floor(fy), tx = fx - ix, ty = fy - iy;
    const a = iy * gx + ix, b = a + 1, c = a + gx, d = c + 1;
    const X = (vx[a] * (1 - tx) + vx[b] * tx) * (1 - ty) + (vx[c] * (1 - tx) + vx[d] * tx) * ty;
    const Y = (vy[a] * (1 - tx) + vy[b] * tx) * (1 - ty) + (vy[c] * (1 - tx) + vy[d] * tx) * ty;
    const m = Math.hypot(X, Y) || 1; FX[y * pw + x] = X / m; FY[y * pw + x] = Y / m;
  }
  return [FX, FY];
}

// har pixel par stroke ki disha: kinaron ke saath (structure tensor), flat jagah par bahao ke saath
function dirField(lum, FX, FY, Rk) {
  const n = pw * ph, Jxx = new Float32Array(n), Jxy = new Float32Array(n), Jyy = new Float32Array(n);
  for (let y = 1; y < ph - 1; y++) for (let x = 1; x < pw - 1; x++) {
    const i = y * pw + x;
    const gx = ((lum[i - pw + 1] + 2 * lum[i + 1] + lum[i + pw + 1]) - (lum[i - pw - 1] + 2 * lum[i - 1] + lum[i + pw - 1])) / 8;
    const gy = ((lum[i + pw - 1] + 2 * lum[i + pw] + lum[i + pw + 1]) - (lum[i - pw - 1] + 2 * lum[i - pw] + lum[i - pw + 1])) / 8;
    Jxx[i] = gx * gx; Jxy[i] = gx * gy; Jyy[i] = gy * gy;
  }
  const r = Math.max(2, Math.round(Rk * 1.4));
  const A = bf(bf(Jxx, pw, ph, r), pw, ph, r), B = bf(bf(Jxy, pw, ph, r), pw, ph, r), C = bf(bf(Jyy, pw, ph, r), pw, ph, r);
  const DX = new Float32Array(n), DY = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const a = A[i], b = B[i], c = C[i], tr = a + c, e = Math.sqrt(tr), disc = Math.sqrt((a - c) * (a - c) + 4 * b * b);
    const coh = tr > 1e-6 ? disc / tr : 0, th = 0.5 * Math.atan2(2 * b, a - c);
    let tx = -Math.sin(th), ty = Math.cos(th);
    const wgt = smooth(0.8, 3.5, e) * smooth(0.06, 0.32, coh), ax = FX[i], ay = FY[i];
    if (tx * ax + ty * ay < 0) { tx = -tx; ty = -ty; }
    const X = wgt * tx + (1 - wgt) * ax, Y = wgt * ty + (1 - wgt) * ay, m = Math.hypot(X, Y) || 1;
    DX[i] = X / m; DY[i] = Y / m;
  }
  return [DX, DY];
}

function hilbert(x, y) {          // paas ki jagahein paas paas aayein
  const n = 1024; let d = 0;
  for (let s = n >> 1; s > 0; s >>= 1) {
    const rx = (x & s) > 0 ? 1 : 0, ry = (y & s) > 0 ? 1 : 0;
    d += s * s * ((3 * rx) ^ ry);
    if (ry === 0) { if (rx === 1) { x = n - 1 - x; y = n - 1 - y; } const t = x; x = y; y = t; }
  }
  return d;
}
const JIT = [16, 13, 10, 8, 6, 5, 4], MAXS = [10, 10, 8, 7, 6, 5, 5], STOP = [2600, 2400, 2000, 1500, 1200, 1000, 800];
function buildStroke(x0, y0, Rk, ref, DX, DY, li, under) {
  const i0 = (y0 * pw + x0) * 4;
  const br0 = ref[i0], bg0 = ref[i0 + 1], bb0 = ref[i0 + 2], jit = (Math.random() - 0.5) * JIT[li];
  const col = [clamp(br0 + jit, 0, 255), clamp(bg0 + jit, 0, 255), clamp(bb0 + jit, 0, 255)];
  const pts = [x0, y0], minS = 2, stepL = Rk * 0.75;
  let x = x0, y = y0, lx = 0, ly = 0;
  for (let s = 0; s < MAXS[li]; s++) {
    const xi = clamp(Math.round(x), 1, pw - 2), yi = clamp(Math.round(y), 1, ph - 2), k = yi * pw + xi, j = k * 4;
    if (s >= minS) {
      const dr = ref[j] - br0, dg = ref[j + 1] - bg0, db = ref[j + 2] - bb0;
      if (dr * dr + dg * dg + db * db > STOP[li]) break;       // rang badal gaya: stroke ruk jaye
    }
    let dx = DX[k], dy = DY[k];
    if (lx * dx + ly * dy < 0) { dx = -dx; dy = -dy; }
    if (s > 0) { dx = 0.65 * dx + 0.35 * lx; dy = 0.65 * dy + 0.35 * ly; const m = Math.hypot(dx, dy) || 1; dx /= m; dy /= m; }
    x += dx * stepL; y += dy * stepL;
    if (x < 1 || y < 1 || x > pw - 2 || y > ph - 2) break;
    pts.push(x, y); lx = dx; ly = dy;
  }
  if (pts.length < 4) { const k = y0 * pw + x0; pts.push(clamp(x0 + DX[k] * Rk * 0.7, 1, pw - 2), clamp(y0 + DY[k] * Rk * 0.7, 1, ph - 2)); }
  {   // insaani haath: raasta thoda lehraata hai
    const nn = pts.length / 2, ph0 = Math.random() * 6.28, amp = Rk * (0.12 + Math.random() * 0.2) * (li < 3 ? 1 : 0.35), fq = 0.7 + Math.random() * 0.9;
    for (let i = 1; i < nn - 1; i++) {
      const a = pts[(i + 1) * 2] - pts[(i - 1) * 2], b = pts[(i + 1) * 2 + 1] - pts[(i - 1) * 2 + 1], m = Math.hypot(a, b) || 1, o = amp * Math.sin(i * fq + ph0) * Math.min(1, i / 2);
      pts[i * 2] += -b / m * o; pts[i * 2 + 1] += a / m * o;
    }
    for (let c = 0; c < 3; c++) col[c] = clamp(col[c] + (Math.random() - 0.5) * (li < 3 ? 14 : 9), 0, 255);   // rang har baar ek jaisa nahi
  }
  const n = pts.length / 2, nrm = new Float32Array(n * 2);
  for (let i = 0; i < n; i++) {
    const a = Math.max(0, i - 1), b = Math.min(n - 1, i + 1);
    let tx = pts[b * 2] - pts[a * 2], ty = pts[b * 2 + 1] - pts[a * 2 + 1];
    const m = Math.hypot(tx, ty) || 1; nrm[i * 2] = -ty / m; nrm[i * 2 + 1] = tx / m;
  }
  const w = Rk * 2.1;
  let br = null;
  if (w >= 7) {
    const nb = Math.min(LOW ? 5 : 9, Math.round(w / 2.4)); br = [];
    for (let i = 0; i < nb; i++) {
      const edge = Math.abs((i + 0.5) / nb - 0.5) * 2, dc = (Math.random() - 0.5) * 20;
      const c2 = [clamp(col[0] + dc, 0, 255), clamp(col[1] + dc, 0, 255), clamp(col[2] + dc, 0, 255)];
      const cu = under ? c2.map((v, q) => lerp(v, under[q], 0.55)) : c2;
      br.push({
        off: ((i + 0.5) / nb - 0.5) * w * 0.86 + (Math.random() - 0.5) * 0.8,
        lw: w / nb * 1.7 * (0.8 + Math.random() * 0.4),
        s: (Math.random() < 0.35 ? Math.random() * 0.2 : Math.random() * 0.04) + edge * 0.1,
        e: (Math.random() < 0.35 ? 0.8 + Math.random() * 0.2 : 0.97 + Math.random() * 0.03) - edge * 0.1 * Math.random(),
        a: 0.8 + Math.random() * 0.2,
        dash: (li <= 3 && w > 12 && Math.random() < 0.22) ? [Rk * (2 + Math.random() * 3), Rk * (0.4 + Math.random() * 0.8)] : null,
        cs: rgbStr(c2), cu: rgbStr(cu), mix: !!under
      });
    }
  }
  return { pts, nrm, w, col, br, li, al: li === 0 ? 0.82 : li === 1 ? 0.92 : 1 };
}

function ptAt(P, Nn, f, off) {
  const N = P.length / 2; f = clamp(f, 0, N - 1);
  const k = Math.floor(f), k2 = Math.min(N - 1, k + 1), fr = f - k;
  return [lerp(P[k * 2], P[k2 * 2], fr) + lerp(Nn[k * 2], Nn[k2 * 2], fr) * off, lerp(P[k * 2 + 1], P[k2 * 2 + 1], fr) + lerp(Nn[k * 2 + 1], Nn[k2 * 2 + 1], fr) * off];
}
function tracePath(c, P, Nn, off, fa, fb) {
  if (fb - fa < 0.01) return false;
  let q = ptAt(P, Nn, fa, off); c.moveTo(q[0], q[1]);
  for (let i = Math.floor(fa) + 1; i < fb; i++) c.lineTo(P[i * 2] + Nn[i * 2] * off, P[i * 2 + 1] + Nn[i * 2 + 1] * off);
  q = ptAt(P, Nn, fb, off); c.lineTo(q[0], q[1]); return true;
}
function drawStroke(c, st, t) {
  const P = st.pts, N = P.length / 2, Nn = st.nrm, head = (N - 1) * clamp(t, 0, 1);
  c.lineCap = "round"; c.lineJoin = "round";
  if (!st.br) {
    c.strokeStyle = rgbStr(st.col); c.lineWidth = st.w; c.beginPath(); c.globalAlpha = st.al == null ? 1 : st.al;
    if (tracePath(c, P, Nn, 0, 0, head)) c.stroke();
    c.globalAlpha = 1;
    return;
  }
  const span = N - 1;
  for (const b of st.br) {
    const fa = b.s * span, fe = b.e * span, fb = Math.min(head, fe);
    if (fb - fa < 0.02) continue;
    c.lineWidth = b.lw; c.globalAlpha = b.a * (st.al == null ? 1 : st.al) * (1 - 0.28 * (st.dry || 0));
    c.setLineDash(b.dash || []);
    if (b.mix) {                       // shuru mein neeche wale rang se mila hua, phir apna rang (wet-on-wet)
      const fm = fa + 0.4 * (fe - fa);
      c.strokeStyle = b.cu; c.beginPath(); if (tracePath(c, P, Nn, b.off, fa, Math.min(fb, fm))) c.stroke();
      if (fb > fm - 0.2) { c.strokeStyle = b.cs; c.beginPath(); if (tracePath(c, P, Nn, b.off, Math.max(fa, fm - 0.2), fb)) c.stroke(); }
    } else {
      c.strokeStyle = b.cs; c.beginPath(); if (tracePath(c, P, Nn, b.off, fa, fb)) c.stroke();
    }
  }
  c.globalAlpha = 1; c.setLineDash([]);
}

// ---------- poori painting pehle se plan karo (layer by layer) ----------
async function prepare() {
  const aspect = photo.naturalWidth / photo.naturalHeight;
  const maxW = Math.min(window.innerWidth - 16, 1100), maxH = window.innerHeight - 24;
  CW = maxW; CH = CW / aspect; if (CH > maxH) { CH = maxH; CW = CH * aspect; }
  CW = Math.round(CW); CH = Math.round(CH);
  const R = Math.min(window.devicePixelRatio || 1, 1.5);
  pw = Math.round(CW * R); ph = Math.round(CH * R);
  const cap = LOW ? 720 : 1200; if (Math.max(pw, ph) > cap) { const f = cap / Math.max(pw, ph); pw = Math.round(pw * f); ph = Math.round(ph * f); }
  brushCv.width = pw; brushCv.height = ph;
  view.width = pw; view.height = ph; view.style.width = CW + "px"; view.style.height = CH + "px";
  $("wrap").style.width = CW + "px"; $("wrap").style.height = CH + "px";
  vctx.fillStyle = rgbStr(PAPER); vctx.fillRect(0, 0, pw, ph);

  const sc = document.createElement("canvas"); sc.width = pw; sc.height = ph;
  const sctx = sc.getContext("2d"); sctx.drawImage(photo, 0, 0, pw, ph);
  const srcData = sctx.getImageData(0, 0, pw, ph).data;
  // grade(srcData);   // is photo ki tone pehle se set hai
  { let r = 0, g2 = 0, b2 = 0, n = 0; for (let i = 0; i < srcData.length; i += 64) { r += srcData[i]; g2 += srcData[i + 1]; b2 += srcData[i + 2]; n++; } BASE = [lerp(PAPER[0], r / n, 0.55), lerp(PAPER[1], g2 / n, 0.55), lerp(PAPER[2], b2 / n, 0.55)]; vctx.fillStyle = rgbStr(BASE); vctx.fillRect(0, 0, pw, ph); }
  const srcS = boxBlur(srcData, pw, ph, 1);      // halka saaf kiya hua tez (sharp) version: bareek detail ke liye
  const [FX, FY] = makeFlow();
  await nextFrame();
  const sketch = buildSketch(srcData);
  let lastDX = null, lastDY = null;
  const pc = document.createElement("canvas"); pc.width = pw; pc.height = ph;
  const pctx = pc.getContext("2d"); pctx.fillStyle = rgbStr(PAPER); pctx.fillRect(0, 0, pw, ph);

  const minD = Math.min(pw, ph);
  const radii = [0.05, 0.03, 0.017, 0.0105, 0.0065, 0.0038, 0.0022].map(f => Math.max(2, f * minD)).slice(0, LOW ? 6 : 7);
  const T = [0, 22, 17, 14, 12, 11, 10];
  const layers = [];
  for (let li = 0; li < radii.length; li++) {
    await nextFrame();
    const Rk = radii[li], br = Math.max(1, Math.round(Rk * 0.4));
    const ref = boxBlur(boxBlur(srcData, pw, ph, br), pw, ph, br);
    const lum = new Float32Array(pw * ph);
    for (let i = 0, j = 0; i < lum.length; i++, j += 4) lum[i] = 0.299 * ref[j] + 0.587 * ref[j + 1] + 0.114 * ref[j + 2];
    const tgt = li < 3 ? ref : srcS;                // bade strokes narm rang, chhote strokes asli detail ke peeche
    const [DX, DY] = dirField(lum, FX, FY, Rk); lastDX = DX; lastDY = DY;
    const cur = li === 0 ? null : pctx.getImageData(0, 0, pw, ph).data;
    const g = Math.max(3, Math.round(Rk * 1.1)), step = g >= 8 ? 2 : 1, list = [];
    for (let y0 = 0; y0 < ph; y0 += g) for (let x0 = 0; x0 < pw; x0 += g) {
      const x1 = Math.min(pw, x0 + g), y1 = Math.min(ph, y0 + g);
      let err = 0, cnt = 0, best = -1, bx = x0, by = y0;
      for (let y = y0; y < y1; y += step) for (let x = x0; x < x1; x += step) {
        let d = 100;
        if (cur) { const i = (y * pw + x) * 4, dr = tgt[i] - cur[i], dg = tgt[i + 1] - cur[i + 1], db = tgt[i + 2] - cur[i + 2]; d = Math.sqrt(dr * dr + dg * dg + db * db); }
        err += d; cnt++; if (d > best) { best = d; bx = x; by = y; }
      }
      if (cnt && err / cnt > T[li]) list.push([clamp(bx, 1, pw - 2), clamp(by, 1, ph - 2)]);
    }
    for (let i = list.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [list[i], list[j]] = [list[j], list[i]]; }
    if (li === 0) {                    // pehli layer ko ghana karo taaki kahin kaagaz ke safed nishan na rahein
      for (let y0 = g / 2; y0 < ph; y0 += g) for (let x0 = g / 2; x0 < pw; x0 += g) list.push([clamp(Math.round(x0), 1, pw - 2), clamp(Math.round(y0), 1, ph - 2)]);
    }
    const CAPL = LOW ? 7000 : 22000; if (list.length > CAPL) list.length = CAPL;
    list.forEach(q => {              // har layer mein brush ka raasta alag (kabhi ulta, kabhi palta hua)
      let hx = Math.min(1023, Math.floor(q[0] / pw * 1024)), hy = Math.min(1023, Math.floor(q[1] / ph * 1024));
      if (li % 2 === 1) hx = 1023 - hx;
      if (li % 3 === 2) hy = 1023 - hy;
      q.key = hilbert(hx, hy) + Math.random() * 40;
    });
    list.sort((u, v) => u.key - v.key);
    const arr = [];
    for (const q of list) {
      if (li === 5 && Math.random() < 0.2) continue;
      const bx = q[0], by = q[1], ci = (by * pw + bx) * 4;
      const under = (cur && li >= 1 && li <= 3) ? [cur[ci], cur[ci + 1], cur[ci + 2]] : null;
      const st = buildStroke(bx, by, Rk * (0.8 + Math.random() * 0.45), tgt, DX, DY, li, under); arr.push(st); drawStroke(pctx, st, 1);
    }
    layers.push(orderByRegion(arr, [4, 5, 5, 6, 8, 8, 8][li], li));
  }
  // aakhri touch: chamakte (bright) chhote dabs
  const hlArr = [];
  {
    const lumA = (d, j) => 0.299 * d[j] + 0.587 * d[j + 1] + 0.114 * d[j + 2];
    const bl = boxBlur(srcData, pw, ph, Math.max(3, Math.round(minD * 0.006)));
    const g = Math.max(4, Math.round(minD * 0.0104)), cand = [];
    for (let y0 = 0; y0 < ph; y0 += g) for (let x0 = 0; x0 < pw; x0 += g) {
      let best = 0, bx = -1, by = -1; const x1 = Math.min(pw, x0 + g), y1 = Math.min(ph, y0 + g);
      for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) { const j = (y * pw + x) * 4, d = lumA(srcS, j) - lumA(bl, j); if (d > best) { best = d; bx = x; by = y; } }
      if (best > 24) cand.push([clamp(bx, 1, pw - 2), clamp(by, 1, ph - 2), best]);
    }
    cand.sort((u, v) => v[2] - u[2]); const CH_ = LOW ? 500 : 1400; if (cand.length > CH_) cand.length = CH_;
    for (const [bx, by] of cand) {
      const st = buildStroke(bx, by, radii[5] * 0.9, srcS, lastDX, lastDY, 5, null);
      st.col = st.col.map(v => clamp(v + 14, 0, 255)); st.li = 6; st.al = 1;
      st.key = hilbert(Math.min(1023, Math.floor(bx / pw * 1024)), Math.min(1023, Math.floor(by / ph * 1024)));
      hlArr.push(st);
    }
    hlArr.sort((u, v) => u.key - v.key); if (hlArr[0]) hlArr[0].reload = true;
  }
  // time-line: pehle sketch, phir bade rang, phir bareek detail, aakhir mein chamak
  const D = [5, 6.5, 7.5, 6, 5, 4, 3.5], RATE = [30, 90, 260, 600, 1200, 1800, 2400], GD = [0.75, 0.5, 0.36, 0.22];
  const plan = [{ arr: sketch, dur: clamp(sketch.length / 650, 3, 6.5), gd: 0.16, grow: true, rel: false }];
  layers.forEach((arr, li) => plan.push({ arr, dur: Math.min(D[li], Math.max(1.2, arr.length / RATE[li])), gd: GD[li] || 0, grow: li < 4, rel: li < 4 }));
  plan.push({ arr: hlArr, dur: Math.min(2.8, Math.max(1, hlArr.length / 220)), gd: 0.25, grow: true, rel: true });
  strokes = []; let tStart = 0.4, lastRel = -99;
  plan.forEach(pl => {
    const n = pl.arr.length;
    pl.arr.forEach((st, k) => {
      st.t0 = tStart + (k / Math.max(1, n)) * pl.dur; st.grow = pl.grow; st.gd = pl.gd; st.rdone = false;
      if (!pl.rel) st.reload = false;
      else { if (st.reload || st.t0 - lastRel > 3.8) { st.reload = true; lastRel = st.t0; } st.dry = clamp((st.t0 - lastRel) / 4.2, 0, 1); }
      strokes.push(st);
    });
    tStart += pl.dur + 0.2;
  });
  $("prog").textContent = "";
  ready = true;
}

// ---------- asli brush ----------
function drawBrush(c, x, y, rt, col, th, lift, alpha) {
  const sc = Math.max(0.8, Math.min(pw, ph) / 700);
  rt = Math.max(rt, 3.2 * sc);
  const flat = rt > 13 * sc, rb = Math.max(rt * 1.05, 8 * sc), bl = rb * 2.4 + 12 * sc, fl = Math.max(rb * 1.8, 20 * sc), hl = Math.max(rb * 9, 150 * sc);
  c.save(); c.globalAlpha = alpha; c.translate(x, y);
  c.save(); c.translate(5 * sc + 11 * sc * lift, 7 * sc + 13 * sc * lift); c.rotate(th);
  c.globalAlpha = alpha * (0.3 - 0.12 * lift); c.fillStyle = "#000";
  c.beginPath(); c.ellipse(0, -hl * 0.55, rb * 0.9, hl * 0.6, 0, 0, 6.283); c.fill(); c.restore();
  c.rotate(th);
  c.fillStyle = rgbStr(col); c.strokeStyle = "rgba(0,0,0,.4)"; c.lineWidth = Math.max(1, sc);
  c.beginPath(); c.moveTo(-rt, 0); c.quadraticCurveTo(0, flat ? rt * 0.35 : rt * 1.6, rt, 0); c.lineTo(rb * 0.95, -bl); c.lineTo(-rb * 0.95, -bl); c.closePath(); c.fill(); c.stroke();
  let g = c.createLinearGradient(-rb, 0, rb, 0); g.addColorStop(0, "#808080"); g.addColorStop(0.35, "#f2f2f2"); g.addColorStop(1, "#6c6c6c");
  c.fillStyle = g; c.beginPath(); c.moveTo(-rb * 0.97, -bl); c.lineTo(-rb * 0.82, -bl - fl); c.lineTo(rb * 0.82, -bl - fl); c.lineTo(rb * 0.97, -bl); c.closePath(); c.fill();
  g = c.createLinearGradient(-rb, 0, rb, 0); g.addColorStop(0, "#56290c"); g.addColorStop(0.4, "#bb7632"); g.addColorStop(1, "#46210a");
  c.fillStyle = g; c.beginPath(); c.moveTo(-rb * 0.8, -bl - fl); c.lineTo(-rb * 0.5, -bl - fl - hl);
  c.quadraticCurveTo(0, -bl - fl - hl - rb * 0.6, rb * 0.5, -bl - fl - hl); c.lineTo(rb * 0.8, -bl - fl); c.closePath(); c.fill();
  c.restore();
}
function drawPalette(c, x, y, a, cols, hot, sc) {
  c.save(); c.globalAlpha = a; c.translate(x, y); c.rotate(-0.3);
  const S = 52 * sc;
  c.shadowColor = "rgba(0,0,0,.5)"; c.shadowBlur = 8 * sc; c.shadowOffsetY = 3 * sc;
  const g = c.createLinearGradient(-S * 1.5, -S, S * 1.5, S); g.addColorStop(0, "#a8733c"); g.addColorStop(1, "#6c4322");
  c.fillStyle = g; c.beginPath(); c.ellipse(0, 0, S * 1.5, S * 0.92, 0, 0, 6.283); c.fill();
  c.shadowColor = "transparent"; c.strokeStyle = "rgba(0,0,0,.35)"; c.lineWidth = sc; c.stroke();
  c.fillStyle = "rgba(0,0,0,.45)"; c.beginPath(); c.ellipse(S * 0.9, S * 0.38, S * 0.14, S * 0.1, 0, 0, 6.283); c.fill();
  for (let i = 0; i < cols.length; i++) {
    const ang = -2.7 + i * 0.62, dx = Math.cos(ang) * S * 1.08, dy = Math.sin(ang) * S * 0.62;
    c.fillStyle = rgbStr(cols[i]); c.beginPath(); c.ellipse(dx, dy, S * 0.2, S * 0.14, ang, 0, 6.283); c.fill();
  }
  c.fillStyle = rgbStr(hot); c.beginPath(); c.ellipse(-S * 0.2, S * 0.1, S * 0.28, S * 0.18, 0.4, 0, 6.283); c.fill();
  c.restore();
}

// ---------- pencil sketch: photo ke kinaron par halki lakeerein ----------
function buildSketch(data) {
  const sm = boxBlur(data, pw, ph, 2), lum = new Float32Array(pw * ph);
  for (let i = 0, j = 0; i < lum.length; i++, j += 4) lum[i] = 0.299 * sm[j] + 0.587 * sm[j + 1] + 0.114 * sm[j + 2];
  const G = new Float32Array(pw * ph), GX = new Float32Array(pw * ph), GY = new Float32Array(pw * ph);
  for (let y = 2; y < ph - 2; y++) for (let x = 2; x < pw - 2; x++) {
    const k = y * pw + x, gx = lum[k + 2] - lum[k - 2], gy = lum[k + 2 * pw] - lum[k - 2 * pw];
    GX[k] = gx; GY[k] = gy; G[k] = Math.hypot(gx, gy);
  }
  const samp = []; for (let k = 0; k < G.length; k += 7) samp.push(G[k]); samp.sort((a, b) => a - b);
  const thr = Math.max(9, samp[Math.floor(samp.length * 0.9)]);
  const sc = Math.max(0.8, Math.min(pw, ph) / 700), cs = 6, cw = Math.ceil(pw / cs), vis = new Uint8Array(cw * Math.ceil(ph / cs)), out = [];
  const trace = (bx, by, dir) => {
    const pts = []; let x = bx, y = by, lx = 0, ly = 0;
    for (let s2 = 0; s2 < 16; s2++) {
      const k = clamp(Math.round(y), 2, ph - 3) * pw + clamp(Math.round(x), 2, pw - 3), g = G[k];
      if (g < thr * 0.55) break;
      let dx = -GY[k] / g * dir, dy = GX[k] / g * dir;
      if (s2 > 0 && lx * dx + ly * dy < 0) { dx = -dx; dy = -dy; }
      x += dx * 3.2; y += dy * 3.2;
      if (x < 2 || y < 2 || x > pw - 3 || y > ph - 3) break;
      pts.push(x, y); lx = dx; ly = dy; vis[((y / cs) | 0) * cw + ((x / cs) | 0)] = 1;
    }
    return pts;
  };
  for (let y0 = 2; y0 < ph - 2; y0 += cs) for (let x0 = 2; x0 < pw - 2; x0 += cs) {
    let best = 0, bx = -1, by = -1;
    for (let y = y0; y < Math.min(y0 + cs, ph - 3); y++) for (let x = x0; x < Math.min(x0 + cs, pw - 3); x++) { const g = G[y * pw + x]; if (g > best) { best = g; bx = x; by = y; } }
    if (best < thr || vis[((by / cs) | 0) * cw + ((bx / cs) | 0)]) continue;
    const f = trace(bx, by, 1), b = trace(bx, by, -1), pts = [];
    for (let i = b.length - 2; i >= 0; i -= 2) pts.push(b[i], b[i + 1]);
    pts.push(bx, by); for (let i = 0; i < f.length; i++) pts.push(f[i]);
    if (pts.length < 8) continue;
    for (let i = 0; i < pts.length; i++) pts[i] += (Math.random() - 0.5) * 1.1;
    out.push({ pts, nrm: new Float32Array(pts.length), w: (0.9 + Math.random() * 0.6) * sc, col: [60 + Math.random() * 16, 52 + Math.random() * 14, 48], br: null, li: -1, al: 0.42 + Math.random() * 0.3, sketch: true });
  }
  while (out.length > (LOW ? 2000 : 4800)) out.splice((Math.random() * out.length) | 0, 1);
  // pencil jahan ruka wahin se agli lakeer: sabse paas wali
  const left = out.slice(), ord = []; let cx = 0, cy = ph * 0.1;
  while (left.length) {
    let bi = 0, bd = 1e18, rev = false;
    for (let i = 0; i < left.length; i++) {
      const P = left[i].pts, n = P.length, d1 = (P[0] - cx) ** 2 + (P[1] - cy) ** 2, d2 = (P[n - 2] - cx) ** 2 + (P[n - 1] - cy) ** 2;
      if (d1 < bd) { bd = d1; bi = i; rev = false; } if (d2 < bd) { bd = d2; bi = i; rev = true; }
    }
    const st = left.splice(bi, 1)[0];
    if (rev) { const r = []; for (let i = st.pts.length - 2; i >= 0; i -= 2) r.push(st.pts[i], st.pts[i + 1]); st.pts = r; }
    ord.push(st); cx = st.pts[st.pts.length - 2]; cy = st.pts[st.pts.length - 1];
  }
  return ord;
}

// ---------- painter ek rang ka area ek saath bharta hai: andhera pehle, ujala baad mein ----------
function orderByRegion(arr, K, li) {
  const n = arr.length;
  if (n < K * 4) { arr.forEach(st => { st.cl = 0; }); if (arr[0]) arr[0].reload = true; return arr; }
  const cen = []; for (let i = 0; i < K; i++) cen.push(arr[(Math.random() * n) | 0].col.slice());
  const asg = new Int16Array(n);
  for (let it = 0; it < 7; it++) {
    const sum = cen.map(() => [0, 0, 0, 0]);
    for (let i = 0; i < n; i++) {
      const c = arr[i].col; let bd = 1e9, bk = 0;
      for (let k = 0; k < K; k++) { const d = (c[0] - cen[k][0]) ** 2 + (c[1] - cen[k][1]) ** 2 + (c[2] - cen[k][2]) ** 2; if (d < bd) { bd = d; bk = k; } }
      asg[i] = bk; const q = sum[bk]; q[0] += c[0]; q[1] += c[1]; q[2] += c[2]; q[3]++;
    }
    for (let k = 0; k < K; k++) if (sum[k][3]) cen[k] = [sum[k][0] / sum[k][3], sum[k][1] / sum[k][3], sum[k][2] / sum[k][3]];
  }
  const rank = cen.map((c, k) => [0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2], k]).sort((a, b) => a[0] - b[0]).map(e => e[1]);   // andhera -> ujala
  const pos = []; rank.forEach((k, r) => { pos[k] = r; });
  arr.forEach((st, i) => {
    st.cl = pos[asg[i]];
    let hx = Math.min(1023, Math.floor(st.pts[0] / pw * 1024)), hy = Math.min(1023, Math.floor(st.pts[1] / ph * 1024));
    if (li % 2 === 1) hx = 1023 - hx;
    if (li % 3 === 2) hy = 1023 - hy;
    st.key = hilbert(hx, hy);
  });
  arr.sort((a, b) => a.cl - b.cl || a.key - b.key);
  let prev = -1; arr.forEach(st => { if (st.cl !== prev) { st.reload = true; prev = st.cl; } });
  return arr;
}

function drawPencil(c, x, y, th, lift, alpha, sc, pen) {
  const L = 190 * sc, W = 5.4 * sc, cone = 24 * sc, bodyTop = L - 30 * sc;
  c.save(); c.globalAlpha = alpha; c.translate(x, y);
  c.save(); c.translate(4 * sc + 9 * sc * lift, 6 * sc + 11 * sc * lift); c.rotate(th); c.globalAlpha = alpha * (0.28 - 0.1 * lift); c.fillStyle = "#000";
  c.beginPath(); c.ellipse(0, -L * 0.5, W * 0.8, L * 0.5, 0, 0, 6.283); c.fill(); c.restore();
  c.rotate(th);
  c.fillStyle = pen ? "#cfd3dc" : "#e8c590"; c.beginPath(); c.moveTo(0, 0); c.lineTo(-W, -cone); c.lineTo(W, -cone); c.closePath(); c.fill();
  c.fillStyle = pen ? "#1a2a8a" : "#3a3a3a"; c.beginPath(); c.moveTo(0, 0); c.lineTo(-W * 0.3, -cone * 0.3); c.lineTo(W * 0.3, -cone * 0.3); c.closePath(); c.fill();
  const g = c.createLinearGradient(-W, 0, W, 0); if (pen) { g.addColorStop(0, "#141d5a"); g.addColorStop(0.45, "#3556d0"); g.addColorStop(1, "#0f1648"); } else { g.addColorStop(0, "#b8860b"); g.addColorStop(0.45, "#f5c518"); g.addColorStop(1, "#a9760a"); }
  c.fillStyle = g; c.fillRect(-W, -bodyTop, 2 * W, bodyTop - cone);
  c.fillStyle = "#bdbdbd"; c.fillRect(-W, -bodyTop - 12 * sc, 2 * W, 12 * sc);
  c.fillStyle = pen ? "#16164a" : "#e58f9a"; c.fillRect(-W, -bodyTop - 28 * sc, 2 * W, 16 * sc);
  c.restore();
}

function tipPos(st, p) {
  const P = st.pts, N = P.length / 2, f = (N - 1) * p, k = Math.floor(f), fr = f - k, k2 = Math.min(N - 1, k + 1);
  return [lerp(P[k * 2], P[k2 * 2], fr), lerp(P[k * 2 + 1], P[k2 * 2 + 1], fr)];
}

// ---------- animation chalana ----------
function play() {
  const token = ++playToken;
  vctx.fillStyle = rgbStr(BASE); vctx.fillRect(0, 0, pw, ph);
  bctx.clearRect(0, 0, pw, ph);
  ["emb", "vig", "plaque", "gloss"].forEach(id => { $(id).style.opacity = 0; });
  $("shine").classList.remove("go"); $("frame").classList.remove("done"); $("bar").style.display = "none";
  strokes.forEach(st => { st.rdone = false; });
  const sc = Math.max(0.8, Math.min(pw, ph) / 700);
  const PAL = { x: pw - 90 * sc, y: ph - 64 * sc };
  const paintS = strokes.filter(q => !q.sketch && q.li >= 0 && q.li <= 3), palCols = []; for (let i = 0; i < 7; i++) palCols.push(paintS[(Math.random() * paintS.length) | 0].col);
  let idx = 0, active = [], t = 0, last = performance.now(), lastSt = null;
  let pauseLeft = 0, pauseEl = 0, palA = 0, sigStage = 0, sigT = 0, sigDrawn = 0, ink = "rgba(30,40,150,.93)", exiting = false, exitT = 0;
  let tool = strokes[0].sketch ? "pencil" : "brush";
  const B = { x: pw * 1.2, y: ph * 0.85, vx: 0, col: [190, 170, 150], rt: 8, lift: 1, alpha: 0 };
  function frame(now) {
    if (token !== playToken) return;
    const rdt = Math.min(0.05, (now - last) / 1000); last = now;
    let paused = false;
    if (pauseLeft > 0) { pauseLeft -= rdt; pauseEl += rdt; paused = true; }
    if (!paused && sigStage === 0) t += rdt * SPEED;
    while (!paused && idx < strokes.length && strokes[idx].t0 <= t) {
      const st = strokes[idx];
      if (st.reload && !st.rdone && SPEED < 6) { st.rdone = true; pauseLeft = 0.75; pauseEl = 0; paused = true; break; }   // brush naya rang lene jata hai
      idx++;
      if (st.grow) active.push(st); else { drawStroke(vctx, st, 1); lastSt = st; }
    }
    for (let i = active.length - 1; i >= 0; i--) {
      const st = active[i], p = clamp((t - st.t0) / st.gd, 0, 1);
      drawStroke(vctx, st, p);
      if (p >= 1) { lastSt = st; active.splice(i, 1); }
    }
    const strokesDone = idx >= strokes.length && active.length === 0;
    if (strokesDone && sigStage === 0) { sigStage = 2; exiting = true; exitT = 0; }   // painting poori: brush chala jata hai
    let tx = B.x, ty = B.y, tcol = B.col, trt = B.rt, spd = active.length ? 28 : 14;
    const nxt = strokes[Math.min(idx, strokes.length - 1)], curS = active.length ? active[active.length - 1] : (lastSt || nxt);
    tool = curS.sketch ? "pencil" : "brush";
    if (paused && pauseEl > 0.35) tool = nxt.sketch ? "pencil" : "brush";
    if (exiting) tool = "brush";
    if (exiting) { exitT += rdt; tx = pw * 1.25; ty = ph * 0.08; spd = 3; }
    else if (sigStage === 1) {
      sigT += rdt; const f = clamp(sigT / sigDur, 0, 1) * (SIG.length - 1), up = Math.floor(f);
      vctx.strokeStyle = ink; vctx.lineWidth = sigLW; vctx.lineCap = "round"; vctx.lineJoin = "round";
      while (sigDrawn < up) { const q0 = SIG[sigDrawn], q1 = SIG[sigDrawn + 1]; if (q1[2]) { vctx.beginPath(); vctx.moveTo(q0[0], q0[1]); vctx.lineTo(q1[0], q1[1]); vctx.stroke(); } sigDrawn++; }
      const a2 = SIG[up], b2 = SIG[Math.min(SIG.length - 1, up + 1)], fr = f - up;
      tx = lerp(a2[0], b2[0], fr); ty = lerp(a2[1], b2[1], fr); tcol = [40, 50, 150]; trt = 2.4 * sc; spd = 40;
      if (sigT > sigDur + 0.6) { sigStage = 2; exiting = true; exitT = 0; }
    }
    else if (paused) { tx = PAL.x - 8 * sc; ty = PAL.y - 2 * sc + Math.sin(now * 0.012) * 3 * sc; tcol = nxt.col; trt = nxt.w * 0.45; spd = 9; }
    else if (active.length) { const st = active[active.length - 1]; [tx, ty] = tipPos(st, clamp((t - st.t0) / st.gd, 0, 1)); tcol = st.col; trt = st.w * 0.45; }
    else if (lastSt) { const P = lastSt.pts; tx = P[P.length - 2]; ty = P[P.length - 1]; tcol = lastSt.col; trt = lastSt.w * 0.45; }
    const alphaT = exiting ? clamp(1 - exitT / 1.1, 0, 1) : 1;
    const k = 1 - Math.exp(-rdt * spd);
    const mvx = (tx - B.x) * k;
    B.x += mvx; B.y += (ty - B.y) * k;
    B.vx += ((rdt > 0 ? mvx / rdt : 0) - B.vx) * 0.15;
    const dist = Math.hypot(tx - B.x, ty - B.y);
    B.lift += ((dist > Math.max(30, trt * 5) ? 1 : 0) - B.lift) * Math.min(1, rdt * 9);
    for (let c = 0; c < 3; c++) B.col[c] += (tcol[c] - B.col[c]) * Math.min(1, rdt * 12);
    B.rt += (trt - B.rt) * Math.min(1, rdt * 10);
    B.alpha += (alphaT - B.alpha) * Math.min(1, rdt * 6);
    palA += ((paused ? 1 : 0) - palA) * Math.min(1, rdt * 8);
    bctx.clearRect(0, 0, pw, ph);
    if (palA > 0.02) drawPalette(bctx, PAL.x, PAL.y, palA, palCols, nxt.col, sc);
    const wx = (Math.sin(now * 0.011) * 0.8 + Math.sin(now * 0.027) * 0.5) * sc, wy = (Math.sin(now * 0.013 + 1) * 0.7 + Math.cos(now * 0.023) * 0.4) * sc;
    const ang = clamp(B.vx / (pw * 1.4), -1, 1);
    if (B.alpha > 0.02) {
      if (tool === "pencil" || tool === "pen") drawPencil(bctx, B.x + wx * 0.6, B.y + wy * 0.6, 0.55 + 0.2 * ang, B.lift, B.alpha, sc, tool === "pen");
      else drawBrush(bctx, B.x + wx, B.y + wy, B.rt, B.col, 0.78 + 0.32 * ang + wx * 0.01, B.lift, B.alpha);
    }
    if (exiting && exitT > 1.2) { bctx.clearRect(0, 0, pw, ph); finish(); return; }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

function finish() {
  if (!LOW) emboss();
  finishUI();
}
function emboss() {
  // rang ke kinaron se halki ubhri hui "impasto" bunawat
  const d = vctx.getImageData(0, 0, pw, ph).data, lum = new Float32Array(pw * ph);
  for (let i = 0, j = 0; i < lum.length; i++, j += 4) lum[i] = 0.299 * d[j] + 0.587 * d[j + 1] + 0.114 * d[j + 2];
  const lumS = bf(lum, pw, ph, 1);
  const e = $("emb"); e.width = pw; e.height = ph;
  const ec = e.getContext("2d"), id = ec.createImageData(pw, ph);
  for (let y = 0; y < ph; y++) for (let x = 0; x < pw; x++) {
    const a = lumS[Math.max(0, y - 1) * pw + Math.max(0, x - 1)], b = lumS[Math.min(ph - 1, y + 1) * pw + Math.min(pw - 1, x + 1)];
    const v = clamp(128 + (a - b) * 1.8, 0, 255), k = (y * pw + x) * 4;
    id.data[k] = id.data[k + 1] = id.data[k + 2] = v; id.data[k + 3] = 255;
  }
  ec.putImageData(id, 0, 0);
  $("emb").style.opacity = 0.5;
}
function finishUI() {
  $("vig").style.opacity = 1; $("gloss").style.opacity = 1;
  $("frame").classList.add("done");
  setTimeout(() => $("shine").classList.add("go"), 400);
  if (CAPTION) { $("plaque").textContent = CAPTION; $("plaque").style.display = "block"; setTimeout(() => { $("plaque").style.opacity = 1; }, 50); }
  window.paintDone = true; celebrate();
}

// ---------- buttons ----------
$("bReplay").addEventListener("click", () => { if (ready) play(); });
function composite() {
  const c = document.createElement("canvas"); c.width = pw; c.height = ph;
  const x = c.getContext("2d"); x.drawImage(view, 0, 0);
  x.globalCompositeOperation = "overlay"; x.globalAlpha = 0.5; x.drawImage($("emb"), 0, 0);
  return c;
}
function download(blob, name) {
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name;
  document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
}
$("bSave").addEventListener("click", () => composite().toBlob(b => download(b, "painting.jpg"), "image/jpeg", 0.93));


// ---------- finish ke baad: udte dil aur chamak (halka) ----------
function celebrate() {
  if ($("celeb")) return;
  const cv = document.createElement("canvas"); cv.id = "celeb"; document.body.appendChild(cv);
  const c = cv.getContext("2d"), d = Math.min(devicePixelRatio || 1, LOW ? 1.25 : 2), MAXP = LOW ? 20 : 50, GAP = LOW ? 0.5 : 0.28;
  const fit = () => { cv.width = innerWidth * d; cv.height = innerHeight * d; c.setTransform(d, 0, 0, d, 0, 0); };
  fit(); addEventListener("resize", fit);
  const P = []; let last = 0, acc = 0;
  const loop = t => {
    requestAnimationFrame(loop);
    if (LOW && t - last < 33) return;
    const dt = Math.min(0.06, (t - last) / 1000 || 0.016); last = t;
    acc += dt;
    if (acc > GAP && P.length < MAXP) { acc = 0; const heart = Math.random() < 0.65; P.push({ heart, x: Math.random() * innerWidth, y: innerHeight + 20, s: heart ? 10 + Math.random() * 16 : 2 + Math.random() * 3, v: 35 + Math.random() * 50, ph: Math.random() * 6.28, sw: 10 + Math.random() * 20, life: 0, max: 7 + Math.random() * 4, h: heart ? 335 + Math.random() * 25 : 40 }); }
    c.clearRect(0, 0, innerWidth, innerHeight);
    for (let i = P.length - 1; i >= 0; i--) {
      const p = P[i]; p.life += dt; p.y -= p.v * dt;
      if (p.life > p.max || p.y < -30) { P.splice(i, 1); continue; }
      const f = Math.min(1, p.life / 1.2) * Math.min(1, (p.max - p.life) / 1.5), x = p.x + Math.sin(p.life * 1.3 + p.ph) * p.sw;
      if (p.heart) drawHeartSprite(c, p.h, x, p.y, p.s, f * 0.6);
      else { const r = p.s * (0.6 + 0.4 * Math.sin(p.life * 6 + p.ph)); c.globalAlpha = f * 0.25; c.fillStyle = "#ffd98a"; c.beginPath(); c.arc(x, p.y, r * 2.2, 0, 6.283); c.fill(); c.globalAlpha = f * 0.9; c.fillStyle = "#fff3c9"; c.beginPath(); c.arc(x, p.y, r, 0, 6.283); c.fill(); }
    }
    c.globalAlpha = 1;
  };
  requestAnimationFrame(loop);
}

let musicStarted = false, synthOn = false;

// In naamon mein se jo bhi file isi folder mein mile, wo chalegi
const MUSIC_FILES = ["assets/music.mp3", "assets/music.m4a", "assets/music.wav", "assets/music.ogg", "assets/music.aac", "music.mp3", "music.MP3", "Music.mp3", "music.m4a", "music.wav", "music.ogg", "music.aac"];

function startMusic() {
  if (musicStarted) return;
  musicStarted = true;
  let i = 0;
  const tryNext = () => {
    if (i >= MUSIC_FILES.length) {
      synth();
      return;
    }
    const a = new Audio(MUSIC_FILES[i++]);
    a.preload = "auto"; a.volume = 0; a.loop = true;
    let handled = false;
    const fail = () => { if (handled) return; handled = true; tryNext(); };
    a.addEventListener("error", fail, { once: true });
    const pr = a.play();
    if (pr && pr.then) {
      pr.then(() => { window.__musicSrc = a.src; let v = 0; const fd = setInterval(() => { v = Math.min(0.8, v + 0.04); a.volume = v; if (v >= 0.8) clearInterval(fd); }, 120); }).catch(err => {
        if (err && err.name === "NotAllowedError") {
          document.addEventListener("click", () => { a.volume = 0.8; a.play().catch(() => {}); }, { once: true });
        } else fail();
      });
    }
  };
  tryNext();
}

function synth() {
  if (synthOn) return;
  synthOn = true;
  const actx = new (window.AudioContext || window.webkitAudioContext)();
  const master = actx.createGain();
  master.gain.value = 0.25;
  master.connect(actx.destination);
  const chords = [[261.63,329.63,392.00],[196.00,246.94,293.66],
                  [220.00,261.63,329.63],[174.61,220.00,261.63]];
  const beat = 0.45;
  function note(f, t, d, type, vol) {
    const o = actx.createOscillator(), g = actx.createGain();
    o.type = type; o.frequency.value = f;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.03);
    g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(g); g.connect(master);
    o.start(t); o.stop(t + d + 0.05);
  }
  let nxt = actx.currentTime + 0.1, bar = 0;
  (function schedule() {
    while (nxt < actx.currentTime + 2) {
      const ch = chords[bar % 4];
      ch.forEach(f => note(f, nxt, beat * 4, "sine", 0.12));
      [0,1,2,1,0,1,2,1].forEach((idx, i) =>
        note(ch[idx] * 2, nxt + i * beat / 2, beat, "triangle", 0.1));
      nxt += beat * 4; bar++;
    }
    setTimeout(schedule, 500);
  })();
}


$("go").addEventListener("click", async function () {
  if (!photo) return;
  $("start").classList.add("loading");
  startMusic();
  ready = false;
  await prepare();
  $("start").classList.add("out"); $("frame").classList.add("show");
  await new Promise(r => setTimeout(r, 650));
  play();
  setTimeout(() => { $("start").style.display = "none"; fxOn = false; }, 1100);
});
