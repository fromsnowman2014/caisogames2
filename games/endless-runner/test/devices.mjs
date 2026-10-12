// Target devices for Turbo Dash.
//
// iPhone 17 Pro on iOS 26 is here because that is the device a real blank-screen
// report came from. Playwright only gained that profile in 1.63, which is why
// the suite pins that version rather than anything older.
import { devices } from 'playwright';

const IOS_26_UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 26_6_1 like Mac OS X) ' +
  'AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Mobile/15E148 Safari/604.1';

export const TARGETS = [
  { name: 'iPhone 17 Pro (iOS 26)',           ctx: { ...devices['iPhone 17 Pro'],           userAgent: IOS_26_UA } },
  { name: 'iPhone 17 Pro landscape (iOS 26)', ctx: { ...devices['iPhone 17 Pro landscape'], userAgent: IOS_26_UA } },
  { name: 'iPhone 16 Pro',                    ctx: { ...devices['iPhone 16 Pro'] } },
  { name: 'iPhone SE (smallest supported)',   ctx: { ...devices['iPhone SE'] } },
  { name: 'Pixel 7',                          ctx: { ...devices['Pixel 7'] } },
  { name: 'Desktop 900x760',                  ctx: { viewport: { width: 900, height: 760 } } }
];

// Hostile environments the game must survive, or at least fail loudly in.
export const HOSTILE = [
  { name: 'localStorage blocked', init: () => {
      Object.defineProperty(window, 'localStorage',
        { get() { throw new Error('SecurityError: storage blocked'); } });
    } },
  { name: 'no AudioContext', init: () => {
      delete window.AudioContext; delete window.webkitAudioContext;
    } }
];

// A preview sheet that sandboxes the page. This is the real-world failure the
// boot screen exists for: scripts are blocked by CSP, which fires no
// window.onerror and does NOT trigger <noscript>, so without the boot screen
// the player just sees an unexplained coloured rectangle.
export const SANDBOX_CSP = "script-src 'none'; style-src 'unsafe-inline'; img-src *";
