const assert = require("node:assert/strict");
const test = require("node:test");

const {
    buildOtpSignInPayload,
    buildPasswordSignInPayload,
    parseMagicLinkSessionFromHash,
    resolveAuthRedirectUrl,
} = require("../src/scripts/authRedirect");

test("uses configured app URL for auth email redirects", () => {
    const result = resolveAuthRedirectUrl(
        { appUrl: "https://yizhifendou1124.github.io/fitness-checkin-web/" },
        { origin: "https://example.github.io", pathname: "/" }
    );

    assert.equal(result, "https://yizhifendou1124.github.io/fitness-checkin-web/");
});

test("falls back to current page when app URL is not configured", () => {
    const result = resolveAuthRedirectUrl(
        {},
        { origin: "https://yizhifendou1124.github.io", pathname: "/fitness-checkin-web/" }
    );

    assert.equal(result, "https://yizhifendou1124.github.io/fitness-checkin-web/");
});

test("puts email redirect URL inside Supabase options", () => {
    const result = buildOtpSignInPayload(
        "user@example.com",
        { appUrl: "https://yizhifendou1124.github.io/fitness-checkin-web/" },
        { origin: "https://wrong.example", pathname: "/" }
    );

    assert.deepEqual(result, {
        email: "user@example.com",
        options: {
            emailRedirectTo: "https://yizhifendou1124.github.io/fitness-checkin-web/",
        },
    });
});

test("builds a Supabase password sign-in payload", () => {
    const result = buildPasswordSignInPayload("sherwin@fitness.local", "secret-password");

    assert.deepEqual(result, {
        email: "sherwin@fitness.local",
        password: "secret-password",
    });
});

test("parses magic link session tokens from URL hash", () => {
    const result = parseMagicLinkSessionFromHash(
        "#access_token=access123&refresh_token=refresh456&type=magiclink"
    );

    assert.deepEqual(result, {
        access_token: "access123",
        refresh_token: "refresh456",
    });
});

test("ignores hashes without a complete magic link session", () => {
    assert.equal(parseMagicLinkSessionFromHash("#access_token=access123"), null);
    assert.equal(parseMagicLinkSessionFromHash(""), null);
});
