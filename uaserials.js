(function () {
    'use strict';

    if (window.plugin_uaserials_ready) return;
    window.plugin_uaserials_ready = true;

    var UASERIALS_PROXY = 'https://api.framextv.tech/api/proxy?url=';
    var UASERIALS_KEY = '297796CCB81D255125';

    function uaserialsProxy(url) {
        return UASERIALS_PROXY + encodeURIComponent(url);
    }

    function uaserialsFetch(url, success, fail) {
        var req = new Lampa.Reguest();
        req.timeout(15000);
        req.silent(uaserialsProxy(url), function (text) {
            if (typeof text === 'string') success(text);
            else if (text && typeof text === 'object') success(JSON.stringify(text));
            else success(text);
        }, fail, false, { dataType: 'text' });
    }

    function uaserialsDecryptTag(tagStr, callback, fail) {
        function doDecrypt() {
            try {
                var d = typeof tagStr === 'string' ? JSON.parse(tagStr) : tagStr;
                if (!window.CryptoJS) {
                    if (fail) fail(new Error('CryptoJS not available'));
                    return;
                }
                var cSalt = CryptoJS.enc.Hex.parse(d.salt);
                var cIv = CryptoJS.enc.Hex.parse(d.iv);
                var cKey = CryptoJS.PBKDF2(UASERIALS_KEY, cSalt, {
                    keySize: 256 / 32,
                    iterations: 999,
                    hasher: CryptoJS.algo.SHA512
                });
                var cDec = CryptoJS.AES.decrypt(d.ciphertext, cKey, {
                    iv: cIv,
                    mode: CryptoJS.mode.CBC,
                    padding: CryptoJS.pad.Pkcs7
                });
                var pt = cDec.toString(CryptoJS.enc.Utf8);
                if (pt) callback(pt);
                else if (fail) fail(new Error('Decryption empty'));
            } catch (e) {
                if (fail) fail(e);
            }
        }

        if (window.CryptoJS) {
            doDecrypt();
        } else {
            Lampa.Utils.putScriptAsync(['https://dmarceniuk.github.io/main/crypto-js.min.js'], doDecrypt);
        }
    }

    function uaserialsTortugaDecode(encoded) {
        try {
            var cleaned = encoded.replace(/[^A-Za-z0-9+/]/g, '');
            var pad = cleaned.length % 4;
            if (pad > 1) cleaned += '='.repeat(4 - pad);
            var decoded = atob(cleaned);
            var salt = decoded.charCodeAt(0) & 0xFF;
            var out = [];
            for (var i = 1; i < decoded.length; i++) {
                var k = (salt + 7 * (i - 1) + 13) % 256;
                out.push(String.fromCharCode((decoded.charCodeAt(i) & 0xFF) ^ k));
            }
            return decodeURIComponent(escape(out.join('')));
        } catch (e) {
            return '';
        }
    }

    function searchAndLoad(movie, onComplete, onError) {
        movie = movie || {};
        var query = movie.original_title || movie.original_name || movie.title || movie.name || '';
        if (!query) return onError('Немає назви для пошуку');

        Lampa.Noty.show('Пошук на UASerials: ' + query);

        var searchUrl = 'https://uaserials.com/index.php?do=search&subaction=search&story=' + encodeURIComponent(query);
        uaserialsFetch(searchUrl, function (html) {
            var regex = /<a[^>]+class="[^"]*uas-card[^"]*"[^>]+href="([^"]+)"[\s\S]*?<span[^>]+class="uas-card__title"[^>]*>([^<]+)<\/span>/g;
            var items = [];
            var m;
            while ((m = regex.exec(html)) !== null) {
                items.push({ title: m[2].trim(), href: m[1] });
            }
            if (!items.length) {
                var fallback = html.match(/href="(https:\/\/uaserials\.com\/\d+-[^"]+\.html)"/);
                if (fallback) items.push({ title: query, href: fallback[1] });
            }

            if (!items.length) {
                var uaTitle = movie.title || movie.name || '';
                if (uaTitle && uaTitle !== query) {
                    var retryUrl = 'https://uaserials.com/index.php?do=search&subaction=search&story=' + encodeURIComponent(uaTitle);
                    uaserialsFetch(retryUrl, function (html2) {
                        while ((m = regex.exec(html2)) !== null) {
                            items.push({ title: m[2].trim(), href: m[1] });
                        }
                        if (!items.length) {
                            var fallback2 = html2.match(/href="(https:\/\/uaserials\.com\/\d+-[^"]+\.html)"/);
                            if (fallback2) items.push({ title: uaTitle, href: fallback2[1] });
                        }
                        if (!items.length) return onError('Нічого не знайдено на UASerials');
                        loadTarget(items[0]);
                    }, onError);
                    return;
                }
                return onError('Нічого не знайдено на UASerials');
            }

            loadTarget(items[0]);

            function loadTarget(target) {
                uaserialsFetch(target.href, function (pageHtml) {
                    var tagMatch = pageHtml.match(/data-tag1=(?:'([^']+)'|"([^"]+)")/);
                    if (!tagMatch) return onError('Плеєр не знайдено на сторінці');
                    var tagContent = tagMatch[1] || tagMatch[2];

                    uaserialsDecryptTag(tagContent, function (decrypted) {
                        try {
                            var tabs = JSON.parse(decrypted);
                            var playerTab = tabs.find(function (t) { return t.tabName === 'Плеєр'; }) || tabs[0];
                            if (!playerTab || !playerTab.url) return onError('Вкладка плеєра відсутня');

                            uaserialsFetch(playerTab.url, function (embedHtml) {
                                var fileMatch = embedHtml.match(/file:\s*"([^"]+)"/);
                                if (!fileMatch) return onError('file не знайдено в ембеді');

                                var decoded = uaserialsTortugaDecode(fileMatch[1]);
                                if (!decoded) return onError('Помилка розкодування Tortuga');

                                onComplete(decoded, target.title);
                            }, onError);
                        } catch (err) {
                            onError(err.message);
                        }
                    }, onError);
                }, onError);
            }
        }, onError);
    }

    function openPlayerModal(decoded, title, movie) {
        if (decoded.indexOf('http') === 0) {
            Lampa.Player.play({
                url: decoded,
                title: title,
                timeline: { hash: Lampa.Utils.hash(decoded + title) }
            });
            return;
        }

        try {
            var playlist = JSON.parse(decoded);
            var seasonItems = playlist.map(function (s, sIdx) {
                return {
                    title: s.title || ('Сезон ' + (sIdx + 1)),
                    season: s
                };
            });

            Lampa.Select.show({
                title: 'Оберіть сезон',
                items: seasonItems,
                onSelect: function (selectedSeason) {
                    var s = selectedSeason.season;
                    var epItems = (s.folder || []).map(function (ep, epIdx) {
                        return {
                            title: ep.title || ('Серія ' + (epIdx + 1)),
                            episode: ep
                        };
                    });

                    Lampa.Select.show({
                        title: selectedSeason.title + ' — Оберіть серію',
                        items: epItems,
                        onSelect: function (selectedEp) {
                            var fileStr = selectedEp.episode.file || '';
                            var voiceMatches = [];
                            var vRegex = /\{([^}]+)\}(https?:\/\/[^\s\(\{]+)/g;
                            var vm;
                            while ((vm = vRegex.exec(fileStr)) !== null) {
                                voiceMatches.push({ title: vm[1].trim(), url: vm[2].trim() });
                            }

                            if (voiceMatches.length > 1) {
                                Lampa.Select.show({
                                    title: 'Оберіть озвучку',
                                    items: voiceMatches,
                                    onSelect: function (v) {
                                        Lampa.Player.play({
                                            url: v.url,
                                            title: title + ' — ' + selectedSeason.title + ' — ' + selectedEp.title + ' (' + v.title + ')'
                                        });
                                    }
                                });
                            } else {
                                var streamUrl = voiceMatches.length ? voiceMatches[0].url : (fileStr.match(/https?:\/\/[^\s\(\{]+/) || [])[0];
                                if (streamUrl) {
                                    Lampa.Player.play({
                                        url: streamUrl,
                                        title: title + ' — ' + selectedSeason.title + ' — ' + selectedEp.title
                                    });
                                } else {
                                    Lampa.Noty.show('Не вдалося знайти посилання на потік');
                                }
                            }
                        }
                    });
                }
            });
        } catch (e) {
            Lampa.Noty.show('Помилка: ' + e.message);
        }
    }

    function addUASerialsButton() {
        Lampa.Listener.follow('full', function (e) {
            if (e.type === 'complite') {
                var render = e.object.activity.render();
                if (!render || render.find('.view--uaserials').length) return;

                var btn = $('<div class="full-start__button selector view--uaserials" style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: #ffffff;"><span>UASerials</span></div>');

                btn.on('hover:enter', function () {
                    searchAndLoad(e.data.movie, function (decoded, resolvedTitle) {
                        openPlayerModal(decoded, resolvedTitle, e.data.movie);
                    }, function (err) {
                        Lampa.Noty.show(err || 'Помилка завантаження');
                    });
                });

                var targetPos = render.find('.view--torrent');
                if (!targetPos.length) targetPos = render.find('.view--online');
                if (targetPos.length) targetPos.after(btn);
                else render.find('.full-start__buttons').append(btn);
            }
        });
    }

    if (window.Lampa && Lampa.Listener) {
        addUASerialsButton();
    } else {
        var timer = setInterval(function () {
            if (window.Lampa && Lampa.Listener) {
                clearInterval(timer);
                addUASerialsButton();
            }
        }, 200);
    }
})();
