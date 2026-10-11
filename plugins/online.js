(function () {
    'use strict';
    var script = document.currentScript || Array.from(document.scripts || []).pop();
    var base = (script && script.src) ? script.src.replace(/\/[^/]+$/, '') : 'https://dmarceniuk.github.io/main';
    if (base.endsWith('/plugins')) {
        base = base.replace(/\/plugins$/, '');
    }

    // 1. Strict torrent protection (user in Spain - absolutely 0% P2P allowed)
    try {
        if (window.Lampa && Lampa.Storage) {
            Lampa.Storage.set('torrserver_preload', false);
            Lampa.Storage.set('torrserver_use_link', 'never');
            Lampa.Storage.set('parser_torrent_type', 'none');
        }
    } catch (e) {}

    // 2. Load dependencies sequentially: crypto-js -> BanderaOnline -> uaserials button
    function putScript(src, cb) {
        if (window.Lampa && Lampa.Utils && Lampa.Utils.putScriptAsync) {
            Lampa.Utils.putScriptAsync([src], cb || function () {}, cb || function () {});
        } else {
            var s = document.createElement('script');
            s.src = src;
            if (cb) s.onload = cb;
            if (cb) s.onerror = cb;
            document.body.appendChild(s);
        }
    }

    function init() {
        putScript(base + '/crypto-js.min.js', function () {
            putScript(base + '/BanderaOnline/BanderaOnline.js', function () {
                putScript(base + '/uaserials.js', function () {
                    console.log('[Online Suite] Ukrainian Balancers Loaded Successfully!');
                });
            });
        });
    }

    if (window.Lampa && Lampa.Listener) {
        init();
    } else {
        var timer = setInterval(function () {
            if (window.Lampa && Lampa.Listener) {
                clearInterval(timer);
                init();
            }
        }, 150);
    }
})();
