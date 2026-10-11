// 1.0.4.11 mobile UI + SRT/VTT subs + CustomSubs reinstate + rebind playlist/next/prev after PiP 130926
(function () {
	"use strict";

	var pipActive = false;
	var pipContainer = null;
	var originalVideoParent = null;
	var originalVideo = null;
	var originalSubtitles = null;
	var originalPlayerVideoDestroy = null;
	var originalPlayerClose = null;
	var originalPlayerPlay = null;
	var isEnteringPiP = false;
	var isExitingPiP = false;
	var pipActivatedTime = 0;
	var savedPlayData = null;
	var playerContainer = null;
	var savedPanelState = null;
	var capturedEvents = {};
	var pipTimelineInterval = null;
	var savedTimelineHash = null;
	var savedSegments = null;
	var savedPlaylist = null;

	/**
	 * After PiP, playlist / next / prev often keep looking clickable but
	 * their handlers are dead (panel re-render). Re-bind via PlayerPanel.listener.
	 */
	function rebindPlaylistButtons() {
		var panel = document.querySelector(".player-panel");
		if (!panel) return;

		function bind(btn, eventName) {
			if (!btn || !btn.parentNode) return;

			// Clone drops dead/duplicated listeners left after PiP panel re-render
			var clone = btn.cloneNode(true);
			btn.parentNode.replaceChild(clone, btn);
			btn = clone;

			btn.addEventListener(
				"click",
				function (e) {
					e.stopPropagation();
					if (e.stopImmediatePropagation) e.stopImmediatePropagation();
					e.preventDefault();
					if (Lampa.PlayerPanel && Lampa.PlayerPanel.listener) {
						Lampa.PlayerPanel.listener.send(eventName, {});
					}
				},
				true
			);

			if (window.$) {
				$(btn).on("hover:enter", function () {
					if (Lampa.PlayerPanel && Lampa.PlayerPanel.listener) {
						Lampa.PlayerPanel.listener.send(eventName, {});
					}
				});
			}
		}

		// Mobile + TV strips can both exist in DOM — rebind every instance
		Array.prototype.forEach.call(
			panel.querySelectorAll(".player-panel__playlist"),
			function (b) {
				bind(b, "playlist");
			}
		);
		Array.prototype.forEach.call(
			panel.querySelectorAll(".player-panel__next"),
			function (b) {
				bind(b, "next");
			}
		);
		Array.prototype.forEach.call(
			panel.querySelectorAll(".player-panel__prev"),
			function (b) {
				bind(b, "prev");
			}
		);
	}

	function savePanelState() {
		savedPanelState = { buttons: {}, playlistButtonsVisible: true };

		var panel = document.querySelector(".player-panel");
		if (panel) {
			var leftPrev = panel.querySelector(
				".player-panel__left .player-panel__prev"
			);
			var leftNext = panel.querySelector(
				".player-panel__left .player-panel__next"
			);
			var centerPrev = panel.querySelector(
				".player-panel__center .player-panel__prev"
			);
			var centerNext = panel.querySelector(
				".player-panel__center .player-panel__next"
			);

			if (leftPrev)
				savedPanelState.buttons["left-prev"] =
					!leftPrev.classList.contains("hide");
			if (leftNext)
				savedPanelState.buttons["left-next"] =
					!leftNext.classList.contains("hide");
			if (centerPrev)
				savedPanelState.buttons["center-prev"] =
					!centerPrev.classList.contains("hide");
			if (centerNext)
				savedPanelState.buttons["center-next"] =
					!centerNext.classList.contains("hide");

			var playlistBox = panel.querySelector(
				".player-panel__playlist-buttons"
			);
			if (playlistBox) {
				savedPanelState.playlistButtonsVisible =
					!playlistBox.classList.contains("hide");
			}
		}

		if (savedPlayData && savedPlayData.segments) {
			savedSegments = JSON.parse(JSON.stringify(savedPlayData.segments));
		} else {
			savedSegments = null;
		}
	}

	function safeCall(label, fn) {
		try {
			fn();
		} catch (err) {
			console.warn("[pip] restore step failed (" + label + "):", err);
		}
	}

	function restorePanelState() {
		if (!savedPanelState) return;

		var panel = document.querySelector(".player-panel");
		if (panel && savedPanelState.buttons) {
			safeCall("button visibility", function () {
				var leftPrev = panel.querySelector(
					".player-panel__left .player-panel__prev"
				);
				var leftNext = panel.querySelector(
					".player-panel__left .player-panel__next"
				);
				var centerPrev = panel.querySelector(
					".player-panel__center .player-panel__prev"
				);
				var centerNext = panel.querySelector(
					".player-panel__center .player-panel__next"
				);

				if (leftPrev && savedPanelState.buttons["left-prev"] !== undefined) {
					leftPrev.classList.toggle(
						"hide",
						!savedPanelState.buttons["left-prev"]
					);
				}
				if (leftNext && savedPanelState.buttons["left-next"] !== undefined) {
					leftNext.classList.toggle(
						"hide",
						!savedPanelState.buttons["left-next"]
					);
				}
				if (centerPrev && savedPanelState.buttons["center-prev"] !== undefined) {
					centerPrev.classList.toggle(
						"hide",
						!savedPanelState.buttons["center-prev"]
					);
				}
				if (centerNext && savedPanelState.buttons["center-next"] !== undefined) {
					centerNext.classList.toggle(
						"hide",
						!savedPanelState.buttons["center-next"]
					);
				}

				// Restore playlist buttons container visibility. After PiP
				// exit Lampa sometimes leaves .player-panel__playlist-buttons
				// with class "hide" (related to the old PlayerPlaylist.set
				// TypeError path). Put it back to the pre-PiP state.
				var playlistBox = panel.querySelector(
					".player-panel__playlist-buttons"
				);
				if (
					playlistBox &&
					savedPanelState.playlistButtonsVisible !== undefined
				) {
					playlistBox.classList.toggle(
						"hide",
						!savedPanelState.playlistButtonsVisible
					);
				}
			});
		}

		// Playlist restore: PlayerPlaylist.set() often throws "e.set is not a
		// function" on current Lampa builds. We still try (caught), then always
		// rebind playlist/next/prev click handlers — that is what actually
		// unsticks the visible-but-dead buttons after PiP.
		try {
			var pl = savedPlaylist;
			if (
				(!pl || !pl.length) &&
				Lampa.PlayerPlaylist &&
				typeof Lampa.PlayerPlaylist.get === "function"
			) {
				pl = Lampa.PlayerPlaylist.get();
			}
			if (
				pl &&
				pl.length &&
				Lampa.PlayerPlaylist &&
				typeof Lampa.PlayerPlaylist.set === "function"
			) {
				try {
					Lampa.PlayerPlaylist.set(pl);
				} catch (err) {
					console.warn("[pip] PlayerPlaylist.set threw (ignored):", err);
				}
				try {
					if (
						Lampa.PlayerPanel &&
						typeof Lampa.PlayerPanel.showNextEpisodeName === "function"
					) {
						Lampa.PlayerPanel.showNextEpisodeName({
							playlist: pl,
							position:
								(Lampa.PlayerPlaylist.position &&
									Lampa.PlayerPlaylist.position()) ||
								0
						});
					}
				} catch (e2) {}
			}
		} catch (e) {
			console.warn("[pip] playlist restore failed", e);
		}

		if (capturedEvents.tracks) {
			safeCall("tracks", function () {
				Lampa.PlayerPanel.setTracks(capturedEvents.tracks);
			});
		}
		if (capturedEvents.subs) {
			safeCall("subs", function () {
				Lampa.PlayerPanel.setSubs(capturedEvents.subs);
			});
		}
		if (capturedEvents.levels) {
			safeCall("levels", function () {
				Lampa.PlayerPanel.setLevels(
					capturedEvents.levels.levels,
					capturedEvents.levels.current
				);
			});
		}
		if (capturedEvents.quality) {
			safeCall("quality", function () {
				Lampa.PlayerPanel.quality(
					capturedEvents.quality.qs,
					capturedEvents.quality.url
				);
			});
		}
		if (capturedEvents.flows && Lampa.PlayerPanel.setFlows) {
			safeCall("flows", function () {
				Lampa.PlayerPanel.setFlows(capturedEvents.flows);
			});
		}
		if (capturedEvents.translate) {
			safeCall("translate", function () {
				Lampa.PlayerPanel.setTranslate(capturedEvents.translate);
			});
		}

		if (savedSegments) {
			safeCall("segments send", function () {
				if (Lampa.Player && Lampa.Player.listener) {
					Lampa.Player.listener.send("segments", savedSegments);
				}
			});

			setTimeout(function () {
				safeCall("segments render", function () {
					var segmentsContainer = document.querySelector(
						".player-panel__timeline-segments"
					);

					if (
						segmentsContainer &&
						Lampa.PlayerVideo &&
						Lampa.PlayerVideo.video
					) {
						var video = Lampa.PlayerVideo.video();
						var duration = video ? video.duration : 0;

						segmentsContainer.innerHTML = "";

						if (duration && savedSegments) {
							for (var name in savedSegments) {
								if (!Array.isArray(savedSegments[name])) continue;
								for (var a = 0; a < savedSegments[name].length; a++) {
									var seg = savedSegments[name][a];

									var segElem = document.createElement("div");
									segElem.className =
										"player-panel__timeline-segment player-panel__timeline-segment--" +
										name;
									var rStart = Math.min(duration, seg.start);
									var rEnd = Math.min(duration, seg.end);
									var start = (rStart / duration) * 100;
									var length = ((rEnd - rStart) / duration) * 100;

									segElem.style.left = start + "%";
									segElem.style.width = length + "%";
									segmentsContainer.appendChild(segElem);
								}
							}
						}
					}
				});
			}, 200);
		}

		// Re-bind playlist / next / prev (handlers often die after PiP)
		setTimeout(function () {
			rebindPlaylistButtons();
		}, 120);
		setTimeout(function () {
			rebindPlaylistButtons();
		}, 400);
	}

	var postPipTimelineInterval = null;
	var postPipTimelineHash = null;

	function saveTimelineDirectly(hash, time, duration, percent) {
		var timeline = Lampa.Storage.get("timeline", "[]");
		var found = false;

		for (var i = 0; i < timeline.length; i++) {
			if (timeline[i].hash === hash) {
				timeline[i].time = time;
				timeline[i].duration = duration;
				timeline[i].percent = percent;
				found = true;
				break;
			}
		}

		if (!found) {
			timeline.push({
				hash: hash,
				time: time,
				duration: duration,
				percent: percent,
				profile: 0
			});
		}

		Lampa.Storage.set("timeline", timeline);
	}

	function startPostPipTimelineUpdate(hash) {
		stopPostPipTimelineUpdate();
		postPipTimelineHash = hash;
		postPipTimelineInterval = setInterval(function () {
			var video =
				Lampa.PlayerVideo && Lampa.PlayerVideo.video
					? Lampa.PlayerVideo.video()
					: null;
			if (video && !video.paused && video.duration && postPipTimelineHash) {
				var currentTime = video.currentTime;
				var duration = video.duration;
				var percent = Math.round((currentTime / duration) * 100);

				if (
					savedPlayData &&
					savedPlayData.timeline &&
					savedPlayData.timeline.handler
				) {
					savedPlayData.timeline.time = currentTime;
					savedPlayData.timeline.duration = duration;
					savedPlayData.timeline.percent = percent;
					savedPlayData.timeline.handler(percent, currentTime, duration);
				} else {
					saveTimelineDirectly(
						postPipTimelineHash,
						currentTime,
						duration,
						percent
					);
				}
			} else if (
				!video ||
				!document.body.classList.contains("player--viewing")
			) {
				if (postPipTimelineHash) {
					var lastVideo =
						Lampa.PlayerVideo && Lampa.PlayerVideo.video
							? Lampa.PlayerVideo.video()
							: null;
					if (lastVideo && lastVideo.duration) {
						var currentTime = lastVideo.currentTime;
						var duration = lastVideo.duration;
						var percent = Math.round((currentTime / duration) * 100);

						if (
							savedPlayData &&
							savedPlayData.timeline &&
							savedPlayData.timeline.handler
						) {
							savedPlayData.timeline.time = currentTime;
							savedPlayData.timeline.duration = duration;
							savedPlayData.timeline.percent = percent;
							savedPlayData.timeline.handler(percent, currentTime, duration);
						} else {
							saveTimelineDirectly(
								postPipTimelineHash,
								currentTime,
								duration,
								percent
							);
						}
					}
				}

				clearInterval(postPipTimelineInterval);
				postPipTimelineInterval = null;
				postPipTimelineHash = null;
			}
		}, 3000);
	}

	function stopPostPipTimelineUpdate() {
		if (postPipTimelineInterval) {
			var video =
				Lampa.PlayerVideo && Lampa.PlayerVideo.video
					? Lampa.PlayerVideo.video()
					: null;
			if (video && video.duration && postPipTimelineHash) {
				var currentTime = video.currentTime;
				var duration = video.duration;
				var percent = Math.round((currentTime / duration) * 100);

				if (
					savedPlayData &&
					savedPlayData.timeline &&
					savedPlayData.timeline.handler
				) {
					savedPlayData.timeline.time = currentTime;
					savedPlayData.timeline.duration = duration;
					savedPlayData.timeline.percent = percent;
					savedPlayData.timeline.handler(percent, currentTime, duration);
				} else {
					Lampa.Timeline.update({
						hash: postPipTimelineHash,
						time: currentTime,
						duration: duration,
						percent: percent
					});
				}
			}
			clearInterval(postPipTimelineInterval);
			postPipTimelineInterval = null;
			postPipTimelineHash = null;
		}
		savedPlayData = null;
	}

	function startPipTimelineUpdate() {
		stopPipTimelineUpdate();
		pipTimelineInterval = setInterval(function () {
			if (
				pipActive &&
				originalVideo &&
				!originalVideo.paused &&
				originalVideo.duration &&
				savedTimelineHash
			) {
				var currentTime = originalVideo.currentTime;
				var duration = originalVideo.duration;
				var percent = Math.round((currentTime / duration) * 100);

				if (
					savedPlayData &&
					savedPlayData.timeline &&
					savedPlayData.timeline.handler
				) {
					savedPlayData.timeline.time = currentTime;
					savedPlayData.timeline.duration = duration;
					savedPlayData.timeline.percent = percent;
					savedPlayData.timeline.handler(percent, currentTime, duration);
				} else {
					Lampa.Timeline.update({
						hash: savedTimelineHash,
						time: currentTime,
						duration: duration,
						percent: percent
					});
				}
			}
		}, 3000);
	}

	function stopPipTimelineUpdate() {
		if (pipTimelineInterval) {
			clearInterval(pipTimelineInterval);
			pipTimelineInterval = null;
		}
	}

	function setupEventCapture() {
		if (Lampa.PlayerVideo && Lampa.PlayerVideo.listener) {
			Lampa.PlayerVideo.listener.follow("tracks", function (e) {
				capturedEvents.tracks = e.tracks;
			});
			Lampa.PlayerVideo.listener.follow("subs", function (e) {
				capturedEvents.subs = e.subs;
			});
			Lampa.PlayerVideo.listener.follow("levels", function (e) {
				capturedEvents.levels = { levels: e.levels, current: e.current };
			});
		}
	}

	function interceptPanelMethods() {
		if (Lampa.PlayerPanel) {
			var origSetTracks = Lampa.PlayerPanel.setTracks;
			if (origSetTracks && !origSetTracks._intercepted) {
				Lampa.PlayerPanel.setTracks = function (tr) {
					capturedEvents.tracks = tr;
					return origSetTracks.apply(this, arguments);
				};
				Lampa.PlayerPanel.setTracks._intercepted = true;
			}

			var origSetSubs = Lampa.PlayerPanel.setSubs;
			if (origSetSubs && !origSetSubs._intercepted) {
				Lampa.PlayerPanel.setSubs = function (su) {
					capturedEvents.subs = su;
					return origSetSubs.apply(this, arguments);
				};
				Lampa.PlayerPanel.setSubs._intercepted = true;
			}

			var origSetLevels = Lampa.PlayerPanel.setLevels;
			if (origSetLevels && !origSetLevels._intercepted) {
				Lampa.PlayerPanel.setLevels = function (levels, current) {
					capturedEvents.levels = { levels: levels, current: current };
					return origSetLevels.apply(this, arguments);
				};
				Lampa.PlayerPanel.setLevels._intercepted = true;
			}

			var origQuality = Lampa.PlayerPanel.quality;
			if (origQuality && !origQuality._intercepted) {
				Lampa.PlayerPanel.quality = function (qs, url) {
					if (qs) capturedEvents.quality = { qs: qs, url: url };
					return origQuality.apply(this, arguments);
				};
				Lampa.PlayerPanel.quality._intercepted = true;
			}

			var origSetFlows = Lampa.PlayerPanel.setFlows;
			if (origSetFlows && !origSetFlows._intercepted) {
				Lampa.PlayerPanel.setFlows = function (data) {
					capturedEvents.flows = data;
					return origSetFlows.apply(this, arguments);
				};
				Lampa.PlayerPanel.setFlows._intercepted = true;
			}

			var origSetTranslate = Lampa.PlayerPanel.setTranslate;
			if (origSetTranslate && !origSetTranslate._intercepted) {
				Lampa.PlayerPanel.setTranslate = function (data) {
					capturedEvents.translate = data;
					return origSetTranslate.apply(this, arguments);
				};
				Lampa.PlayerPanel.setTranslate._intercepted = true;
			}
		}
	}

	function createPipContainer() {
		if (pipContainer) return;

		pipContainer = document.createElement("div");
		pipContainer.id = "lampa-pip-container";
		pipContainer.innerHTML =
			'<div class="lampa-pip-video-wrap"></div><div class="lampa-pip-subtitles-mirror"></div>';
		document.body.appendChild(pipContainer);

		pipContainer.addEventListener("click", function (e) {
			if (Date.now() - pipActivatedTime < 500) return;
			if (
				e.target === pipContainer ||
				e.target.classList.contains("lampa-pip-video-wrap") ||
				e.target.classList.contains("lampa-pip-subtitles-mirror")
			) {
				exitPiP();
			}
		});
	}

	function createHeaderButton() {
		var existing = document.querySelector(".head__action.pip--icon");
		if (existing) return;

		var actions = document.querySelector(".head__actions");
		if (!actions) return;

		var btn = document.createElement("div");
		btn.className = "head__action selector pip--icon";
		btn.style.display = "none";
		btn.innerHTML =
			'<svg viewBox="0 0 24.5 23.2" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M19.1,0h-3.7h-1.5H5.3C2.4,0,0,2.4,0,5.4v12.5c0,3,2.4,5.3,5.4,5.3h13.8c3,0,5.3-2.4,5.3-5.3V9.9V8.5V5.4C24.5,2.4,22.1,0,19.1,0z M19.1,20.5h-13H5.3c-1.5,0-2.6-1.2-2.6-2.7V5.4c0-1.5,1.2-2.6,2.6-2.6h5.1c-0.1,0.2-0.1,0.5-0.1,0.7v6.5c0,1.9,1.5,3.4,3.4,3.4H21c0.3,0,0.5,0,0.7-0.1v4.5C21.8,19.3,20.6,20.5,19.1,20.5z M21.8,9.9c0,0.4-0.3,0.7-0.7,0.7h-7.2c-0.4,0-0.7-0.3-0.7-0.7V3.4c0-0.4,0.3-0.7,0.7-0.7h1.5h3.7c1.5,0,2.7,1.2,2.7,2.6v3.2V9.9z" fill="currentColor"/></svg>';

		actions.insertBefore(btn, actions.firstChild);

		btn.addEventListener("click", function (e) {
			e.stopPropagation();
			exitPiP();
		});

		$(btn).on("hover:enter", function () {
			exitPiP();
		});
	}

	function showHeaderButton() {
		var btn = document.querySelector(".head__action.pip--icon");
		if (btn) btn.style.display = "";
	}

	function hideHeaderButton() {
		var btn = document.querySelector(".head__action.pip--icon");
		if (btn) btn.style.display = "none";
	}

	function togglePiP() {
		if (pipActive) {
			exitPiP();
		} else {
			enterPiP();
		}
	}

	function updatePipSize() {
		if (!pipContainer || !originalVideo) return;

		var videoWidth = originalVideo.videoWidth || 16;
		var videoHeight = originalVideo.videoHeight || 9;
		var aspectRatio = videoWidth / videoHeight;

		var pipWidth = 256;
		var pipHeight = Math.round(pipWidth / aspectRatio);

		pipContainer.style.width = pipWidth + "px";
		pipContainer.style.height = pipHeight + "px";
	}

	// ===== PiP subtitle engine (Lampa removes .player-video__subtitles in PiP) =====
	var subtitlesMirror = null;
	var savedSubsSnapshot = null; // { list, selectedIndex }
	var pipCues = [];
	var pipCueTimer = null;
	var pipLastCueText = "";

	function getLiveSubsList() {
		try {
			var v =
				Lampa.PlayerVideo && Lampa.PlayerVideo.video
					? Lampa.PlayerVideo.video()
					: null;
			if (v && v.customSubs && v.customSubs.length) return v.customSubs;
		} catch (e) {}
		if (capturedEvents.subs && capturedEvents.subs.length) return capturedEvents.subs;
		try {
			var pd = Lampa.Player && Lampa.Player.playdata ? Lampa.Player.playdata() : null;
			if (pd && pd.subtitles && pd.subtitles.length) return pd.subtitles;
		} catch (e2) {}
		if (savedPlayData && savedPlayData.subtitles && savedPlayData.subtitles.length) {
			return savedPlayData.subtitles;
		}
		return null;
	}

	function snapshotSubs() {
		savedSubsSnapshot = null;
		try {
			var list = getLiveSubsList();
			if (!list || !list.length) return;

			var cleaned = [];
			var selectedIndex = -1;
			for (var i = 0; i < list.length; i++) {
				var s = list[i];
				if (!s || !s.url) continue;
				if (s.index === -1 && !s.url) continue;
				var wasSelected = !!(s.selected || s.mode === "showing");
				if (wasSelected) selectedIndex = cleaned.length;
				cleaned.push({
					index: typeof s.index === "number" ? s.index : cleaned.length,
					label: s.label || s.language || s.lang || "sub",
					url: s.url,
					lang: s.lang,
					language: s.language,
					selected: wasSelected,
					extra: s.extra
				});
			}
			if (!cleaned.length) return;
			savedSubsSnapshot = { list: cleaned, selectedIndex: selectedIndex };
		} catch (e) {
			console.warn("[pip] snapshotSubs failed", e);
		}
	}

	function clearSubsSnapshot() {
		savedSubsSnapshot = null;
	}

	function reinstateCustomSubs() {
		if (!savedSubsSnapshot || !savedSubsSnapshot.list || !savedSubsSnapshot.list.length) {
			return;
		}
		var list = savedSubsSnapshot.list.filter(function (s) {
			return s && s.url;
		});
		if (!list.length) return;

		var idx = savedSubsSnapshot.selectedIndex;
		if (idx < 0 || idx >= list.length) idx = 0;

		try {
			if (Lampa.Player && typeof Lampa.Player.subtitles === "function") {
				Lampa.Player.subtitles(list, idx);
				console.log("[pip] reinstate via Player.subtitles", list.length, "idx", idx);
			} else if (
				Lampa.PlayerVideo &&
				typeof Lampa.PlayerVideo.customSubs === "function"
			) {
				Lampa.PlayerVideo.customSubs(list);
				console.log("[pip] reinstate via PlayerVideo.customSubs", list.length);
			}

			setTimeout(function () {
				try {
					var live = getLiveSubsList();
					if (!live || !live.length) return;
					var targetUrl = list[idx] && list[idx].url;
					var target = null;
					if (targetUrl) {
						for (var i = 0; i < live.length; i++) {
							if (live[i] && live[i].url === targetUrl) {
								target = live[i];
								break;
							}
						}
					}
					if (!target && live[idx]) target = live[idx];
					if (target && target.url) {
						try {
							target.mode = "showing";
							console.log("[pip] reinstate: mode=showing", target.url);
						} catch (eMode) {
							console.warn("[pip] reinstate mode failed", eMode);
						}
					}
					if (Lampa.PlayerPanel && typeof Lampa.PlayerPanel.setSubs === "function") {
						try {
							Lampa.PlayerPanel.setSubs(live);
						} catch (ePanel) {}
					}
				} catch (e2) {
					console.warn("[pip] reinstate follow-up failed", e2);
				}
			}, 150);
		} catch (e) {
			console.warn("[pip] reinstateCustomSubs failed", e);
		}
	}

	function parseTimestamp(ts) {
		ts = (ts || "").trim().replace(",", ".");
		var parts = ts.split(":");
		var h = 0,
			m = 0,
			s = 0;
		if (parts.length === 3) {
			h = parseFloat(parts[0]) || 0;
			m = parseFloat(parts[1]) || 0;
			s = parseFloat(parts[2]) || 0;
		} else if (parts.length === 2) {
			m = parseFloat(parts[0]) || 0;
			s = parseFloat(parts[1]) || 0;
		} else {
			s = parseFloat(parts[0]) || 0;
		}
		return h * 3600 + m * 60 + s;
	}

	function parseSubtitlesData(text) {
		var cues = [];
		if (!text) return cues;
		text = text.replace(/\r+/g, "").replace(/^WEBVTT[^\n]*\n+/i, "");
		var blocks = text.split(/\n{2,}/);
		for (var i = 0; i < blocks.length; i++) {
			var block = blocks[i].trim();
			if (!block) continue;
			var lines = block.split("\n");
			var idx = 0;
			if (lines[0] && /^\d+$/.test(lines[0].trim())) idx = 1;
			if (!lines[idx]) continue;
			var timeLine = lines[idx];
			if (
				!timeLine.match(
					/(\d{1,2}:)?\d{1,2}:\d{1,2}[.,]\d{1,3}\s*-->\s*(\d{1,2}:)?\d{1,2}:\d{1,2}[.,]\d{1,3}/
				)
			) {
				continue;
			}
			var times = timeLine.split(/\s*-->\s*/);
			if (times.length < 2) continue;
			var start = parseTimestamp(times[0].split(" ")[0]);
			var end = parseTimestamp(times[1].split(" ")[0]);
			var body = lines
				.slice(idx + 1)
				.join("\n")
				.replace(/<[^>]+>/g, "")
				.trim();
			if (!body) continue;
			cues.push({ start: start, end: end, text: body });
		}
		return cues;
	}

	function loadPipSubtitlesFromUrl(url) {
		pipCues = [];
		pipLastCueText = "";
		if (!url || !subtitlesMirror) return;
		fetch(url)
			.then(function (r) {
				if (!r.ok) throw new Error("sub fetch " + r.status);
				return r.text();
			})
			.then(function (text) {
				if (!pipActive) return;
				pipCues = parseSubtitlesData(text);
				console.log("[pip] loaded cues:", pipCues.length, "from", url);
			})
			.catch(function (err) {
				console.warn("[pip] subtitle fetch failed", url, err);
			});
	}

	function tickPipCues() {
		if (!pipActive || !subtitlesMirror || !originalVideo) return;
		if (!pipCues.length) return;
		var t = originalVideo.currentTime || 0;
		var text = "";
		for (var i = 0; i < pipCues.length; i++) {
			var c = pipCues[i];
			if (t >= c.start && t <= c.end) {
				text = c.text;
				break;
			}
		}
		if (text !== pipLastCueText) {
			pipLastCueText = text;
			if (text) {
				subtitlesMirror.innerHTML =
					'<div class="player-video__subtitles-text" style="display:inline-block">' +
					text.replace(/\n/g, "<br>") +
					"</div>";
			} else {
				subtitlesMirror.innerHTML = "";
			}
		}
	}

	function startPipCueTimer() {
		stopPipCueTimer();
		pipCueTimer = setInterval(tickPipCues, 200);
		if (originalVideo) {
			originalVideo.addEventListener("timeupdate", tickPipCues);
			originalVideo.addEventListener("seeked", tickPipCues);
		}
	}

	function stopPipCueTimer() {
		if (pipCueTimer) {
			clearInterval(pipCueTimer);
			pipCueTimer = null;
		}
		if (originalVideo) {
			originalVideo.removeEventListener("timeupdate", tickPipCues);
			originalVideo.removeEventListener("seeked", tickPipCues);
		}
		pipCues = [];
		pipLastCueText = "";
	}

	function getActiveSubUrl() {
		var list = getLiveSubsList();
		if (!list) return null;
		for (var i = 0; i < list.length; i++) {
			var s = list[i];
			if (!s || !s.url) continue;
			if (s.selected || s.mode === "showing") return s.url;
		}
		for (var j = 0; j < list.length; j++) {
			if (list[j] && list[j].url) return list[j].url;
		}
		return null;
	}

	function startSubtitlesMirror() {
		if (!pipContainer) return;
		subtitlesMirror = pipContainer.querySelector(".lampa-pip-subtitles-mirror");
		if (!subtitlesMirror) return;
		subtitlesMirror.innerHTML = "";

		var url = getActiveSubUrl();
		if (!url && savedSubsSnapshot && savedSubsSnapshot.list) {
			var idx = savedSubsSnapshot.selectedIndex;
			if (idx >= 0 && savedSubsSnapshot.list[idx]) {
				url = savedSubsSnapshot.list[idx].url;
			} else if (savedSubsSnapshot.list[0]) {
				url = savedSubsSnapshot.list[0].url;
			}
		}
		if (url) {
			loadPipSubtitlesFromUrl(url);
		} else {
			console.warn("[pip] no active subtitle url for PiP renderer");
		}
		startPipCueTimer();
	}

	function stopSubtitlesMirror() {
		stopPipCueTimer();
		if (subtitlesMirror) {
			subtitlesMirror.innerHTML = "";
		}
		subtitlesMirror = null;
		originalSubtitles = null;
	}

	function enterPiP() {
		if (isEnteringPiP) {
			return;
		}

		originalVideo = document.querySelector(".player-video__display video");
		if (!originalVideo) {
			originalVideo = document.querySelector(".player video");
		}

		if (!originalVideo) {
			Lampa.Noty.show(
				"PiP доступний тільки з вбудованим програвачем. Змініть плеєр у налаштуваннях."
			);
			return;
		}

		isEnteringPiP = true;
		originalVideoParent = originalVideo.parentElement;
		playerContainer = document.querySelector(".player");

		savedPlayData = Lampa.Player.playdata();

		if (savedPlayData && savedPlayData.timeline) {
			savedTimelineHash = savedPlayData.timeline.hash;
		}

		savePanelState();
		snapshotSubs(); // capture active tracks with urls before DOM move

		// Save playlist so we can restore / rebind next+playlist after exit
		try {
			if (
				Lampa.PlayerPlaylist &&
				typeof Lampa.PlayerPlaylist.get === "function"
			) {
				var pl = Lampa.PlayerPlaylist.get();
				savedPlaylist = Array.isArray(pl)
					? pl.map(function (item) {
							return Object.assign({}, item);
					  })
					: null;
			} else {
				savedPlaylist = null;
			}
		} catch (e) {
			savedPlaylist = null;
		}

		createPipContainer();

		var videoWrap = pipContainer.querySelector(".lampa-pip-video-wrap");
		videoWrap.appendChild(originalVideo);

		originalVideo.style.cssText =
			"width:100%!important;height:100%!important;object-fit:contain!important;position:static!important;transform:none!important;";

		// Субтитри НЕ переносяться по DOM (щоб не ламати клік-логіку плеєра), namaoftelegr
		// а їхній текст дзеркалиться в окремий елемент усередині pip-контейнера.
		startSubtitlesMirror();

		updatePipSize();
		originalVideo.addEventListener("loadedmetadata", updatePipSize);

		pipActive = true;
		pipActivatedTime = Date.now();
		pipContainer.classList.add("active");

		document.body.classList.add("lampa-pip-mode");
		document.body.classList.remove("player--viewing");

		Lampa.PlayerPanel.hide();

		createHeaderButton();
		showHeaderButton();

		startPipTimelineUpdate();

		setTimeout(function () {
			Lampa.Controller.toggle("content");
			isEnteringPiP = false;
		}, 50);
	}

	function exitPiP() {
		if (!pipActive) return;

		isExitingPiP = true;

		stopPipTimelineUpdate();

		var timelineHashForRestore = savedTimelineHash;

		if (originalVideo && originalVideo.duration && savedTimelineHash) {
			var currentTime = originalVideo.currentTime;
			var duration = originalVideo.duration;
			var percent = Math.round((currentTime / duration) * 100);

			Lampa.Timeline.update({
				hash: savedTimelineHash,
				time: currentTime,
				duration: duration,
				percent: percent
			});

			if (savedPlayData && savedPlayData.timeline) {
				savedPlayData.timeline.time = currentTime;
				savedPlayData.timeline.duration = duration;
				savedPlayData.timeline.percent = percent;
			}
		}

		if (originalVideo) {
			originalVideo.removeEventListener("loadedmetadata", updatePipSize);
		}

		if (pipContainer) {
			pipContainer.classList.remove("active");
		}

		if (playerContainer && !playerContainer.isConnected) {
			document.body.appendChild(playerContainer);
		}

		if (originalVideo && originalVideoParent) {
			originalVideoParent.appendChild(originalVideo);
			originalVideo.style.cssText = "";
		}

		stopSubtitlesMirror();

		document.body.classList.remove("lampa-pip-mode");
		document.body.classList.add("player--viewing");
		hideHeaderButton();

		pipActive = false;

		// --- ОНОВЛЕНА ЧАСТИНА ДЛЯ МОБІЛЬНИХ ПРИСТРОЇВ ---
		Lampa.Controller.toggle("player");
		Lampa.PlayerPanel.show(); // Прибрано "true", щоб панель не фіксувалася

		restorePanelState();

		// Recreate CustomSubs — moving <video> leaves module-level customsubs = null
		setTimeout(reinstateCustomSubs, 50);
		setTimeout(reinstateCustomSubs, 250);
		setTimeout(reinstateCustomSubs, 700);

		// Force rebind playlist/next/prev (mobile often loses handlers)
		setTimeout(function () {
			try {
				Lampa.Controller.toggle("player");
				if (Lampa.PlayerPanel && Lampa.PlayerPanel.show) {
					Lampa.PlayerPanel.show();
				}
				rebindPlaylistButtons();
			} catch (e) {}
		}, 80);
		setTimeout(rebindPlaylistButtons, 300);
		setTimeout(rebindPlaylistButtons, 800);

		// Re-place / re-show the PiP button for the current layout
		// (portrait mobile vs landscape/desktop). Also clears any stale
		// inline display styles left on the native button.
		setTimeout(ensurePipButton, 50);
		setTimeout(ensurePipButton, 250);
		setTimeout(ensurePipButton, 600);

		startPostPipTimelineUpdate(timelineHashForRestore);

		// Автоматично ховаємо інтерфейс через 3 секунди
		setTimeout(function () {
			if (document.body.classList.contains("player--viewing") && Lampa.PlayerPanel && Lampa.PlayerPanel.hide) {
				Lampa.PlayerPanel.hide();
			}
		}, 3000);
		// ----------------------------------------------

		originalVideo = null;
		originalVideoParent = null;
		playerContainer = null;
		isExitingPiP = false;
	}

	function closePiPCompletely() {
		stopPipTimelineUpdate();

		if (originalVideo && originalVideo.duration && savedTimelineHash) {
			var currentTime = originalVideo.currentTime;
			var duration = originalVideo.duration;
			var percent = Math.round((currentTime / duration) * 100);

			Lampa.Timeline.update({
				hash: savedTimelineHash,
				time: currentTime,
				duration: duration,
				percent: percent
			});
		}

		if (originalVideo && originalVideoParent) {
			if (playerContainer && !playerContainer.isConnected) {
				document.body.appendChild(playerContainer);
			}
			originalVideoParent.appendChild(originalVideo);
			originalVideo.style.cssText = "";
		}

		stopSubtitlesMirror();

		pipActive = false;
		isEnteringPiP = false;
		isExitingPiP = false;

		if (pipContainer) {
			pipContainer.classList.remove("active");
		}

		document.body.classList.remove("lampa-pip-mode");
		hideHeaderButton();

		savedPlayData = null;
		savedPanelState = null;
		savedTimelineHash = null;
		savedSegments = null;
		savedPlaylist = null;
		capturedEvents = {};
		originalVideo = null;
		originalVideoParent = null;
		playerContainer = null;
	}

	function addStyles() {
		var css = [
			"#lampa-pip-container {",
			"  display: none;",
			"  position: fixed;",
			"  width: 400px;",
			"  height: 225px;",
			"  right: 16px;",
			"  /* Sit above Lampa bottom nav + system gesture bar */",
			"  bottom: 110px;",
			"  z-index: 999999;",
			"  border-radius: 10px;",
			"  overflow: hidden;",
			"  box-shadow: 0 5px 30px rgba(0,0,0,0.7);",
			"  background: #000;",
			"  cursor: pointer;",
			"  transition: width 0.2s, height 0.2s, bottom 0.2s;",
			"  -webkit-transform: translateZ(0);",
			"  transform: translateZ(0);",
			"  -webkit-mask-image: -webkit-radial-gradient(white, black);",
			"}",
			"#lampa-pip-container.active {",
			"  display: block;",
			"}",
			/* Desktop / large screens: slightly lower is fine (no tall bottom nav) */
			"@media (min-width: 900px) {",
			"  #lampa-pip-container {",
			"    bottom: 40px;",
			"    right: 30px;",
			"  }",
			"}",
			/* Mobile / true--mobile: keep clear of navigation-bar */
			"body.true--mobile #lampa-pip-container,",
			"body.navigation-bar--enabled #lampa-pip-container {",
			"  bottom: 120px;",
			"  right: 12px;",
			"}",
			".lampa-pip-video-wrap {",
			"  width: 100%;",
			"  height: 100%;",
			"  overflow: hidden;",
			"  border-radius: 10px;",
			"  -webkit-transform: translateZ(0);",
			"  transform: translateZ(0);",
			"  -webkit-mask-image: -webkit-radial-gradient(white, black);",
			"}",
			".lampa-pip-video-wrap video {",
			"  width: 100% !important;",
			"  height: 100% !important;",
			"  object-fit: contain !important;",
			"  transform: none !important;",
			"  border-radius: 10px;",
			"}",
			"body.lampa-pip-mode .player {",
			"  position: fixed !important;",
			"  width: 1px !important;",
			"  height: 1px !important;",
			"  left: -9999px !important;",
			"  top: -9999px !important;",
			"  overflow: hidden !important;",
			"  pointer-events: none !important;",
			"}",
			"body.lampa-pip-mode .activity--active {",
			"  opacity: 1 !important;",
			"}",
			/* Do NOT force .player-panel__pip.hide visible globally —
			 * on mobile the native button lives under a display:none parent
			 * and forcing it only leaves stale inline styles after exit.
			 * ensurePipButton() handles visibility per layout instead. */
			".lampa-pip-subtitles-mirror {",
			"  position: absolute !important;",
			"  left: 0 !important;",
			"  right: 0 !important;",
			"  bottom: 4% !important;",
			"  width: 100% !important;",
			"  z-index: 5 !important;",
			"  pointer-events: none !important;",
			"  font-size: 11px !important;",
			"  line-height: 1.25 !important;",
			"  text-align: center !important;",
			"  color: #fff !important;",
			"  text-shadow: 0 1px 2px rgba(0,0,0,0.9) !important;",
			"}",
			".lampa-pip-subtitles-mirror * {",
			"  font-size: inherit !important;",
			"  line-height: inherit !important;",
			"  position: static !important;",
			"  transform: none !important;",
			"}"
		].join("\n");

		var style = document.createElement("style");
		style.id = "lampa-pip-styles";
		style.textContent = css;
		document.head.appendChild(style);
	}

	function overridePipHandler() {
		if (
			Lampa.PlayerPanel &&
			Lampa.PlayerPanel.listener &&
			Lampa.PlayerPanel.listener._listeners
		) {
			Lampa.PlayerPanel.listener._listeners["pip"] = [safeTogglePiP];
		}
	}

	var lastPipToggleAt = 0;
	function safeTogglePiP() {
		var now = Date.now();
		if (now - lastPipToggleAt < 300) return;
		lastPipToggleAt = now;
		togglePiP();
	}

	function isElementVisible(el) {
		if (!el) return false;
		try {
			var s = window.getComputedStyle(el);
			if (s.display === "none" || s.visibility === "hidden" || s.opacity === "0") {
				return false;
			}
			// offsetParent is null for fixed/absolute sometimes; also check rect
			var r = el.getBoundingClientRect();
			return r.width > 0 || r.height > 0 || s.display === "flex" || s.display === "block";
		} catch (e) {
			return false;
		}
	}

	/**
	 * Prefer computed visibility of the two right strips over body class —
	 * some Android WebViews / Lampa builds set true--mobile late or not at all
	 * while still using the mobile panel layout.
	 */
	function isMobilePanel() {
		if (document.body.classList.contains("true--mobile")) return true;

		var panel = document.querySelector(".player-panel");
		if (!panel) return false;

		var mobileRight = panel.querySelector(
			".player-panel__right.player-panel__mobile-visible"
		);
		var tvRight = panel.querySelector(
			".player-panel__right.player-panel__tv-visible"
		);

		if (mobileRight && isElementVisible(mobileRight)) return true;
		if (tvRight && isElementVisible(tvRight)) return false;

		// Fallback: narrow portrait viewport
		return window.innerWidth < 700 && window.innerHeight > window.innerWidth;
	}

	function forceShowPip(btn) {
		if (!btn) return;
		btn.classList.remove("hide");
		// Inline !important so it wins over Lampa re-adding "hide" or
		// platform CSS that would otherwise keep the button invisible.
		btn.style.setProperty("display", "flex", "important");
	}

	function clearForcedPipStyle(btn) {
		if (!btn) return;
		btn.style.removeProperty("display");
	}

	function bindPipButtonEvents(btn) {
		if (!btn || btn._pipBound) return;
		btn._pipBound = true;

		// Capture phase + stopImmediatePropagation so this fully replaces
		// whatever native handler Lampa may (re)attach to this element,
		// instead of both firing and toggling PiP twice.
		btn.addEventListener(
			"click",
			function (e) {
				e.stopPropagation();
				if (e.stopImmediatePropagation) e.stopImmediatePropagation();
				e.preventDefault();
				safeTogglePiP();
			},
			true
		);

		if (window.$) {
			$(btn).on("hover:enter", function (e) {
				if (e) {
					if (e.stopPropagation) e.stopPropagation();
					if (e.preventDefault) e.preventDefault();
				}
				safeTogglePiP();
			});
		}
	}

	function buildPipButtonMarkup() {
		var div = document.createElement("div");
		div.className = "player-panel__pip button selector";
		div.setAttribute("data-pip-injected", "1");
		div.innerHTML =
			'<svg><use xlink:href="#sprite-player-pip"></use></svg><div class="tooltip">Зменшити</div>';
		return div;
	}

	/**
	 * Ensure a usable PiP button exists in the *visible* panel row.
	 *
	 * On desktop / TV the native button lives in .player-panel__tv-visible
	 * and only needs the "hide" class removed.
	 * On mobile that whole block is display:none, so we must inject (or keep)
	 * a button inside .player-panel__mobile-visible.
	 */
	function ensurePipButton() {
		var panel = document.querySelector(".player-panel");
		if (!panel) return;

		var mobile = isMobilePanel();
		var tvRight = panel.querySelector(".player-panel__right.player-panel__tv-visible");
		var mobileRight = panel.querySelector(
			".player-panel__right.player-panel__mobile-visible"
		);
		var mobileBox = mobileRight
			? mobileRight.querySelector(".player-panel__box-buttons")
			: null;

		// --- Mobile path: inject into the mobile-visible strip ---
		if (mobile && mobileBox) {
			// Prefer an already-injected mobile button; remove stray ones.
			var mobileBtns = mobileBox.querySelectorAll(".player-panel__pip");
			var keepMobile = null;
			Array.prototype.forEach.call(mobileBtns, function (b) {
				if (!keepMobile) {
					keepMobile = b;
					return;
				}
				if (b.parentNode) b.parentNode.removeChild(b);
			});

			if (!keepMobile) {
				keepMobile = buildPipButtonMarkup();
				var fs = mobileBox.querySelector(".player-panel__fullscreen");
				if (fs) {
					mobileBox.insertBefore(keepMobile, fs);
				} else {
					mobileBox.appendChild(keepMobile);
				}
			}

			forceShowPip(keepMobile);
			bindPipButtonEvents(keepMobile);

			// Native TV button: strip forced display so it does not "leak"
			// into portrait after the user visited fullscreen / landscape.
			if (tvRight) {
				var tvPips = tvRight.querySelectorAll(".player-panel__pip");
				Array.prototype.forEach.call(tvPips, function (tvPip) {
					clearForcedPipStyle(tvPip);
					// Put native button back to Lampa's default hidden state
					// on mobile so it never shows through after layout flips.
					tvPip.classList.add("hide");
				});
			}
			return;
		}

		// --- Desktop / TV / non-mobile path ---
		// Prefer the native button inside tv-visible.
		var nativePip = tvRight
			? tvRight.querySelector(".player-panel__pip")
			: panel.querySelector(".player-panel__pip:not([data-pip-injected])");

		// Remove any mobile-injected duplicates that may still be in DOM nameoftelegr
		// after an orientation change (mobile → landscape / fullscreen).
		var allPips = panel.querySelectorAll(".player-panel__pip");
		Array.prototype.forEach.call(allPips, function (b) {
			if (b === nativePip) return;
			if (b.getAttribute("data-pip-injected") === "1" && b.parentNode) {
				b.parentNode.removeChild(b);
			}
		});

		if (nativePip) {
			forceShowPip(nativePip);
			bindPipButtonEvents(nativePip);
			return;
		}

		// Fallback: no native button at all — inject into the first visible box.
		var box =
			(tvRight && tvRight.querySelector(".player-panel__box-buttons:last-child")) ||
			mobileBox ||
			panel.querySelector(".player-panel__box-buttons");
		if (!box) return;

		var btn = buildPipButtonMarkup();
		var fullscreenBtn = box.querySelector(".player-panel__fullscreen");
		if (fullscreenBtn) {
			box.insertBefore(btn, fullscreenBtn);
		} else {
			box.appendChild(btn);
		}
		forceShowPip(btn);
		bindPipButtonEvents(btn);
	}

	var ensurePipRAF = null;
	function scheduleEnsurePip() {
		if (ensurePipRAF) return;
		ensurePipRAF = requestAnimationFrame(function () {
			ensurePipRAF = null;
			ensurePipButton();
		});
	}

	var panelObserver = null;
	function watchPanel() {
		if (panelObserver) return;
		// Watch the outer .player wrapper, not .player-panel itself — if
		// Lampa ever replaces the whole .player-panel node (as it appears
		// to do after certain panel-refresh errors), an observer attached
		// to the old node would keep watching a detached element and never
		// see the replacement.
		var root =
			document.querySelector(".player") ||
			document.querySelector(".player-panel");
		if (!root) return;

		panelObserver = new MutationObserver(function () {
			scheduleEnsurePip();
		});
		panelObserver.observe(root, {
			childList: true,
			subtree: true,
			attributes: true,
			attributeFilter: ["class"]
		});
	}

	function unwatchPanel() {
		if (panelObserver) {
			panelObserver.disconnect();
			panelObserver = null;
		}
		if (ensurePipRAF) {
			cancelAnimationFrame(ensurePipRAF);
			ensurePipRAF = null;
		}
	}

	function interceptPlayerMethods() {
		if (
			!originalPlayerVideoDestroy &&
			Lampa.PlayerVideo &&
			Lampa.PlayerVideo.destroy
		) {
			originalPlayerVideoDestroy = Lampa.PlayerVideo.destroy;
			Lampa.PlayerVideo.destroy = function (savemeta) {
				if (pipActive) {
					return;
				}

				if (postPipTimelineHash) {
					var video =
						Lampa.PlayerVideo && Lampa.PlayerVideo.video
							? Lampa.PlayerVideo.video()
							: null;

					if (video && video.duration) {
						var currentTime = video.currentTime;
						var duration = video.duration;
						var percent = Math.round((currentTime / duration) * 100);

						Lampa.Timeline.update({
							hash: postPipTimelineHash,
							time: currentTime,
							duration: duration,
							percent: percent
						});
					}

					stopPostPipTimelineUpdate();
				}

				return originalPlayerVideoDestroy.call(this, savemeta);
			};
		}

		if (!originalPlayerClose && Lampa.Player && Lampa.Player.close) {
			originalPlayerClose = Lampa.Player.close;
			Lampa.Player.close = function () {
				if (pipActive || isEnteringPiP) {
					return;
				}
				return originalPlayerClose.call(this);
			};
		}

		if (!originalPlayerPlay && Lampa.Player && Lampa.Player.play) {
			originalPlayerPlay = Lampa.Player.play;
			Lampa.Player.play = function (data) {
				if (data && data.timeline) {
					var stored = Lampa.Storage.get("timeline", "[]");
					var found = stored.find(function (t) {
						return t.hash === data.timeline.hash;
					});

					if (found && found.time > data.timeline.time) {
						data.timeline.time = found.time;
						data.timeline.duration = found.duration;
						data.timeline.percent = found.percent;
					}
				}

				if (pipActive && !isExitingPiP) {
					Lampa.Noty.show("Спочатку закрийте PiP");
					return;
				}
				return originalPlayerPlay.call(this, data);
			};
		}

		if (Lampa.Player && Lampa.Player.iptv) {
			var originalPlayerIptv = Lampa.Player.iptv;
			if (!originalPlayerIptv._pipIntercepted) {
				Lampa.Player.iptv = function (data) {
					if (pipActive && !isExitingPiP) {
						Lampa.Noty.show("Спочатку закрийте PiP");
						return;
					}
					return originalPlayerIptv.call(this, data);
				};
				Lampa.Player.iptv._pipIntercepted = true;
			}
		}
	}

	function initPlugin() {
		addStyles();
		overridePipHandler();
		interceptPlayerMethods();
		interceptPanelMethods();
		setupEventCapture();

		window.addEventListener("resize", function () {
			scheduleEnsurePip();
		});
		window.addEventListener("orientationchange", function () {
			// Lampa rebuilds/relayouts the panel after rotation; give it a
			// beat before we re-check/re-inject the button.
			setTimeout(ensurePipButton, 300);
		});

		Lampa.Listener.follow("player", function (e) {
			if (e.type === "start") {
				clearSubsSnapshot();
				stopPostPipTimelineUpdate();
				var run = function () {
					overridePipHandler();
					interceptPlayerMethods();
					interceptPanelMethods();
					ensurePipButton();
					watchPanel();
				};
				// Panel DOM is often not ready at the first "start" tick,
				// especially on mobile WebView — retry a few times.
				setTimeout(run, 50);
				setTimeout(run, 200);
				setTimeout(run, 500);
				setTimeout(run, 1200);
			}

			if (
				e.type === "destroy" ||
				e.type === "close" ||
				e.type === "end" ||
				e.type === "stop"
			) {
				clearSubsSnapshot();
				unwatchPanel();
				if (pipActive) {
					closePiPCompletely();
				}
			}
		});

		// When the control panel is shown, re-ensure the button for the
		// current layout (portrait vs fullscreen).
		if (Lampa.PlayerPanel && Lampa.PlayerPanel.listener) {
			Lampa.PlayerPanel.listener.follow("visible", function (e) {
				if (e && e.status) {
					scheduleEnsurePip();
					setTimeout(ensurePipButton, 80);
				}
			});
		}
	}

	if (window.appready) {
		initPlugin();
	} else {
		Lampa.Listener.follow("app", function (e) {
			if (e.type === "ready") {
				initPlugin();
			}
		});
	}
})();
