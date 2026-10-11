(function () {
    'use strict';
    var script = document.currentScript || Array.from(document.scripts || []).pop();
    var base = (script && script.src) ? script.src.replace(/\/[^/]+$/, '') : 'https://dmarceniuk.github.io/main';
    // If loaded from /plugins/bo.js, adjust base to root
    if (base.endsWith('/plugins')) {
        base = base.replace(/\/plugins$/, '');
    }
    var cryptoUrl = base + '/crypto-js.min.js';
    var boUrl = base + '/BanderaOnline/BanderaOnline.js';

    function loadScript(src, onSuccess, onError) {
        if (window.Lampa && Lampa.Utils && Lampa.Utils.putScriptAsync) {
            Lampa.Utils.putScriptAsync([src], onSuccess || function () { }, onError || function () { });
        } else {
            var s = document.createElement('script');
            s.src = src;
            if (onSuccess) s.onload = onSuccess;
            if (onError) s.onerror = onError;
            document.body.appendChild(s);
        }
    }

    if (!window.CryptoJS) {
        loadScript(cryptoUrl, function () {
            loadScript(boUrl);
        }, function () {
            loadScript(boUrl);
        });
    } else {
        loadScript(boUrl);
    }
})();
