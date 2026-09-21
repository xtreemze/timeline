import { expect, test } from '@playwright/test';

test('built Pages shell boots application runtime on mobile', async ({ page }) => {
  const pageErrors: string[] = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));

  await page.goto('/', { waitUntil: 'domcontentloaded' });

  const shell = page.locator('#app-shell');
  const edit = page.locator('#editor-toggle');
  const browse = page.locator('#timeline-browser-toggle');
  const view = page.locator('#timeline-view-controls-toggle');

  await expect(shell).toHaveAttribute('data-mode', 'view');
  await expect(edit.locator('.semantic-icon')).toHaveCount(1);
  await expect(browse.locator('.semantic-icon')).toHaveCount(1);
  await expect(view.locator('.semantic-icon')).toHaveCount(1);

  await edit.click();
  await expect(shell).toHaveAttribute('data-mode', 'edit');
  await expect(page.locator('#control-panel')).toBeVisible();
  await expect(edit.locator('.app-tool-label')).toHaveText('Done');

  const project = page.locator('#project-menu-toggle');
  await project.click();
  await expect(page.locator('#project-menu:popover-open')).toBeVisible();
  await expect(page.locator('#load-sample')).toBeEnabled();
  await expect(page.locator('#import-json-trigger')).toBeEnabled();
  await expect(page.locator('#clear-timeline')).toBeEnabled();

  expect(pageErrors).toEqual([]);
});
