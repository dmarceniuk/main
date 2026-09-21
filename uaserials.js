(function () {
    'use strict';

    if (window.plugin_uaserials_ready) return;
    window.plugin_uaserials_ready = true;

    var UASERIALS_PROXY = 'https://api.framextv.tech/api/proxy?url=';
    var UASERIALS_KEY = '297796CCB81D255125';

    function uaserialsProxy(url) {
        return UASERIALS_PROXY + encodeURIComponent(url);
    }

    function wrapStreamProxy(url) {
        if (!url) return '';
        if (url.indexOf(UASERIALS_PROXY) === 0) return url;
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

    function cleanStr(s) {
        if (!s) return '';
        return s.toLowerCase()
            .replace(/<[^>]+>/g, '')
            .replace(/[^\p{L}\p{N}\s]/gu, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    }

    function parseCards(html) {
        var items = [];
        var cardRegex = /<a[^>]+class="[^"]*uas-card[^"]*"[^>]+href="([^"]+)"[\s\S]*?<span[^>]+class="uas-card__title"[^>]*>([^<]+)<\/span>(?:[\s\S]*?<span[^>]+class="uas-card__orig"[^>]*>([\s\S]*?)<\/span>)?(?:[\s\S]*?<span[^>]+class="uas-card__year"[^>]*>(\d+)<\/span>)?/g;
        var m;
        while ((m = cardRegex.exec(html)) !== null) {
            items.push({
                href: m[1],
                title: m[2].trim(),
                orig: m[3] ? m[3].replace(/<[^>]+>/g, '').trim() : '',
                year: m[4] ? m[4].trim() : ''
            });
        }
        return items;
    }

    function scoreCard(card, movie) {
        var targetOrig = cleanStr(movie.original_title || movie.original_name || '');
        var targetUa = cleanStr(movie.title || movie.name || '');
        var cardTitle = cleanStr(card.title);
        var cardOrig = cleanStr(card.orig);

        if ((targetOrig && cardOrig === targetOrig) || (targetUa && cardTitle === targetUa)) {
            return 100;
        }

        if (targetOrig && cardOrig && (cardOrig.indexOf(targetOrig) !== -1 || targetOrig.indexOf(cardOrig) !== -1)) {
            return 85;
        }
        if (targetUa && cardTitle && (cardTitle.indexOf(targetUa) !== -1 || targetUa.indexOf(cardTitle) !== -1)) {
            return 85;
        }

        var tWordsOrig = targetOrig.split(' ').filter(function (w) { return w.length > 1; });
        var tWordsUa = targetUa.split(' ').filter(function (w) { return w.length > 1; });
        var cWords = (cardTitle + ' ' + cardOrig).split(' ').filter(function (w) { return w.length > 1; });

        var matchOrig = 0;
        tWordsOrig.forEach(function (w) { if (cWords.indexOf(w) !== -1) matchOrig++; });
        var ratioOrig = tWordsOrig.length ? matchOrig / tWordsOrig.length : 0;

        var matchUa = 0;
        tWordsUa.forEach(function (w) { if (cWords.indexOf(w) !== -1) matchUa++; });
        var ratioUa = tWordsUa.length ? matchUa / tWordsUa.length : 0;

        var maxRatio = Math.max(ratioOrig, ratioUa);
        if (maxRatio < 0.5) return 0;

        var score = Math.round(maxRatio * 70);

        var tYear = parseInt((movie.release_date || movie.first_air_date || movie.year || '').slice(0, 4), 10);
        var cYear = parseInt(card.year, 10);
        if (tYear && cYear) {
            var diff = Math.abs(tYear - cYear);
            if (diff === 0) score += 20;
            else if (diff === 1) score += 10;
            else if (diff > 2) score -= 30;
        }

        return Math.max(0, score);
    }

    function searchAndLoad(movie, onComplete, onError) {
        movie = movie || {};
        var origQuery = (movie.original_title || movie.original_name || '').trim();
        var uaQuery = (movie.title || movie.name || '').trim();
        var primaryQuery = origQuery || uaQuery;
        if (!primaryQuery) return onError('Немає назви для пошуку');

        Lampa.Noty.show('Пошук на UASerials: ' + (uaQuery || origQuery));

        var cleanPrimary = primaryQuery.replace(/[:,\.!\?#\(\)\[\]]/g, ' ').replace(/\s+/g, ' ').trim();
        var searchUrl = 'https://uaserials.com/index.php?do=search&subaction=search&story=' + encodeURIComponent(cleanPrimary);

        uaserialsFetch(searchUrl, function (html) {
            processResults(html, function () {
                var secondaryQuery = (primaryQuery === origQuery ? uaQuery : origQuery);
                if (secondaryQuery && secondaryQuery !== primaryQuery) {
                    var cleanSecondary = secondaryQuery.replace(/[:,\.!\?#\(\)\[\]]/g, ' ').replace(/\s+/g, ' ').trim();
                    var retryUrl = 'https://uaserials.com/index.php?do=search&subaction=search&story=' + encodeURIComponent(cleanSecondary);
                    uaserialsFetch(retryUrl, function (html2) {
                        processResults(html2, function () {
                            onError('На UASerials не знайдено: ' + (uaQuery || origQuery));
                        });
                    }, onError);
                } else {
                    onError('На UASerials не знайдено: ' + (uaQuery || origQuery));
                }
            });
        }, onError);

        function processResults(html, onNotFound) {
            var allCards = parseCards(html);
            var scoredCards = [];
            for (var i = 0; i < allCards.length; i++) {
                var s = scoreCard(allCards[i], movie);
                if (s >= 40) {
                    scoredCards.push({ card: allCards[i], score: s });
                }
            }
            scoredCards.sort(function (a, b) { return b.score - a.score; });

            if (!scoredCards.length) {
                onNotFound();
                return;
            }

            if (scoredCards.length === 1 || (scoredCards[0].score >= 85 && (scoredCards.length < 2 || scoredCards[0].score - scoredCards[1].score >= 20))) {
                loadTarget(scoredCards[0].card);
            } else {
                Lampa.Select.show({
                    title: 'Оберіть реліз на UASerials',
                    items: scoredCards.map(function (sc) {
                        var c = sc.card;
                        return {
                            title: c.title + (c.orig ? ' (' + c.orig + ')' : '') + (c.year ? ' [' + c.year + ']' : ''),
                            card: c
                        };
                    }),
                    onSelect: function (sel) {
                        loadTarget(sel.card);
                    }
                });
            }
        }

        function loadTarget(target) {
            Lampa.Noty.show('Завантаження: ' + target.title);
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
    }

    function openPlayerModal(decoded, title, movie) {
        if (decoded.indexOf('http') === 0) {
            Lampa.Player.play({
                url: wrapStreamProxy(decoded),
                title: title,
                timeline: { hash: Lampa.Utils.hash(decoded) },
                isonline: true
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

            function chooseEpisode(selectedSeason) {
                var s = selectedSeason.season;
                var epItems = (s.folder || []).map(function (ep, epIdx) {
                    return {
                        title: ep.title || ('Серія ' + (epIdx + 1)),
                        episode: ep
                    };
                });

                if (!epItems.length) {
                    Lampa.Noty.show('Серії відсутні у цьому сезоні');
                    return;
                }

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

                        var subRegex = /\[([^\]]+)\](https?:\/\/[^\s,\)]+)/g;
                        var subs = [];
                        var sm;
                        while ((sm = subRegex.exec(fileStr)) !== null) {
                            subs.push({ label: sm[1].trim(), url: sm[2].trim() });
                        }

                        function playEp(streamUrl, voiceTitle) {
                            var epTitle = selectedEp.title + (voiceTitle ? ' (' + voiceTitle + ')' : '');
                            var fullTitle = title + ' — ' + selectedSeason.title + ' — ' + epTitle;

                            var seasonPlaylist = (s.folder || []).map(function (ep, idx) {
                                var f = ep.file || '';
                                var vList = [];
                                var vr = /\{([^}]+)\}(https?:\/\/[^\s\(\{]+)/g;
                                var rm;
                                while ((rm = vr.exec(f)) !== null) {
                                    vList.push({ title: rm[1].trim(), url: rm[2].trim() });
                                }
                                var matchedV = voiceTitle ? vList.find(function (x) { return x.title === voiceTitle; }) : null;
                                var epStream = matchedV ? matchedV.url : (vList.length ? vList[0].url : (f.match(/https?:\/\/[^\s\(\{]+/) || [])[0]);
                                return {
                                    title: selectedSeason.title + ' — ' + (ep.title || ('Серія ' + (idx + 1))),
                                    url: wrapStreamProxy(epStream),
                                    timeline: { hash: Lampa.Utils.hash(epStream || '') }
                                };
                            });

                            Lampa.Player.play({
                                url: wrapStreamProxy(streamUrl),
                                title: fullTitle,
                                subtitles: subs,
                                playlist: seasonPlaylist,
                                timeline: { hash: Lampa.Utils.hash(streamUrl) },
                                isonline: true
                            });
                        }

                        if (voiceMatches.length > 1) {
                            Lampa.Select.show({
                                title: 'Оберіть озвучку',
                                items: voiceMatches,
                                onSelect: function (v) {
                                    playEp(v.url, v.title);
                                }
                            });
                        } else {
                            var directStream = voiceMatches.length ? voiceMatches[0].url : (fileStr.match(/https?:\/\/[^\s\(\{]+/) || [])[0];
                            if (directStream) {
                                playEp(directStream, voiceMatches.length ? voiceMatches[0].title : '');
                            } else {
                                Lampa.Noty.show('Не вдалося знайти посилання на потік');
                            }
                        }
                    }
                });
            }

            if (seasonItems.length === 1) {
                chooseEpisode(seasonItems[0]);
            } else {
                Lampa.Select.show({
                    title: 'Оберіть сезон',
                    items: seasonItems,
                    onSelect: chooseEpisode
                });
            }
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
