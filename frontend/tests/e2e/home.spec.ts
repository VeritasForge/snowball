import { test, expect } from '@playwright/test';

test.describe('Home Page', () => {

  test('Guest mode should show Guest Portfolio dashboard', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('게스트 포트폴리오 현황')).toBeVisible();
    await expect(page.getByText('+ 종목 추가 (ADD ASSET)')).toBeVisible();
  });

  test('Logged-in user with no accounts should show welcome screen', async ({ page }) => {
    // Mock login state
    await page.addInitScript(() => {
        window.localStorage.setItem('auth-storage', JSON.stringify({
            state: {
                isAuthenticated: true,
                token: 'fake-token',
                user: { id: '1', email: 'test@example.com' }
            },
            version: 0
        }));
        window.localStorage.setItem('access_token', 'fake-token');
    });

    // Mock API
    await page.route('**/api/v1/accounts', async route => {
        await route.fulfill({ json: [] });
    });

    // Mock refresh token endpoint to avoid 401 loop if app checks it
    await page.route('**/api/v1/auth/refresh', async route => {
        await route.fulfill({ status: 400 }); // Fail refresh so it doesn't loop, but token is present
    });

    await page.goto('/');

    // Expect welcome screen
    await expect(page.getByText('환영합니다!')).toBeVisible();
    await expect(page.getByText('아직 관리 중인 포트폴리오가 없습니다.')).toBeVisible();

    // Expect create account input
    await expect(page.getByPlaceholder('포트폴리오 이름 (예: 퇴직연금)')).toBeVisible();
  });

});
