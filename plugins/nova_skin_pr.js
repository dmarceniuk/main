// Nova Skin Premium access bridge for LampaUA.
(function () {
  'use strict';

  var premium = 'https://hlushok.github.io/lampa-plugin/nova_skin_premium.js';
  var pendingMarker = 'nova_skin_lampac_loader_pending';
  var loadedMarker = 'nova_skin_lampac_loader';
  var listenerMarker = 'nova_skin_lampac_identity_listener';
  var accessMarker = 'nova_skin_lampac_access';
  var discoveryAttempts = 40;
  var discoveryDelay = 250;
  var networkRetries = 2;
  var accessInFlight = false;
  var networkFailures = 0;
  var identityRevision = 0;
  var defaults = {
    nova_skin_probe: true,
    nova_skin_view: 'grid'
  };

  function report(message, error) {
    try {
      if (window.console && typeof window.console.error === 'function') {
        if (error) window.console.error(message, error);
        else window.console.error(message);
      }
    } catch (e) {}
  }

  function normalizeBase(value) {
    var base = String(value || '').replace(/\s+/g, '').replace(/\/+$/, '');
    return /^https?:\/\//i.test(base) ? base : '';
  }

  function baseFromOnlineScript(value) {
    var clean = String(value || '').replace(/[?#].*$/, '').replace(/\/+$/, '');
    var found = clean.match(/^(https?:\/\/.+)\/online(?:\.min)?\.js$/i);
    return found ? normalizeBase(found[1]) : '';
  }

  function loadedPluginUrls() {
    try {
      if (
        window.Lampa &&
        window.Lampa.Plugins &&
        typeof window.Lampa.Plugins.loaded === 'function'
      ) {
        return window.Lampa.Plugins.loaded() || [];
      }
    } catch (e) {}
    return [];
  }

  function findLampacBase() {
    var urls = loadedPluginUrls();
    var i;
    var base;
    for (i = 0; i < urls.length; i++) {
      base = baseFromOnlineScript(urls[i]);
      if (base) return base;
    }

    try {
      var scripts = document.scripts || [];
      for (i = 0; i < scripts.length; i++) {
        base = baseFromOnlineScript(scripts[i] && scripts[i].src);
        if (base) return base;
      }
    } catch (e) {}

    return '';
  }

  function storageGet(name, fallback) {
    try {
      if (window.Lampa && window.Lampa.Storage && typeof window.Lampa.Storage.get === 'function') {
        return window.Lampa.Storage.get(name, fallback);
      }
    } catch (e) {}
    return fallback;
  }

  function accessUrl(base) {
    var query = [
      'memkey=nova-skin-access',
      'id=0',
      'serial=0'
    ];
    var account = storageGet('account_email', '');
    var uid = storageGet('lampac_unic_id', '');

    if (account) query.push('account_email=' + encodeURIComponent(account));
    if (uid) query.push('uid=' + encodeURIComponent(uid));
    return base + '/lifeevents?' + query.join('&');
  }

  function validAccessResponse(xhr) {
    if (!xhr || xhr.status !== 200) return false;

    try {
      var data = JSON.parse(xhr.responseText || '');
      return !!(
        data &&
        typeof data.ready === 'boolean' &&
        typeof data.tasks === 'number' &&
        Object.prototype.toString.call(data.online) === '[object Array]'
      );
    } catch (e) {
      return false;
    }
  }

  function applyMissingDefaults() {
    if (!window.Lampa || !window.Lampa.Storage) return;

    Object.keys(defaults).forEach(function (name) {
      try {
        if (localStorage.getItem(name) === null) {
          window.Lampa.Storage.set(name, defaults[name]);
        }
      } catch (e) {}
    });
  }

  function refreshSkin() {
    if (!window[loadedMarker] || !window.nova_skin) return;

    setTimeout(function () {
      try {
        if (
          window.Lampa &&
          window.Lampa.Activity &&
          typeof window.Lampa.Activity.replace === 'function'
        ) window.Lampa.Activity.replace();
      } catch (e) {}
    }, 0);
  }

  function setAccess(allowed) {
    var value = allowed === true;
    var changed = window[accessMarker] !== value;
    window[accessMarker] = value;
    if (changed) refreshSkin();
  }

  function loadPremium() {
    if (window[loadedMarker]) return;
    window[loadedMarker] = true;
    window[pendingMarker] = false;

    applyMissingDefaults();
    window.nova_skin_probe_mode = function () {
      return 'external';
    };

    if (window.nova_skin) return;

    var target = document.head || document.body || document.documentElement;
    if (!target || typeof target.appendChild !== 'function' || typeof document.createElement !== 'function') {
      window[loadedMarker] = false;
      setAccess(false);
      report('[Nova Skin Lampac] Script insertion is unavailable.');
      return;
    }

    var script = document.createElement('script');
    script.type = 'text/javascript';
    script.async = true;
    script.src = premium + '?v=' + Math.floor(Date.now() / 3600000);
    script.onerror = function (error) {
      window[loadedMarker] = false;
      setAccess(false);
      report('[Nova Skin Lampac] Premium build failed to load.', error);
    };
    try {
      target.appendChild(script);
    } catch (error) {
      window[loadedMarker] = false;
      setAccess(false);
      report('[Nova Skin Lampac] Premium build insertion failed.', error);
    }
  }

  function retryAccess(base) {
    accessInFlight = false;
    networkFailures++;
    if (networkFailures > networkRetries) {
      window[pendingMarker] = false;
      setAccess(false);
      return;
    }

    setTimeout(function () {
      requestAccess(base);
    }, 1000);
  }

  function requestAccess(base) {
    if (accessInFlight) return;
    accessInFlight = true;
    window[pendingMarker] = true;

    var xhr;
    var requestRevision = identityRevision;
    var completed = false;

    function restartChangedIdentity() {
      if (requestRevision === identityRevision) return false;
      accessInFlight = false;
      networkFailures = 0;
      setTimeout(function () {
        checkWhenReady(0);
      }, 0);
      return true;
    }

    function transientFailure() {
      if (completed) return;
      completed = true;
      if (restartChangedIdentity()) return;
      retryAccess(base);
    }

    try {
      xhr = new XMLHttpRequest();
      xhr.open('GET', accessUrl(base), true);
      xhr.timeout = 6000;

      var aesgcmkey = storageGet('aesgcmkey', '');
      if (aesgcmkey && typeof xhr.setRequestHeader === 'function') {
        xhr.setRequestHeader('X-Kit-AesGcm', aesgcmkey);
      }

      xhr.onload = function () {
        if (completed) return;
        completed = true;
        accessInFlight = false;
        if (restartChangedIdentity()) return;
        if (validAccessResponse(xhr)) {
          networkFailures = 0;
          setAccess(true);
          loadPremium();
          return;
        }

        if (xhr.status === 0 || xhr.status >= 500) {
          retryAccess(base);
        } else {
          window[pendingMarker] = false;
          setAccess(false);
        }
      };
      xhr.onerror = transientFailure;
      xhr.ontimeout = transientFailure;
      xhr.send();
    } catch (error) {
      report('[Nova Skin Lampac] Premium access check failed.', error);
      retryAccess(base);
    }
  }

  function checkWhenReady(attempt) {
    if (accessInFlight) return;

    var base = findLampacBase();
    if (base && window.Lampa && window.Lampa.Storage) {
      attachIdentityListener();
      requestAccess(base);
      return;
    }

    if (attempt >= discoveryAttempts) {
      window[pendingMarker] = false;
      setAccess(false);
      return;
    }

    setTimeout(function () {
      checkWhenReady(attempt + 1);
    }, discoveryDelay);
  }

  function attachIdentityListener() {
    if (window[listenerMarker]) return;

    try {
      var listener = window.Lampa && window.Lampa.Storage && window.Lampa.Storage.listener;
      if (!listener || typeof listener.follow !== 'function') return;

      listener.follow('change', function (event) {
        if (!event) return;
        if (
          event.name !== 'account_email' &&
          event.name !== 'lampac_unic_id' &&
          event.name !== 'aesgcmkey'
        ) return;

        identityRevision++;
        networkFailures = 0;
        setTimeout(function () {
          checkWhenReady(0);
        }, 0);
      });
      window[listenerMarker] = true;
    } catch (e) {}
  }

  attachIdentityListener();
  if (window[loadedMarker]) return;
  setAccess(false);
  if (window[pendingMarker]) return;
  window[pendingMarker] = true;
  checkWhenReady(0);
})();
