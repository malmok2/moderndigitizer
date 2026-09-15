// 굽어 놓은 docs/index.html 이 실제로 맞는 숫자를 내놓는지 끝에서 끝까지 확인한다.
//
//     npm i -D playwright && node tools/check.js
//     node tools/check.js docs/index.html      (다른 파일을 보고 싶을 때)
//
// 아는 함수를 그린 그림을 만들어 넣고, 뽑아낸 값을 그 함수와 비교한다.
// 숫자를 다루는 도구라 "돌아간다"로는 부족하다 — 얼마나 맞는지까지 본다.
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const FILE = path.resolve(process.argv[2] || path.join(__dirname, '..', 'docs', 'index.html'));
const TMP = fs.mkdtempSync(path.join(require('os').tmpdir(), 'digicheck-'));
let failed = 0;

function ok(name, cond, detail) {
  console.log((cond ? '  ok   ' : '  FAIL ') + name + (detail ? '  — ' + detail : ''));
  if (!cond) failed++;
}
function near(a, b, tol) { return Math.abs(a - b) <= tol; }

// 파일 하나짜리 도구지만 localStorage 를 쓰므로 http 로 띄운다.
function serve() {
  const html = fs.readFileSync(FILE);
  return new Promise(res => {
    const s = http.createServer((q, p) => { p.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); p.end(html); });
    s.listen(0, '127.0.0.1', () => res({ url: 'http://127.0.0.1:' + s.address().port + '/', close: () => s.close() }));
  });
}

// 시험용 그림 두 장을 브라우저 안에서 그린다.
async function makeFigures(page) {
  await page.goto('about:blank');
  const urls = await page.evaluate(() => {
    const mk = (draw) => {
      const c = document.createElement('canvas'); c.width = 820; c.height = 620;
      const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, 800, 600);
      draw(g); return c.toDataURL('image/png');
    };
    const U0 = 100, U1 = 700, V0 = 500, V1 = 80;
    // 1) 선형 축 · 색 곡선 둘
    const lin = mk(g => {
      const ux = x => U0 + (x / 10) * (U1 - U0), vy = y => V0 + (y / 100) * (V1 - V0);
      g.strokeStyle = '#000'; g.lineWidth = 2;
      g.beginPath(); g.moveTo(U0, V1 - 20); g.lineTo(U0, V0); g.lineTo(U1 + 20, V0); g.stroke();
      const curve = (f, col) => {
        g.strokeStyle = col; g.lineWidth = 3; g.beginPath();
        for (let i = 0; i <= 400; i++) { const x = i / 40; i ? g.lineTo(ux(x), vy(f(x))) : g.moveTo(ux(x), vy(f(x))); }
        g.stroke();
      };
      curve(x => x * x, '#d62728');
      curve(x => 10 * x, '#1f77b4');
    });
    // 2) 로그-로그 축 · 검은 곡선 + 초록 마커
    const MARK = [[2, 0.004], [10, 0.02], [70, 0.09], [400, 0.4]];
    const log = mk(g => {
      const ux = x => U0 + (Math.log10(x) / 3) * (U1 - U0);
      const vy = y => V0 + ((Math.log10(y) + 3) / 3) * (V1 - V0);
      g.strokeStyle = '#000'; g.lineWidth = 2;
      g.beginPath(); g.moveTo(U0, V1); g.lineTo(U0, V0); g.lineTo(U1, V0); g.stroke();
      g.strokeStyle = '#bbb'; g.lineWidth = 1;
      for (let d = 0; d <= 3; d++) for (let m = 1; m <= 9; m++) {
        const x = m * Math.pow(10, d); if (x > 1000) continue;
        g.beginPath(); g.moveTo(ux(x), V0); g.lineTo(ux(x), V1); g.stroke();
      }
      g.strokeStyle = '#000'; g.lineWidth = 2.5; g.beginPath();
      for (let i = 0; i <= 300; i++) {
        const x = Math.pow(10, i / 100), y = 1e-3 * Math.pow(x, 0.7);
        i ? g.lineTo(ux(x), vy(y)) : g.moveTo(ux(x), vy(y));
      }
      g.stroke();
      g.fillStyle = '#2ca02c';
      for (const [x, y] of MARK) g.fillRect(ux(x) - 5, vy(y) - 5, 10, 10);
    });
    // 3) 자동 찾기용 — 격자선·범례·교차가 모두 있는 빡센 그림 (x 0..10, y 0..100)
    const line = (g, f, col, lw) => {
      g.strokeStyle = col; g.lineWidth = lw || 3; g.beginPath();
      for (let i = 0; i <= 500; i++) {
        const x = i / 50, u = U0 + (x / 10) * (U1 - U0), v = V0 + (f(x) / 100) * (V1 - V0);
        i ? g.lineTo(u, v) : g.moveTo(u, v);
      }
      g.stroke();
    };
    const frame = g => {
      const ux = x => U0 + (x / 10) * (U1 - U0), vy = y => V0 + (y / 100) * (V1 - V0);
      g.strokeStyle = '#ddd'; g.lineWidth = 1;
      for (let x = 1; x < 10; x++) { g.beginPath(); g.moveTo(ux(x), V0); g.lineTo(ux(x), V1); g.stroke(); }
      for (let y = 10; y < 100; y += 10) { g.beginPath(); g.moveTo(U0, vy(y)); g.lineTo(U1, vy(y)); g.stroke(); }
      g.strokeStyle = '#000'; g.lineWidth = 2; g.strokeRect(U0, V1, U1 - U0, V0 - V1);
      g.font = '14px sans-serif'; g.fillStyle = '#000'; g.textAlign = 'center';
      for (let x = 0; x <= 10; x += 2) g.fillText(String(x), ux(x), V0 + 22);
    };
    const MK2 = [1, 2.5, 4, 5.5, 7, 8.5].map(x => [x, 50 + 30 * Math.sin(x)]);
    const busy = mk(g => {
      const ux = x => U0 + (x / 10) * (U1 - U0), vy = y => V0 + (y / 100) * (V1 - V0);
      frame(g);
      line(g, x => 100 - 100 * Math.exp(-0.5 * x), '#d62728');
      line(g, x => 10 * x, '#1f77b4');
      line(g, x => 0.9 * x * x, '#000000', 2.5);
      g.fillStyle = '#2ca02c';
      for (const [x, y] of MK2) g.fillRect(ux(x) - 5, vy(y) - 5, 10, 10);
      const lx = ux(6.4), ly = vy(28);          // 범례 — 색 견본까지 있어 자동 찾기를 흔든다
      g.font = '13px sans-serif'; g.textAlign = 'left';
      [['#d62728', 'Case A'], ['#1f77b4', 'Case B'], ['#000000', 'Case D'], ['#2ca02c', 'Measured']]
        .forEach(([c, t], i) => {
          g.strokeStyle = c; g.lineWidth = 3;
          g.beginPath(); g.moveTo(lx, ly + i * 20); g.lineTo(lx + 24, ly + i * 20); g.stroke();
          g.fillStyle = '#000'; g.fillText(t, lx + 32, ly + i * 20 + 4);
        });
    });
    // 4) 같은 색 곡선 둘이 교차하는 그림
    const cross = mk(g => { frame(g); line(g, x => 20 + 6 * x, '#d62728'); line(g, x => 80 - 6 * x, '#d62728'); });
    return { lin, log, busy, cross };
  });
  const out = {};
  for (const [k, v] of Object.entries(urls)) {
    out[k] = path.join(TMP, k + '.png');
    fs.writeFileSync(out[k], Buffer.from(v.split(',')[1], 'base64'));
  }
  return out;
}

(async () => {
  const srv = await serve();
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1500, height: 940 } });
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });

  const figs = await makeFigures(page);
  const fresh = async () => {
    await page.goto(srv.url);
    // 기다리던 자동 저장까지 지운다 — 안 그러면 새로 고칠 때 옛 상태가 도로 쓰인다.
    await page.evaluate(() => { try { clearTimeout(saveT); saveT = 0; localStorage.clear(); } catch (e) { } });
    await page.reload({ waitUntil: 'load' });
    await page.waitForTimeout(250);
  };
  const open = async f => {
    await page.setInputFiles('#file', f);
    await page.waitForFunction(() => !!S.img, null, { timeout: 8000 });
    await page.waitForTimeout(200);
  };
  const click = async (u, v) => {
    const [x, y] = await page.evaluate(([u, v]) => [sx(u), sy(v)], [u, v]);
    await page.mouse.click(x, y);
  };
  const drag = async (a, b) => {
    const p1 = await page.evaluate(([u, v]) => [sx(u), sy(v)], a);
    const p2 = await page.evaluate(([u, v]) => [sx(u), sy(v)], b);
    await page.mouse.move(p1[0], p1[1]); await page.mouse.down();
    await page.mouse.move(p2[0], p2[1], { steps: 8 }); await page.mouse.up();
    await page.waitForTimeout(150);
  };
  const setVals = async v => { for (const [id, x] of Object.entries(v)) await page.fill(id, x); await page.waitForTimeout(150); };

  // ── 1. 선형 축: 축 맞추기 · 색으로 자동 추출 · 손으로 찍기 · 내보내기 ──────
  console.log('\n선형 축 (빨강 y = x², 파랑 y = 10x)');
  await fresh();
  await open(figs.lin);
  const ux = x => 100 + (x / 10) * 600, vy = y => 500 + (y / 100) * (-420);
  await click(ux(0), vy(0)); await click(ux(10), vy(0)); await click(ux(0), vy(0)); await click(ux(0), vy(100));
  await setVals({ '#vx1': '0', '#vx2': '10', '#vy1': '0', '#vy2': '100' });
  ok('축 네 점이 맞춰진다', await page.evaluate(() => !!TR));
  const mid = await page.evaluate(([u, v]) => toData(u, v), [ux(5), vy(50)]);
  ok('좌표 변환', near(mid[0], 5, 0.05) && near(mid[1], 50, 0.5), `(5, 50) → (${mid[0].toFixed(3)}, ${mid[1].toFixed(3)})`);

  await page.click('#eyedrop'); await click(ux(5), vy(25));
  await page.click('#run'); await page.waitForTimeout(350);
  const q = await page.evaluate(() => dataPts(S.ds[S.act]));
  let w1 = 0;
  for (const [x, y] of q) if (x >= 0.3 && x <= 9.7) w1 = Math.max(w1, Math.abs(y - x * x));
  ok('색으로 추출한 값이 y = x² 와 맞는다', q.length > 100 && w1 < 1.0, `${q.length}점, 최대 차이 ${w1.toFixed(3)} (세로 범위 100)`);

  await page.click('#dsAdd'); await page.click('#eyedrop'); await click(ux(5), vy(50));
  await page.click('#run'); await page.waitForTimeout(350);
  const q2 = await page.evaluate(() => dataPts(S.ds[S.act]));
  let w2 = 0;
  for (const [x, y] of q2) if (x >= 0.3 && x <= 9.7) w2 = Math.max(w2, Math.abs(y - 10 * x));
  ok('색이 다른 곡선을 따로 뽑는다', q2.length > 100 && w2 < 1.0, `${q2.length}점, 최대 차이 ${w2.toFixed(3)}`);

  await page.click('#dsAdd'); await click(ux(2), vy(40)); await click(ux(4), vy(60));
  const man = await page.evaluate(() => dataPts(S.ds[S.act]));
  ok('손으로 찍은 점', man.length === 2 && near(man[0][0], 2, 0.05) && near(man[0][1], 40, 0.4),
     man.map(p => `(${p[0].toFixed(2)}, ${p[1].toFixed(2)})`).join(' '));

  const csv = await page.evaluate(() => { S.fmt = 'csv'; return buildExport().text.split('\r\n')[0]; });
  ok('CSV 머리글에 데이터셋 이름이 들어간다', /x,.*y/.test(csv), csv);
  const jsonOk = await page.evaluate(() => {
    S.fmt = 'json'; const o = JSON.parse(buildExport().text); S.fmt = 'csv';
    return o.tool === 'plot-digitizer' && o.datasets.length === 3 && o.axes.x.to === 10;
  });
  ok('JSON 내보내기 모양', jsonOk);

  await page.keyboard.press('t'); await page.waitForTimeout(250);
  ok('데이터 표', await page.evaluate(() => document.querySelectorAll('#tbody tr').length) === 2);
  await page.evaluate(() => { undo(); });
  ok('되돌리기', await page.evaluate(() => S.ds[S.act].pts.length) === 1);
  await page.evaluate(() => { redo(); });

  await page.reload({ waitUntil: 'load' }); await page.waitForTimeout(700);
  const rest = await page.evaluate(() => ({ img: !!S.img, tr: !!TR, ds: S.ds.length }));
  ok('새로 고쳐도 하던 자리에서 이어진다', rest.img && rest.tr && rest.ds === 3, JSON.stringify(rest));

  // ── 2. 로그 축 · 검은 선 · 마커 · 영역 · 지우개 · 작업 파일 ───────────────
  console.log('\n로그-로그 축 (검은 곡선 y = 1e-3·x^0.7, 초록 마커 넷)');
  await fresh();
  await open(figs.log);
  const lx = x => 100 + (Math.log10(x) / 3) * 600, ly = y => 500 + ((Math.log10(y) + 3) / 3) * (-420);
  await page.check('#logx'); await page.check('#logy');
  await click(lx(1), ly(1e-3)); await click(lx(1000), ly(1e-3)); await click(lx(1), ly(1e-3)); await click(lx(1), ly(1));
  await setVals({ '#vx1': '1', '#vx2': '1000', '#vy1': '0.001', '#vy2': '1' });
  const pr = await page.evaluate(([u, v]) => toData(u, v), [lx(100), ly(0.1)]);
  ok('로그 좌표 변환', near(pr[0] / 100, 1, 0.02) && near(pr[1] / 0.1, 1, 0.02),
     `(100, 0.1) → (${pr[0].toPrecision(5)}, ${pr[1].toPrecision(5)})`);
  await setVals({ '#vy1': '0' });
  ok('로그 축에 0 을 넣으면 막는다', await page.evaluate(() => !TR && calErr === 'stLogBad'));
  await setVals({ '#vy1': '0.001' });

  await page.evaluate(() => { S.mode = 'dark'; S.tol = 110; S.algo = 'line'; renderAuto(); });
  await page.click('#run'); await page.waitForTimeout(400);
  const dk = await page.evaluate(() => dataPts(S.ds[S.act]));
  let wd = 0;
  for (const [x, y] of dk) if (x >= 1.3 && x <= 800) wd = Math.max(wd, Math.abs(y / (1e-3 * Math.pow(x, 0.7)) - 1));
  ok('검은 선 그림에서 뽑은 값', dk.length > 100 && wd < 0.05, `${dk.length}점, 최대 상대오차 ${(wd * 100).toFixed(2)}%`);

  const MARK = [[2, 0.004], [10, 0.02], [70, 0.09], [400, 0.4]];
  await page.click('#dsAdd'); await page.click('#eyedrop'); await click(lx(10), ly(0.02));
  await page.evaluate(() => { S.algo = 'blob'; S.minA = 20; S.tol = 60; renderAuto(); });
  await page.click('#run'); await page.waitForTimeout(300);
  const bl = await page.evaluate(() => dataPts(S.ds[S.act]));
  let mOk = bl.length === MARK.length;
  for (let i = 0; i < MARK.length && mOk; i++) {
    mOk = near(bl[i][0] / MARK[i][0], 1, 0.03) && near(bl[i][1] / MARK[i][1], 1, 0.03);
  }
  ok('마커(산점도) 자리', mOk, bl.map(p => `(${p[0].toPrecision(3)}, ${p[1].toPrecision(3)})`).join(' '));

  await page.click('#roiSet');
  await drag([lx(1.2), ly(0.9)], [lx(30), ly(1.1e-3)]);
  await page.evaluate(() => { S.algo = 'blob'; renderAuto(); });
  await page.click('#run'); await page.waitForTimeout(250);
  ok('영역을 지정하면 그 안만 뽑는다', await page.evaluate(() => S.ds[S.act].pts.length) === 2);

  await page.evaluate(() => { S.tool = 'erase'; renderAuto(); });
  await drag([lx(1.2), ly(0.9)], [lx(5), ly(1.1e-3)]);
  ok('지우개', await page.evaluate(() => S.ds[S.act].pts.length) === 1);
  await page.evaluate(() => { undo(); });
  ok('지우개 되돌리기', await page.evaluate(() => S.ds[S.act].pts.length) === 2);

  const proj = path.join(TMP, 'session.digi.json');
  fs.writeFileSync(proj, await page.evaluate(() => projectJSON()));
  await page.click('#clearImg'); await page.waitForTimeout(150);
  await page.setInputFiles('#projFile', proj); await page.waitForTimeout(700);
  const rt = await page.evaluate(() => ({ img: !!S.img, tr: !!TR, logx: S.logx, logy: S.logy, ds: S.ds.length, roi: !!S.roi }));
  ok('작업 파일 저장 → 다시 열기', rt.img && rt.tr && rt.logx && rt.logy && rt.ds === 2 && rt.roi, JSON.stringify(rt));

  // ── 3. 내장 예제 그림 ─────────────────────────────────────────────────────
  console.log('\n내장 예제 그림');
  await fresh();
  await page.click('#sampleBtn');
  await page.waitForFunction(() => !!S.img, null, { timeout: 8000 });
  await page.waitForTimeout(250);
  ok('예제 그림이 열리고 X1 이 물린다', await page.evaluate(() => S.imgW === 680 && armed === 'x1'));
  const ex = x => 92 + (x / 60) * 548, ey = y => 392 - (y / 300) * 348;
  await click(ex(0), ey(0)); await click(ex(60), ey(0)); await click(ex(0), ey(0)); await click(ex(0), ey(300));
  await setVals({ '#vx1': '0', '#vx2': '60', '#vy1': '0', '#vy2': '300' });
  await page.click('#eyedrop'); await click(ex(20), ey(280 * (1 - Math.exp(-20 / 14))));
  await page.click('#run'); await page.waitForTimeout(400);
  const sp = await page.evaluate(() => dataPts(S.ds[S.act]));
  let ws = 0;
  for (const [t, T] of sp) if (t >= 1 && t <= 58) ws = Math.max(ws, Math.abs(T - 280 * (1 - Math.exp(-t / 14))));
  ok('예제 곡선 A 를 되찾는다', sp.length > 80 && ws < 3, `${sp.length}점, 최대 차이 ${ws.toFixed(2)} ℃ (세로 범위 300)`);

  // ── 4. 자동 찾기: 격자선·범례·교차가 있는 빡센 그림 ───────────────────────
  console.log('\n곡선 자동 찾기 (색 곡선 셋 + 마커 + 격자선 + 범례)');
  const bx = x => 100 + (x / 10) * 600, by = y => 500 + (y / 100) * (-420);
  const rms = (rows, f) => {
    let s = 0, n = 0;
    for (const [x, y] of rows) { if (x < 0.3 || x > 9.7) continue; s += (y - f(x)) ** 2; n++; }
    return n ? Math.sqrt(s / n) : 1e9;
  };
  await fresh();
  await open(figs.busy);
  await click(bx(0), by(0)); await click(bx(10), by(0)); await click(bx(0), by(0)); await click(bx(0), by(100));
  await setVals({ '#vx1': '0', '#vx2': '10', '#vy1': '0', '#vy2': '100' });
  await page.click('#discover'); await page.waitForTimeout(700);
  const sets = await page.evaluate(() => S.ds.map(d => ({ color: d.color, rows: dataPts(d) })));
  ok('계열을 스스로 찾는다 (넷)', sets.length === 4,
     sets.map(d => `${d.color} ${d.rows.length}점`).join(' · '));
  const bestOf = f => sets.map(d => ({ d, e: rms(d.rows, f) })).sort((a, b) => a.e - b.e)[0];
  for (const [nm, f, col] of [['빨강 100−100e^(−x/2)', x => 100 - 100 * Math.exp(-0.5 * x), '#d62728'],
                              ['파랑 10x', x => 10 * x, '#1f77b4'],
                              ['검정 0.9x² (범례 글자 속에서)', x => 0.9 * x * x, '#15181c']]) {
    const b = bestOf(f);
    ok('  ' + nm, b.e < 0.5 && b.d.color === col, `색 ${b.d.color}, rms ${b.e.toFixed(3)} (세로 범위 100)`);
  }
  const MK2 = [1, 2.5, 4, 5.5, 7, 8.5].map(x => [x, 50 + 30 * Math.sin(x)]);
  const gr = sets.find(d => d.color === '#2ca02c');
  const mkOk = gr && gr.rows.length === MK2.length &&
    MK2.every((p, i) => near(gr.rows[i][0], p[0], 0.06) && near(gr.rows[i][1], p[1], 0.6));
  ok('  초록 마커 여섯 (범례 견본은 빼고)', !!mkOk, gr ? `${gr.rows.length}점` : '못 찾음');

  console.log('\n같은 색 곡선 둘이 교차');
  await fresh();
  await open(figs.cross);
  await click(bx(0), by(0)); await click(bx(10), by(0)); await click(bx(0), by(0)); await click(bx(0), by(100));
  await setVals({ '#vx1': '0', '#vx2': '10', '#vy1': '0', '#vy2': '100' });
  await page.click('#discover'); await page.waitForTimeout(700);
  const xs = await page.evaluate(() => S.ds.map(d => dataPts(d)));
  const up = xs.map(r => rms(r, x => 20 + 6 * x)).sort((a, b) => a - b)[0];
  const dn = xs.map(r => rms(r, x => 80 - 6 * x)).sort((a, b) => a - b)[0];
  ok('교차하는 두 곡선을 갈라 놓는다', xs.length === 2 && up < 0.3 && dn < 0.3,
     `${xs.length}개 · rms ${up.toFixed(3)} / ${dn.toFixed(3)}`);

  // ── 5. 내려받은 파일이 엑셀에서 안 깨지는지 (한글 머리글) ─────────────────
  console.log('\n내려받기');
  await page.evaluate(() => {
    S.ds = [{ name: '곡선 1', color: '#0072b2', on: true, pts: [[120, 300], [200, 250]] }];
    S.act = 0; renderAll();
  });
  const grab = async (fmt) => {
    await page.evaluate(f => { S.fmt = f; renderExport(); }, fmt);
    const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#dlBtn')]);
    const f = path.join(TMP, 'out.' + fmt);
    await dl.saveAs(f);
    return fs.readFileSync(f);
  };
  const csvBuf = await grab('csv');
  const head = csvBuf.subarray(0, 3);
  ok('CSV 파일에 UTF-8 표시(BOM)가 붙는다', head[0] === 0xEF && head[1] === 0xBB && head[2] === 0xBF,
     '첫 세 바이트 ' + [...head].map(b => b.toString(16).toUpperCase()).join(' '));
  const csvTxt = csvBuf.toString('utf8');
  ok('한글 머리글이 온전하다', csvTxt.includes('곡선 1 x') && csvTxt.includes('곡선 1 y'),
     JSON.stringify(csvTxt.split('\r\n')[0].replace('\uFEFF', '')));
  const jsonBuf = await grab('json');
  ok('JSON 에는 BOM 을 붙이지 않는다 (파서가 뱉는다)', jsonBuf[0] === 0x7B, '첫 바이트 ' + jsonBuf[0].toString(16));
  ok('JSON 이 그대로 읽힌다', JSON.parse(jsonBuf.toString('utf8')).datasets[0].name === '곡선 1');
  const clip = await page.evaluate(() => { S.fmt = 'csv'; return buildExport().text.charCodeAt(0); });
  ok('클립보드로는 BOM 없이 간다', clip !== 0xFEFF, 'U+' + clip.toString(16).toUpperCase());

  // ── 6. 어두운 화면 · 언어 ─────────────────────────────────────────────────
  console.log('\n화면');
  await page.click('#themeBtn');
  ok('어두운 화면', await page.evaluate(() => document.documentElement.dataset.theme) === 'dark');
  await page.evaluate(() => setLang('en'));
  ok('English', (await page.textContent('#tTitle')) === 'Plot Digitizer');
  await page.evaluate(() => setLang('ko'));
  ok('한국어', (await page.textContent('#tTitle')) === '그래프 디지타이저');

  ok('콘솔 오류 없음', errors.length === 0, errors.join(' | '));

  await browser.close(); srv.close();
  fs.rmSync(TMP, { recursive: true, force: true });
  console.log(failed ? `\n${failed}건 실패` : '\n모두 통과');
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error('\n터졌다: ' + e.stack); process.exit(1); });
