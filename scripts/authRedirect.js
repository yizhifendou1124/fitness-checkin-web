(function (root) {
    function withTrailingSlash(url) {
        return url.endsWith("/") ? url : url + "/";
    }

    function resolveAuthRedirectUrl(config, location) {
        if (config && config.appUrl) {
            return withTrailingSlash(config.appUrl.trim());
        }

        return location.origin + location.pathname;
    }

    function buildOtpSignInPayload(email, config, location) {
        return {
            email,
            options: {
                emailRedirectTo: resolveAuthRedirectUrl(config, location),
            },
        };
    }

    function buildPasswordSignInPayload(email, password) {
        return { email, password };
    }

    function parseMagicLinkSessionFromHash(hash) {
        if (!hash) {
            return null;
        }

        const params = new URLSearchParams(hash.startsWith("#") ? hash.slice(1) : hash);
        const accessToken = params.get("access_token");
        const refreshToken = params.get("refresh_token");

        if (!accessToken || !refreshToken) {
            return null;
        }

        return {
            access_token: accessToken,
            refresh_token: refreshToken,
        };
    }

    root.resolveAuthRedirectUrl = resolveAuthRedirectUrl;
    root.buildOtpSignInPayload = buildOtpSignInPayload;
    root.buildPasswordSignInPayload = buildPasswordSignInPayload;
    root.parseMagicLinkSessionFromHash = parseMagicLinkSessionFromHash;

    if (typeof module !== "undefined" && module.exports) {
        module.exports = {
            buildOtpSignInPayload,
            buildPasswordSignInPayload,
            parseMagicLinkSessionFromHash,
            resolveAuthRedirectUrl,
        };
    }
})(typeof window !== "undefined" ? window : globalThis);
