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
    // (the all-time coin mission reads save.totalCoins, so both are primed -
    //  this line was a 1-in-7 flake before)
    //  ...and ONLY that one is primed, because priming both would also finish
    //  an all-time-coins mission sitting in another slot and drop two cores)
    missions[0].target = 1;
    if (missions[0].key === 'totalCoins') save.totalCoins = 99; else stats[missions[0].key] = 99;
    checkMissions();
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
    // SPIDER has no air jumps: its reach is ONE web swing, replayed on the
    // real functions (jump, web at the apex, swing, auto-release, land).
    function swingOnce() {
      restart(); started = true; platforms.length = 0;
      platforms.push({ x: -200, y: GROUND_Y, width: 100000, type: 'ground', fake: false,
                       crumble: false, crumbleTimer: -1, fallen: false, tufts: [] });
      stage = STAGES.length - 1; distance = 0; scrollSpeed = 8;
      const base = targetSpeed();
      player.y = GROUND_Y - PLAYER_H; player.grounded = true; player.velocityY = 0;
      jumpHeld = true; jumpBuffer = BUFFER_FRAMES;
      let dist = 0, webs = 0, wasOn = false;
      for (let f = 0; f < 900; f++) {
        updatePlayer(); const s = scrollSpeed; scrollWorld(); checkCollisions(); tryJump();
        if (web.active && !wasOn) webs++;
        wasOn = web.active;
        if (webs >= 1 && !web.active) jumpHeld = false;
        dist += s;
        scrollSpeed = frameSpeed();
        if (player.grounded && f > 5) break;
      }
      // normalise to the 8px/frame the other rows use
      return dist * (8 / base);
    }
    const out = [];
    for (let st = 0; st < STAGES.length; st++) {
      const real = STAGES[st].name === 'SPIDER'
        ? swingOnce()
        : (stage = st, simulate(STAGES[st].airJumps, STAGES[st].glide, 8));
      stage = st; scrollSpeed = 8; distance = 0;
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

// 7. Shop economy, and the skill gate on the strong items.
console.log('\nShop:');
{
  const { browser, page } = await open(webkit, TARGETS[0].ctx);
  const e = await page.evaluate(() => {
    const o = {};
    save.wallet = 0; save.owned = []; save.best = 0;
    save.equip = { hat: 'none', rocket: 'none', trail: 'none' };
    const cap = SHOP.hat[1], halo = SHOP.hat[4], turbo = SHOP.rocket[2];

    o.brokePlayerCannotBuy = buyItem('hat', cap) === false;
    save.wallet = 5000;
    o.buyDeductsAndEquips = buyItem('hat', cap) &&
      save.wallet === 5000 - cap.price && save.equip.hat === 'cap';
    o.cannotBuyTwice = buyItem('hat', cap) === false;

    // Money alone must never unlock the strong items - price gates time,
    // not skill, so the good ones also need a real distance record.
    save.wallet = 99999; save.best = 0;
    o.moneyAloneCannotUnlockHalo = lockReason('hat', halo) !== null;
    o.moneyAloneCannotUnlockTurbo = lockReason('rocket', turbo) !== null;
    save.best = 3000;
    o.recordUnlocksThem =
      lockReason('hat', halo) === null && lockReason('rocket', turbo) === null;

    // Effects
    buyItem('rocket', turbo); restart();
    o.turboStartsRunWinged = stage === 1;
    buyItem('hat', halo); restart();
    o.haloStartsRunShielded = power.shield === 1;
    save.equip.hat = 'none'; save.equip.rocket = 'none'; restart();
    o.withoutItemsStartsPlain = stage === 0 && power.shield === 0;

    // A slower world must also score more slowly, or it would be a free win.
    distance = 0;
    save.equip.rocket = 'none'; const fast = targetSpeed();
    save.equip.rocket = 'mini'; const slow = targetSpeed();
    o.slowPackTradesScoreForTime = slow < fast;
    save.equip.rocket = 'none';

    // A coin bonus must never reach score, or coins could buy a rank. The
    // Crown is applied at pickup now, so earn the coins for real.
    const earn = (n) => { for (let i = 0; i < n; i++) { coins.length = 0;
      coins.push({ x: PLAYER_X + PLAYER_W / 2, y: player.y + PLAYER_H / 2, collected: false });
      checkCollisions(); } };
    save.equip.hat = 'crown'; restart(); started = true; save.wallet = 0; walletCarry = 0;
    const s0 = score; earn(4); const crownScore = score - s0;
    const crownWallet = save.wallet;
    save.equip.hat = 'none'; restart(); started = true; save.wallet = 0; walletCarry = 0;
    const s1 = score; earn(4);
    o.coinBonusPaysWalletOnly = crownWallet === 5 && save.wallet === 4 &&
                                (score - s1) === crownScore;

    // Menus must pause the run rather than let it play on unseen.
    restart(); started = true; const d0 = distance;
    uiScreen = 'shop'; update(16); update(16);
    o.menuPausesTheRun = distance === d0;
    uiScreen = 'play'; restart();
    return o;
  });
  for (const [k, v] of Object.entries(e)) ok(v === true, k);
  await browser.close();
}

// 8. Cloud leaderboard. The game must be complete WITHOUT it, and must treat
//    other viewers' rows as untrusted input.
console.log('\nCloud leaderboard:');
{
  // (a) no cloud at all - the common case for a local file or plain web host
  const { browser, page } = await open(webkit, TARGETS[0].ctx);
  const off = await page.evaluate(() => ({
    state: cloudState,
    running: typeof elapsed === 'number' && elapsed > 0.2,
    boardStillOpens: (openBoard(), uiScreen === 'board')
  }));
  ok(off.state === 'off' && off.running && off.boardStillOpens,
     'game is complete with no cloud, and the board still opens', off.state);
  await browser.close();

  // (b) cloud present, including a hostile row
  const b2 = await webkit.launch();
  const c2 = await b2.newContext(TARGETS[0].ctx);
  const p2 = await c2.newPage();
  await p2.addInitScript(() => {
    const q = () => ({
      orderBy() { return q(); }, limit() { return q(); },
      onSnapshot(next) {
        setTimeout(() => next({ docs: [
          { id: 'ok', exists: true, data: () => ({ name: 'RIVAL', score: 900, meters: 100, stage: 'BLAZE' }) },
          { id: 'bad', exists: true, data: () => ({ name: 'Z'.repeat(90), score: 'nope', meters: null }) }
        ], size: 2, empty: false, docChanges: () => [], metadata: {} }), 20);
        return () => {};
      },
      doc: () => ({ set(d) { window.__set = d; return Promise.resolve(); } })
    });
    window.claude = { use: n => Promise.resolve(n === 'db' ? { collection: () => q() } : null) };
  });
  await p2.route('**/game.html', r => r.fulfill({
    status: 200, headers: { 'content-type': 'text/html; charset=utf-8' }, body: html }));
  await p2.goto('https://turbo-dash.test/game.html');
  await p2.waitForTimeout(1200);
  const on = await p2.evaluate(async () => {
    save.name = 'ME'; save.bestScore = 500; save.best = 90; lastSubmitted = -1;
    await submitScore();
    return {
      state: cloudState,
      rows: boardRows.length,
      sanitised: boardRows.every(r => r.name.length <= 14 &&
        typeof r.score === 'number' && isFinite(r.score) &&
        typeof r.meters === 'number' && isFinite(r.meters)),
      submittedName: window.__set ? window.__set.name : null
    };
  });
  ok(on.state === 'ready' && on.rows === 2, 'subscribes to the shared board', 'rows ' + on.rows);
  ok(on.sanitised === true, 'other viewers rows are sanitised before display');
  ok(on.submittedName === 'ME', 'posts one row for this player', JSON.stringify(on.submittedName));
  await b2.close();
}

// 9. NAME ENTRY. This exists because the name box was untypable in the real
//    world while every emulated test passed: synthetic taps focus an input
//    regardless, but a real device obeys preventDefault(). So assert on
//    defaultPrevented, which is the thing the device actually honours.
console.log('\nName entry (regression guards):');
{
  const { browser, page } = await open(webkit, TARGETS[0].ctx);
  const r = await page.evaluate(() => {
    const o = {};
    openBoard(); openNameModal();

    // iOS raises its keyboard only for a focus() made synchronously inside the
    // gesture; a deferred one focuses silently and looks like a dead box.
    o.focusHappensSynchronously =
      document.activeElement && document.activeElement.id === 'nameInput';

    const input = document.getElementById('nameInput');
    const cv = document.getElementById('game');
    const touch = (el) => {
      const ev = new Event('touchstart', { bubbles: true, cancelable: true });
      Object.defineProperty(ev, 'changedTouches', { value: [{ clientX: 10, clientY: 10 }] });
      el.dispatchEvent(ev);
      return ev.defaultPrevented;
    };
    // Cancelling the tap on the field is exactly what broke typing.
    o.tapOnNameFieldIsNotCancelled = touch(input) === false;
    // ...while the game surface must still cancel, or the page scrolls.
    o.tapOnGameIsStillCancelled = touch(cv) === true;

    const key = (code, k) => {
      const ev = new KeyboardEvent('keydown', { code, key: k, bubbles: true, cancelable: true });
      window.dispatchEvent(ev);
      return ev.defaultPrevented;
    };
    // W and SPACE are jump keys AND ordinary characters.
    o.spaceReachesTheNameField = key('Space', ' ') === false;
    o.wReachesTheNameField = key('KeyW', 'w') === false;

    // Validation
    save.name = 'KEEP';
    input.value = '   '; closeNameModal(true);
    o.blankNameIsRejected = save.name === 'KEEP';
    openNameModal(); input.value = 'NEWNAME'; closeNameModal(false);
    o.cancelDiscardsTheEdit = save.name === 'KEEP';
    openNameModal(); input.value = 'Y'.repeat(40); closeNameModal(true);
    o.longNameIsCapped = save.name.length === 14;
    openNameModal(); input.value = 'A' + String.fromCharCode(7) + 'B'; closeNameModal(true);
    o.controlCharsStripped = save.name === 'AB';

    closeMenu();
    return o;
  });
  for (const [k, v] of Object.entries(r)) ok(v === true, k);

  // The prompt clears its flag ~120ms after closing, to swallow the trailing
  // touchend of the tap that dismissed it. Wait that out before checking that
  // the game has taken the keyboard back.
  await page.waitForTimeout(300);
  const jump = await page.evaluate(() => {
    const ev = new KeyboardEvent('keydown', { code: 'Space', key: ' ', bubbles: true, cancelable: true });
    window.dispatchEvent(ev);
    return ev.defaultPrevented && jumpBuffer > 0;
  });
  ok(jump === true, 'SPACE still jumps during play');
  await browser.close();
}

// 10. Typing for real, through the browser's own input pipeline.
console.log('\nName entry (real typing):');
{
  const browser = await webkit.launch();
  const ctx = await browser.newContext(TARGETS[0].ctx);
  const page = await ctx.newPage();
  await page.route('**/game.html', r => r.fulfill({
    status: 200, headers: { 'content-type': 'text/html; charset=utf-8' }, body: html }));
  await page.goto('https://turbo-dash.test/game.html');
  await page.waitForTimeout(1200);
  await page.evaluate(() => { openBoard(); openNameModal(); });
  await page.click('#nameInput');
  await page.keyboard.type('WAVE WON', { delay: 20 });
  const typed = await page.evaluate(() => document.getElementById('nameInput').value);
  ok(typed === 'WAVE WON', 'types a name containing W and a space', JSON.stringify(typed));
  await page.keyboard.press('Enter');
  await page.waitForTimeout(250);
  const saved = await page.evaluate(() => ({ n: save.name, open: nameModalOpen }));
  ok(saved.n === 'WAVE WON' && !saved.open, 'Enter commits and closes', JSON.stringify(saved));
  await browser.close();
}

// 11. The board must always be able to show the player their own position.
console.log('\nBoard: your own row is never lost:');
{
  const browser = await webkit.launch();
  const ctx = await browser.newContext(TARGETS[0].ctx);
  const page = await ctx.newPage();
  await page.addInitScript(() => {
    const rows = [];
    for (let i = 0; i < 19; i++) rows.push({ id: 'r' + i, exists: true,
      data: () => ({ name: 'R' + i, score: 20000 - i * 700, meters: 3000, stage: 'BLAZE' }) });
    rows.push({ id: 'MINE', exists: true,
      data: () => ({ name: 'YOU', score: 1500, meters: 260, stage: 'RUNNER' }) });
    const q = () => ({ orderBy: () => q(), limit: () => q(),
      onSnapshot(next) { setTimeout(() => next({ docs: rows, size: rows.length,
        empty: false, docChanges: () => [], metadata: {} }), 20); return () => {}; },
      doc: () => ({ set: () => Promise.resolve() }) });
    window.claude = { use: n => Promise.resolve(n === 'db' ? { collection: () => q() } : null) };
  });
  await page.route('**/game.html', r => r.fulfill({
    status: 200, headers: { 'content-type': 'text/html; charset=utf-8' }, body: html }));
  await page.goto('https://turbo-dash.test/game.html');
  await page.waitForTimeout(1300);
  const r = await page.evaluate(() => {
    save.clientId = 'MINE';
    return { rows: boardRows.length, rank: myBoardRank() };
  });
  ok(r.rows === 20 && r.rank === 20,
     'a player outside the visible rows still has a findable rank',
     'rank ' + r.rank + ' of ' + r.rows);
  await browser.close();
}

// 12. LIVES. Three lives roughly triple how long a run lasts, which would
//     have tripled every score and made the existing leaderboard meaningless.
//     The revive cost is what keeps the board comparable, so it is tested as
//     carefully as the lives themselves.
console.log('\nLives:');
{
  const { browser, page } = await open(webkit, TARGETS[0].ctx);
  const e = await page.evaluate(() => {
    const o = {};
    restart(); started = true;
    o.runStartsWithThree = lives === 3;

    player.y = H + 200; checkCollisions();
    o.aFallSpendsALifeNotTheRun = lives === 2 && !gameOver;
    o.reviveLandsOnSolidGround = player.y < H && isFinite(player.y);
    o.reviveGrantsAMercyWindow = invuln > 0;

    // The cost.
    restart(); started = true; evolve(); evolve(); combo = 9;
    const st = stage;
    player.y = H + 200; checkCollisions();
    o.reviveCostsAnEvolutionStage = stage === st - 1;
    o.reviveWipesTheComboStreak = combo === 0;

    restart(); started = true;
    player.y = H + 200; checkCollisions();
    o.stageNeverFallsBelowBase = stage === 0;

    restart(); started = true; lives = 1;
    player.y = H + 200; checkCollisions();
    o.theLastLifeReallyEndsTheRun = gameOver && lives === 0;

    // Hearts, and the rubber-banding that decides when they appear.
    restart(); started = true; lives = 2;
    powerups.length = 0;
    powerups.push({ x: PLAYER_X + PLAYER_W / 2, y: player.y + PLAYER_H / 2,
                    type: 'heart', taken: false, bob: 0 });
    checkCollisions();
    o.aHeartRestoresALife = lives === 3;

    lives = MAX_LIVES;
    powerups.length = 0;
    powerups.push({ x: PLAYER_X + PLAYER_W / 2, y: player.y + PLAYER_H / 2,
                    type: 'heart', taken: false, bob: 0 });
    const sc = score; checkCollisions();
    o.livesAreCappedAndPayPointsInstead = lives === MAX_LIVES && score > sc;

    lives = MAX_LIVES; const full = heartChance();
    lives = 3; const mid = heartChance();
    lives = 1; const low = heartChance();
    o.noHeartsWhileHealthy = full === 0;
    o.heartsGetLikelierInTrouble = low > mid && mid > 0 && low <= 0.09;

    restart();
    o.livesResetEachRun = lives === 3;
    return o;
  });
  for (const [k, v] of Object.entries(e)) ok(v === true, k);
  await browser.close();
}

// 13. SUPER SUIT. Hold to fly, on a budget that only drains while held, so the
//     decision is WHEN to spend it rather than whether to hold the button.
console.log('\nSuper Suit:');
{
  const { browser, page } = await open(webkit, TARGETS[0].ctx);
  const e = await page.evaluate(() => {
    const o = {};
    const suit = SHOP.rocket[3];
    save.wallet = 99999; save.best = 0;
    o.moneyAloneCannotUnlockTheSuit = lockReason('rocket', suit) !== null;
    save.best = 9999; buyItem('rocket', suit);

    restart(); started = true;
    o.startsWithAFullTank = flightMeter === FLIGHT_FRAMES;

    player.y = 300; player.velocityY = 0; player.grounded = false; jumpHeld = true;
    const y0 = player.y;
    for (let i = 0; i < 30; i++) updatePlayer();
    o.holdingLiftsThePlayer = player.y < y0;
    o.theClimbIsSlowNotExplosive = player.velocityY < 0 && player.velocityY > FLY_RISE - 0.5;

    jumpHeld = false; const y1 = player.y;
    for (let i = 0; i < 20; i++) updatePlayer();
    o.releasingDrops = player.y > y1;

    // The budget is the whole design: it must not tick away while idle.
    restart(); started = true; jumpHeld = false; player.grounded = false;
    for (let i = 0; i < 60; i++) updatePlayer();
    o.tankHoldsSteadyWhenNotFlying = flightMeter === FLIGHT_FRAMES;
    jumpHeld = true;
    for (let i = 0; i < 60; i++) updatePlayer();
    o.tankDrainsOnlyWhileHeld = flightMeter === FLIGHT_FRAMES - 60;

    restart(); started = true; jumpHeld = true; player.grounded = false; player.y = 100;
    for (let i = 0; i < 200; i++) updatePlayer();
    o.cannotFlyOffTheTopOfTheWorld = player.y >= FLY_CEIL - 0.01;
    o.flightDoesNotFarmTheBigAirBonus = airFrames === 0;

    // The suit is permanent for the run: an empty tank stops the flight, and
    // running on the ground fills it again. It used to burn out for good at
    // this moment - mid-air, by definition - which is what killed people.
    restart(); started = true; jumpHeld = true; player.grounded = false; player.y = 300;
    for (let i = 0; i < FLIGHT_FRAMES + 40; i++) updatePlayer();
    o.anEmptyTankStopsTheFlight = flightMeter === 0 && flying === false;
    o.theSuitIsNotGone = hasSuit() === true;
    // ...and while still held in the air, the fall is a glide, not a plunge
    o.anEmptyTankGlidesDownWhileHeld = gliding === true && player.velocityY <= 3.2;
    jumpHeld = false; updatePlayer(); updatePlayer();
    o.releasingDropsNormally = gliding === false && player.velocityY > 3.2;
    player.grounded = true; player.velocityY = 0; jumpHeld = false;
    for (let i = 0; i < 100; i++) updatePlayer();
    o.theTankRefillsOnTheGround = flightMeter > 100;
    o.noRefillWhileHovering = (() => { const f = flightMeter; player.grounded = false; for (let i = 0; i < 30; i++) updatePlayer(); return flightMeter === f; })();
    player.grounded = true; player.velocityY = 0; jumpBuffer = 5; jumpHeld = true; flightMeter = 0;
    tryJump();
    o.normalJumpingWorksWhileTheTankIsDry = player.velocityY === JUMP_STRENGTH;

    save.equip.rocket = 'none'; restart(); started = true;
    player.grounded = false; player.y = 300; player.velocityY = 0; jumpHeld = true;
    const y2 = player.y;
    for (let i = 0; i < 20; i++) updatePlayer();
    o.withoutTheSuitNothingFlies = player.y > y2 && flying === false;

    save.equip.rocket = 'none'; restart();
    return o;
  });
  for (const [k, v] of Object.entries(e)) ok(v === true, k);
  await browser.close();
}

// 14. LEVELS AND THE NEW HAZARDS.
console.log('\nLevels and hazards:');
{
  const { browser, page } = await open(webkit, TARGETS[0].ctx);
  const e = await page.evaluate(() => {
    const o = {};
    restart();
    distance = 0;      o.startsAtLevelOne = levelOf() === 1;
    distance = 29999;  o.reachesLevelTen = levelOf() === 10;
    distance = 999999; o.levelIsCapped = levelOf() === 10;
    o.everyLevelIsNamed = LEVELS.length === 10 && LEVELS.every(l => l.name);

    // Hazards arrive one at a time, each with a level to itself to learn it.
    distance = 0;         o.noHazardsAtTheStart = crumbleChance() === 0 && fakeChance() === 0;
    distance = 3000 * 2;  o.crumblersFromLevelThree = crumbleChance() > 0 && fakeChance() === 0;
    distance = 3000 * 5;  o.fakesFromLevelSix = fakeChance() > 0;   // moved: level 6 is MIRAGE now
    distance = 29999;     o.hazardRatesStayBounded = crumbleChance() <= 0.45 && fakeChance() <= 0.40;

    // A fake is scenery and must never hold the player up.
    restart(); started = true;
    platforms.length = 0;
    platforms.push({ x: PLAYER_X - 40, y: 300, width: 200, type: 'floating',
                     fake: true, revealed: 0, crumble: false, crumbleTimer: -1,
                     fallen: false, tufts: null });
    player.y = 300 - PLAYER_H; player.velocityY = 4; player.grounded = false;
    checkCollisions();
    o.aFakeNeverCatchesYou = !player.grounded;
    o.aFakeRevealsItselfOnContact = platforms[0].revealed === 1;

    // A crumbler catches you first, warns, then lets go.
    restart(); started = true;
    platforms.length = 0;
    platforms.push({ x: PLAYER_X - 40, y: 300, width: 200, type: 'floating',
                     fake: false, crumble: true, crumbleTimer: -1, fallen: false, tufts: null });
    player.y = 300 - PLAYER_H; player.velocityY = 4;
    player.grounded = false; player.isJumping = true;
    checkCollisions();
    const plat = platforms[0];
    o.aCrumblerCatchesYouFirst = player.grounded === true;
    o.landingLightsTheFuse = plat.crumbleTimer === CRUMBLE_FRAMES;
    o.theFuseGivesRealWarningTime = CRUMBLE_FRAMES >= 40;
    for (let i = 0; i < CRUMBLE_FRAMES; i++) updateCrumbling();
    o.theCrumblerThenCollapses = plat.fallen === true;
    player.y = 300 - PLAYER_H; player.velocityY = 4; player.grounded = false;
    checkCollisions();
    o.aCollapsedSlabHoldsNothing = !player.grounded;

    // THE FAIRNESS RULE: the real route must be walkable ignoring every fake.
    restart(); distance = 29999;
    for (let i = 0; i < 250; i++) generatePlatform();
    const reals = platforms.filter(q => !q.fake);
    let worst = 0, backwards = 0;
    for (let k = 1; k < reals.length; k++) {
      const g = reals[k].x - (reals[k - 1].x + reals[k - 1].width);
      if (g < 0) backwards++;
      worst = Math.max(worst, g);
    }
    o.theRealRouteNeverNeedsAFake = backwards === 0 && worst < 400;
    restart();
    return o;
  });
  for (const [k, v] of Object.entries(e)) ok(v === true, k);
  await browser.close();
}

// 15. THE COIN BALLOON. It used to be a merchant that SOLD a power for 60
//     coins out of the wallet, and that is precisely what made a real player
//     finish a run with "+78 this run" printed over a wallet that had fallen
//     by 42. It now pays 60 instead of taking 60. These checks pin the two
//     things that must stay true: it never reduces the wallet, and it never
//     touches the score.
console.log('\nCoin balloon:');
{
  const { browser, page } = await open(webkit, TARGETS[0].ctx);
  const e = await page.evaluate(() => {
    const o = {};
    const put = () => { powerups.length = 0;
      powerups.push({ x: PLAYER_X + PLAYER_W / 2, y: player.y + PLAYER_H / 2,
                      type: 'balloon', taken: false, bob: 0 });
      return powerups[0]; };

    // Offered to everyone. The merchant demanded 60 coins before it would even
    // appear, so the players who needed coins most never saw one.
    restart(); save.wallet = 0;
    o.offeredEvenWithAnEmptyWallet = balloonChance() > 0;
    save.wallet = 5000;
    o.stillOfferedWhenRich = balloonChance() > 0;

    // Popping it PAYS. This is the whole point of the rework.
    restart(); started = true; save.wallet = 200; save.equip.hat = 'none';
    const s0 = score;
    let m = put(); checkCollisions();
    o.poppingPaysTheWallet = save.wallet === 200 + BALLOON_COINS && m.taken;
    o.poppingNeverCostsCoins = save.wallet > 200;
    // ...into the WALLET only. A balloon that paid score would let a patient
    // player buy leaderboard position, which the economy exists to prevent.
    o.poppingPaysNoScore = score === s0;

    // It counts toward the run's banked total, so the end screen's "+N this
    // run" includes it and the number is not a lie in the other direction.
    o.countsTowardTheRunTotal = runBanked >= BALLOON_COINS;
    o.countedSeparatelyFromCaughtCoins = stats.runCoins === 0 && balloonsPopped === 1;

    // The Crown is a coin bonus, so it applies here too.
    restart(); started = true; save.owned.push('hat:crown'); save.equip.hat = 'crown';
    save.wallet = 0; put(); checkCollisions();
    o.crownBoostsBalloonsToo = save.wallet > BALLOON_COINS;
    save.equip.hat = 'none';

    // Banked on contact, not at the end of the run: an abandoned run keeps it.
    restart(); started = true; save.wallet = 0; put(); checkCollisions();
    o.bankedImmediatelyNotOnDeath = save.wallet === BALLOON_COINS && !gameOver;

    // Nothing in the world sells anything any more.
    o.nothingSellsPowersAnyMore =
      typeof window.buyFromMerchant === 'undefined' &&
      typeof window.MERCHANT_PRICE === 'undefined';

    // Powers still reach the player - they simply fall free now.
    restart(); distance = 0;      const early = powerChance();
    distance = 9000;              const late = powerChance();
    o.freePowerupsStillArrive = early > 0 && late > early;

    restart();
    return o;
  });
  for (const [k, v] of Object.entries(e)) ok(v === true, k);
  await browser.close();
}

// 15b. THE WALLET LEDGER. The reported bug was not lost coins - saving worked
//      perfectly - it was an end screen that reported earnings while something
//      else quietly spent the savings. The fix is an accounting invariant:
//      walletBefore + gain - spent === walletAfter, always.
console.log('\nWallet ledger is honest:');
{
  const { browser, page } = await open(webkit, TARGETS[0].ctx);
  const e = await page.evaluate(() => {
    const o = {};
    const ledgerHolds = (setup, pre) => {
      restart(); started = true; save.equip.hat = 'none';
      if (pre) pre();                     // arrange the world BEFORE the baseline
      const before = save.wallet;
      setup();
      lives = 1; die('fall');
      return before + runWalletGain - runWalletSpent === save.wallet;
    };

    o.holdsForPlainCoins = ledgerHolds(() => {
      for (let i = 0; i < 31; i++) collectCoin({ x: 0, y: 0, collected: false });
    });

    o.holdsWithBalloons = ledgerHolds(() => {
      for (let i = 0; i < 12; i++) collectCoin({ x: 0, y: 0, collected: false });
      for (let i = 0; i < 3; i++) popBalloon({ x: 0, y: 0 });
    });

    // The shop is reachable mid-run (pause screen, LIFE LOST screen), so a
    // purchase is the one thing left that can take coins out during a run.
    // It must be REPORTED, not hidden.
    o.holdsWhenTheShopIsUsedMidRun = ledgerHolds(() => {
      for (let i = 0; i < 20; i++) collectCoin({ x: 0, y: 0, collected: false });
      buyItem('trail', SHOP.trail[1]);
    }, () => { save.wallet = 3000; save.best = 9999; save.owned = []; });
    o.midRunSpendingIsShown = runWalletSpent === 200;

    // ...and a purchase made AFTER the run ended is not the run's business.
    const shownBefore = runWalletSpent;
    buyItem('trail', SHOP.trail[2]);
    o.spendingAfterTheRunIsNotBackdated = runWalletSpent === shownBefore;

    // Every counter starts clean, or a second run inherits the first's ledger.
    restart();
    o.countersResetBetweenRuns =
      runBanked === 0 && runSpent === 0 && balloonCoins === 0 && balloonsPopped === 0;
    return o;
  });
  for (const [k, v] of Object.entries(e)) ok(v === true, k);
  await browser.close();
}

// 15c. COINS SURVIVE. The user asked outright whether saving works. It does,
//      and this is what proves it: a reload, an abandoned run, and a store
//      that refuses to work at all.
console.log('\nCoins survive:');
{
  const { browser, page } = await open(webkit, TARGETS[0].ctx);

  await page.evaluate(() => {
    restart(); started = true; save.wallet = 0; persist();
    for (let i = 0; i < 24; i++) collectCoin({ x: 0, y: 0, collected: false });
    popBalloon({ x: 0, y: 0 });
  });
  const mid = await page.evaluate(() => save.wallet);
  await page.reload();
  await page.waitForTimeout(1500);
  const afterReload = await page.evaluate(() => save.wallet);
  ok(afterReload === mid, 'coins survive a reload', `${mid} -> ${afterReload}`);

  // No death, no game-over screen, no clean ending at all - the app-switch case.
  await page.evaluate(() => {
    restart(); started = true;
    for (let i = 0; i < 9; i++) collectCoin({ x: 0, y: 0, collected: false });
  });
  const mid2 = await page.evaluate(() => save.wallet);
  await page.reload();
  await page.waitForTimeout(1500);
  const afterAbandon = await page.evaluate(() => save.wallet);
  ok(afterAbandon === mid2, 'coins from an ABANDONED run survive', `${mid2} -> ${afterAbandon}`);
  await browser.close();

  // A store that throws on every access must be detected, not mistaken for a
  // working one, and must be SAID so on the screen where the wallet is read.
  const { browser: b2, page: p2 } = await open(webkit, TARGETS[0].ctx, {
    init: () => {
      Object.defineProperty(window, 'localStorage',
        { configurable: true, get() { throw new Error('blocked'); } });
    }
  });
  const blocked = await p2.evaluate(() => {
    restart(); started = true;
    for (let i = 0; i < 4; i++) collectCoin({ x: 0, y: 0, collected: false });
    lives = 1; die('fall');
    render();
    return { storageOk, gameOver, wallet: save.wallet };
  });
  ok(blocked.storageOk === false, 'a blocked store is detected', JSON.stringify(blocked));
  ok(blocked.gameOver === true, 'the game still plays with no store at all');
  await b2.close();
}

// 16. PETS. The rule: a pet may ease the RUN or fatten the WALLET, never
//     inflate the SCORE.
console.log('\nPets:');
{
  const { browser, page } = await open(webkit, TARGETS[0].ctx);
  const e = await page.evaluate(() => {
    const o = {};
    o.threePetsOfferedPlusNone = SHOP.pet.length === 4;
    save.wallet = 99999; save.best = 0;
    o.strongPetsNeedARecordNotJustMoney =
      lockReason('pet', SHOP.pet[2]) !== null && lockReason('pet', SHOP.pet[3]) !== null;
    save.best = 9999;

    // Pup: gathers coins, and the help lands in the wallet only.
    buyItem('pet', SHOP.pet[1]); restart(); started = true;
    coins.length = 0;
    coins.push({ x: PLAYER_X + 120, y: player.y + PLAYER_H / 2, collected: false });
    const before = coins[0].x;
    for (let i = 0; i < 10; i++) updatePet();
    o.pupDrawsCoinsIn = coins[0].x < before;

    const scoreOf = (pet) => {
      save.equip.pet = pet; restart(); started = true;
      const s0 = score;
      coins.length = 0;
      coins.push({ x: PLAYER_X + PLAYER_W / 2, y: player.y + PLAYER_H / 2, collected: false });
      checkCollisions();
      return score - s0;
    };
    o.pupAddsNothingToScore = scoreOf('pup') === scoreOf('none');

    save.equip.pet = 'pup'; restart(); started = true; save.wallet = 0;
    coins.length = 0;
    coins.push({ x: PLAYER_X + PLAYER_W / 2, y: player.y + PLAYER_H / 2, collected: false });
    checkCollisions();
    o.pupBonusLandsInTheWalletLive = save.wallet === 4;   // 1 coin + 3 bonus, at once

    save.equip.pet = 'bird'; o.onlyTheBirdSpotsFakes = birdSpotsFakes() === true;
    save.equip.pet = 'pup';  o.othersDoNot = birdSpotsFakes() === false;

    // Cub spares the FORM once - it does not hand out lives.
    save.equip.pet = 'cub'; restart(); started = true;
    evolve(); evolve();
    const st = stage, lv = lives;
    player.y = H + 200; checkCollisions();
    o.cubSparesTheFormOnce = stage === st && cubUsed;
    o.cubStillCostsTheLife = lives === lv - 1;
    const st2 = stage;
    player.y = H + 200; checkCollisions();
    o.cubOnlyWorksOncePerRun = stage === st2 - 1;
    restart(); o.cubRechargesNextRun = cubUsed === false;

    save.equip.pet = 'none'; restart();
    return o;
  });
  for (const [k, v] of Object.entries(e)) ok(v === true, k);
  await browser.close();
}

// 17. Announcements must never overlap each other.
console.log('\nBanner queue:');
{
  const { browser, page } = await open(webkit, TARGETS[0].ctx);
  const e = await page.evaluate(() => {
    const o = {};
    restart(); started = true; bannerQueue = []; banner = null;
    // 2100m is genuinely both a zone change and a level change.
    pushBanner('ZONE 4', 'FROST PEAKS', '', '#FFE066');
    pushBanner('LEVEL 7', 'HIGH WIRE', 'Narrower platforms', '#FFB86C');
    pushBanner('STAGE 2', 'WINGED', 'DOUBLE JUMP', '#E9D5FF');
    updateBanners();
    o.onlyOneShowsAtATime = banner !== null && bannerQueue.length === 2;
    const first = banner.sub;
    for (let i = 0; i < 200; i++) updateBanners();
    o.theNextOneStillGetsItsTurn = banner !== null && banner.sub !== first;
    for (let i = 0; i < 40; i++) pushBanner('X', 'Y', '', '#fff');
    o.theQueueStaysBounded = bannerQueue.length <= 3;
    restart();
    o.theQueueClearsBetweenRuns = bannerQueue.length === 0 && banner === null;
    return o;
  });
  for (const [k, v] of Object.entries(e)) ok(v === true, k);
  await browser.close();
}

// 18. THE WALLET. Coins were always banked correctly, but the game never
//     showed a running total, so a player saving up across several runs had
//     no way to see it and reasonably concluded their coins were being wiped.
//     These lock in both the data AND the fact that it is visible.
console.log('\nWallet:');
{
  const { browser, page } = await open(webkit, TARGETS[0].ctx);
  const e = await page.evaluate(() => {
    const o = {};
    const runWorth = (n) => {
      restart(); started = true; walletCarry = 0;
      for (let i = 0; i < n; i++) { coins.length = 0;
        coins.push({ x: PLAYER_X + PLAYER_W / 2, y: player.y + PLAYER_H / 2, collected: false });
        checkCollisions(); }
      lives = 1; die('fall');
    };
    save.wallet = 0; save.totalCoins = 0; save.owned = []; save.best = 9999;
    runWorth(40); const a = save.wallet;
    runWorth(35); const b2 = save.wallet;
    runWorth(25);
    o.coinsAccumulateAcrossRuns = a === 40 && b2 === 75 && save.wallet === 100;

    // the savings goal that makes the accumulation legible
    save.wallet = 0;
    const nu = nextUnlock();
    o.thereIsAVisibleSavingsGoal = !!nu && nu.item.price > 0;
    o.theGoalIsTheCheapestOneLeft = !SHOP[nu.slot].some(i =>
      i.price > 0 && i.price < nu.item.price && !hasItem(nu.slot, i.id) &&
      (!i.needBest || save.best >= i.needBest));
    save.wallet = 999999;
    o.noGoalOnceEverythingIsAffordable = nextUnlock() === null;
    // never dangle something the player has not earned the record for
    save.wallet = 0; save.best = 0;
    const nu2 = nextUnlock();
    o.recordLockedItemsAreNotDangled = !nu2 || !nu2.item.needBest;
    save.best = 9999;
    restart();
    return o;
  });
  for (const [k, v] of Object.entries(e)) ok(v === true, k);

  // and it survives a reload, which is what the player actually experiences
  await page.evaluate(() => { save.wallet = 777; persist(); });
  await page.reload();
  await page.waitForTimeout(1100);
  const kept = await page.evaluate(() => save.wallet);
  ok(kept === 777, 'the wallet survives a reload', String(kept));
  await browser.close();
}

// 19. HERO, the fourth evolution. Flight had been locked behind a 2600-coin
//     item, which is the one thing this game has never done - every other
//     strong power is reachable by playing well.
console.log('\nHERO evolution:');
{
  const { browser, page } = await open(webkit, TARGETS[0].ctx);
  const e = await page.evaluate(() => {
    const o = {};
    const toHero = () => { restart(); started = true; evolve(); evolve(); evolve(); };

    o.thereAreSixStages = STAGES.length === 6 && STAGES[3].name === 'HERO' &&
                          STAGES[4].name === 'JET' && STAGES[5].name === 'SPIDER';
    restart(); started = true; evolve(); evolve();
    cores.length = 0; spawnEvolutionCore();
    o.aThirdCoreIsOfferedAfterBlaze = cores.length === 1;
    evolve(); cores.length = 0; spawnEvolutionCore();
    o.aFourthCoreIsOfferedAfterHero = cores.length === 1;
    evolve(); evolve(); cores.length = 0; spawnEvolutionCore();
    o.nothingIsOfferedBeyondSpider = cores.length === 0;

    toHero();
    o.heroHasFourJumps = 1 + maxAirJumps() === 4;
    o.heroArrivesFuelled = heroFuel === HERO_FLIGHT_MAX;

    player.grounded = false; player.y = 300; player.velocityY = 0; jumpHeld = true;
    const y0 = player.y;
    for (let i = 0; i < 30; i++) updatePlayer();
    o.heroCanFly = player.y < y0 && flying === true;
    const low = heroFuel;
    o.flyingDrainsTheFuel = low < HERO_FLIGHT_MAX;

    jumpHeld = false; player.grounded = true;
    for (let i = 0; i < 60; i++) updatePlayer();
    o.fuelRefillsOnTheGround = heroFuel > low;
    const mid = heroFuel; player.grounded = false;
    for (let i = 0; i < 60; i++) updatePlayer();
    o.fuelNeverRefillsMidAir = heroFuel === mid;

    // hovering forever must be impossible by construction
    toHero(); player.grounded = false; jumpHeld = true; player.y = 300;
    for (let i = 0; i < HERO_FLIGHT_MAX + 200; i++) updatePlayer();
    o.theFuelRunsOutAndYouFall = heroFuel <= 0 && !flying && player.velocityY > 0;

    // The Super Suit must still be worth its price.
    save.wallet = 99999; save.best = 9999;
    buyItem('rocket', SHOP.rocket[3]);
    restart(); started = true;
    o.theSuitStillFliesFromSecondOne = hasSuit() && stage === 1;
    o.theSuitsBudgetIsFarBigger = FLIGHT_FRAMES > HERO_FLIGHT_MAX * 3;
    // the suit starts the run at WINGED, and there are forms above HERO now,
    // so evolve BY NAME rather than by count
    restart(); started = true; while (stageDef().name !== 'HERO') evolve();
    const f0 = flightMeter, h0 = heroFuel;
    player.grounded = false; jumpHeld = true;
    for (let i = 0; i < 30; i++) updatePlayer();
    o.theFiniteBudgetIsSpentFirst = flightMeter < f0 && heroFuel === h0;
    for (let i = 0; i < FLIGHT_FRAMES + 10; i++) updatePlayer();
    o.anEmptySuitLeavesHeroFlightIntact = flightMeter === 0 && heroCanFly();
    save.equip.rocket = 'none';

    // Gaps are sized for JUMPS, never assuming flight - an empty tank must
    // never leave the player facing a gap they cannot jump.
    restart(); scrollSpeed = 8;
    const widths = [];
    for (let st = 0; st < 4; st++) { stage = st; widths.push(gapRange()[1]); }
    o.gapsGrowWithEachStage = widths.every((v, i) => i === 0 || v > widths[i - 1]);
    stage = 3;
    o.heroGapsAssumeJumpsNotFlight = gapRange()[1] < 864 * 0.8;
    restart();
    return o;
  });
  for (const [k, v] of Object.entries(e)) ok(v === true, k);
  await browser.close();
}

// 20. COINS BANK ON PICKUP. Coins used to be credited only in finishRun(),
//     on the final death - so a run abandoned mid-way (tab closed, app
//     switched, page reclaimed by iOS) lost every coin it had earned. On a
//     phone that is the normal way to stop playing.
console.log('\nCoins bank on pickup:');
{
  const { browser, page } = await open(webkit, TARGETS[0].ctx);
  const e = await page.evaluate(() => {
    const o = {};
    o.storageProbePassed = storageOk === true;
    restart(); started = true; save.wallet = 100; walletCarry = 0; persist();
    const grab = () => { coins.length = 0;
      coins.push({ x: PLAYER_X + PLAYER_W / 2, y: player.y + PLAYER_H / 2, collected: false });
      checkCollisions(); };
    grab(); o.aCoinBanksTheMomentItIsTaken = save.wallet === 101 && !gameOver;
    grab(); grab(); o.everyCoinBanksAtOnce = save.wallet === 103;
    // the game-over total must equal what was banked, never double it
    lives = 1; die('fall');
    o.gameOverDoesNotDoubleCount = save.wallet === 103 && runWalletGain === 3;
    return o;
  });
  for (const [k, v] of Object.entries(e)) ok(v === true, k);

  // The bug itself: abandon the run, reload, and the coins must still be there.
  await page.evaluate(() => {
    restart(); started = true; save.wallet = 500; walletCarry = 0; persist();
    for (let i = 0; i < 7; i++) { coins.length = 0;
      coins.push({ x: PLAYER_X + PLAYER_W / 2, y: player.y + PLAYER_H / 2, collected: false });
      checkCollisions(); }
    document.dispatchEvent(new Event('visibilitychange'));
    window.dispatchEvent(new Event('pagehide'));
  });
  await page.reload();
  await page.waitForTimeout(1100);
  const kept = await page.evaluate(() => save.wallet);
  ok(kept === 507, 'an abandoned run keeps its coins across a reload', String(kept));
  await browser.close();
}

// 21. LIFE LOST pauses the run. Losing a life is the one moment a runner can
//     stop without breaking anything - momentum is already zero - and it is
//     where the player gets to decide whether to shop.
console.log('\nLife-lost pause:');
{
  const { browser, page } = await open(webkit, TARGETS[0].ctx);
  const e = await page.evaluate(() => {
    const o = {};
    restart(); started = true; evolve();
    player.y = H + 200; checkCollisions();
    o.losingALifeFreezesTheRun = lifePause && !gameOver && lives === 2;
    const d0 = distance;
    update(16); update(16);
    o.theWorldHoldsWhileFrozen = distance === d0;

    // The screen is now guarded against the taps still in flight from the
    // moment of death: nothing is accepted for RESUME_LOCK frames, and after
    // that only CONTINUE - never a stray tap.
    const space = () => window.dispatchEvent(new KeyboardEvent('keydown',
      { code: 'Space', key: ' ', bubbles: true, cancelable: true }));
    space();
    o.spaceIsSwallowedDuringTheLockout = lifePause === true;
    o.aStrayTapNeverResumes = routePress(-9999, -9999) === true && lifePause === true;
    for (let i = 0; i < RESUME_LOCK + 2; i++) update(16);
    o.aStrayTapStillNeverResumes = routePress(-9999, -9999) === true && lifePause === true;
    space();
    o.spaceResumesOnceUnlocked = lifePause === false && jumpBuffer === 0;
    o.resumeGrantsMercy = invuln >= REVIVE_INVULN;
    update(16);
    o.theWorldMovesAgainAtOnce = distance > d0;       // no deferred hit-stop

    restart(); started = true;
    player.y = H + 200; checkCollisions();
    openShop();
    o.theShopOpensFromThePause = uiScreen === 'shop' && lifePause;
    closeMenu();
    o.closingTheShopReturnsToThePause = uiScreen === 'play' && lifePause;

    restart(); started = true; lives = 1;
    player.y = H + 200; checkCollisions();
    o.theFinalDeathSkipsThePause = gameOver && !lifePause;
    restart();
    return o;
  });
  for (const [k, v] of Object.entries(e)) ok(v === true, k);
  await browser.close();
}

// 22. SAVE ON EVERY CHANGE. The throttle that preceded this left a window of
//     unsaved progress that iOS could reclaim; and saving more often makes a
//     corrupt write more likely, so the backup copy is guarded as carefully.
console.log('\nSave on every change:');
{
  const { browser, page } = await open(webkit, TARGETS[0].ctx);
  const e = await page.evaluate(() => {
    const o = {};
    const onDisk = () => JSON.parse(localStorage.getItem(SAVE_KEY)).wallet;
    restart(); started = true; save.wallet = 100; walletCarry = 0; persist();
    const grab = () => { coins.length = 0;
      coins.push({ x: PLAYER_X + PLAYER_W / 2, y: player.y + PLAYER_H / 2, collected: false });
      checkCollisions(); };
    grab(); o.aCoinIsOnDiskAtOnce = onDisk() === 101;
    grab(); grab(); o.noThrottleWindowRemains = onDisk() === 103 && onDisk() === save.wallet;
    const n0 = saveCount; persist(); persist();
    o.unchangedStateIsNotRewritten = saveCount === n0;
    o.theSavedTickLights = savedFlash > 0 && storageOk === true;

    // rotation keeps the previous state as a backup
    save.wallet = 4321; persist(); save.wallet = 4322; persist();
    o.backupHoldsThePreviousState =
      JSON.parse(localStorage.getItem(SAVE_KEY_BACKUP)).wallet === 4321;

    // a corrupt primary must never be rotated INTO the backup
    localStorage.setItem(SAVE_KEY, '{"wallet":9,"bes');
    lastBody = ''; save.wallet = 4323; persist();
    let bak = null; try { bak = JSON.parse(localStorage.getItem(SAVE_KEY_BACKUP)); } catch (x) {}
    o.garbageIsNeverBackedUp = !!bak && typeof bak.wallet === 'number' && bak.wallet !== 9;

    // every lifecycle edge writes
    const fire = (t, n) => { save.wallet += 1; lastBody = ''; t.dispatchEvent(new Event(n)); return onDisk() === save.wallet; };
    o.pagehideWrites = fire(window, 'pagehide');
    o.beforeunloadWrites = fire(window, 'beforeunload');
    o.blurWrites = fire(window, 'blur');
    o.freezeWrites = fire(document, 'freeze');

    // the heartbeat catches anything a mutation path forgot. (The lifecycle
    // events above also paused and saved the live run, as leaving the page
    // now does; take it back so the run is playing again.)
    reclaimLiveRun(); uiScreen = 'play'; countdown = 0;
    save.wallet = 9000; lastBody = ''; lastPersistAt = performance.now() - 5000;
    update(16);
    o.heartbeatWritesAMissedChange = onDisk() === 9000;
    return o;
  });
  for (const [k, v] of Object.entries(e)) ok(v === true, k);

  // a corrupt primary falls back to the backup, and is repaired at once
  await page.evaluate(() => {
    save.wallet = 5555; save.best = 321; persist();
    save.wallet = 5556; persist();                 // 5555 is now the backup
    localStorage.setItem(SAVE_KEY, '{"wallet":5556,"best":3');
  });
  await page.reload();
  await page.waitForTimeout(1100);
  const r = await page.evaluate(() => {
    let primary = 'corrupt';
    try { primary = JSON.parse(localStorage.getItem(SAVE_KEY)).wallet; } catch (x) {}
    return { from: saveLoadedFrom, wallet: save.wallet, best: save.best, primary };
  });
  ok(r.from === 'backup' && r.wallet === 5555 && r.best === 321,
     'a corrupt primary recovers from the backup', JSON.stringify(r));
  ok(r.primary === 5555, 'and the primary is repaired immediately', String(r.primary));
  await browser.close();
}

// 23. TRIPWIRES, SPRINGS, PORTALS - the level 2 / 4 / 7 additions.
console.log('\nTripwires:');
{
  const { browser, page } = await open(webkit, TARGETS[0].ctx);
  const e = await page.evaluate(() => {
    const o = {};
    o.levelTwoIsTripwire = LEVELS[1].name === 'TRIPWIRE';
    distance = 0;    o.noWiresAtLevelOne = wireChance() === 0;
    distance = 3000; o.wiresFromLevelTwo = wireChance() > 0;
    restart(); started = true;
    const l0 = lives, st0 = stage;
    wires.length = 0; wires.push({ x: PLAYER_X, y: GROUND_Y, w: 46, hit: false });
    player.y = GROUND_Y - PLAYER_H; player.grounded = true; combo = 7;
    checkCollisions();
    o.runningIntoAWireStumbles = stunTimer === STUN_FRAMES && wires[0].hit;
    o.aStumbleNeverCostsALife = lives === l0 && stage === st0 && !gameOver;
    o.aStumbleWipesTheCombo = combo === 0;
    jumpBuffer = 5; jumpHeld = true; player.velocityY = 0; tryJump();
    o.noJumpingWhileStunned = player.velocityY === 0;
    for (let i = 0; i < STUN_FRAMES; i++) updatePlayer();
    jumpBuffer = 5; jumpHeld = true; player.velocityY = 0; player.grounded = true; coyoteFrames = 1; tryJump();
    o.jumpingReturnsAfterTheStun = player.velocityY === JUMP_STRENGTH;
    restart(); started = true;
    wires.length = 0; wires.push({ x: PLAYER_X, y: GROUND_Y, w: 46, hit: false });
    player.y = GROUND_Y - PLAYER_H - 40; player.grounded = false; player.velocityY = -3;
    checkCollisions();
    o.aHopClearsTheWire = stunTimer === 0 && !wires[0].hit;
    // the fairness rule: a stumble can never end at a pit
    restart(); distance = 3000 * 8;
    let placed = 0, unsafe = 0;
    for (let i = 0; i < 400; i++) {
      generatePlatform();
      for (const w of wires) {
        const pl = platforms.find(q => !q.fake && w.x >= q.x && w.x <= q.x + q.width);
        if (!pl) continue; placed++;
        if (pl.x + pl.width - w.x < STUN_RUNWAY) unsafe++;
        for (const sp of spikes) if (Math.abs(sp.x - w.x) < STUN_RUNWAY) unsafe++;
      }
      if (platforms.length > 40) { const cut = platforms[platforms.length - 15].x;
        platforms = platforms.slice(-15); wires = wires.filter(w => w.x > cut); spikes = spikes.filter(x => x.x > cut); }
    }
    o.wiresArePlaced = placed > 20;
    o.everyWireLeavesRecoveryRunway = unsafe === 0;
    o.runwayCoversTheStunAtTopSpeed = STUN_RUNWAY >= STUN_FRAMES * MAX_SPEED;
    restart(); return o;
  });
  for (const [k, v] of Object.entries(e)) ok(v === true, k);
  await browser.close();
}

console.log('\nSprings:');
{
  const { browser, page } = await open(webkit, TARGETS[0].ctx);
  const e = await page.evaluate(() => {
    const o = {};
    distance = 3000 * 2; o.noSpringsBeforeLevelFour = springChance() === 0;
    distance = 3000 * 3; o.springsFromLevelFour = springChance() > 0;
    const put = () => { springs.length = 0; springs.push({ x: PLAYER_X, y: GROUND_Y, w: 34, pressed: 0 }); return springs[0]; };
    restart(); started = true; const sp = put();
    player.y = GROUND_Y - PLAYER_H; player.velocityY = 3; player.grounded = false; player.isJumping = true;
    checkCollisions();
    o.landingOnASpringLaunches = player.velocityY === SPRING_LAUNCH && springArc && sp.pressed > 0;
    o.launchRefillsAirJumpsForCorrection = player.airJumps === maxAirJumps();
    const flight = (launch, arc) => { let y = 0, v = launch, f = 0, top = 0;
      while (f < 600) { v += arc ? SPRING_GRAVITY : (v < 0 ? GRAVITY : GRAVITY_FALL);
        if (!arc && v > MAX_FALL_SPEED) v = MAX_FALL_SPEED; y += v; f++; if (y < top) top = y;
        if (y >= 0 && f > 2) break; } return { frames: f, height: -top }; };
    const n = flight(JUMP_STRENGTH, false), s2 = flight(SPRING_LAUNCH, true);
    o.theArcIsHighAndSlow = s2.height > n.height * 2 && s2.frames > n.frames * 2.2;
    o.theArcStaysUnderTheCeiling = s2.height < (GROUND_Y - PLAYER_H - FLY_CEIL);
    restart(); started = true; evolve(); put();
    player.y = GROUND_Y - PLAYER_H; player.velocityY = 3; player.grounded = false; player.isJumping = true;
    checkCollisions();
    player.velocityY = 4; jumpBuffer = 5; jumpHeld = true; coyoteFrames = 0; tryJump();
    o.anAirJumpRetakesControlOfTheArc = springArc === false && player.velocityY < 0;
    restart(); started = true; put();
    player.y = GROUND_Y - PLAYER_H - 60; player.velocityY = -4; player.grounded = false;
    checkCollisions();
    o.hoppingOverDoesNotFireIt = springArc === false;
    restart(); return o;
  });
  for (const [k, v] of Object.entries(e)) ok(v === true, k);
  await browser.close();
}

console.log('\nPortals:');
{
  const { browser, page } = await open(webkit, TARGETS[0].ctx);
  const e = await page.evaluate(() => {
    const o = {};
    distance = 3000 * 5; o.noPortalsBeforeSeven = portalChance() === 0;
    distance = 3000 * 6; o.portalsFromSeven = portalChance() > 0;
    // Generation is random and an exit needs a wide, real slab in its window;
    // a portal that finds none stays inert by design (checked below), so the
    // resolution itself is given a few worlds to happen in.
    let pt;
    // The entry goes on the opening runway BEFORE the world beyond it is
    // built, as the generator itself places portals; the generator then owes
    // it an exit (it stretches the platform in the window - see
    // generatePlatform), and an entry it could not serve is removed.
    for (let attempt = 0; attempt < 8; attempt++) {
      restart(); distance = 3000 * 8;
      platforms = platforms.slice(0, 1); portals.length = 0;
      portals.push({ inX: 500, inY: GROUND_Y - 30, outX: null, outY: 0, used: false, spin: 0 });
      recycleWorld();
      pt = portals[0];
      if (pt && pt.outX !== null) break;
    }
    o.theEntryIsServedNotDropped = !!pt;
    if (!pt) pt = { inX: 500, outX: null, outY: 0 };
    const under = pt.outX !== null && platforms.find(q => !q.fake && !q.crumble && pt.outX >= q.x && pt.outX <= q.x + q.width);

    // Measured before this fix: 35-41% of generator-placed portals ever got
    // an exit. Now every one must, at every level they appear on.
    let placed = 0, resolved = 0;
    for (const lvl of [7, 9, 10]) for (let t = 0; t < 40; t++) {
      restart(); distance = 3000 * (lvl - 1); scrollSpeed = targetSpeed();
      for (let i = 0; i < 40; i++) generatePlatform();
      resolvePortalExits();
      for (const q of portals) {
        placed++;
        let last = lastRealPlatform();
        while (last.x + last.width < q.inX + WARP_MAX + 60) { generatePlatform(); last = lastRealPlatform(); }
        resolvePortalExits();
        if (q.outX !== null) resolved++;
      }
    }
    o.generatorPlacedPortalsAllGetAnExit = placed > 30 && resolved / placed >= 0.95;
    o.theExitResolvesAboveARealPlatform = !!under && pt.outY === under.y - 96;
    o.theExitIsVisibleBeforeTheEntry = pt.outX !== null && pt.outX > pt.inX + WARP_MIN - 1;
    const mk = () => { portals.length = 0; portals.push({ inX: PLAYER_X + PLAYER_W / 2, inY: player.y + PLAYER_H / 2,
      outX: PLAYER_X + 440, outY: GROUND_Y - 96, used: false, spin: 0 }); };
    restart(); started = true; evolve(); distance = 3000 * 8; mk();
    const d0 = distance, s0 = score, aj = player.airJumps;
    player.y = GROUND_Y - PLAYER_H; player.grounded = true; checkCollisions();
    o.enteringWarpsAndPaysTheBonus = portals[0].used && score - s0 >= WARP_BONUS;
    o.aWarpNeverCreditsDistance = distance === d0;
    o.youExitWithAirJumpsSpent = player.airJumps === 0 && aj > 0;
    o.youExitFallingAtTheExit = player.y === GROUND_Y - 96 && !player.grounded;
    restart(); started = true; distance = 3000 * 8; mk(); spikes.length = 0;
    spikes.push({ x: PLAYER_X + 430, y: GROUND_Y - 30, size: 30, near: Infinity, scored: false });
    spikes.push({ x: PLAYER_X + 600, y: GROUND_Y - 30, size: 30, near: Infinity, scored: false });
    player.y = GROUND_Y - PLAYER_H; player.grounded = true; checkCollisions();
    o.onlyASpikeDirectlyUnderTheExitIsCleared = spikes.length === 1 && spikes[0].x > PLAYER_X + 100;
    restart(); started = true; mk();
    player.y = GROUND_Y - PLAYER_H - 90; player.grounded = false; player.velocityY = -4; checkCollisions();
    o.jumpingOverTheEntryDeclines = portals[0].used === false;
    restart(); started = true; distance = 3000 * 8;
    cores.length = 0; cores.push({ x: PLAYER_X + 200, y: 300, taken: false, bob: 0, spin: 0 }); mk();
    player.y = GROUND_Y - PLAYER_H; player.grounded = true; checkCollisions(); recycleWorld();
    o.aSkippedCoreIsReofferedNotLost = cores.length === 1 && cores[0].x > PLAYER_X;
    restart(); return o;
  });
  for (const [k, v] of Object.entries(e)) ok(v === true, k);
  await browser.close();
}

// 24. The accidental-resume guard, and the pause button.
console.log('\nAccidental-resume guard:');
{
  const { browser, page } = await open(webkit, TARGETS[0].ctx);
  const e = await page.evaluate(() => {
    const o = {};
    // A runner is played by tapping constantly, so at the moment of death
    // there are taps already in flight. They must not dismiss the screen.
    restart(); started = true;
    player.y = H + 200; checkCollisions();
    o.lifeLostArmsTheLockout = lifePause && resumeLock > 0;
    o.theContinueButtonRefusesWhileLocked = (resumeFromLifePause(), lifePause === true);
    for (let i = 0; i < RESUME_LOCK + 2; i++) update(16);
    o.itIsStillPausedAfterTheLockout = lifePause === true;
    resumeFromLifePause();
    o.continueWorksOnceUnlocked = lifePause === false;

    // Game over keeps tap-to-restart - the fast restart loop is the point -
    // but not during the lockout.
    restart(); started = true; lives = 1;
    player.y = H + 200; checkCollisions();
    o.gameOverArmsTheLockout = gameOver && resumeLock > 0;
    pressJump();
    o.anInFlightTapDoesNotRestart = gameOver === true;
    for (let i = 0; i < RESUME_LOCK + 2; i++) update(16);
    pressJump();
    o.tapRestartsOnceUnlocked = gameOver === false;
    restart(); return o;
  });
  for (const [k, v] of Object.entries(e)) ok(v === true, k);
  await browser.close();
}

console.log('\nPause:');
{
  const { browser, page } = await open(webkit, TARGETS[0].ctx);
  const e = await page.evaluate(() => {
    const o = {};
    restart(); started = true; distance = 5000;
    openPause();
    o.pauseOpensAndReleasesAHeldJump = uiScreen === 'paused' && jumpHeld === false;
    const d0 = distance;
    update(16); update(16);
    o.theWorldFreezesWhilePaused = distance === d0;
    closePause();
    o.resumeRefusesWhileLocked = uiScreen === 'paused';
    for (let i = 0; i < RESUME_LOCK + 2; i++) update(16);
    closePause();
    o.resumeWorksOnceUnlocked = uiScreen === 'play' && jumpBuffer === 0;
    // RESUME counts in (3-2-1) rather than snapping straight into motion
    o.resumeCountsIn = countdown === COUNTDOWN_FRAMES;
    for (let i = 0; i < COUNTDOWN_FRAMES - 1; i++) update(16);
    o.theWorldHoldsDuringTheCount = distance === d0;
    update(16); update(16);
    o.theWorldMovesAgain = distance > d0;

    // A menu opened from the pause returns to the pause, not into a run the
    // player had deliberately stopped.
    openPause(); for (let i = 0; i < RESUME_LOCK + 2; i++) update(16);
    openShop(); closeMenu();
    o.aMenuFromPauseReturnsToPause = uiScreen === 'paused';
    uiScreen = 'play'; menuFrom = 'play';
    openShop(); closeMenu();
    o.aMenuFromPlayStillReturnsToPlay = uiScreen === 'play';

    // Pause is refused where there is nothing to pause.
    restart(); o.cannotPauseBeforeTheRunStarts = (openPause(), uiScreen === 'play');
    restart(); started = true; lives = 1; player.y = H + 200; checkCollisions();
    o.cannotPauseOnGameOver = (openPause(), uiScreen === 'play');
    restart(); started = true; player.y = H + 200; checkCollisions();
    o.cannotPauseOnTheLifeLostScreen = (openPause(), uiScreen === 'play');

    // The button lives in the HUD only while a run is actually going.
    restart(); started = true; render();
    const at = (x, y) => uiButtons.some(bt => x >= bt.x && x <= bt.x + bt.w && y >= bt.y && y <= bt.y + bt.h);
    o.theButtonIsInTheTopRightCorner = at(W - 36, 27);
    restart(); render();
    o.noButtonBeforeTheRunStarts = !at(W - 36, 27);
    return o;
  });
  for (const [k, v] of Object.entries(e)) ok(v === true, k);
  await browser.close();
}

// 25. TURRETS (level 8). A cannon that rises, fires one knee-high shot, and
//     sinks. Only the shell hurts; the cue is the pop; any jump clears it.
console.log('\nTurrets:');
{
  const { browser, page } = await open(webkit, TARGETS[0].ctx);
  const e = await page.evaluate(() => {
    const o = {};
    distance = 3000 * 6; o.noTurretsBeforeEight = turretChance() === 0;
    distance = 3000 * 7; o.turretsFromEight = turretChance() > 0;
    const flat = () => { platforms.length = 0;
      platforms.push({ x: -200, y: GROUND_Y, width: 3000, type: 'ground', fake: false,
                       crumble: false, crumbleTimer: -1, fallen: false, tufts: [] }); };
    const put = (ahead) => { turrets.length = 0; bullets.length = 0;
      turrets.push({ x: PLAYER_X + ahead, y: GROUND_Y, state: 'hidden', t: 0 }); return turrets[0]; };

    restart(); started = true; flat(); scrollSpeed = 10; distance = 3000 * 8;
    // the pop is clamped to the visible track, so the test uses that range
    const range = Math.min(TURRET_RANGE, W - PLAYER_X - 30);
    let tu = put(range + 200);
    updateTurrets(); o.hiddenOutOfRange = tu.state === 'hidden';
    tu.x = PLAYER_X + range - 5;
    updateTurrets(); o.popsInRange = tu.state === 'rising';
    let shots = 0;
    for (let i = 0; i < 200; i++) { const n = bullets.length; updateTurrets(); scrollWorld(); if (bullets.length > n) shots++; }
    o.firesExactlyOnce = shots === 1;
    o.sinksAfterwards = tu.state === 'done';

    // reaction window from the pop to impact, at top speed
    restart(); started = true; flat(); scrollSpeed = MAX_SPEED; distance = 3000 * 8;
    tu = put(range - 1);
    let hitFrame = -1;
    for (let i = 0; i < 200 && hitFrame < 0; i++) {
      updateTurrets(); scrollWorld();
      for (const q of bullets) if (q.x + BULLET_R > PLAYER_X && q.x - BULLET_R < PLAYER_X + PLAYER_W) hitFrame = i + 1;
    }
    o.reactionWindowIsHumane = hitFrame >= 30;

    restart(); started = true; flat(); distance = 3000 * 8;
    bullets.length = 0; bullets.push({ x: PLAYER_X + 20, y: GROUND_Y - 22, vx: -5, flash: 0 });
    const l0 = lives; checkCollisions();
    o.standingRunnerIsShot = lives === l0 - 1 && lifePauseCause === 'shot';
    restart(); started = true; flat(); power.shield = 1;
    bullets.length = 0; bullets.push({ x: PLAYER_X + 20, y: GROUND_Y - 22, vx: -5, flash: 0 });
    const l1 = lives; checkCollisions();
    o.shieldBlocksTheShot = lives === l1 && power.shield === 0;
    restart(); started = true; flat();
    bullets.length = 0; bullets.push({ x: PLAYER_X + 20, y: GROUND_Y - 22, vx: -5, flash: 0 });
    player.y = GROUND_Y - PLAYER_H - 40; player.grounded = false; player.velocityY = -2;
    const l2 = lives; checkCollisions();
    o.aSmallHopClearsIt = lives === l2;

    restart(); distance = 3000 * 9;
    let placed = 0, inLanding = 0, crowded = 0, onFloating = 0;
    for (let i = 0; i < 500; i++) {
      generatePlatform();
      for (const q of turrets) {
        placed++;
        const host = platforms.find(pl => q.x >= pl.x && q.x <= pl.x + pl.width && !pl.fake);
        if (!host) continue;
        if (host.type !== 'ground') onFloating++;
        if (q.x - host.x < LANDING_ZONE) inLanding++;
        for (const s of spikes)  if (Math.abs(s.x - q.x) < 100) crowded++;
        for (const w of wires)   if (Math.abs(w.x - q.x) < 100) crowded++;
        for (const s of springs) if (Math.abs(s.x - q.x) < 100) crowded++;
      }
      if (platforms.length > 40) { const cut = platforms[platforms.length - 15].x;
        platforms = platforms.slice(-15);
        turrets = turrets.filter(q => q.x > cut); spikes = spikes.filter(q => q.x > cut);
        wires = wires.filter(q => q.x > cut); springs = springs.filter(q => q.x > cut); }
    }
    o.turretsGetPlaced = placed > 15;
    o.neverOnFloatingSlabs = onFloating === 0;
    o.neverInTheLandingZone = inLanding === 0;
    o.neverCrowdOtherHazards = crowded === 0;

    // a revive lays a clear runway: whatever was ahead - wires included - is
    // gone from it, and nothing hostile sits on it
    restart(); started = true; distance = 3000 * 8;
    const pl = platforms[platforms.length - 1];
    wires.length = 0; wires.push({ x: pl.x + 100, y: pl.y, w: 46, hit: false });
    player.y = H + 200; lives = 3; checkCollisions();
    const rw = platforms.find(q => q.safe);
    const onRunway = x => rw && x >= rw.x && x <= rw.x + rw.width;
    o.reviveRunwayHasNoWiresOrTurrets = !!rw && !wires.some(q => onRunway(q.x)) && !turrets.some(q => onRunway(q.x));
    restart();
    return o;
  });
  for (const [k, v] of Object.entries(e)) ok(v === true, k);
  await browser.close();
}

// 26. THE SECRET CLOUD. Almost invisible, at the top, moving at world speed.
//     Only the THIRD jump of one flight collects it; flying never does.
console.log('\nSecret cloud:');
{
  const { browser, page } = await open(webkit, TARGETS[0].ctx);
  const e = await page.evaluate(() => {
    const o = {};
    restart(); stage = 1; o.noSecretsWithoutAThirdJump = secretChance() === 0;
    stage = 2; o.secretsOnceYouHaveOne = secretChance() > 0;
    const flat = () => { platforms.length = 0;
      platforms.push({ x: -200, y: GROUND_Y, width: 3000, type: 'ground', fake: false,
                       crumble: false, crumbleTimer: -1, fallen: false, tufts: [] }); };
    const put = () => { secrets.length = 0; secrets.push({ x: PLAYER_X + PLAYER_W / 2, taken: false, phase: 0 }); return secrets[0]; };
    const touch = () => { player.y = SECRET_Y - PLAYER_H / 2; player.grounded = false; player.velocityY = -1; checkCollisions(); };
    const flyUp = (jumpsToUse) => {
      restart(); started = true; flat(); stage = 2; save.wallet = 0;
      player.y = GROUND_Y - PLAYER_H; player.grounded = true; player.airJumps = 2;
      const sc = put();
      jumpHeld = true; jumpBuffer = BUFFER_FRAMES; tryJump();
      let used = 1, wasRising = true;
      for (let f = 0; f < 300; f++) {
        updatePlayer(); checkCollisions();
        if (sc.taken) return true;
        const rising = player.velocityY < 0;
        if (wasRising && !rising && used < jumpsToUse) { jumpBuffer = BUFFER_FRAMES; coyoteFrames = 0; tryJump(); used++; }
        wasRising = rising;
        if (player.grounded && f > 5) break;
      }
      return false;
    };
    o.aTripleJumpCollectsIt = flyUp(3) === true;
    o.aDoubleJumpReachesItButDoesNot = flyUp(2) === false;
    restart(); started = true; flat(); stage = 3; heroFuel = HERO_FLIGHT_MAX;
    let sc = put(); flightJumps = 3; flying = true; touch();
    o.flyingIntoItDoesNothing = sc.taken === false;
    restart(); started = true; flat(); stage = 2;
    sc = put(); flightJumps = 2; flying = false; touch();
    o.twoAirJumpsFromALedgeDoNot = sc.taken === false;

    // the tell: it moves at world speed, not cloud speed
    restart(); started = true; flat(); stage = 2; scrollSpeed = 8;
    secrets.length = 0; secrets.push({ x: 500, taken: false, phase: 0 });
    clouds[0].x = 500; scrollWorld();
    o.itMovesAtWorldSpeedNotCloudSpeed = secrets[0].x === 492 && clouds[0].x > 495;

    // the prize table respects the record gate and never pays score
    restart(); started = true; flat(); stage = 2;
    save.wallet = 0; save.best = 0; save.owned = []; lives = 2;
    const seen = {}; let recordBroken = 0;
    for (let i = 0; i < 400; i++) {
      const pr = rollSecretPrize(); seen[pr.id] = (seen[pr.id] || 0) + 1;
      if (pr.id === 'item' && pr.gift.item.needBest && save.best < pr.gift.item.needBest) recordBroken++;
    }
    o.everyPrizeAppears = ['coins', 'hero', 'item', 'jackpot', 'lives'].every(k => seen[k] > 0);
    o.freeItemsNeverBypassTheRecord = recordBroken === 0;
    const realRandom = Math.random;
    Math.random = () => 0.1;
    restart(); started = true; flat(); stage = 2; save.wallet = 0; const s0 = score;
    sc = put(); flightJumps = 3; touch();
    o.coinsPayTheWalletOnly = save.wallet === 300 && score === s0 && runBanked === 300;
    Math.random = () => 0.5;
    restart(); started = true; flat(); stage = 2;
    sc = put(); flightJumps = 3; touch();
    o.heroPrizeEvolvesToHero = stageDef().name === 'HERO';
    Math.random = realRandom;
    restart();
    return o;
  });
  for (const [k, v] of Object.entries(e)) ok(v === true, k);
  await browser.close();
}

// 27. JET, the fifth form: drag to fly, a tank that drains only while
//     thrusting and refills only on the ground, release to fall.
console.log('\nJET:');
{
  const { browser, page } = await open(webkit, TARGETS[0].ctx);
  const e = await page.evaluate(() => {
    const o = {};
    const JET = STAGES.findIndex(s => s.name === 'JET');
    const flat = () => { platforms.length = 0;
      platforms.push({ x: -200, y: GROUND_Y, width: 6000, type: 'ground', fake: false,
                       crumble: false, crumbleTimer: -1, fallen: false, tufts: [] }); };
    const asJet = () => { restart(); started = true; flat(); stage = JET; jetFuel = JET_FUEL_MAX;
      player.y = GROUND_Y - PLAYER_H; player.grounded = true; player.velocityY = 0; endDrag(); jumpHeld = false; };
    const dragTo = (dx, dy) => { drag = { active: true, ox: 100, oy: 100, dx, dy }; };

    asJet(); jumpHeld = true;
    const y0 = player.y; for (let i = 0; i < 20; i++) { updatePlayer(); checkCollisions(); }
    o.holdClimbs = player.y < y0 - 40 && flying && jetFuel < JET_FUEL_MAX;
    asJet(); player.y = 200; player.grounded = false; dragTo(0, 80);
    const y1 = player.y; for (let i = 0; i < 20; i++) updatePlayer();
    o.dragDownDives = player.y > y1 + 60;
    asJet(); player.y = 300; player.grounded = false; dragTo(0, -80);
    const y2 = player.y; for (let i = 0; i < 20; i++) updatePlayer();
    o.dragUpClimbs = player.y < y2 - 60;
    asJet(); player.y = 300; player.grounded = false; dragTo(5, 5); jumpHeld = true;
    updatePlayer(); o.tinyDragIsJustAHold = thrust().y === -1 && thrust().x === 0;

    asJet(); player.y = 300; player.grounded = false; dragTo(80, 0);
    for (let i = 0; i < 60; i++) { updatePlayer(); scrollSpeed = targetSpeed(); }
    const boosted = scrollSpeed;
    asJet(); player.y = 300; player.grounded = false; dragTo(-80, 0);
    for (let i = 0; i < 60; i++) { updatePlayer(); scrollSpeed = targetSpeed(); }
    const braked = scrollSpeed;
    asJet(); const plain = targetSpeed();
    o.boostSpeedsTheWorld = boosted > plain * 1.3;
    o.brakeSlowsTheWorld = braked < plain * 0.8;
    endDrag(); jumpHeld = false; player.y = 200; player.grounded = false; player.velocityY = 0;
    for (let i = 0; i < 60; i++) { updatePlayer(); scrollSpeed = targetSpeed(); }
    o.releaseFallsAndThrottleReturns = player.velocityY > 0 && !flying && Math.abs(scrollSpeed - plain) < 0.05;

    asJet(); player.y = 200; player.grounded = false; dragTo(0, -80);
    let f = 0; while (flying || f === 0) { updatePlayer(); f++; if (f > 2000) break; }
    o.tankEmptiesInAboutFiveSeconds = f >= JET_FUEL_MAX && f <= JET_FUEL_MAX + 3;
    o.emptyTankMeansFalling = jetFuel === 0 && player.velocityY > 0;
    updatePlayer(); o.noRefillInTheAir = jetFuel === 0;
    endDrag(); player.y = GROUND_Y - PLAYER_H; player.grounded = true; player.velocityY = 0;
    for (let i = 0; i < 100; i++) updatePlayer();
    o.refillsOnTheGround = jetFuel > 60;

    asJet(); player.y = 60; player.grounded = false; dragTo(0, -80);
    for (let i = 0; i < 60; i++) updatePlayer();
    o.cannotFlyOffTheTop = player.y >= FLY_CEIL;
    asJet(); player.y = 300; player.grounded = false; dragTo(0, -80);
    for (let i = 0; i < 40; i++) updatePlayer();
    o.flightIsNotHangTime = airFrames === 0;
    asJet(); player.airJumps = 3; jumpBuffer = 5; jumpHeld = true; tryJump();
    o.noJumpsWhileTheTankHasFuel = player.airJumps === 3 && jumpBuffer === 0;
    jetFuel = 0; jumpBuffer = 5; tryJump();
    o.jumpsReturnWhenTheTankIsDry = player.velocityY < 0;
    o.gapsNotSizedForFlight = STAGES[JET].reach === STAGES[JET - 1].reach;
    asJet(); lives = 3; player.y = H + 200; checkCollisions();
    o.lifeLostDropsToHero = stageDef().name === 'HERO';
    restart(); started = true; flat(); stage = JET - 1; jetFuel = 0; evolve();
    o.evolvingToJetFillsTheTank = jetFuel === JET_FUEL_MAX;
    restart();
    return o;
  });
  for (const [k, v] of Object.entries(e)) ok(v === true, k);
  await browser.close();
}

// 28. SPIDER, the summit: hold to jump then swing, release to drop, press
//     again to web again. Three webs per flight, refilled by landing.
console.log('\nSPIDER:');
{
  const { browser, page } = await open(webkit, TARGETS[0].ctx);
  const e = await page.evaluate(() => {
    const o = {};
    const SP = STAGES.findIndex(s => s.name === 'SPIDER');
    const flat = () => { platforms.length = 0;
      platforms.push({ x: -200, y: GROUND_Y, width: 100000, type: 'ground', fake: false,
                       crumble: false, crumbleTimer: -1, fallen: false, tufts: [] }); };
    const asSpider = () => { restart(); started = true; flat(); stage = SP; distance = 9000;
      scrollSpeed = 8; player.y = GROUND_Y - PLAYER_H; player.grounded = true; player.velocityY = 0; };
    const flight = (websWanted) => {
      asSpider();
      const base = targetSpeed();
      jumpHeld = true; jumpBuffer = BUFFER_FRAMES;
      let dist = 0, f = 0, webs = 0, minVx = Infinity, maxVx = 0, top = player.y, wasOn = false;
      for (; f < 900; f++) {
        updatePlayer(); const s = scrollSpeed; scrollWorld(); checkCollisions(); tryJump();
        if (web.active && !wasOn) webs++;
        wasOn = web.active;
        if (web.active) { if (s < minVx) minVx = s; if (s > maxVx) maxVx = s; }
        if (webs >= websWanted && !web.active) jumpHeld = false;
        dist += s; if (player.y < top) top = player.y;
        scrollSpeed = frameSpeed();
        if (player.grounded && f > 5) break;
        if (player.y > H) break;
      }
      return { dist, webs, minVx, maxVx, top, base, landed: player.grounded };
    };
    const one = flight(1), two = flight(2), held = flight(99);
    o.aHeldJumpFiresAWebAtTheApex = one.webs === 1;
    o.theSwingNeverScrollsBackward = one.minVx >= 0;
    o.theSwingSpeedsTheWorldUp = one.maxVx > one.base * 1.5;
    o.theSwingStaysUnderTheCeiling = one.top >= FLY_CEIL;
    o.oneSwingOutreachesHero = one.dist > 35 * one.base * STAGES[SP - 1].reach;
    o.aSecondWebGoesFurther = two.webs === 2 && two.dist > one.dist;
    o.aHeldButtonCannotSwingForever = held.webs === WEB_MAX && held.landed;

    asSpider(); player.y = 300; player.grounded = false; player.velocityY = 2;
    jumpBuffer = 5; jumpHeld = true; coyoteFrames = 0; tryJump();
    o.aPressInTheAirFiresAWeb = web.active === true;
    for (let i = 0; i < 12; i++) { updatePlayer(); scrollSpeed = frameSpeed(); }
    releaseJump();
    o.releaseDetachesAndCarriesSpeed = web.active === false && frameSpeed() > targetSpeed();
    updatePlayer(); o.thenGravityResumes = player.velocityY !== 0;

    asSpider(); player.y = 300; player.grounded = false; jumpBuffer = 5; jumpHeld = true; tryJump();
    player.y = GROUND_Y - PLAYER_H; player.velocityY = 3; checkCollisions();
    o.landingEndsTheSwingAndRefillsWebs = web.active === false && player.grounded && websLeft === WEB_MAX;
    asSpider(); player.y = 300; player.grounded = false; jumpBuffer = 5; jumpHeld = true; tryJump();
    lives = 3; player.y = H + 200; checkCollisions();
    o.aLostLifeClearsTheWebAndDropsToJet = web.active === false && stageDef().name === 'JET';
    asSpider(); jumpBuffer = 5; jumpHeld = false; tryJump();
    o.groundJumpStillJumps = player.velocityY < 0 && web.active === false;
    o.noAirJumpsNoWings = maxAirJumps() === 0;
    restart(); started = true; flat(); stage = 2; player.y = 300; player.grounded = false; player.airJumps = 2;
    jumpBuffer = 5; jumpHeld = true; coyoteFrames = 0; tryJump();
    o.otherFormsStillAirJump = player.velocityY < 0 && web.active === false;
    restart();
    return o;
  });
  for (const [k, v] of Object.entries(e)) ok(v === true, k);
  await browser.close();
}

// 28a. NO FLIGHT ENDS IN A PLUNGE. HERO and JET tanks run dry in the air like
//      the suit's; holding then glides, and the tank warns at a quarter.
console.log('\nSoft landing:');
{
  const { browser, page } = await open(webkit, TARGETS[0].ctx);
  const e = await page.evaluate(() => {
    const o = {};
    const flat = () => { platforms.length = 0;
      platforms.push({ x: -200, y: GROUND_Y, width: 6000, type: 'ground', fake: false,
                       crumble: false, crumbleTimer: -1, fallen: false, tufts: [] }); };
    // HERO: fly until dry, keep holding -> glide, with the air jumps intact
    restart(); started = true; flat(); stage = 3; heroFuel = 40;
    player.y = 200; player.grounded = false; jumpHeld = true;
    for (let i = 0; i < 60; i++) updatePlayer();
    o.heroGlidesWhenTheTankRunsDry = heroFuel === 0 && gliding === true && player.velocityY <= 3.2;
    o.heroKeepsItsAirJumpsToSteer = player.airJumps === maxAirJumps();
    // JET: same, on the drag
    restart(); started = true; flat(); stage = 4; jetFuel = 40;
    player.y = 200; player.grounded = false; drag = { active: true, ox: 100, oy: 100, dx: 0, dy: -80 };
    for (let i = 0; i < 60; i++) updatePlayer();
    o.jetGlidesWhenTheTankRunsDry = jetFuel === 0 && gliding === true && player.velocityY <= 3.2;
    endDrag();
    // a plain jumper who never flew gets no glide from holding
    restart(); started = true; flat(); stage = 0;
    player.y = 200; player.grounded = false; player.velocityY = 5; jumpHeld = true;
    for (let i = 0; i < 10; i++) updatePlayer();
    o.noFreeGlideWithoutAFlight = gliding === false;
    // the warning fires once per flight, at a quarter, before the tank is empty
    restart(); started = true; flat(); stage = 3; heroFuel = HERO_FLIGHT_MAX;
    player.y = 200; player.grounded = false; jumpHeld = true;
    let warnedAt = -1;
    for (let i = 0; i < HERO_FLIGHT_MAX + 5; i++) { updatePlayer(); if (warnedAt < 0 && lowFuelWarned) warnedAt = heroFuel; }
    o.warnsAtAQuarterTank = warnedAt > 0 && warnedAt <= HERO_FLIGHT_MAX * 0.25 + 1;
    restart();
    return o;
  });
  for (const [k, v] of Object.entries(e)) ok(v === true, k);
  await browser.close();
}

// 28b. THE SAFE RESUME. A revive used to give a median 28 frames (0.47s) of
//      ground before the first edge or hazard, with the gaps ahead sized for
//      the form just lost. Now: a flat runway, fresh gaps for the form the
//      player HAS, and a speed ramp on CONTINUE. The costs stay.
console.log('\nSafe resume:');
{
  const { browser, page } = await open(webkit, TARGETS[0].ctx);
  const e = await page.evaluate(() => {
    const o = {};
    const safeFramesAhead = () => {
      const px = PLAYER_X + PLAYER_W;
      const ground = platforms.filter(q => !q.fake && q.x <= px && q.x + q.width >= PLAYER_X)
                              .sort((a, b) => b.x + b.width - (a.x + a.width))[0];
      if (!ground) return 0;
      const edge = ground.x + ground.width - px;
      const haz = [...spikes.map(q => q.x), ...wires.map(q => q.x), ...turrets.map(q => q.x),
                   ...portals.map(q => q.inX), ...springs.map(q => q.x)].filter(x => x > px);
      const first = haz.length ? Math.min(...haz) - px : Infinity;
      return Math.min(edge, first) / targetSpeed();
    };
    const dieBy = (cause) => { if (cause === 'fall') { player.y = H + 200; checkCollisions(); } else die(cause); };

    let worst = Infinity, gapTooWide = 0, crumbleUnderfoot = 0;
    for (const [cause, st, dist] of [['fall', 3, 18000], ['spike', 3, 18000], ['shot', 4, 24000], ['fall', 2, 9000]]) {
      for (let t = 0; t < 25; t++) {
        restart(); started = true; distance = dist; scrollSpeed = targetSpeed();
        for (let i = 0; i < st; i++) evolve();
        for (let i = 0; i < 60; i++) update(16);
        dieBy(cause);
        if (gameOver) continue;
        worst = Math.min(worst, safeFramesAhead());
        const rw = platforms.find(q => q.safe);
        if (rw && rw.crumble) crumbleUnderfoot++;
        // the first gap beyond the runway must be one the NEW form is given
        const next = platforms.filter(q => !q.fake && q.x > rw.x + rw.width).sort((a, b) => a.x - b.x)[0];
        if (next && next.x - (rw.x + rw.width) > gapRange()[1] + 1) gapTooWide++;
      }
    }
    o.atLeastNinetyFramesOfClearGround = worst >= 90;
    o.worstCaseFrames = Math.round(worst);
    o.theRunwayNeverCrumbles = crumbleUnderfoot === 0;
    o.gapsBeyondAreSizedForTheNewForm = gapTooWide === 0;

    // the world BEHIND the player is untouched; a pending core is re-offered
    restart(); started = true; distance = 9000; evolve(); evolve();
    for (let i = 0; i < 60; i++) update(16);
    const behind = platforms.filter(q => q.x + q.width < PLAYER_X - 60).map(q => q.x);
    cores.length = 0; cores.push({ x: PLAYER_X + 300, y: 300, taken: false, bob: 0, spin: 0 });
    dieBy('spike');
    o.theWorldBehindIsKept = behind.every(x => platforms.some(q => q.x === x));
    o.aPendingCoreIsReoffered = cores.filter(q => !q.taken).length === 1 && cores[0].x > PLAYER_X;
    o.nothingLivesOnTheRunway = (() => {
      const rw = platforms.find(q => q.safe);
      const on = x => x > rw.x && x < rw.x + rw.width;
      return !spikes.some(q => on(q.x)) && !wires.some(q => on(q.x)) && !turrets.some(q => on(q.x)) &&
             !springs.some(q => on(q.x)) && !portals.some(q => on(q.inX)) && bullets.length === 0;
    })();

    // the ramp: CONTINUE resumes at ~55% speed and is back to full in 1.5s
    for (let i = 0; i < RESUME_LOCK + 2; i++) update(16);
    resumeFromLifePause();
    const full = targetSpeed();
    update(16); const first = scrollSpeed;
    for (let i = 0; i < RAMP_FRAMES + 2; i++) update(16);
    o.resumeStartsSlow = first < full * 0.62 && first > full * 0.5;
    o.backToFullSpeedAfterTheRamp = Math.abs(scrollSpeed - targetSpeed()) < 0.01 && resumeRamp === 0;

    // the costs are untouched
    restart(); started = true; evolve(); evolve(); combo = 7; const d0 = distance = 5000;
    for (let i = 0; i < 30; i++) update(16);
    const d1 = distance, st0 = stage;
    dieBy('fall');
    o.formStillLost = stage === st0 - 1;
    o.comboStillWiped = combo === 0;
    o.distanceNeitherCreditedNorRefunded = distance === d1;
    restart();
    return o;
  });
  for (const [k, v] of Object.entries(e)) { if (typeof v === 'number') console.log('  worst-case clear ground: ' + v + ' frames'); else ok(v === true, k); }
  await browser.close();
}

// 29. MISSIONS RE-ROLL. Three missions capped the ladder at HERO; with six
//     forms a finished mission is replaced so the climb can continue.
console.log('\nMissions re-roll:');
{
  const { browser, page } = await open(webkit, TARGETS[0].ctx);
  const e = await page.evaluate(() => {
    const o = {};
    restart(); started = true;
    const first = missions.map(m => m.id);
    // finish the first mission by force
    const m0 = missions[0];
    if (m0.key === 'totalCoins') save.totalCoins = m0.target; else stats[m0.key] = m0.target;
    checkMissions();
    o.threeMissionsStayLive = missions.length === 3;
    o.theFinishedOneWasReplaced = missions[0].id !== first[0] || missions[0].done === false;
    o.theReplacementIsNotAlreadyDone = missions.every(m => m.done || missionProgress(m) < m.target);
    o.aCoreWasDropped = cores.length === 1;
    o.theRunCountsIt = stats.runMissions === 1;
    o.noDuplicateLiveMissions = new Set(missions.filter(m => !m.done).map(m => m.id)).size ===
                                missions.filter(m => !m.done).length;

    // five cores in one run is now possible
    restart(); started = true;
    let cores5 = 0;
    for (let round = 0; round < 12 && cores5 < 5; round++) {
      const m = missions.find(q => !q.done); if (!m) break;
      if (m.key === 'totalCoins') save.totalCoins = m.target + save.totalCoins; else stats[m.key] = m.target;
      const before = cores.length; checkMissions(); cores5 += cores.length - before;
    }
    o.fiveCoresAreReachableInOneRun = cores5 >= 5;
    restart();
    return o;
  });
  for (const [k, v] of Object.entries(e)) ok(v === true, k);
  await browser.close();
}

// 30. THE SAVED RUN. Leaving the game saves the run as an exact world;
//     CONTINUE restores it and consumes the save. One slot that cannot be
//     loaded twice is what keeps the shared board honest.
console.log('\nSaved run:');
{
  const { browser, page } = await open(webkit, TARGETS[0].ctx);
  const e = await page.evaluate(() => {
    const o = {};
    const runFor = n => { for (let i = 0; i < n; i++) update(16); };

    // A restored run plays on exactly like the original would have: same
    // inputs, same seeded randomness, every gameplay field compared. Scenery
    // is carried across by hand - it re-rolls with the shared random stream
    // when it wraps, and the snapshot leaves it out on purpose.
    const seeded = seed => () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0;
      let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296; };
    const realRandom = Math.random;
    const drive = n => { for (let f = 0; f < n; f++) { if (f % 37 === 0) pressJump(); if (f % 37 === 9) releaseJump(); update(16); } };
    const pick = () => { const x = snapshotRun(); delete x.savedAt; delete x.seq; return JSON.stringify(x); };
    let exact = 0, tried = 0;
    for (const [st, dist] of [[2, 7000], [3, 22000], [4, 25000]]) {
      restart(); started = true; distance = dist;
      for (let i = 0; i < st; i++) evolve();
      drive(400);
      while (hitStop > 0 || lifePause || jumpHeld) { if (lifePause) { resumeLock = 0; resumeFromLifePause(); } releaseJump(); update(16); }
      if (gameOver) continue;
      tried++;
      const S = snapshotRun(), profile = JSON.stringify(save), E = elapsed;
      const cosmetic = JSON.stringify({ clouds, hills, speedLines, stars, grassTufts, runFrame, runTimer, coinFrame, coinTimer });
      Math.random = seeded(1234); elapsed = E; drive(300); const A = pick();
      save = JSON.parse(profile); applySnapshot(S);
      { const c = JSON.parse(cosmetic); clouds = c.clouds; hills = c.hills; speedLines = c.speedLines; stars = c.stars;
        grassTufts = c.grassTufts; runFrame = c.runFrame; runTimer = c.runTimer; coinFrame = c.coinFrame; coinTimer = c.coinTimer; }
      Math.random = seeded(1234); elapsed = E; drive(300); const B = pick();
      Math.random = realRandom;
      if (A === B) exact++;
    }
    o.aRestoredRunContinuesExactlyAsTheOriginal = tried >= 2 && exact === tried;

    // SAVE & QUIT -> title -> a tap continues, exactly, after a 3-2-1
    restart(); started = true; distance = 9000; evolve(); evolve(); runFor(200);
    const before = { d: distance, s: score, lives, stage, x0: platforms[0].x, rid: runId };
    openPause(); runFor(RESUME_LOCK + 2);
    saveAndQuit();
    o.saveAndQuitReturnsToTheTitle = !started && !gameOver && !!pendingRun && !!readLocalRun();
    resumeLock = 0; pressJump();
    o.aTapOnTheTitleContinues = started && distance === before.d && score === before.s &&
      lives === before.lives && stage === before.stage && runId === before.rid && platforms[0].x === before.x0;
    o.continuingConsumesTheSave = !readLocalRun() && pendingRun === null;
    const d0 = distance;
    pressJump();
    o.noJumpIsBufferedDuringTheCount = jumpBuffer === 0;
    releaseJump(); runFor(COUNTDOWN_FRAMES - 1);
    o.theWorldHoldsDuringTheCount = distance === d0;
    runFor(3);
    o.itMovesAtGo = distance > d0;

    // leaving pauses and saves; coming back takes the save back
    onLeavingPage();
    o.leavingPausesAndSaves = uiScreen === 'paused' && !!readLocalRun() && readLocalRun().runId === runId;
    reclaimLiveRun();
    o.comingBackTakesTheSaveBack = !readLocalRun() && started && !gameOver;

    // nothing survives the run's end
    uiScreen = 'play'; countdown = 0; lives = 1; invuln = 0; die('fall');
    o.gameOverLeavesNothingToLoad = gameOver && !readLocalRun() && pendingRun === null;

    // a doomed fall is still doomed after a save and a continue
    restart(); started = true; distance = 5000;
    platforms = platforms.filter(q => q.x > PLAYER_X + 400);
    spikes = []; wires = []; turrets = []; springs = []; portals = [];
    player.y = 380; player.velocityY = 6; player.grounded = false; player.airJumps = 0;
    const l0 = lives;
    saveAndQuit(); resumeLock = 0; continueRun(); runFor(COUNTDOWN_FRAMES + 120);
    o.aDoomedFallStaysDoomed = lives === l0 - 1 || gameOver;

    // a copy left open elsewhere is forfeited once the run moved on
    restart(); started = true; distance = 5000; runFor(60);
    onLeavingPage(); clearLocalRun(); reclaimLiveRun();
    o.aStaleCopyIsForfeitedNotPlayedTwice = !started && /continued/.test(runNotice);

    // NEW RUN: two taps, and the saved run's score is banked, not lost
    restart(); started = true; distance = 5000; runFor(60); score = 98765;
    saveAndQuit(); newRunFromTitle();
    o.newRunNeedsASecondTap = !!pendingRun && newRunArmed > 0 && !gameOver;
    newRunFromTitle();
    o.newRunBanksTheSavedRun = gameOver && save.bestScore >= 98765 && !readLocalRun() && !pendingRun;

    // END RUN ends the run even inside the post-revive mercy window
    restart(); started = true; distance = 5000; runFor(30);
    die('spike'); resumeLock = 0; resumeFromLifePause(); openPause(); resumeLock = 0;
    const mercy = invuln > 0;
    endRunNow();
    o.endRunWorksDuringTheMercyWindow = mercy && gameOver === true;

    // saved on the LIFE LOST screen: continues as if CONTINUE was pressed
    restart(); started = true; distance = 5000; runFor(30);
    die('spike'); onLeavingPage();
    const snap = readLocalRun();
    restart(); pendingRun = snap; resumeLock = 0; continueRun();
    o.aLifeLostSaveResumesStraightIn = !lifePause && resumeRamp > 0 && invuln > 0;

    // JSON has no Infinity: an unscored spike must not pay a free CLOSE CALL
    restart(); started = true;
    spikes = [{ x: PLAYER_X + 300, y: GROUND_Y - 30, size: 30, near: Infinity, scored: false }];
    applySnapshot(snapshotRun());
    o.anUnscoredSpikeSurvivesTheRoundTrip = spikes[0].near === Infinity;

    // blocked storage and no cloud: SAVE & QUIT says so and keeps the run
    restart(); started = true; distance = 5000; runFor(30);
    const realSet = Storage.prototype.setItem;
    Storage.prototype.setItem = function () { throw new Error('blocked'); };
    saveAndQuit();
    Storage.prototype.setItem = realSet;
    o.blockedStorageKeepsTheRunAndSaysSo = started && !gameOver && /Could not save/.test(runNotice);

    // a malformed save from storage is ignored rather than crashing boot
    localStorage.setItem(RUN_KEY, JSON.stringify({ v: 1, runId: 'x', world: {} }));
    o.aMalformedSaveIsIgnored = readLocalRun() === null;
    clearLocalRun();
    restart();
    return o;
  });
  for (const [k, v] of Object.entries(e)) ok(v === true, k);

  // A real reload offers the run on the title.
  await page.evaluate(() => { restart(); started = true; distance = 12000; for (let i = 0; i < 60; i++) update(16); onLeavingPage(); });
  const m = await page.evaluate(() => readLocalRun().meters);
  await page.reload(); await page.waitForTimeout(1200);
  const back = await page.evaluate(() => ({ offered: !!pendingRun, m: pendingRun && pendingRun.meters }));
  ok(back.offered && back.m === m, 'after a reload the title offers the saved run', JSON.stringify(back));
  await page.evaluate(() => { clearLocalRun(); pendingRun = null; });
  await browser.close();
}

// 30b. KEYBOARD. Every menu button has a key, shown on the button; these
//      are the ones a desktop player runs the whole game with.
console.log('\nKeyboard:');
{
  const { browser, page } = await open(webkit, { viewport: { width: 1200, height: 800 } });
  const e = await page.evaluate(() => {
    const o = {};
    const press = code => window.dispatchEvent(new KeyboardEvent('keydown', { code, key: code, bubbles: true, cancelable: true }));
    const lift = code => window.dispatchEvent(new KeyboardEvent('keyup', { code, key: code, bubbles: true, cancelable: true }));
    const runFor = n => { for (let i = 0; i < n; i++) update(16); };
    restart();
    press('KeyS'); o.sOpensTheShopFromTheTitle = uiScreen === 'shop';
    press('Escape'); o.escapeClosesIt = uiScreen === 'play';
    press('KeyL'); o.lOpensTheBoard = uiScreen === 'board';
    press('Escape');
    started = true;
    press('KeyS'); o.sIsJetDiveDuringARunNotShop = uiScreen === 'play' && keyDive === true;
    lift('KeyS');
    press('Escape'); o.escapePausesARun = uiScreen === 'paused';
    runFor(RESUME_LOCK + 2);
    press('Enter'); o.enterResumesThroughTheCount = uiScreen === 'play' && countdown === COUNTDOWN_FRAMES;
    runFor(COUNTDOWN_FRAMES + 2);
    distance = 6000; runFor(10);
    press('Escape'); runFor(RESUME_LOCK + 2);
    press('KeyQ'); o.qSavesAndQuits = !started && !!pendingRun && !!readLocalRun();
    press('KeyN'); o.nArmsNewRun = newRunArmed > 0 && !!pendingRun;
    newRunArmed = 0;
    resumeLock = 0; press('Space');
    o.spaceContinuesTheSavedRun = started && pendingRun === null && countdown > 0;
    runFor(COUNTDOWN_FRAMES + 2);
    press('Escape'); runFor(RESUME_LOCK + 2);
    press('KeyE'); o.eEndsTheRunFromThePause = gameOver === true;
    runFor(RESUME_LOCK + 2);
    press('Enter'); o.enterRestartsAfterGameOver = gameOver === false;
    restart();
    return o;
  });
  for (const [k, v] of Object.entries(e)) ok(v === true, k);
  await browser.close();
}

// 31. THE CLOUD SAVE. Mirrored to the player's private area of the db, so it
//     continues on another device - and a copy left running on the first
//     device is forfeited rather than played twice.
console.log('\nCloud save:');
{
  const browser = await webkit.launch();
  const store = new Map();
  let refuse = false;
  const MOCK = () => {
    const ref = path => ({
      id: path.split('/').pop(), path,
      get: async () => { const v = await window.__dbGet(path);
        return { id: path.split('/').pop(), exists: v !== null, data: () => v === null ? undefined : JSON.parse(v) }; },
      set: async body => { const r = await window.__dbSet(path, JSON.stringify(body)); if (r) throw { code: r }; },
      delete: async () => { await window.__dbDel(path); }
    });
    const q = name => { const o = { orderBy: () => o, limit: () => o,
      onSnapshot: next => { next({ docs: [], size: 0, empty: true }); return () => {}; },
      doc: id => ref(name + '/' + id) }; return o; };
    window.claude = { use: n => Promise.resolve(n === 'db' ? { doc: ref, collection: q } :
                                                n === 'user' ? { id: async () => 'u1' } : null) };
  };
  const device = async () => {
    const ctx = await browser.newContext(TARGETS[0].ctx);
    await ctx.exposeFunction('__dbGet', p => store.has(p) ? JSON.stringify(store.get(p)) : null);
    await ctx.exposeFunction('__dbSet', (p, body) => { if (refuse) return 'invalid_argument'; store.set(p, JSON.parse(body)); return null; });
    await ctx.exposeFunction('__dbDel', p => { store.delete(p); });
    await ctx.addInitScript(MOCK);
    const page = await ctx.newPage();
    await page.route('**/game.html', r => r.fulfill({ status: 200, headers: { 'content-type': 'text/html; charset=utf-8' }, body: html }));
    await page.goto('https://turbo-dash.test/game.html');
    await page.waitForTimeout(1500);
    return page;
  };
  const settle = p => p.evaluate(async () => { await cloudChain; await new Promise(r => setTimeout(r, 50)); await cloudChain; });
  const SAVE = 'data/users/u1/turbo';

  const phone = await device();
  const saved = await phone.evaluate(() => {
    restart(); started = true; distance = 15000; evolve(); evolve(); evolve();
    for (let i = 0; i < 200; i++) update(16);
    onLeavingPage();
    return { m: Math.floor(distance / 10), runId, stage: stageDef().name, lives, score: Math.floor(score) };
  });
  await settle(phone);
  ok(store.has(SAVE) && store.get(SAVE).runId === saved.runId, 'leaving the app writes the run to the player\'s private cloud area');

  const pc = await device();
  await settle(pc);
  const offered = await pc.evaluate(() => ({ src: pendingRun && pendingRun.src, m: pendingRun && pendingRun.meters }));
  ok(offered.src === 'cloud' && offered.m === saved.m, 'another device is offered the run', JSON.stringify(offered));
  await pc.evaluate(() => { resumeLock = 0; continueRun(); });
  await settle(pc);
  const there = await pc.evaluate(() => ({ m: Math.floor(distance / 10), runId, stage: stageDef().name, lives, score: Math.floor(score) }));
  ok(JSON.stringify(there) === JSON.stringify({ m: saved.m, runId: saved.runId, stage: saved.stage, lives: saved.lives, score: saved.score }),
     'it continues there exactly', JSON.stringify(there));
  ok(!store.has(SAVE), 'continuing consumes the cloud copy');

  await phone.evaluate(() => reclaimLiveRun());
  await settle(phone);
  const stale = await phone.evaluate(() => ({ started, notice: runNotice }));
  ok(!stale.started && /continued/.test(stale.notice), 'the copy left on the first device is forfeited', JSON.stringify(stale));

  // game over never deletes a different run's cloud save
  await phone.evaluate(() => { restart(); started = true; distance = 4000; for (let i = 0; i < 60; i++) update(16); });
  store.set(SAVE, { v: 1, runId: 'r-other-device' });
  await phone.evaluate(() => { lives = 1; invuln = 0; die('fall'); });
  await settle(phone);
  ok(store.has(SAVE) && store.get(SAVE).runId === 'r-other-device', 'game over leaves another run\'s cloud save alone');
  store.delete(SAVE);

  // a visitor who may not write keeps a device save
  refuse = true;
  const visitor = await device();
  await visitor.evaluate(() => { restart(); started = true; distance = 3000; for (let i = 0; i < 60; i++) update(16); openPause(); resumeLock = 0; saveAndQuit(); });
  await settle(visitor);
  const vis = await visitor.evaluate(() => ({ writable: cloudRunWritable, local: !!readLocalRun(), offered: !!pendingRun }));
  ok(!vis.writable && vis.local && vis.offered, 'a read-only visitor keeps a device save', JSON.stringify(vis));
  await browser.close();
}

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
