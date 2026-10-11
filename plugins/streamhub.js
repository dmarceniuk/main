// StreamHub Plugin for Lampa (Online Streaming Aggregator)
// Integrates Rezka, Eneyida, UAFlix, UASerials & Kodik streams via StreamHub Core Gateway
(function () {
  'use strict';

  var COMPONENT = 'streamhub_online';
  var BTN_CLASS = 'view--online_streamhub';

  var strings = {
    streamhub_title: { ru: 'StreamHub', uk: 'StreamHub', en: 'StreamHub' },
    streamhub_watch: { ru: 'Смотреть StreamHub', uk: 'Дивитися через StreamHub', en: 'Watch via StreamHub' },
    streamhub_empty: { ru: 'Потоки не найдены', uk: 'Потоки не знайдені', en: 'No streams found' },
    streamhub_empty_desc: { ru: 'Проверьте запущен ли бэкенд StreamHub или выберите другой источник', uk: 'Перевірте чи запущено сервер StreamHub або виберіть інше джерело', en: 'Make sure StreamHub backend is running or choose another source' },
    streamhub_season: { ru: 'Сезон', uk: 'Сезон', en: 'Season' },
    streamhub_episode: { ru: 'Серия', uk: 'Серія', en: 'Episode' },
    streamhub_quality: { ru: 'Качество', uk: 'Якість', en: 'Quality' },
    streamhub_source: { ru: 'Источник', uk: 'Джерело', en: 'Source' },
    streamhub_back: { ru: 'Назад', uk: 'Назад', en: 'Back' },
    streamhub_server_url: { ru: 'Адрес сервера StreamHub', uk: 'Адреса сервера StreamHub', en: 'StreamHub Server URL' },
    streamhub_server_descr: { ru: 'URL адаптера Lampa (по умолчанию http://localhost:7011)', uk: 'URL адаптера Lampa (за замовчуванням http://localhost:7011)', en: 'Lampa adapter URL (default http://localhost:7011)' }
  };

  function t(key) {
    var l = (Lampa.Storage.field && Lampa.Storage.field('language')) || 'uk';
    return (strings[key] && (strings[key][l] || strings[key].uk || strings[key].en)) || key;
  }

  function getBackendUrl() {
    var custom = Lampa.Storage.get('streamhub_backend_url', '');
    if (custom) return custom.replace(/\/$/, '');
    
    // Automatic fallback: if running on local network / custom port
    var origin = window.location.origin || '';
    if (origin && origin.startsWith('http')) {
      try {
        var u = new URL(origin);
        return u.protocol + '//' + u.hostname + ':7011';
      } catch (e) {}
    }
    return 'http://localhost:7011';
  }

  function ensureTemplates() {
    if ($('#streamhub-style').length) return;

    Lampa.Template.add('streamhub_item', 
      '<div class="online-item selector streamhub-item">' +
        '<div class="online-item__title">{title}</div>' +
        '<div class="online-item__meta">{meta}</div>' +
      '</div>'
    );

    Lampa.Template.add('streamhub_empty', 
      '<div class="online-empty streamhub-empty">' +
        '<div class="online-empty__title">' + t('streamhub_empty') + '</div>' +
        '<div class="online-empty__time">' + t('streamhub_empty_desc') + '</div>' +
      '</div>'
    );

    var css = '<style id="streamhub-style">' +
      '.streamhub-item{padding:1em 1.2em;background:rgba(255,255,255,0.06);border-radius:.4em;margin-bottom:.6em;line-height:1.4;transition:background .2s,border .2s;}' +
      '.streamhub-item__title{font-size:1.2em;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}' +
      '.streamhub-item__meta{opacity:.75;font-size:.95em;margin-top:.25em;color:#93c5fd;}' +
      '.streamhub-item.focus{background:rgba(59,130,246,0.35);border:1px solid rgba(147,197,253,0.8);}' +
      '.streamhub-empty{padding:2em 1em;text-align:center;}' +
      '.streamhub-empty .online-empty__title{font-size:1.4em;margin-bottom:.5em;color:#f87171;}' +
      '.streamhub-empty .online-empty__time{opacity:.7;font-size:1.05em;max-width:30em;margin:0 auto;}' +
      '.view--online_streamhub{background:linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%) !important;color:#ffffff !important;}' +
      '.view--online_streamhub svg{margin-right:.4em;vertical-align:middle;}' +
      '</style>';

    $('body').append(css);
  }

  function fetchStreams(payload) {
    var base = getBackendUrl();
    var params = [];
    if (payload.imdb) params.push('imdb=' + encodeURIComponent(payload.imdb));
    if (payload.query) params.push('query=' + encodeURIComponent(payload.query));
    if (payload.season) params.push('season=' + encodeURIComponent(payload.season));
    if (payload.episode) params.push('episode=' + encodeURIComponent(payload.episode));
    if (payload.year) params.push('year=' + encodeURIComponent(payload.year));
    var url = base + '/streams' + (params.length ? '?' + params.join('&') : '');

    var controller = (typeof AbortController !== 'undefined') ? new AbortController() : null;
    var timer;
    if (controller) {
      timer = setTimeout(function () {
        try { controller.abort(); } catch (e) {}
      }, 8000);
    }

    return fetch(url, {
      signal: controller ? controller.signal : undefined
    })
      .then(function (r) {
        if (timer) clearTimeout(timer);
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      })
      .then(function (d) {
        return d.streams || [];
      })
      .catch(function (err) {
        if (timer) clearTimeout(timer);
        console.warn('StreamHub fetchStreams error:', err);
        return [];
      });
  }

  function Component(object) {
    var scroll = new Lampa.Scroll({ mask: true });
    var files = new Lampa.Explorer(object);
    var last;

    this.create = function () {
      return files.render();
    };

    this.render = function () {
      return files.render();
    };

    this.start = function () {
      ensureTemplates();
      this.loading(true);
      var movie = object.movie || {};
      var isTv = Boolean(movie.name || movie.number_of_seasons || (movie.seasons && movie.seasons.length));

      if (!isTv) {
        loadStreams({ movie: movie });
      } else {
        showSeasons(movie);
      }
    };

    var loadStreams = function (params) {
      var movie = params.movie;
      var season = params.season;
      var episode = params.episode;
      var titleOverride = params.titleOverride;

      var payload = {
        imdb: movie.imdb_id || movie.imdb,
        query: movie.original_title || movie.original_name || movie.title || movie.name || titleOverride,
        season: season,
        episode: episode,
        year: movie.release_date ? String(movie.release_date).slice(0, 4) : movie.first_air_date ? String(movie.first_air_date).slice(0, 4) : undefined
      };

      files.clear();
      var loader = $('<div class="broadcast__scan"><div></div></div>');
      files.appendFiles(loader);

      fetchStreams(payload).then(function (streams) {
        files.clear();
        if (!streams || !streams.length) {
          drawEmpty();
          return;
        }
        drawStreams(streams, movie, season);
      }).catch(function () {
        files.clear();
        drawEmpty();
      });
    };

    var showSeasons = function (movie) {
      files.clear();
      var seasons = movie.seasons || [];
      if (!seasons.length && movie.id) {
        var tmdbId = movie.id;
        Lampa.Api.sources.tmdb.get('tv/' + tmdbId, {}, function (data) {
          movie.seasons = data.seasons || [];
          renderSeasonList(movie);
        }, function () {
          renderSeasonList(movie);
        });
      } else {
        renderSeasonList(movie);
      }
    };

    var renderSeasonList = function (movie) {
      scroll.clear();
      var list = (movie.seasons || []).filter(function (s) { return s.season_number >= 1; });
      if (!list.length) {
        drawEmpty();
        return;
      }

      list.forEach(function (s) {
        var meta = t('streamhub_season') + ' ' + s.season_number + (s.episode_count ? ' · ' + s.episode_count + ' серій' : '');
        var card = Lampa.Template.get('streamhub_item', {
          title: s.name || (t('streamhub_season') + ' ' + s.season_number),
          meta: meta
        });

        card.on('hover:enter', function () {
          loadEpisodes(movie, s.season_number);
        });
        card.on('hover:focus', function (e) {
          last = e.target;
          scroll.update($(e.target), true);
        });
        scroll.append(card);
      });

      finalizeNav();
    };

    var loadEpisodes = function (movie, seasonNumber) {
      scroll.clear();
      var tmdbId = movie.id;
      if (!tmdbId) {
        loadStreams({ movie: movie, season: seasonNumber, episode: 1 });
        return;
      }

      Lampa.Api.sources.tmdb.get('tv/' + tmdbId + '/season/' + seasonNumber, {}, function (data) {
        var episodes = data.episodes || [];
        if (!episodes.length) {
          loadStreams({ movie: movie, season: seasonNumber, episode: 1 });
          return;
        }

        var back = $('<div class="online-item selector streamhub-item"><div class="online-item__title">← ' + t('streamhub_back') + '</div></div>');
        back.on('hover:enter', function () {
          renderSeasonList(movie);
        });
        back.on('hover:focus', function (e) {
          last = e.target;
          scroll.update($(e.target), true);
        });
        scroll.append(back);

        episodes.forEach(function (ep) {
          var meta = t('streamhub_season') + ' ' + seasonNumber + ' · ' + t('streamhub_episode') + ' ' + ep.episode_number;
          var card = Lampa.Template.get('streamhub_item', {
            title: ep.name ? (ep.episode_number + '. ' + ep.name) : meta,
            meta: meta
          });

          card.on('hover:enter', function () {
            loadStreams({
              movie: movie,
              season: seasonNumber,
              episode: ep.episode_number,
              titleOverride: ep.name
            });
          });
          card.on('hover:focus', function (e) {
            last = e.target;
            scroll.update($(e.target), true);
          });
          scroll.append(card);
        });

        finalizeNav();
      }, function () {
        loadStreams({ movie: movie, season: seasonNumber, episode: 1 });
      });
    };

    var drawStreams = function (streams, movie, seasonNumber) {
      scroll.clear();

      var back = $('<div class="online-item selector streamhub-item"><div class="online-item__title">← ' + t('streamhub_back') + '</div></div>');
      back.on('hover:enter', function () {
        if (seasonNumber) {
          loadEpisodes(movie, seasonNumber);
        } else if (movie.seasons && movie.seasons.length) {
          renderSeasonList(movie);
        } else {
          Lampa.Activity.backward();
        }
      });
      back.on('hover:focus', function (e) {
        last = e.target;
        scroll.update($(e.target), true);
      });
      scroll.append(back);

      streams.forEach(function (s) {
        var metaParts = [];
        if (s.quality) metaParts.push(t('streamhub_quality') + ': ' + s.quality);
        if (s.source) metaParts.push(t('streamhub_source') + ': ' + s.source);
        var meta = metaParts.length ? metaParts.join(' · ') : 'Direct HLS / MP4 Stream';

        var title = s.title || movie.title || movie.name || 'Stream';
        var card = Lampa.Template.get('streamhub_item', {
          title: title,
          meta: meta
        });

        card.on('hover:enter', function () {
          Lampa.Player.play({
            title: title,
            url: s.url,
            quality: s.quality,
            subtitles: s.subtitles || []
          });
          Lampa.Player.playlist([{
            title: title,
            url: s.url
          }]);
        });
        card.on('hover:focus', function (e) {
          last = e.target;
          scroll.update($(e.target), true);
        });
        scroll.append(card);
      });

      finalizeNav();
    };

    var drawEmpty = function () {
      scroll.clear();
      var empty = $(Lampa.Template.get('streamhub_empty', {}, true));
      scroll.append(empty);
      finalizeNav();
    };

    var finalizeNav = function () {
      files.appendFiles(scroll.render());
      Lampa.Controller.add(COMPONENT, {
        toggle: function () {
          Lampa.Controller.collectionSet(scroll.render(), files.render());
          Lampa.Controller.collectionFocus(last || scroll.render().find('.selector').first(), scroll.render());
        },
        back: function () {
          Lampa.Activity.backward();
        }
      });
      Lampa.Controller.toggle(COMPONENT);
    };

    this.loading = function (status) {
      if (status) {
        files.clear();
        files.appendFiles($('<div class="broadcast__scan"><div></div></div>'));
      }
    };

    this.empty = function () {
      drawEmpty();
    };

    this.pause = function () {};
    this.stop = function () {};
    this.destroy = function () {
      scroll.destroy();
      files.destroy();
    };
  }

  function injectButton(activity) {
    var render = activity.render();
    if (!render || render.find('.' + BTN_CLASS).length) return;

    var btn = $(
      '<div class="full-start__button selector ' + BTN_CLASS + '" data-subtitle="Rezka, Eneyida, UAFlix, UASerials">' +
        '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">' +
          '<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z" fill="currentColor"/>' +
        '</svg>' +
        '<span>StreamHub</span>' +
      '</div>'
    );

    btn.on('hover:enter', function () {
      ensureTemplates();
      Lampa.Component.add(COMPONENT, Component);
      var active = Lampa.Activity.active();
      var card = (active && active.method === 'tv') ? (active.card || {}) : (activity.data.movie || activity.card || {});

      Lampa.Activity.push({
        url: '',
        title: t('streamhub_title'),
        component: COMPONENT,
        search: card.title || card.name || '',
        movie: card,
        page: 1
      });
    });

    // Placement priority: after Bandera Online, after UASerials, before play, or append
    var target = render.find('.view--bandera-online');
    if (!target.length) target = render.find('.view--uaserials');
    if (!target.length) target = render.find('.view--torrent');
    if (target.length) {
      target.after(btn);
    } else {
      var btnsContainer = render.find('.full-start-new__buttons, .full-start__buttons').first();
      if (btnsContainer.length) {
        btnsContainer.append(btn);
      } else {
        render.find('.button--play').before(btn);
      }
    }
  }

  function initSettings() {
    if (!Lampa.SettingsApi) return;

    Lampa.SettingsApi.addComponent({
      component: 'streamhub_settings',
      name: 'StreamHub',
      icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z" fill="currentColor"/></svg>'
    });

    Lampa.SettingsApi.addParam({
      component: 'streamhub_settings',
      param: {
        name: 'streamhub_backend_url',
        type: 'input',
        default: 'http://localhost:7011',
        placeholder: 'http://localhost:7011'
      },
      field: {
        name: t('streamhub_server_url'),
        description: t('streamhub_server_descr')
      }
    });
  }

  function startPlugin() {
    if (window.streamhub_online_plugin) return;
    window.streamhub_online_plugin = true;

    ensureTemplates();
    Lampa.Lang.add(strings);
    Lampa.Component.add(COMPONENT, Component);
    initSettings();

    Lampa.Listener.follow('full', function (e) {
      if (e.type === 'complite') {
        injectButton(e.object.activity);
      }
    });
  }

  if (window.Lampa && Lampa.Listener) {
    startPlugin();
  } else {
    var timer = setInterval(function () {
      if (window.Lampa && Lampa.Listener) {
        clearInterval(timer);
        startPlugin();
      }
    }, 150);
  }
})();
