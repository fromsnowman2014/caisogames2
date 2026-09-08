/**
 * Turbo Dash browser test suite.
 *
 * Run with:  npm run setup && npm test
 *
 * Two things this suite exists to catch, both learned the hard way:
 *   1. The game must RENDER on Safari's engine, not just Chromium.
 *   2. When an environment refuses to run the game, that must be VISIBLE.
 *      A silent blank canvas is treated as a failure here, not a pass.
 */
import { webkit, chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { TARGETS, HOSTILE, SANDBOX_CSP } from './devices.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const GAME = path.join(HERE, '..', 'src', 'index.html');
const html = fs.readFileSync(GAME, 'utf8');
const SKY = [135, 206, 235];   // the canvas CSS background - "nothing drawn yet"

let pass = 0, fail = 0;
const ok = (c, m, extra) => {
  console.log((c ? '  PASS  ' : '  FAIL  ') + m + (extra ? '  ' + extra : ''));
  c ? pass++ : fail++;
};

async function open(engine, ctxOpts, { csp, init } = {}) {
  const browser = await engine.launch();
  const ctx = await browser.newContext(ctxOpts);
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  if (init) await page.addInitScript(init);
  await page.route('**/game.html', r => r.fulfill({
    status: 200,
    headers: { 'content-type': 'text/html; charset=utf-8',
               ...(csp ? { 'content-security-policy': csp } : {}) },
    body: html
  }));
  await page.goto('https://turbo-dash.test/game.html');
  await page.waitForTimeout(1500);
  return { browser, page, errors };
}

const probe = page => page.evaluate(sky => {
  const c = document.getElementById('game');
  const r = c.getBoundingClientRect();
  const boot = document.getElementById('boot');
  let drew = false;
  try {
    const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
    for (let i = 0; i < d.length; i += 4) {
      if (!(d[i] === sky[0] && d[i + 1] === sky[1] && d[i + 2] === sky[2])) { drew = true; break; }
    }
  } catch (e) { /* tainted or unavailable */ }
  return {
    w: Math.round(r.width), h: Math.round(r.height),
    drew,
    bootVisible: boot ? getComputedStyle(boot).display !== 'none' : false
  };
}, SKY);

console.log('\nTurbo Dash - browser tests\n');

// 1. The game renders on every target device, on Safari's engine.
console.log('WebKit (Safari engine) rendering:');
for (const t of TARGETS) {
  const { browser, page, errors } = await open(webkit, t.ctx);
  const s = await probe(page);
  ok(s.drew && s.w > 10 && s.h > 10 && !s.bootVisible && errors.length === 0,
     t.name, `${s.w}x${s.h} drew=${s.drew}` + (errors[0] ? ' ERR ' + errors[0] : ''));
  await browser.close();
}

// 2. Same on Chromium, to catch anything Safari happens to tolerate.
console.log('\nChromium rendering:');
for (const t of TARGETS.slice(0, 3)) {
  const { browser, page, errors } = await open(chromium, t.ctx);
  const s = await probe(page);
  ok(s.drew && !s.bootVisible && errors.length === 0, t.name, `${s.w}x${s.h}`);
  await browser.close();
}

// 3. Degraded environments must still play.
console.log('\nHostile environments (must still run):');
for (const h of HOSTILE) {
  const { browser, page, errors } = await open(webkit, TARGETS[0].ctx, { init: h.init });
  const s = await probe(page);
  ok(s.drew && !s.bootVisible, h.name, `drew=${s.drew}`);
  await browser.close();
}

// 4. THE REGRESSION THAT MATTERS: a sandboxed preview blocks the scripts.
//    The game cannot run, and that is fine - but it must SAY SO. A blank
//    canvas with no explanation is the bug being guarded against.
console.log('\nSandboxed preview (scripts blocked by CSP):');
{
  const { browser, page } = await open(webkit, TARGETS[0].ctx, { csp: SANDBOX_CSP });
  const s = await probe(page);
  const msg = await page.evaluate(() => {
    const b = document.getElementById('boot');
    return b ? b.innerText.replace(/\s+/g, ' ').trim().slice(0, 60) : '';
  });
  ok(s.bootVisible, 'boot screen explains the failure instead of a blank canvas',
     JSON.stringify(msg));
  await browser.close();
}

// 5. Evolution: the in-run form progression and its physics.
console.log('\nEvolution (변신):');
{
  const { browser, page } = await open(webkit, TARGETS[0].ctx);
  const e = await page.evaluate(() => {
    const o = {};
    const fall = () => { player.grounded = false; player.isJumping = true; player.velocityY = 6; };
    const airJump = () => { jumpBuffer = 5; jumpHeld = true; coyoteFrames = 0; tryJump(); };

    restart(); started = true; fall(); player.airJumps = maxAirJumps(); airJump();
    o.stage1HasNoAirJump = player.velocityY === 6;

    restart(); started = true; evolve();
    fall(); player.airJumps = maxAirJumps(); airJump();
    const j1 = player.velocityY;
    player.velocityY = 6; airJump();
    o.stage2DoubleJumpOnce = j1 < 0 && player.velocityY === 6;
    o.airJumpWeakerThanGround = j1 > JUMP_STRENGTH;

    restart(); started = true; evolve(); evolve();
    fall(); player.airJumps = maxAirJumps(); airJump(); const a = player.velocityY;
    player.velocityY = 6; airJump(); const c = player.velocityY;
    player.velocityY = 6; airJump();
    o.stage3TwoAirJumps = a < 0 && c < 0 && player.velocityY === 6;
    o.eachAirJumpWeaker = c > a;

    // glide belongs to stage 3 only, and can never gain height
    restart(); started = true; evolve(); evolve();
    player.grounded = false; player.velocityY = 9; player.airJumps = 0; jumpHeld = true;
    updatePlayer();
    o.glideSlowsFallNeverLifts = gliding && player.velocityY > 0 && player.velocityY <= 3.2;
    restart(); started = true;
    player.grounded = false; player.velocityY = 9; player.airJumps = 0; jumpHeld = true;
    updatePlayer();
    o.glideIsStage3Only = !gliding;

    // a completed mission drops a reachable core ahead of the player
    restart(); started = true; cores.length = 0;
    missions[0].target = 1; stats[missions[0].key] = 99; checkMissions();
    o.missionDropsCoreAhead = cores.length === 1 && cores[0].x > PLAYER_X;

    // missing it must not destroy the reward
    cores[0].x = -100; recycleWorld();
    o.missedCoreIsReoffered = cores.length === 1 && cores[0].x > PLAYER_X;

    // difficulty must track ability, or evolving trivialises the level
    restart(); scrollSpeed = 8;
    const r = [Math.round(jumpReach())];
    evolve(); r.push(Math.round(jumpReach()));
    evolve(); r.push(Math.round(jumpReach()));
    o.gapsScaleWithPower = r[2] > r[1] && r[1] > r[0];

    // and the form must not survive death
    restart(); evolve(); evolve(); restart();
    o.formResetsEachRun = stage === 0 && cores.length === 0;
    restart();
    return o;
  });
  for (const [k, v] of Object.entries(e)) ok(v === true, k);
  await browser.close();
}

// 6. The generator must never ask for a gap the current form cannot clear.
//    Reach is MEASURED by replaying the real physics, not estimated.
console.log('\nGap reachability vs measured physics:');
{
  const { browser, page } = await open(webkit, TARGETS[0].ctx);
  const rows = await page.evaluate(() => {
    function simulate(airJumps, canGlide, speed) {
      let y = 0, v = JUMP_STRENGTH, air = airJumps, f = 0;   // no hold: worst case
      while (f < 400) {
        if (air > 0 && v > 0 && y > -26) {
          v = JUMP_STRENGTH * 0.86 * Math.pow(0.82, airJumps - air); air--;
        }
        v += v < 0 ? GRAVITY : GRAVITY_FALL;
        if (v > MAX_FALL_SPEED) v = MAX_FALL_SPEED;
        y += v; f++;
        if (y >= 0 && f > 2) break;
      }
      return f * speed;
    }
    const out = [];
    for (let st = 0; st < STAGES.length; st++) {
      stage = st; scrollSpeed = 8; distance = 0;
      const real = simulate(STAGES[st].airJumps, STAGES[st].glide, 8);
      const hardest = gapRange()[1];
      out.push({ name: STAGES[st].name, real: Math.round(real),
                 hardest: Math.round(hardest), ratio: +(hardest / real).toFixed(2) });
    }
    stage = 0;
    return out;
  });
  for (const r of rows) {
    ok(r.ratio < 0.85, `${r.name}: hardest gap ${r.hardest}px vs ${r.real}px reach`,
       `ratio ${r.ratio}`);
  }
  await browser.close();
}

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
