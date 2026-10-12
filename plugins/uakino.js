/* UAKino для Lampa — фільми й серіали українською з каталогу uakino.ax.
   Встановлення: Lampa → Налаштування → Розширення → Додати плагін → https://uakino.ax/lampa.js
   09.10.2026. Посилання на відео підписані нашим сервером і прив'язані до IP пристрою. */
(function () {
  'use strict';
  if (window.uakino_plugin_ready) return;
  window.uakino_plugin_ready = true;

  var API = 'https://uakino.ax';

  // 11.10.2026: на LG webOS (старий вебкіт у lampa.tv) глобального fetch НЕМА —
  // вхід через QR падав з «fetch is not defined». Мінімальна заміна на XHR:
  // нам потрібні лише method, headers, body та .json()/.text() у відповіді.
  var uakinoFetch = (typeof window.fetch === 'function') ? function (u, o) { return window.fetch(u, o); } : function (url, opts) {
    opts = opts || {};
    return new Promise(function (resolve, reject) {
      var x = new XMLHttpRequest();
      x.open(opts.method || 'GET', url, true);
      if (opts.headers) for (var k in opts.headers) { try { x.setRequestHeader(k, opts.headers[k]); } catch (e) {} }
      // cache:'no-store' у XHR немає — глушимо кеш заголовком
      if (opts.cache === 'no-store') { try { x.setRequestHeader('Cache-Control', 'no-cache'); } catch (e) {} }
      x.onload = function () {
        resolve({
          ok: x.status >= 200 && x.status < 300,
          status: x.status,
          text: function () { return Promise.resolve(x.responseText); },
          json: function () { try { return Promise.resolve(JSON.parse(x.responseText)); } catch (e) { return Promise.reject(e); } },
        });
      };
      x.onerror = function () { reject(new Error('network')); };
      x.ontimeout = function () { reject(new Error('timeout')); };
      x.send(opts.body || null);
    });
  };
  var ICON = '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"></rect><path d="M10 9.5v5l4-2.5z" fill="currentColor"></path></svg>';

  function sid() {
    var s = Lampa.Storage.get('uakino_sid', '');
    if (!s) { s = 'lp' + Math.random().toString(36).slice(2) + Date.now().toString(36); Lampa.Storage.set('uakino_sid', s); }
    return s;
  }
  // Чи тягне пристрій HEVC (від цього залежить, чи пропонувати наш 4K). Android — так завжди,
  // решті (ТВ-браузери Tizen/webOS, десктоп) віримо лише на пряме питання до плеєра.
  function hevc() {
    try {
      if (Lampa.Platform && Lampa.Platform.is('android')) return 1;
      var t = 'video/mp4; codecs="hvc1.1.6.L153.90"';
      if (window.MediaSource && MediaSource.isTypeSupported && MediaSource.isTypeSupported(t)) return 1;
      if (document.createElement('video').canPlayType(t)) return 1;
    } catch (e) {}
    return 0;
  }
  function getJSON(url) {
    return uakinoFetch(url, { cache: 'no-store' }).then(function (r) {
      return r.json().then(function (j) { if (!r.ok && !j.found && r.status !== 404) throw new Error(j.error || r.status); return j; });
    });
  }
  function q(o) { return Object.keys(o).filter(function (k) { return o[k] !== undefined && o[k] !== null && o[k] !== ''; })
    .map(function (k) { return k + '=' + encodeURIComponent(o[k]); }).join('&'); }

  // ── 09.10: акаунт UAKino (вхід за QR з телефона чи сайту). Токен — лише в цій Lampa (localStorage),
  //    у CUB не синхронізується. Позиція перегляду, історія й обране — спільні з сайтом і застосунками. ──
  var STAR = '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z"></path></svg>';
  function token() { return Lampa.Storage.get('uakino_token', '') || ''; }
  function userName() {
    try { var p = JSON.parse(decodeURIComponent(escape(atob(token().split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))))); return p.username || ''; }
    catch (e) { return ''; }
  }
  function logout(silent) {
    Lampa.Storage.set('uakino_token', ''); cache = {};
    if (!silent && Lampa.Noty) Lampa.Noty.show('UAKino: ви вийшли з акаунта');
  }
  function api(path, body) {
    var o = { cache: 'no-store', headers: { Authorization: 'Bearer ' + token() } };
    if (body) { o.method = 'POST'; o.headers['Content-Type'] = 'application/json'; o.body = JSON.stringify(body); }
    return uakinoFetch(API + path, o).then(function (r) {
      if (r.status === 401) { logout(true); throw new Error('auth'); }
      return r.json();
    });
  }
  var cache = {};   // history / favorites — на хвилину, щоб не смикати API на кожну картку
  function cached(key, path) {
    var c = cache[key];
    if (c && Date.now() - c.t < 60000) return Promise.resolve(c.v);
    return api(path).then(function (v) { cache[key] = { t: Date.now(), v: v }; return v; });
  }
  function history() { return token() ? cached('h', '/api/user/history').then(function (d) { return d.history || []; }).catch(function () { return []; }) : Promise.resolve([]); }
  function favorites() { return token() ? cached('f', '/api/user/favorites').then(function (d) { return d.items || []; }).catch(function () { return []; }) : Promise.resolve([]); }

  function login(done) {
    var timer = 0, closed = false;
    var stop = function () { closed = true; clearInterval(timer); };
    var close = function () { stop(); Lampa.Modal.close(); if (done) done(); };
    var html = $('<div class="uakino-login" style="text-align:center;padding:.5em 0 1em">' +
      '<div class="uakino-login__qr" style="background:#fff;display:inline-block;padding:.6em;border-radius:.6em;width:13em;height:13em"></div>' +
      '<div style="margin-top:1em;font-size:1.1em;line-height:1.5">Наведіть камеру телефона на код<br>або введіть код на сторінці <b>uakino.ax/tv</b>:</div>' +
      '<div class="uakino-login__code" style="margin-top:.5em;font-size:2.2em;font-weight:700;letter-spacing:.12em">…</div>' +
      '<div class="uakino-login__hint" style="margin-top:.6em;opacity:.6">На телефоні має бути виконано вхід у UAKino</div></div>');
    var startCode = function () {
      uakinoFetch(API + '/api/auth/qr/start', { method: 'POST' }).then(function (r) { return r.json(); }).then(function (d) {
        if (closed) return;
        if (!d.code) { html.find('.uakino-login__hint').text(d.error || 'Не вдалося отримати код'); return; }
        html.find('.uakino-login__qr').html('<img src="' + API + '/hls/api/lampa/qr.svg?code=' + d.code + '" style="width:100%;height:100%;display:block">');
        html.find('.uakino-login__code').text(d.code.slice(0, 4) + ' ' + d.code.slice(4));
        clearInterval(timer);
        timer = setInterval(function () {
          uakinoFetch(API + '/api/auth/qr/poll?code=' + d.code, { cache: 'no-store' }).then(function (r) { return r.json(); }).then(function (p) {
            if (closed) return;
            if (p.status === 'approved' && p.token) {
              Lampa.Storage.set('uakino_token', p.token); cache = {};
              close();
              if (Lampa.Noty) Lampa.Noty.show('UAKino: ви увійшли як ' + (userName() || 'користувач'));
            } else if (p.status === 'expired' || p.status === 'invalid') startCode();
          }).catch(function () {});
        }, 2500);
      }).catch(function () { html.find('.uakino-login__hint').text('Немає звʼязку з uakino.ax'); });
    };
    Lampa.Modal.open({ title: 'Вхід в UAKino', html: html, size: 'small', onBack: close });
    $('.modal').css('z-index', 60);
    startCode();
  }

  // Позиція перегляду → акаунт
  var lastSent = 0;
  setInterval(function () {
    if (!token()) return;
    try { if (!Lampa.Player.opened()) return; } catch (e) { return; }
    var d = null; try { d = Lampa.Player.playdata(); } catch (e) {}
    if (!d || !d.uakino) return;
    var v = $('.player video').get(0) || document.querySelector('video');
    if (!v || v.paused) return;
    var D = v.duration, t = v.currentTime;
    if (!isFinite(D) || D <= 0 || t < 30 || Date.now() - lastSent < 15000) return;
    lastSent = Date.now();
    var u = d.uakino;
    api('/api/movie/watch-progress', { movie_id: u.movie, current_time: Math.floor(t), duration: Math.floor(D),
      progress: Math.min(1, t / D), season: u.season, episode: u.episode, voice: u.voice || undefined }).catch(function () {});
    delete cache.h;
  }, 5000);

  function resume(view, h) {
    if (!view || !h || !h.current_time || (h.progress || 0) >= 0.95) return view;
    if ((view.time || 0) + 30 < h.current_time) {
      view.time = h.current_time;
      if (h.duration) { view.duration = h.duration; view.percent = Math.round(h.current_time / h.duration * 100); }
    }
    return view;
  }

  function find(movie) {
    var tv = !!(movie.name || movie.number_of_seasons || movie.first_air_date);
    var date = movie.release_date || movie.first_air_date || '';
    return getJSON(API + '/hls/api/lampa/find?' + q({
      tmdb: movie.id, imdb: movie.imdb_id, type: tv ? 'tv' : 'movie', year: date.slice(0, 4),
      title: movie.title || movie.name, orig: movie.original_title || movie.original_name
    }));
  }
  function play(movieId, opt) {
    return getJSON(API + '/hls/api/play?' + q({ movie: movieId, s: sid(), hevc: hevc(), voice: opt.voice,
      season: opt.season, episode: opt.episode, q: opt.q }));
  }
  function m3u8(u) { return u && !/\.m3u8($|\?)/.test(u) ? u + '.m3u8' : u; }

  function start(p, title, view, meta) {
    var url = p.manifest_abs || (API + p.manifest);
    var item = { title: title, url: m3u8(url), timeline: view, uakino: meta, hls_type: 'hlsjs' };
    if (p.subs && p.subs.length) item.subtitles = p.subs.map(function (s) { return { label: s.label, url: API + s.url }; });
    Lampa.Player.play(item);
    Lampa.Player.playlist([item]);
  }
  function timeline(movie, s, e) {
    try {
      var orig = movie.original_title || movie.original_name || movie.title || movie.name || '';
      var key = s != null ? [s, s > 10 ? ':' : '', e, orig].join('') : orig;
      return Lampa.Timeline.view(Lampa.Utils.hash(key));
    } catch (err) { return undefined; }
  }
  function mark(view) {
    if (!view || !view.percent) return '';
    return view.percent >= 90 ? ' ✓' : ' • ' + view.percent + '%';
  }
  function back() { Lampa.Controller.toggle('full_start'); }
  function select(title, items, cb, onBackCb) {
    Lampa.Select.show({ title: title, items: items, onSelect: cb, onBack: onBackCb || back });
  }

  function open(movie) {
    Lampa.Loading.start(function () { Lampa.Loading.stop(); });
    find(movie).then(function (f) {
      if (!f.found) { Lampa.Loading.stop(); if (Lampa.Noty) Lampa.Noty.show('UAKino: цього фільму поки немає'); return null; }
      return Promise.all([play(f.movie_id, {}), history()]).then(function (res) {
        var p = res[0];
        var h = res[1].filter(function (x) { return parseInt(x.id) === f.movie_id; })[0] || null;
        Lampa.Loading.stop();
        var name = movie.title || movie.name || f.title;
        var voices = p.voices && p.voices.length ? p.voices : [null];
        var memKey = 'uakino_voice_' + f.movie_id, mem = Lampa.Storage.get(memKey, '');
        if (h && h.voice && voices.indexOf(h.voice) >= 0) mem = h.voice;
        var has4k = !!p.alt4k && hevc() === 1;

        var chooseVoice = function (cb, forcePrompt) {
          if (voices.length < 2 && !has4k) return cb(voices[0]);
          if (!forcePrompt && p.is_series && mem && voices.indexOf(mem) >= 0) return cb(mem);
          var items = voices.map(function (v) {
            return {
              title: (v || 'Українська') + (mem === v ? ' • обрано' : ''),
              voice: v,
              selected: mem === v
            };
          });
          if (has4k) items.unshift({ title: '4K · найвища якість', voice: null, q: '2160' });
          select('Якість і озвучка', items, function (it) {
            if (p.is_series && it.voice && !it.q) {
              mem = it.voice;
              Lampa.Storage.set(memKey, it.voice);
            }
            cb(it.voice, it.q);
          }, function () {
            Lampa.Controller.toggle('full_start');
          });
        };

        if (!p.is_series) {
          chooseVoice(function (v, qq) {
            var meta = { movie: f.movie_id, voice: v };
            if (!qq && (v === p.current.voice || voices.length < 2)) return start(p, name, resume(timeline(movie), h), meta);
            Lampa.Loading.start(function () { Lampa.Loading.stop(); });
            play(f.movie_id, { voice: v, q: qq }).then(function (pp) {
              Lampa.Loading.stop();
              start(pp, name + (qq ? ' • 4K' : v ? ' • ' + v : ''), resume(timeline(movie), h), meta);
            }).catch(function (e) { Lampa.Loading.stop(); if (Lampa.Noty) Lampa.Noty.show('UAKino: ' + (e && e.message || 'помилка')); });
          });
          return;
        }

        var renderSeries = function (v) {
          var eps = p.episodes.filter(function (e) { return (e.voice || null) === (v || null) && e.episode != null; });
          var seasons = eps.map(function (e) { return e.season; }).filter(function (s, i, a) { return a.indexOf(s) === i; }).sort(function (a, b) { return a - b; });
          var hs = h && h.season != null && (!h.voice || h.voice === v) ? h.season : null;

          var chooseSeason = function (cb) {
            if (seasons.length < 2) return cb(seasons[0]);
            var seasonItems = seasons.map(function (s) {
              return { title: 'Сезон ' + s + (s === hs ? ' • ви тут' : ''), season: s, selected: s === hs };
            });
            if (voices.length > 1 || has4k) {
              seasonItems.unshift({ title: '🔄 Змінити озвучку' + (v ? ' (' + v + ')' : ''), action: 'change_voice' });
            }
            select('Сезон' + (v ? ' • ' + v : ''), seasonItems, function (it) {
              if (it.action === 'change_voice') {
                return chooseVoice(function (newV) {
                  renderSeries(newV);
                }, true);
              }
              cb(it.season);
            }, function () {
              if (voices.length > 1 || has4k) {
                chooseVoice(function (newV) {
                  renderSeries(newV);
                }, true);
              } else {
                Lampa.Controller.toggle('full_start');
              }
            });
          };

          chooseSeason(function (s) {
            var list = eps.filter(function (e) { return e.season === s; }).sort(function (a, b) { return a.episode - b.episode; });
            var he = hs === s ? h.episode : null;
            var epItems = list.map(function (e) {
              var own = e.title && !/^\s*(серія|епізод|episode)\s*\d+\s*$/i.test(e.title);
              var view = timeline(movie, s, e.episode);
              if (e.episode === he) view = resume(view, h);
              return {
                title: 'Серія ' + e.episode + (own ? ' — ' + e.title : '') + mark(view) + (e.episode === he ? ' • продовжити' : ''),
                ep: e,
                selected: e.episode === he
              };
            });
            if (seasons.length > 1) {
              epItems.unshift({ title: '📁 Інший сезон (зараз Сезон ' + s + ')', action: 'change_season' });
            }
            if (voices.length > 1 || has4k) {
              epItems.unshift({ title: '🔄 Змінити озвучку' + (v ? ' (' + v + ')' : ''), action: 'change_voice' });
            }

            select('Сезон ' + s + (v ? ' • ' + v : ''), epItems, function (it) {
              if (it.action === 'change_season') {
                return chooseSeason(function () {
                  renderSeries(v);
                });
              }
              if (it.action === 'change_voice') {
                return chooseVoice(function (newV) {
                  renderSeries(newV);
                }, true);
              }

              Lampa.Loading.start(function () { Lampa.Loading.stop(); });
              var items = new Array(list.length), idx = list.indexOf(it.ep), k = 0;
              var next = function () {
                if (k >= list.length) return Promise.resolve();
                var j = k++, e = list[j];
                return play(f.movie_id, { voice: v, season: s, episode: e.episode }).then(function (pp) {
                  var view = timeline(movie, s, e.episode);
                  if (e.episode === he) view = resume(view, h);
                  items[j] = { title: name + ' • С' + s + ' С' + e.episode, url: m3u8(pp.manifest_abs || (API + pp.manifest)),
                               timeline: view, hls_type: 'hlsjs', uakino: { movie: f.movie_id, voice: v, season: s, episode: e.episode } };
                  if (pp.subs && pp.subs.length) items[j].subtitles = pp.subs.map(function (x) { return { label: x.label, url: API + x.url }; });
                }).catch(function () {}).then(next);
              };
              Promise.all([next(), next(), next(), next()]).then(function () {
                Lampa.Loading.stop();
                var ok = items.filter(Boolean);
                if (!items[idx]) { if (Lampa.Noty) Lampa.Noty.show('UAKino: не вдалося відкрити серію'); return; }
                Lampa.Player.play(items[idx]);
                Lampa.Player.playlist(ok);
              });
            }, function () {
              if (seasons.length > 1) {
                chooseSeason(function () {
                  renderSeries(v);
                });
              } else if (voices.length > 1 || has4k) {
                chooseVoice(function (newV) {
                  renderSeries(newV);
                }, true);
              } else {
                Lampa.Controller.toggle('full_start');
              }
            });
          });
        };

        chooseVoice(function (v) {
          renderSeries(v);
        });
      });
    }).catch(function (e) { Lampa.Loading.stop(); if (Lampa.Noty) Lampa.Noty.show('UAKino: помилка ' + (e && e.message || '')); });
  }

  function addButton(e) {
    var render = e.object.activity.render();
    if (!render || render.find('.view--uakino').length) return;
    var btn = $('<div class="full-start__button selector view--uakino" data-subtitle="uakino.ax">' + ICON + '<span>UAKino</span></div>');
    btn.on('hover:enter', function () { open(e.data.movie); });
    var targetTorrent = render.find('.view--torrent');
    if (targetTorrent.length) {
      targetTorrent.after(btn);
    } else {
      var targetButtons = render.find('.full-start-new__buttons, .full-start__buttons');
      if (targetButtons.length) {
        targetButtons.first().prepend(btn);
      } else {
        render.find('.full-start-new, .full-start').first().prepend(btn);
      }
    }
    if (token()) addFavButton(render, e.data.movie);
  }

  function addFavButton(render, movie) {
    Promise.all([find(movie), favorites()]).then(function (r) {
      var f = r[0];
      if (!f.found || render.find('.view--uakino-fav').length) return;
      var on = r[1].some(function (x) { return parseInt(x.id) === f.movie_id; });
      var btn = $('<div class="full-start__button selector view--uakino-fav">' + STAR + '<span></span></div>');
      var paint = function () { btn.find('span').text(on ? 'В обраному' : 'В обране'); btn.find('path').attr('fill', on ? 'currentColor' : 'none'); };
      paint();
      btn.on('hover:enter', function () {
        api('/api/user/favorites/' + (on ? 'remove' : 'add'), { movie_id: f.movie_id }).then(function () {
          on = !on; paint(); delete cache.f;
          if (Lampa.Noty) Lampa.Noty.show(on ? 'Додано в обране UAKino' : 'Прибрано з обраного UAKino');
        }).catch(function () { if (Lampa.Noty) Lampa.Noty.show('UAKino: увійдіть в акаунт ще раз'); });
      });
      render.find('.view--uakino').after(btn);
    }).catch(function () {});
  }

  Lampa.Listener.follow('full', function (e) {
    if (e.type === 'complite') { try { addButton(e); } catch (err) { console.log('uakino', err); } }
  });

  // ── Каталог UAKino — розділ у меню Lampa ──
  var ROWS = [['new', 'Новинки'], ['films', 'Фільми'], ['series', 'Серіали'], ['cartoons', 'Мультфільми'], ['4k', 'У 4K'], ['top', 'Найкраще'], ['anime', 'Аніме']];
  function list(cat, page, limit) {
    return getJSON(API + '/hls/api/lampa/list?' + q({ cat: cat, page: page || 1, limit: limit || 20 }));
  }
  function cards(ids) { return getJSON(API + '/hls/api/lampa/cards?ids=' + ids.join(',')); }
  var tmdb = function () { return Lampa.Api.sources.tmdb; };
  var source = {
    main: function (params, oncomplite, onerror) {
      var mine = [['Продовжити перегляд', history], ['Обране', favorites]].map(function (m) {
        return m[1]().then(function (items) {
          var ids = items.filter(function (x) { return m[0] === 'Обране' || (x.progress || 0) < 0.95; }).slice(0, 30).map(function (x) { return x.id; });
          return ids.length ? cards(ids).then(function (d) { return { title: m[0], results: d.results }; }) : null;
        }).catch(function () { return null; });
      });
      var cat = ROWS.map(function (r) { return list(r[0], 1, 20).then(function (d) { return { title: r[1], results: d.results, url: r[0], source: 'uakino', total_pages: d.total_pages }; }).catch(function () { return null; }); });
      Promise.all(mine.concat(cat))
        .then(function (rows) { rows = rows.filter(function (r) { return r && r.results.length; }); rows.length ? oncomplite(rows) : onerror(); })
        .catch(onerror);
    },
    category: function (params, oncomplite, onerror) { source.main(params, oncomplite, onerror); },
    list: function (params, oncomplite, onerror) {
      list(params.url || 'new', params.page || 1, 30).then(function (d) { oncomplite(d); }).catch(onerror);
    },
    full: function (params, oncomplite, onerror) { tmdb().full(params, oncomplite, onerror); },
    seasons: function (tv, from, oncomplite) { tmdb().seasons(tv, from, oncomplite); },
    person: function (params, oncomplite, onerror) { tmdb().person(params, oncomplite, onerror); },
    search: function (params, oncomplite) { tmdb().search ? tmdb().search(params, oncomplite) : oncomplite([]); },
    menu: function (params, oncomplite) { oncomplite([]); },
    clear: function () {}
  };
  if (Lampa.Api && Lampa.Api.sources) {
    Lampa.Api.sources.uakino = source;
  }

  function addMenu() {
    if ($('.menu [data-action="uakino"]').length) return;
    var item = $('<li class="menu__item selector" data-action="uakino"><div class="menu__ico">' + ICON + '</div><div class="menu__text">UAKino</div></li>');
    item.on('hover:enter', function () {
      Lampa.Activity.push({ url: '', title: 'UAKino', component: 'main', source: 'uakino', page: 1 });
    });
    $('.menu .menu__list').eq(0).prepend(item);
  }

  function addSettings() {
    if (!Lampa.SettingsApi) return;
    Lampa.SettingsApi.addComponent({ component: 'uakino', name: 'UAKino', icon: ICON });
    Lampa.SettingsApi.addParam({
      component: 'uakino', param: { name: 'uakino_account', type: 'button' },
      field: { name: 'Акаунт UAKino', description: '' },
      onRender: function (item) {
        var u = userName();
        item.find('.settings-param__name').text(token() ? 'Вийти з акаунта' + (u ? ' (' + u + ')' : '') : 'Увійти через телефон або сайт');
        item.find('.settings-param__descr').remove();
        item.append('<div class="settings-param__descr">' + (token()
          ? 'Позиція перегляду, історія й обране спільні з uakino.ax і застосунком UAKino.'
          : 'QR-код або код для uakino.ax/tv — позиція перегляду, історія й обране стануть спільними з сайтом і застосунком.') + '</div>');
      },
      onChange: function () {
        var reopen = function () {
          try { Lampa.Settings.create('uakino'); } catch (e) { Lampa.Controller.toggle('settings_component'); }
        };
        if (token()) { logout(); reopen(); }
        else login(reopen);
      }
    });
  }

  function ready() { addMenu(); try { addSettings(); } catch (e) { console.log('uakino settings', e); } }
  if (window.appready) ready();
  else if (Lampa.Listener) Lampa.Listener.follow('app', function (e) { if (e.type === 'ready') ready(); });
})();
