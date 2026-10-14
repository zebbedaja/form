const { test, expect } = require('@playwright/test');

async function prepareForm(page, name) {
  await page.goto('/?debug=1');
  await expect(page.locator('#status-msg')).toHaveText('Debug mode: trolls disabled.');

  // The documented cheat fills the other fields through the game's real UI.
  for (const key of ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown',
    'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a']) {
    await page.keyboard.press(key);
  }
  await expect(page.locator('#status-msg')).toHaveText('Cheat code accepted. Shame.');
  await page.getByLabel('Full name:').fill(name);
}

async function fillSecondPage(page) {
  await page.locator('#second-heading').focus();
  for (const key of ['a', 'b', 'ArrowRight', 'ArrowLeft', 'ArrowRight',
    'ArrowLeft', 'ArrowDown', 'ArrowDown', 'ArrowUp', 'ArrowUp']) {
    await page.keyboard.press(key);
  }
  await expect(page.locator('#f-occupation')).toHaveValue('Applet developer');
  await expect(page.locator('#f-city')).toHaveValue('Berlin');
}

async function finishSubmission(page) {
  const dialog = page.getByRole('dialog');
  await expect(dialog).toContainText('Form submitted successfully!');
  await dialog.getByRole('button', { name: 'OK', exact: true }).click();
  await expect(dialog).toContainText('Your form has been lost.');
  await dialog.getByRole('button', { name: 'OK', exact: true }).click();
  await expect(page.locator('#win')).toBeVisible();
}

for (const { label, input, displayed } of [
  { label: 'entered full name', input: 'Ada Lovelace', displayed: 'Ada Lovelace' },
  { label: 'trimmed Unicode name', input: '  José García  ', displayed: 'José García' },
  { label: 'HTML-like name as literal text', input: '<b>Ada Lovelace</b>', displayed: '<b>Ada Lovelace</b>' }
]) {
  test(`congratulates the ${label}`, async ({ page }) => {
    await prepareForm(page, input);
    await page.getByRole('button', { name: 'Next', exact: true }).click();
    await fillSecondPage(page);
    await page.getByRole('button', { name: 'Submit', exact: true }).click();
    await finishSubmission(page);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(`Congratulations ${displayed} 🎉`);
    await expect(page.locator('#win-name > *')).toHaveCount(0);
    await expect(page.locator('#win-attempts')).toHaveText('1');
  });
}

test('keeps the submitted name during the delayed success flow', async ({ page }) => {
  await prepareForm(page, 'Ada Lovelace');
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  await fillSecondPage(page);
  await page.getByRole('button', { name: 'Submit', exact: true }).click();
  // The form remains editable until the first submission dialog appears.
  await page.getByLabel('Full name:').fill('Grace Hopper');
  await finishSubmission(page);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Congratulations Ada Lovelace 🎉');
});

for (const width of [1280, 390, 320]) {
  test(`keeps page two at least halfway covered at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await prepareForm(page, 'Ada Lovelace');
    await page.getByRole('button', { name: 'Next', exact: true }).click();
    const front = await page.locator('#frame').boundingBox();
    const rear = await page.locator('#second-frame').boundingBox();
    const overlapWidth = Math.max(0, Math.min(front.x + front.width, rear.x + rear.width) - Math.max(front.x, rear.x));
    const overlapHeight = Math.max(0, Math.min(front.y + front.height, rear.y + rear.height) - Math.max(front.y, rear.y));
    expect(overlapWidth * overlapHeight / (rear.width * rear.height)).toBeGreaterThanOrEqual(0.5);
    expect(rear.x + rear.width).toBeLessThanOrEqual(width + 1);
    await expect(page.locator('#second-heading')).toHaveText('Additional details');
    await expect(page.locator('#second-frame')).toHaveCSS('transform', 'matrix(-1, 0, 0, -1, 0, 0)');
    await page.screenshot({ path: `test-results/page-two-${width}.png`, fullPage: true });
    await page.getByRole('button', { name: 'Back', exact: true }).click();
    await expect(page.locator('#second-frame')).toBeHidden();
    await expect(page.getByLabel('Full name:')).toHaveValue('Ada Lovelace');
    await page.getByLabel('Full name:').fill('Grace Hopper');
    await page.getByRole('button', { name: 'Next', exact: true }).click();
    await expect(page.locator('#f-city')).toHaveValue('');
    await fillSecondPage(page);
    await page.getByRole('button', { name: 'Submit', exact: true }).click();
    await finishSubmission(page);
    await expect(page.locator('#win-name')).toHaveText('Grace Hopper');
  });
}


test('requires the obscured fields and accepts blind keyboard input', async ({ page }) => {
  await page.goto('/?debug=1');
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText('Please enter your full name.');
  await page.getByRole('dialog').getByRole('button', { name: 'OK', exact: true }).click();
  await prepareForm(page, 'Ada Lovelace');
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  await page.locator('#second-heading').press('Tab');
  await expect(page.locator('#f-occupation')).toBeFocused();
  await page.keyboard.press('ControlOrMeta+a');
  await page.keyboard.press('Backspace');
  await page.getByRole('button', { name: 'Submit', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText('Please enter your occupation.');
  await page.getByRole('dialog').getByRole('button', { name: 'OK', exact: true }).click();
  await page.locator('#second-heading').focus();
  await page.keyboard.press('Tab');
  await page.keyboard.type('Engineer');
  await page.keyboard.press('Tab');
  await expect(page.locator('#f-city')).toBeFocused();
  await page.keyboard.press('ControlOrMeta+a');
  await page.keyboard.type('Hamburg');
  for (const id of ['f-occupation', 'f-city']) {
    const covered = await page.locator(`#${id}`).evaluate(el => {
      const rect = el.getBoundingClientRect();
      return document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2).closest('#frame') !== null;
    });
    expect(covered).toBe(true);
  }
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Back', exact: true })).toBeFocused();
  await page.keyboard.press('Tab');
  await page.keyboard.press('Enter');
  await finishSubmission(page);
});


test('uses separate cheat sequences on each page', async ({ page }) => {
  await prepareForm(page, 'Ada Lovelace');
  await expect(page.locator('#f-occupation')).toHaveValue('');
  await expect(page.locator('#f-city')).toHaveValue('');
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  for (const key of ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown',
    'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a']) {
    await page.keyboard.press(key);
  }
  await expect(page.locator('#f-occupation')).toHaveValue('');
  await expect(page.locator('#f-city')).toHaveValue('');
  await fillSecondPage(page);
  await expect(page.locator('#f-name')).toHaveValue('Ada Lovelace');
  await page.getByRole('button', { name: 'Back', exact: true }).click();
  await page.getByLabel('Full name:').fill('Grace Hopper');
  await page.getByRole('button', { name: 'Next', exact: true }).focus();
  for (const key of ['a', 'b', 'ArrowRight', 'ArrowLeft', 'ArrowRight',
    'ArrowLeft', 'ArrowDown', 'ArrowDown', 'ArrowUp', 'ArrowUp']) {
    await page.keyboard.press(key);
  }
  await expect(page.locator('#f-name')).toHaveValue('Grace Hopper');
});
