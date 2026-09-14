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
    o.startsWithAFullTank = flightMeter === FLIGHT_FRAMES && !suitBurned;

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

    // Burn-out drops to the pack below rather than removing the item.
    restart(); started = true; jumpHeld = true; player.grounded = false;
    for (let i = 0; i < FLIGHT_FRAMES + 40; i++) updatePlayer();
    o.burnsOutWhenTheTankIsEmpty = suitBurned && flightMeter === 0;
    o.stopsFlyingOnceBurnedOut = flying === false;
    player.grounded = true; player.velocityY = 0; jumpBuffer = 5; jumpHeld = true;
    tryJump();
    o.normalJumpingReturnsAfterBurnout = player.velocityY === JUMP_STRENGTH;

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

// 15. THE MERCHANT. Mid-run spending without a menu, because a menu would stop
//     the run the whole game exists to keep moving.
console.log('\nMerchant:');
{
  const { browser, page } = await open(webkit, TARGETS[0].ctx);
  const e = await page.evaluate(() => {
    const o = {};
    const put = () => { powerups.length = 0;
      powerups.push({ x: PLAYER_X + PLAYER_W / 2, y: player.y + PLAYER_H / 2,
                      type: 'merchant', goods: 'shield', taken: false, bob: 0 });
      return powerups[0]; };

    restart(); save.wallet = 0;   o.noOfferWhileBroke = merchantChance() === 0;
    save.wallet = 500;            o.offersOnceAffordable = merchantChance() > 0;

    restart(); started = true; save.wallet = 200; power.shield = 0;
    let m = put(); checkCollisions();
    o.buyingDeductsAndGrants = save.wallet === 200 - MERCHANT_PRICE &&
                               power.shield === 1 && m.taken;

    // Refused purchases must not quietly eat the coins OR the balloon.
    restart(); started = true; save.wallet = 10; power.shield = 0;
    m = put(); checkCollisions();
    o.refusedPurchaseChangesNothing = save.wallet === 10 && power.shield === 0 && !m.taken;

    // The offer is decided up front so it can be shown before committing.
    restart(); lives = MAX_LIVES;
    let heartsAtFull = 0;
    for (let i = 0; i < 300; i++) if (rollMerchantGoods() === 'heart') heartsAtFull++;
    o.neverSellsHeartsAtFullLives = heartsAtFull === 0;
    lives = 1;
    let heartsWhenHurt = 0;
    for (let i = 0; i < 300; i++) if (rollMerchantGoods() === 'heart') heartsWhenHurt++;
    o.sellsHeartsWhenHurt = heartsWhenHurt > 30;
    restart();
    return o;
  });
  for (const [k, v] of Object.entries(e)) ok(v === true, k);
  await browser.close();
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

    o.thereAreFourStages = STAGES.length === 4 && STAGES[3].name === 'HERO';
    restart(); started = true; evolve(); evolve();
    cores.length = 0; spawnEvolutionCore();
    o.aThirdCoreIsOfferedAfterBlaze = cores.length === 1;
    evolve(); cores.length = 0; spawnEvolutionCore();
    o.nothingIsOfferedBeyondHero = cores.length === 0;

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
    restart(); started = true; evolve(); evolve(); evolve();
    const f0 = flightMeter, h0 = heroFuel;
    player.grounded = false; jumpHeld = true;
    for (let i = 0; i < 30; i++) updatePlayer();
    o.theFiniteBudgetIsSpentFirst = flightMeter < f0 && heroFuel === h0;
    for (let i = 0; i < FLIGHT_FRAMES + 10; i++) updatePlayer();
    o.aBurntSuitLeavesHeroFlightIntact = suitBurned && heroCanFly();
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

    // the heartbeat catches anything a mutation path forgot
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
    restart(); distance = 3000 * 8; portals.length = 0;
    portals.push({ inX: 700, inY: GROUND_Y - 30, outX: null, outY: 0, used: false, spin: 0 });
    recycleWorld();
    const pt = portals[0];
    const under = pt.outX !== null && platforms.find(q => !q.fake && !q.crumble && pt.outX >= q.x && pt.outX <= q.x + q.width);
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
    update(16);
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

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
