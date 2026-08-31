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

    root.resolveAuthRedirectUrl = resolveAuthRedirectUrl;

    if (typeof module !== "undefined" && module.exports) {
        module.exports = { resolveAuthRedirectUrl };
    }
})(typeof window !== "undefined" ? window : globalThis);
