import { test, expect } from "@playwright/test";

test.skip("mdx story is rendered", async ({ page }) => {
  await page.goto("/?story=mdx--first");
  await expect(page.locator("main button")).toHaveText("simple");
});
