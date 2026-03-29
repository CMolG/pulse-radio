import { chromium, devices } from 'playwright';

async function run() {
  const browser = await chromium.launch({ headless: true });

  const mobile = await browser.newContext({ ...devices['iPhone 14'] });
  const p1 = await mobile.newPage();
  await p1.goto('http://localhost:3001', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await p1.waitForTimeout(2000);

  const cards = p1.locator('.group.cursor-pointer');
  if (await cards.count()) {
    await cards.first().click({ force: true });
    await p1.waitForTimeout(3000);
  }

  const mobileCheck = await p1.evaluate(() => {
    const reel = document.querySelector('.lyrics-reel');
    const bodyText = document.body.textContent || '';
    return {
      hasReel: !!reel,
      hasLyricsHeader: bodyText.includes('Lyrics'),
      hasPlaceholder: bodyText.includes('Lyrics will appear here when track metadata is available'),
      reelButtons: reel ? reel.querySelectorAll('button').length : 0,
    };
  });
  console.log('MOBILE', JSON.stringify(mobileCheck));

  const desktop = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const p2 = await desktop.newPage();
  await p2.goto('http://localhost:3001', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await p2.waitForTimeout(2000);
  const cards2 = p2.locator('.group.cursor-pointer');
  if (await cards2.count()) {
    await cards2.first().click({ force: true });
    await p2.waitForTimeout(3000);
  }

  const desktopCheck = await p2.evaluate(() => {
    const reel = document.querySelector('.lyrics-reel');
    const bodyText = document.body.textContent || '';
    return {
      hasReel: !!reel,
      hasLyricsHeader: bodyText.includes('Lyrics'),
      hasPlaceholder: bodyText.includes('Lyrics will appear here when track metadata is available'),
      reelButtons: reel ? reel.querySelectorAll('button').length : 0,
    };
  });
  console.log('DESKTOP', JSON.stringify(desktopCheck));

  await p1.screenshot({ path: '/tmp/lyrics-ui-mobile-final.png', fullPage: true });
  await p2.screenshot({ path: '/tmp/lyrics-ui-desktop-final.png', fullPage: true });

  await mobile.close();
  await desktop.close();
  await browser.close();
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
