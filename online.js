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
            var curBal = Lampa.Storage.get('bandera_online_balanser', '');
            if (!curBal || curBal === 'uatut') {
                Lampa.Storage.set('bandera_online_balanser', 'uakino');
            }
        }
    } catch (e) {}

    // 2. Cache-busting version parameter based on release timestamp
    var v = 'v=3.0.' + Math.floor(Date.now() / 60000);

    function putScript(src, cb) {
        var sep = src.indexOf('?') === -1 ? '?' : '&';
        var finalSrc = src + sep + v;
        if (window.Lampa && Lampa.Utils && Lampa.Utils.putScriptAsync) {
            Lampa.Utils.putScriptAsync([finalSrc], cb || function () {}, cb || function () {});
        } else {
            var s = document.createElement('script');
            s.src = finalSrc;
            if (cb) s.onload = cb;
            if (cb) s.onerror = cb;
            document.body.appendChild(s);
        }
    }

    function init() {
        // 1. Official UAKino integration (catalog in menu, QR account, 4K HEVC, instant player)
        putScript(base + '/uakino.js', function () {
            // 2. CryptoJS for decrypting streams
            putScript(base + '/crypto-js.min.js', function () {
                // 3. Multi-source Balancer Hub (UAKino, Franko CDN, Makhno Ashdi, UAFlix, UASerials, Filmix)
                putScript(base + '/BanderaOnline/BanderaOnline.js', function () {
                    console.log('[Online Suite] All Ukrainian Balancers & UAKino Loaded Successfully!');
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
