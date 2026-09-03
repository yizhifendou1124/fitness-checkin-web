const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const indexHtml = fs.readFileSync(
    path.join(__dirname, "..", "src", "index.html"),
    "utf8"
);
const styleCss = fs.readFileSync(
    path.join(__dirname, "..", "src", "styles", "style.css"),
    "utf8"
);

test("OTP input accepts Supabase email token lengths", () => {
    const otpInput = indexHtml.match(/<input id="auth-otp"[^>]+>/);

    assert.ok(otpInput, "auth OTP input should exist");
    assert.match(otpInput[0], /maxlength="10"/);
    assert.match(otpInput[0], /placeholder="验证码"/);
});

test("login UI defaults to fixed user password mode and can switch to email OTP", () => {
    assert.match(indexHtml, /id="auth-mode-fixed"[^>]+aria-pressed="true"/);
    assert.match(indexHtml, /id="auth-mode-email"[^>]+aria-pressed="false"/);
    assert.match(indexHtml, /id="auth-step-fixed"/);
    assert.match(indexHtml, /id="auth-password"[^>]+type="password"/);
    assert.match(indexHtml, /id="fixed-login"/);
    assert.match(indexHtml, /id="auth-step-email"[^>]+class="hidden"/);
});

test("main UI opens account migration in a hidden modal", () => {
    assert.doesNotMatch(indexHtml, /id="user-email"/);
    assert.match(indexHtml, /id="open-migration"[^>]+class="header-action-btn"/);
    assert.match(indexHtml, /id="export-checkin"[^>]+class="header-action-btn"/);
    assert.match(indexHtml, /id="logout"[^>]+class="header-action-btn"/);
    assert.match(indexHtml, /id="migration-modal"[^>]+class="hidden"/);
    assert.match(indexHtml, /id="migration-panel"/);
    assert.match(indexHtml, /id="close-migration"/);
    assert.match(indexHtml, /id="migration-source-email"[^>]+type="email"/);
    assert.doesNotMatch(indexHtml, /id="migration-target-email"/);
    assert.match(indexHtml, /id="migration-current-account"/);
    assert.match(indexHtml, /迁移到当前账号/);
    assert.match(indexHtml, /id="migration-mode-incremental"[^>]+value="incremental"[^>]+checked/);
    assert.match(indexHtml, /id="migration-mode-overwrite"[^>]+value="overwrite"/);
    assert.match(indexHtml, /id="migrate-data"/);
    assert.match(indexHtml, /id="migration-message"/);
});

test("header action buttons share a distinct selected style from month controls", () => {
    assert.doesNotMatch(styleCss, /#user-bar\s*{[^}]*gap:/s);
    assert.match(styleCss, /#user-bar\s*{[^}]*margin-bottom: 16px;/s);
    assert.match(styleCss, /#app\.is-exporting #user-bar\s*{[^}]*margin-bottom: 48px !important;/s);
    assert.match(styleCss, /\.header-action-btn \+ \.header-action-btn\s*{[^}]*margin-left: 8px;/s);
    assert.match(styleCss, /\.header-action-btn\s*{[^}]*background: #7c8fda;/s);
    assert.match(styleCss, /\.header-action-btn:hover,[\s\S]*?\.header-action-btn\.active\s*{[^}]*background: #5f72c7;/s);
    assert.match(styleCss, /#app\.is-exporting #export-checkin,[\s\S]*?#app\.is-exporting #export-checkin\.active\s*{[^}]*background: #7c8fda !important;[^}]*box-shadow: none !important;[^}]*transform: none !important;[^}]*transition: none !important;/s);
    assert.doesNotMatch(styleCss, /\.logout-btn\s*{[^}]*background:/s);
});

test("page exposes high-resolution app image export", () => {
    assert.match(indexHtml, /html-to-image@1\.11\.11/);
    assert.match(indexHtml, /id="export-checkin"[^>]+class="header-action-btn"/);
});

test("app script exports the full app DOM as a high-resolution png", () => {
    const appScript = fs.readFileSync(
        path.join(__dirname, "..", "src", "scripts", "app.auth.js"),
        "utf8"
    );

    assert.match(appScript, /const exportCheckinButton = document\.getElementById\("export-checkin"\)/);
    assert.match(appScript, /const EXPORT_PIXEL_RATIO = 4/);
    assert.match(appScript, /async function exportCheckInAsPng\(\)/);
    assert.match(appScript, /appContainer\.classList\.add\("is-exporting"\)/);
    assert.match(appScript, /appContainer\.classList\.remove\("is-exporting"\)/);
    assert.match(appScript, /await waitForStableExportFrame\(\)/);
    assert.match(appScript, /appContainer\.getBoundingClientRect\(\)/);
    assert.match(appScript, /window\.htmlToImage\.toPng\(appContainer/);
    assert.match(appScript, /pixelRatio: EXPORT_PIXEL_RATIO/);
    assert.match(appScript, /cacheBust: true/);
    assert.match(appScript, /downloadLink\.download = buildExportFileName\(\)/);
    assert.doesNotMatch(appScript, /appContainer\.scrollWidth/);
    assert.doesNotMatch(appScript, /style:\s*{[\s\S]*width: `\$\{width\}px`/);
    assert.doesNotMatch(appScript, /renderHighDefinitionExportCanvas/);
    assert.doesNotMatch(appScript, /drawExportCalendar/);
});
