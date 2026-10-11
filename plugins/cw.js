(function () {
    'use strict';
    var localPath = './plugins/CommunityWatches/CommunityWatches.js';
    var remoteUrl = 'https://lampame.github.io/main/CommunityWatches/CommunityWatches.js';
    Lampa.Utils.putScriptAsync([localPath], function () { }, function () {
        Lampa.Utils.putScriptAsync([remoteUrl], function () { });
    });
})();
