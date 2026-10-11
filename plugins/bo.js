(function () {
    'use strict';
    var localCrypto = './plugins/crypto-js.min.js';
    var localPath = './plugins/BanderaOnline/BanderaOnline.js';
    var remoteCrypto = 'https://dmarceniuk.github.io/main/crypto-js.min.js';
    var remoteUrl = 'https://dmarceniuk.github.io/main/BanderaOnline/BanderaOnline.js';

    function loadRemote() {
        Lampa.Utils.putScriptAsync([remoteCrypto, remoteUrl], function () { });
    }

    Lampa.Utils.putScriptAsync([localCrypto, localPath], function () { }, function () {
        loadRemote();
    });
})();
