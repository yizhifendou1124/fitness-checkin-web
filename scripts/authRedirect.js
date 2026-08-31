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

    root.resolveAuthRedirectUrl = resolveAuthRedirectUrl;
    root.buildOtpSignInPayload = buildOtpSignInPayload;

    if (typeof module !== "undefined" && module.exports) {
        module.exports = {
            buildOtpSignInPayload,
            resolveAuthRedirectUrl,
        };
    }
})(typeof window !== "undefined" ? window : globalThis);
