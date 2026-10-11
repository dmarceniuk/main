(function () {
  'use strict';

  if (window.lampauaRemoteKeyboardStarted) return;
  window.lampauaRemoteKeyboardStarted = true;

  var STORAGE_KEY = 'lampaua_remote_keyboard_room';
  var PUBLIC_ORIGIN = 'https://kinohub.uk';
  var hub = null;
  var roomId = null;
  var reconnectTimer = null;
  var lastEnter = 0;
  var lastRemoteText = '';
  var qrModalOpen = false;
  var qrReturnController = '';

  function setStatus(color) {
    $('.lampaua-remote-dot').css({
      'background-color': color,
      'box-shadow': '0 0 5px ' + color
    });
  }

  function ensureScript(src, check, done) {
    if (check()) return done();

    var finished = false;
    function finish() {
      if (finished) return;
      finished = true;
      done();
    }

    $('<script>').attr('src', src).on('load error', finish).appendTo('head');
    setTimeout(finish, 4000);
  }

  function log(message, data) {}

  function error(message, data) {}

  function appOrigin() {
    if (PUBLIC_ORIGIN && PUBLIC_ORIGIN.charAt(0) !== '{') {
      return PUBLIC_ORIGIN.replace(/\/$/, '');
    }
    return location.origin;
  }

  function wsUrl() {
    return appOrigin().replace(/^http/i, 'ws') + '/nws';
  }

  function LocalNwsClient(url, options) {
    this.url = url;
    this.options = options || {};
    this.handlers = {};
    this.queue = [];
    this.socket = null;
    this.reconnectTimer = null;
    this.reconnectDelay = this.options.reconnectDelay || 3000;
    this.autoReconnect = !!this.options.autoReconnect;
  }

  LocalNwsClient.prototype.on = function (method, handler) {
    if (!this.handlers[method]) this.handlers[method] = [];
    this.handlers[method].push(handler);
  };

  LocalNwsClient.prototype.emit = function (method, args) {
    var list = this.handlers[method] || [];
    for (var i = 0; i < list.length; i++) {
      try { list[i].apply(null, args || []); } catch (e) { error('handler failed', e); }
    }
  };

  LocalNwsClient.prototype.connect = function () {
    var self = this;
    try {
      log('connect tv socket', self.url);
      self.socket = new WebSocket(self.url);
    } catch (e) {
      error('socket create failed', e);
      self.emit('Error', [e]);
      self.scheduleReconnect();
      return;
    }

    self.socket.onmessage = function (event) {
      if (event.data === 'ping') return;
      var message = null;
      try { message = JSON.parse(event.data); } catch (e) { return; }
      if (!message || !message.method) return;
      log('socket message', message);
      self.emit(message.method, message.args || []);
      if (message.method === 'Connected') self.flush();
    };

    self.socket.onopen = function () {
      log('socket open');
      self.flush();
    };

    self.socket.onerror = function (event) {
      error('socket error', event);
      self.emit('Error', [event]);
    };

    self.socket.onclose = function () {
      log('socket closed');
      self.emit('Closed', []);
      self.scheduleReconnect();
    };
  };

  LocalNwsClient.prototype.invoke = function (method) {
    var payload = JSON.stringify({
      method: method,
      args: Array.prototype.slice.call(arguments, 1)
    });

    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      this.queue.push(payload);
      return;
    }

    log('socket send', payload);
    this.socket.send(payload);
  };

  LocalNwsClient.prototype.flush = function () {
    while (this.socket && this.socket.readyState === WebSocket.OPEN && this.queue.length) {
      var payload = this.queue.shift();
      log('socket send queued', payload);
      this.socket.send(payload);
    }
  };

  LocalNwsClient.prototype.scheduleReconnect = function () {
    var self = this;
    if (!self.autoReconnect || self.reconnectTimer) return;
    self.reconnectTimer = setTimeout(function () {
      self.reconnectTimer = null;
      self.connect();
    }, self.reconnectDelay);
  };

  LocalNwsClient.prototype.close = function () {
    this.autoReconnect = false;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    if (this.socket) this.socket.close();
  };

  function isRoomCode(value) {
    return /^LMP-\d{8}$/.test(String(value || ''));
  }

  function createRoomCode() {
    var digits = '';

    if (window.crypto && window.crypto.getRandomValues) {
      var values = new Uint8Array(8);
      window.crypto.getRandomValues(values);
      for (var i = 0; i < values.length; i++) digits += String(values[i] % 10);
    } else {
      for (var j = 0; j < 8; j++) digits += String(Math.floor(Math.random() * 10));
    }

    return 'LMP-' + digits;
  }

  function getRoom() {
    roomId = Lampa.Storage.get(STORAGE_KEY, '');
    if (!isRoomCode(roomId)) {
      roomId = createRoomCode();
      Lampa.Storage.set(STORAGE_KEY, roomId, false);
    }
    return roomId;
  }

  function phoneUrl() {
    return appOrigin() + '/keyboard.html#' + encodeURIComponent(getRoom());
  }

  function drawQr(target, url) {
    target.empty();
    try {
      if (window.qrcode) {
        var qr = window.qrcode(0, 'M');
        qr.addData(url);
        qr.make();
        target.html(qr.createSvgTag({ scalable: true }));
        target.find('svg').css({ width: '100%', height: '100%' });
        return;
      }
      if (Lampa.Utils && Lampa.Utils.qrcode) {
        Lampa.Utils.qrcode(url, target);
        target.find('svg, canvas, img').css({
          width: '100%',
          height: '100%',
          'max-width': '100%',
          'max-height': '100%'
        });
        return;
      }
    } catch (e) {}
    target.css({
      color: '#111',
      'font-size': '12px',
      'line-height': '1.35',
      'word-break': 'break-all',
      padding: '8px'
    }).text(url);
  }

  function showQr() {
    var url = phoneUrl();
    var code = getRoom();
    qrModalOpen = true;
    qrReturnController = (Lampa.Controller.enabled() || {}).name || '';
    window.last_controller = qrReturnController;
    var html = $('<div class="lampaua-remote-modal" style="width:380px;max-width:76vw;margin:0 auto;text-align:center"><div style="width:280px;height:280px;max-width:62vw;max-height:62vw;margin:0 auto;background:#fff;padding:14px;display:flex;align-items:center;justify-content:center;overflow:hidden"><div class="lampaua-remote-qr" style="width:100%;height:100%;display:flex;align-items:center;justify-content:center"></div></div><div style="margin-top:12px;color:#ddd;font-size:14px;line-height:1.35"><div>Скануйте QR телефоном</div><div style="margin-top:6px;font-size:20px;font-weight:700;color:#fff;white-space:nowrap">Код: ' + code + '</div><div style="margin-top:6px;font-size:13px;color:#ddd;white-space:nowrap">Адреса: lampaua.mooo.com/keyboard.html</div></div></div>');
    Lampa.Modal.open({
      title: 'LampaUa пульт',
      html: html,
      size: 'small',
      align: 'center',
      onBack: function () {
        closeQrModal();
      },
      buttons: [{
        name: 'Новий код',
        onSelect: function () {
          qrModalOpen = false;
          roomId = '';
          Lampa.Storage.set(STORAGE_KEY, '', false);
          getRoom();
          connect(true);
          Lampa.Modal.close();
          setTimeout(showQr, 10);
        }
      }]
    });
    ensureScript(appOrigin() + '/keyboard/qrcode.js', function () { return typeof window.qrcode !== 'undefined'; }, function () {
      drawQr(html.find('.lampaua-remote-qr'), url);
    });
    Lampa.Controller.toggle('modal');
  }

  function closeQrModal() {
    if (!qrModalOpen) return;

    qrModalOpen = false;
    try { Lampa.Modal.close(); } catch (e) {}
    try { Lampa.Controller.toggle(qrReturnController || window.last_controller || 'content'); } catch (e) {}
  }

  function addButton() {
    if ($('.head__action-lampaua-remote').length) return;
    var button = $('<div class="head__action selector head__action-lampaua-remote" style="position:relative"><div class="lampaua-remote-dot" style="position:absolute;top:12px;right:12px;width:8px;height:8px;background-color:#fa0a0a;border-radius:50%;box-shadow:0 0 5px #fa0a0a;z-index:2"></div><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 16 16"><path d="M2 2h2v2H2z"></path><path d="M6 0v6H0V0zM5 1H1v4h4zM4 12H2v2h2z"></path><path d="M6 10v6H0v-6zm-5 1v4h4v-4zm11-9h2v2h-2z"></path><path d="M10 0v6h6V0zm5 1v4h-4V1zM8 1V0h1v2H8v2H7V1zm0 5V4h1v2zM6 8V7h1V6h1v2h1V7h5v1h-4v1H7V8zm0 0v1H2V8H1v1H0V7h3v1zm10 1h-1V7h1zm-1 0h-1v2h2v-1h-1zm-4 0h2v1h-1v1h-1v1H9v1h3v-2zm0 0h3v1h-2v1h-1zm-4-1v1h1v-2H7v1z"></path><path d="M7 12h1v3h4v1H7zm9 2v2h-3v-1h2v-1z"></path></svg></div>');
    button.on('hover:enter click', function () {
      if (!$('.modal').length) showQr();
    });
    var settings = $('.head__actions .open--settings');
    if (settings.length) settings.before(button);
    else $('.head__actions').append(button);
  }

  function sendInput(text) {
    closeQrModal();
    lastRemoteText = String(text || '').trim();
    var target = $('input:focus, textarea:focus, .keyboard__input, .search__text, input[type="text"]').first();
    if (target.length) {
      if (target.is('input, textarea')) {
        target.val(text);
        target[0].dispatchEvent(new Event('input', { bubbles: true }));
        target[0].dispatchEvent(new Event('change', { bubbles: true }));
      } else {
        target.text(text);
        target[0].dispatchEvent(new Event('input', { bubbles: true }));
      }
    }
    if (window.SimpleKeyboardInstances) {
      for (var key in window.SimpleKeyboardInstances) {
        var keyboard = window.SimpleKeyboardInstances[key];
        if (keyboard && typeof keyboard.setInput === 'function') {
          keyboard.setInput(text);
          if (keyboard.options && typeof keyboard.options.onChange === 'function') keyboard.options.onChange(text);
        }
      }
    }

    var settingsInput = $('.keyboard-input--visible .settings-input__input').first();
    if (settingsInput.length) {
      settingsInput.toggleClass('filled', Boolean(lastRemoteText));
      settingsInput.text(lastRemoteText);
    }
  }

  function dispatchKey(target, type, code, keyName, codeName) {
    var event;
    try {
      event = new KeyboardEvent(type, {
        key: keyName || '',
        code: codeName || '',
        keyCode: code,
        which: code,
        bubbles: true,
        cancelable: true
      });
    } catch (e) {
      event = document.createEvent('Event');
      event.initEvent(type, true, true);
      event.keyCode = code;
      event.which = code;
    }
    target.dispatchEvent(event);
  }

  function dispatchMediaKey(action) {
    var map = {
      VOLUME_UP: { code: 175, key: 'AudioVolumeUp' },
      VOLUME_DOWN: { code: 174, key: 'AudioVolumeDown' },
      VOLUME_MUTE: { code: 173, key: 'AudioVolumeMute' }
    };
    var item = map[action];
    if (!item) return false;

    dispatchKey(window, 'keydown', item.code, item.key, item.key);
    dispatchKey(document, 'keydown', item.code, item.key, item.key);
    setTimeout(function () {
      dispatchKey(window, 'keyup', item.code, item.key, item.key);
      dispatchKey(document, 'keyup', item.code, item.key, item.key);
    }, 50);
    return true;
  }

  function playerVideoElement() {
    try {
      if (window.Lampa && Lampa.PlayerVideo && typeof Lampa.PlayerVideo.video === 'function') {
        var video = Lampa.PlayerVideo.video();
        if (video) return video;
      }
    } catch (e) {}

    return document.querySelector('video');
  }

  function setPlayerVolume(volume) {
    volume = Math.max(0, Math.min(1, Number(volume) || 0));

    try {
      if (window.Lampa && Lampa.Storage) Lampa.Storage.set('player_volume', String(volume));
      if (window.Lampa && Lampa.PlayerVideo && typeof Lampa.PlayerVideo.changeVolume === 'function') {
        Lampa.PlayerVideo.changeVolume(volume);
      }
    } catch (e) {}

    var video = playerVideoElement();
    if (video) {
      try {
        video.volume = volume;
        if (volume > 0) video.muted = false;
      } catch (e) {}
    }

    $('.player-panel__volume-range').val(volume);
  }

  function currentPlayerVolume() {
    var video = playerVideoElement();
    if (video && typeof video.volume === 'number') return video.volume;

    try {
      if (window.Lampa && Lampa.Storage) return parseFloat(Lampa.Storage.get('player_volume', '1'));
    } catch (e) {}

    return 1;
  }

  function controlVolume(action) {
    dispatchMediaKey(action);

    var video = playerVideoElement();
    var next = currentPlayerVolume();

    if (action === 'VOLUME_UP') {
      setPlayerVolume(next + 0.08);
      return true;
    }

    if (action === 'VOLUME_DOWN') {
      setPlayerVolume(next - 0.08);
      return true;
    }

    if (action === 'VOLUME_MUTE') {
      if (video) {
        try { video.muted = !video.muted; } catch (e) {}
      } else if (next > 0) {
        setPlayerVolume(0);
      } else {
        setPlayerVolume(1);
      }
      return true;
    }

    return false;
  }

  function activeInput() {
    var focused = document.activeElement;
    if (focused && /^(INPUT|TEXTAREA)$/i.test(focused.tagName)) return focused;

    var lampaInput = $('.simple-keyboard-input:focus, .simple-keyboard input:focus, .search-box__input:focus').first();
    return lampaInput.length ? lampaInput[0] : null;
  }

  function pressKeyboardEnter() {
    var enter = $('.simple-keyboard [data-skbtn="{ENTER}"], .simple-keyboard [data-skbtn="{SEARCH}"]').filter(function () {
      return this.offsetParent !== null;
    }).first();

    if (!enter.length) return false;

    try {
      enter.trigger('hover:enter');
      return true;
    } catch (e) {
      return false;
    }
  }

  function triggerFocusedEnter() {
    var focused = $('.selector.focus').filter(function () {
      return this.offsetParent !== null;
    }).last();

    if (!focused.length) return false;

    try {
      focused.trigger('hover:enter');
      return true;
    } catch (e) {
      return false;
    }
  }

  function triggerMenuItem(action) {
    var item = $('.menu__item[data-action="' + action + '"]').first();
    if (!item.length) return false;

    try {
      item.trigger('hover:enter');
      return true;
    } catch (e) {
      return false;
    }
  }

  function openLampaMenu() {
    try {
      Lampa.Controller.toggle('menu');
      return true;
    } catch (e) {
      return false;
    }
  }

  function openLampaHome() {
    if (triggerMenuItem('main')) return true;

    if (openLampaMenu()) {
      setTimeout(function () { triggerMenuItem('main'); }, 50);
      return true;
    }

    return false;
  }

  function openLampaSettings() {
    if (triggerMenuItem('settings')) return true;

    var button = $('.open--settings').first();
    if (button.length) {
      try {
        button.trigger('hover:enter');
        return true;
      } catch (e) {}
    }

    if (openLampaMenu()) {
      setTimeout(function () { triggerMenuItem('settings'); }, 50);
      return true;
    }

    try {
      Lampa.Controller.toggle('settings');
      return true;
    } catch (e) {
      return false;
    }
  }

  function triggerLampaAction(action) {
    if (!window.Lampa || !Lampa.Controller) return false;

    try {
      if (action === 'UP' || action === 'DOWN' || action === 'LEFT' || action === 'RIGHT') {
        Lampa.Controller.move(action.toLowerCase());
        return true;
      }

      if (action === 'BACK') {
        Lampa.Controller.back();
        return true;
      }

      if (action === 'HOME') {
        return openLampaHome();
      }

      if (action === 'MENU') {
        return openLampaMenu();
      }

      if (action === 'SETTINGS') {
        return openLampaSettings();
      }

      if (action === 'VOLUME_UP' || action === 'VOLUME_DOWN' || action === 'VOLUME_MUTE') {
        return controlVolume(action);
      }

      if (action === 'ENTER') {
        if (installPluginFromInput()) return true;

        var input = activeInput();
        if (input) {
          dispatchKey(input, 'keyup', 13);
          return true;
        }

        if (pressKeyboardEnter()) return true;

        Lampa.Controller.enter();
        return true;
      }
    } catch (e) {
      error('lampa action failed', e);
    }

    return false;
  }

  function installPluginFromInput() {
    if (!$('body').hasClass('keyboard-input--visible')) return false;
    if (!window.Lampa || !Lampa.Plugins || !Lampa.Storage) return false;

    var title = $('.settings-input__title').text().toLowerCase();
    var looksLikePluginInput = title.indexOf('плаг') >= 0 || title.indexOf('plugin') >= 0;
    if (!looksLikePluginInput) return false;

    var url = lastRemoteText || $('.settings-input__input').text();
    url = String(url || '').trim();
    if (!/^https?:\/\/.+\.js(?:[?#].*)?$/i.test(url)) return false;

    try {
      var ready = Lampa.Plugins.get && Lampa.Plugins.get().find(function (plugin) {
        return plugin && plugin.url === url;
      });

      if (!ready) {
        Lampa.Plugins.add({
          url: url,
          status: 1
        });
      } else if (ready.status !== 1) {
        ready.status = 1;
        if (Lampa.Plugins.save) Lampa.Plugins.save(ready);
        if (Lampa.Plugins.push) Lampa.Plugins.push(ready);
      } else if (Lampa.Plugins.push) {
        Lampa.Plugins.push(ready);
      }

      if (Lampa.Noty && Lampa.Lang) {
        Lampa.Noty.show((Lampa.Lang.translate('plugins_add_success') || 'Плагін підключено'));
      }

      setTimeout(function () {
        try { Lampa.Controller.back(); } catch (e) {}
      }, 50);

      return true;
    } catch (e) {
      error('plugin install fallback failed', e);
      return false;
    }
  }

  function sendAction(action) {
    closeQrModal();
    action = String(action || '').toUpperCase();
    if (action === 'ENTER') {
      var now = Date.now();
      if (now - lastEnter < 400) return;
      lastEnter = now;
    }

    if (triggerLampaAction(action)) return;

    var code = { UP: 38, DOWN: 40, LEFT: 37, RIGHT: 39, BACK: 27, ENTER: 13, HOME: 36, MENU: 93, VOLUME_MUTE: 173, VOLUME_DOWN: 174, VOLUME_UP: 175 }[action];
    if (!code) return;
    dispatchKey(window, 'keydown', code);
    setTimeout(function () { dispatchKey(window, 'keyup', code); }, 50);
  }

  function connect(force) {
    getRoom();
    if (hub && !force) return;
    if (hub) {
      try { hub.close(); } catch (e) {}
      hub = null;
    }
    hub = new LocalNwsClient(wsUrl(), { autoReconnect: true, reconnectDelay: 3000 });
    hub.on('Connected', function () {
      log('join tv', roomId);
      hub.invoke('rk_join_tv', roomId);
    });
    hub.on('rk_ready', function () { setStatus('#4CAF50'); });
    hub.on('rk_status', function (phones) {
      setStatus(phones > 0 ? '#4CAF50' : '#ffaa00');
      if (phones > 0) setTimeout(closeQrModal, 250);
    });
    hub.on('rk_receive_text', sendInput);
    hub.on('rk_receive_action', sendAction);
    hub.on('Closed', function () {
      setStatus('#fa0a0a');
    });
    hub.on('Error', function () {
      setStatus('#fa0a0a');
    });
    hub.connect();
  }

  function updatePluginMeta() {
    if (!window.Lampa || !Lampa.Plugins || !Lampa.Plugins.get) return;

    try {
      var plugins = Lampa.Plugins.get();
      var changed = false;

      for (var i = 0; i < plugins.length; i++) {
        var plugin = plugins[i];
        var url = String(plugin && plugin.url || '');

        if (/\/remotekeyboard\.js(?:[?#].*)?$/i.test(url)) {
          if (plugin.name !== 'Remote Keyboard') {
            plugin.name = 'Remote Keyboard';
            changed = true;
          }
          if (plugin.author !== 'LampaUA') {
            plugin.author = 'LampaUA';
            changed = true;
          }
          if (plugin.descr !== 'Пульт LampaUa з QR-підключенням, тачпадом, клавіатурою та системними кнопками.') {
            plugin.descr = 'Пульт LampaUa з QR-підключенням, тачпадом, клавіатурою та системними кнопками.';
            changed = true;
          }
        }
      }

      if (changed && Lampa.Plugins.save) Lampa.Plugins.save();
    } catch (e) {
      error('plugin metadata update failed', e);
    }
  }

  function init() {
    updatePluginMeta();
    addButton();
    connect(false);
  }

  if (window.appready) init();
  else Lampa.Listener.follow('app', function (event) {
    if (event.type === 'ready') init();
  });
})();
