(function () {
    'use strict';
    var localCrypto = './plugins/crypto-js.min.js';
    var localPath = './plugins/BanderaOnline/BanderaOnline.js';
    var remoteCrypto = 'https://dmarceniuk.github.io/main/crypto-js.min.js';
    var remoteUrl = 'https://dmarceniuk.github.io/main/BanderaOnline/BanderaOnline.js';

    function loadRemote() {
        if (!window.CryptoJS) {
            Lampa.Utils.putScriptAsync([remoteCrypto], function () {
                Lampa.Utils.putScriptAsync([remoteUrl], function () { });
            }, function () {
                Lampa.Utils.putScriptAsync([remoteUrl], function () { });
            });
        } else {
            Lampa.Utils.putScriptAsync([remoteUrl], function () { });
        }
    }

    function loadLocal() {
        if (!window.CryptoJS) {
            Lampa.Utils.putScriptAsync([localCrypto], function () {
                Lampa.Utils.putScriptAsync([localPath], function () { }, loadRemote);
            }, loadRemote);
        } else {
            Lampa.Utils.putScriptAsync([localPath], function () { }, loadRemote);
        }
    }

    loadLocal();
})();
