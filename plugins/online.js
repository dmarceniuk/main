(function () {
    'use strict';
    var base = 'https://dmarceniuk.github.io/main';
    try {
        var scripts = document.getElementsByTagName('script');
        for (var i = scripts.length - 1; i >= 0; i--) {
            var s = scripts[i];
            if (s && s.src && (s.src.indexOf('dmarceniuk') !== -1 || s.src.indexOf('online.js') !== -1)) {
                base = s.src.split('?')[0].replace(/\/[^/]+$/, '').replace(/\/plugins$/, '');
                break;
            }
        }
    } catch (e) {}

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
    var v = 'v=3.2.' + Math.floor(Date.now() / 60000);

    function putScript(src, cb) {
        var sep = src.indexOf('?') === -1 ? '?' : '&';
        var finalSrc = src + sep + v;
        if (window.Lampa && Lampa.Utils && Lampa.Utils.putScriptAsync) {
            Lampa.Utils.putScriptAsync([finalSrc], cb || function () {}, cb || function () {});
        } else {
            var s = document.createElement('script');
            s.src = finalSrc;
            if (cb) {
                s.onload = cb;
                s.onerror = cb;
            }
            document.body.appendChild(s);
        }
    }

    function init() {
        // 1. Official UAKino integration (catalog in menu, QR account, 4K HEVC, instant player)
        putScript(base + '/uakino.js');

        // 2. CryptoJS for decrypting streams + Multi-source Balancer Hub
        putScript(base + '/crypto-js.min.js', function () {
            putScript(base + '/BanderaOnline/BanderaOnline.js', function () {
                console.log('[Online Suite] All Ukrainian Balancers & UAKino Loaded Successfully!');
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
