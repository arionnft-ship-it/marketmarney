(function () {
  'use strict';
  const API = '/api/live';
  let config = null,
    localStream = null,
    host = null,
    viewer = null,
    heartbeat = null,
    eventAbort = null,
    facing = 'user';
  const peers = new Map();
  const pendingHostIce = new WeakMap();
  let watchGeneration = 0;
  let waitingForOffer = null;
  const q = (s) => document.querySelector(s),
    stages = ['#liveList', '#setupStage', '#hostStage', '#viewerStage'];
  function show(sel) {
    for (const id of stages) q(id).classList.toggle('is-active', id === sel);
  }
  function toast(message) {
    const box = q('#liveToast');
    box.textContent = message;
    box.classList.add('is-visible');
    clearTimeout(box._t);
    box._t = setTimeout(() => box.classList.remove('is-visible'), 3500);
  }
  async function api(path, options = {}) {
    const headers = { Accept: 'application/json', ...(options.headers || {}) };
    if (options.body && !headers['Content-Type']) headers['Content-Type'] = 'application/json';
    const response = await fetch(API + path, { credentials: 'same-origin', ...options, headers });
    let data = {};
    try {
      data = await response.json();
    } catch {}
    if (!response.ok) {
      const error = new Error(data.message || data.error || 'HTTP ' + response.status);
      error.status = response.status;
      error.data = data;
      throw error;
    }
    return data;
  }
  function escapeText(value) {
    return String(value || '');
  }
  async function loadConfig() {
    config = await api('/config');
  }
  async function loadStreams() {
    const grid = q('#liveGrid');
    grid.innerHTML = '<div class="mm-live-empty">Memuat siaran...</div>';
    try {
      const data = await api('/streams');
      if (!data.streams.length) {
        grid.innerHTML =
          '<div class="mm-live-empty">Belum ada siaran langsung. Jadilah yang pertama memulai Live Marney.</div>';
        return;
      }
      grid.innerHTML = '';
      for (const row of data.streams) {
        const a = document.createElement('a');
        a.className = 'mm-live-card';
        a.href = '/live.html?watch=' + encodeURIComponent(row.id);
        const badge = document.createElement('span');
        badge.className = 'mm-live-badge';
        badge.innerHTML = '<span class="mm-live-dot"></span> LIVE';
        const h = document.createElement('h2');
        h.textContent = row.title;
        const p = document.createElement('p');
        p.textContent = row.hostName + ' • ' + row.category;
        const meta = document.createElement('div');
        meta.className = 'mm-live-meta';
        meta.textContent = row.viewerCount + ' penonton';
        a.append(badge, h, p, meta);
        grid.appendChild(a);
      }
    } catch (e) {
      grid.innerHTML =
        '<div class="mm-live-empty">Siaran belum dapat dimuat. Periksa koneksi lalu coba lagi.</div>';
    }
  }
  function auth(token) {
    return { Authorization: 'Bearer ' + token };
  }
  async function consumeEvents(streamId, token, onEvent) {
    if (eventAbort) eventAbort.abort();
    const controller = new AbortController();
    eventAbort = controller;
    let retry = 0;
    while (!controller.signal.aborted) {
      try {
        const response = await fetch(API + '/streams/' + encodeURIComponent(streamId) + '/events', {
          headers: { Accept: 'text/event-stream', ...auth(token) },
          credentials: 'same-origin',
          signal: controller.signal,
        });
        if (!response.ok) throw new Error('EVENT_' + response.status);
        const reader = response.body.getReader(),
          decoder = new TextDecoder();
        let buffer = '';
        retry = 0;
        while (!controller.signal.aborted) {
          const part = await reader.read();
          if (part.done) break;
          buffer += decoder.decode(part.value, { stream: true });
          let cut;
          while ((cut = buffer.indexOf('\n\n')) >= 0) {
            const block = buffer.slice(0, cut);
            buffer = buffer.slice(cut + 2);
            let event = 'message',
              data = '{}';
            for (const line of block.split(/\r?\n/)) {
              if (line.startsWith('event:')) event = line.slice(6).trim();
              else if (line.startsWith('data:')) data = line.slice(5).trim();
            }
            if (!block.startsWith(':')) {
              try {
                await onEvent(event, JSON.parse(data));
              } catch {}
            }
          }
        }
      } catch (e) {
        if (controller.signal.aborted) return;
        await new Promise((r) => setTimeout(r, Math.min(5000, 700 * Math.pow(1.6, retry++))));
      }
    }
  }
  function peerConfig() {
    return { iceServers: (config && config.iceServers) || [] };
  }
  async function sendSignal(streamId, token, payload) {
    return api('/streams/' + encodeURIComponent(streamId) + '/signal', {
      method: 'POST',
      headers: auth(token),
      body: JSON.stringify(payload),
    });
  }
  function setHeartbeat(streamId, token) {
    clearInterval(heartbeat);
    const beat = () =>
      api('/streams/' + encodeURIComponent(streamId) + '/heartbeat', {
        method: 'POST',
        headers: auth(token),
        body: '{}',
      })
        .then((data) => {
          if (host) q('#hostViewers').textContent = data.viewerCount + ' penonton';
          if (viewer) q('#viewerCount').textContent = data.viewerCount + ' penonton';
        })
        .catch(() => {});
    beat();
    heartbeat = setInterval(beat, 9000);
  }
  async function makeHostPeer(viewerId) {
    if (peers.has(viewerId) || !localStream || !host) return;
    const pc = new RTCPeerConnection(peerConfig());
    const session = host;
    peers.set(viewerId, pc);
    pendingHostIce.set(pc, []);
    for (const track of localStream.getTracks()) {
      const sender = pc.addTrack(track, localStream);
      if (track.kind === 'video') {
        try {
          const params = sender.getParameters();
          params.encodings = params.encodings && params.encodings.length ? params.encodings : [{}];
          params.encodings[0].maxBitrate = 750000;
          params.encodings[0].maxFramerate = 24;
          sender.setParameters(params).catch(() => {});
        } catch {}
      }
    }
    pc.onicecandidate = (e) => {
      if (host === session && e.candidate)
        sendSignal(session.id, session.token, { target: viewerId, kind: 'ice', data: e.candidate }).catch(
          () => {},
        );
    };
    pc.onconnectionstatechange = () => {
      if (['failed', 'closed'].includes(pc.connectionState)) {
        pc.close();
        peers.delete(viewerId);
      }
    };
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    // The v1 server delivers offers only to already-open viewer event streams.
    // Repeat this same offer until answered; later snapshots include gathered ICE.
    for (const delay of [0, 750, 1500, 3000, 6000, 9000]) {
      if (delay) await new Promise((resolve) => setTimeout(resolve, delay));
      if (host !== session || peers.get(viewerId) !== pc || pc.signalingState !== 'have-local-offer') return;
      try {
        await sendSignal(session.id, session.token, {
          target: viewerId,
          kind: 'offer',
          data: pc.localDescription,
        });
      } catch (error) {
        if (error.status === 404 || error.status === 401) return;
      }
    }
  }
  async function hostEvent(type, data) {
    if (type === 'viewer-joined') {
      // Leave the SSE reader free to process the answer while the offer is retrying.
      makeHostPeer(data.viewerId).catch(() => {});
    } else if (type === 'signal') {
      const pc = peers.get(data.viewerId);
      if (!pc) return;
      const candidates = pendingHostIce.get(pc);
      if (data.kind === 'answer' && pc.signalingState === 'have-local-offer') {
        await pc.setRemoteDescription(data.data);
        for (const candidate of candidates.splice(0)) {
          try {
            await pc.addIceCandidate(candidate);
          } catch {}
        }
      } else if (data.kind === 'ice') {
        if (pc.remoteDescription) {
          try {
            await pc.addIceCandidate(data.data);
          } catch {}
        } else if (candidates.length < 128) {
          candidates.push(data.data);
        }
      }
    } else if (type === 'viewer-left') {
      const pc = peers.get(data.viewerId);
      if (pc) pc.close();
      peers.delete(data.viewerId);
    } else if (type === 'stats') q('#hostViewers').textContent = data.viewerCount + ' penonton';
    else if (type === 'ended') {
      await stopHost(false);
      toast('Siaran telah berakhir');
    }
  }
  async function startHost(event) {
    event.preventDefault();
    q('#loginNotice').classList.remove('is-visible');
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facing,
          width: { ideal: 960 },
          height: { ideal: 540 },
          frameRate: { ideal: 24, max: 30 },
        },
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
    } catch (e) {
      toast('Izin kamera dan mikrofon diperlukan untuk Live.');
      return;
    }
    localStream = stream;
    q('#localVideo').srcObject = stream;
    try {
      const data = await api('/streams', {
        method: 'POST',
        body: JSON.stringify({ title: q('#liveTitle').value, category: q('#liveCategory').value }),
      });
      host = data.stream;
      config = { ...(config || {}), iceServers: data.iceServers };
      q('#hostTitle').textContent = host.title;
      q('#hostCategory').textContent = host.category;
      q('#hostStatus').textContent = 'LIVE';
      show('#hostStage');
      setHeartbeat(host.id, host.token);
      consumeEvents(host.id, host.token, (t, d) => Promise.resolve(hostEvent(t, d)).catch(() => {}));
      history.replaceState(null, '', '/live.html?host=' + encodeURIComponent(host.id));
    } catch (e) {
      for (const track of stream.getTracks()) track.stop();
      localStream = null;
      if (e.status === 401) {
        q('#loginNotice').classList.add('is-visible');
        show('#setupStage');
      } else toast(e.message || 'Live belum dapat dimulai');
    }
  }
  async function stopHost(callApi = true) {
    clearInterval(heartbeat);
    heartbeat = null;
    if (eventAbort) eventAbort.abort();
    for (const pc of peers.values()) pc.close();
    peers.clear();
    if (callApi && host)
      api('/streams/' + encodeURIComponent(host.id), { method: 'DELETE', headers: auth(host.token) }).catch(
        () => {},
      );
    if (localStream) {
      for (const track of localStream.getTracks()) track.stop();
      localStream = null;
    }
    host = null;
    history.replaceState(null, '', '/live.html');
    show('#liveList');
    loadStreams();
  }
  async function switchCamera() {
    if (!localStream || !host) return;
    facing = facing === 'user' ? 'environment' : 'user';
    try {
      const next = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: facing },
          width: { ideal: 960 },
          height: { ideal: 540 },
          frameRate: { ideal: 24, max: 30 },
        },
        audio: false,
      });
      const track = next.getVideoTracks()[0],
        old = localStream.getVideoTracks()[0];
      if (old) {
        localStream.removeTrack(old);
        old.stop();
      }
      localStream.addTrack(track);
      q('#localVideo').srcObject = localStream;
      for (const pc of peers.values()) {
        const sender = pc.getSenders().find((s) => s.track && s.track.kind === 'video');
        if (sender) await sender.replaceTrack(track);
      }
    } catch (e) {
      facing = facing === 'user' ? 'environment' : 'user';
      toast('Kamera lain tidak tersedia');
    }
  }
  async function watch(streamId, attempt = 0) {
    const generation = ++watchGeneration;
    clearTimeout(waitingForOffer);
    show('#viewerStage');
    q('#viewerOverlay').hidden = false;
    q('#viewerOverlay').textContent = 'Menghubungkan ke siaran...';
    try {
      const data = await api('/streams/' + encodeURIComponent(streamId) + '/join', {
        method: 'POST',
        body: '{}',
      });
      const session = { id: streamId, viewerId: data.viewerId, token: data.token };
      if (generation !== watchGeneration) {
        releaseViewer(session);
        return;
      }
      viewer = session;
      // Subscribe as soon as the join token is available, before constructing the peer.
      consumeEvents(streamId, session.token, onViewerEvent);
      config = { ...(config || {}), iceServers: data.iceServers };
      q('#viewerTitle').textContent = data.stream.title;
      q('#viewerHost').textContent = data.stream.hostName + ' • ' + data.stream.category;
      q('#viewerCount').textContent = data.stream.viewerCount + ' penonton';
      const pc = new RTCPeerConnection(peerConfig());
      viewer.pc = pc;
      const pending = [];
      pc.ontrack = (e) => {
        if (viewer !== session) return;
        q('#remoteVideo').srcObject = e.streams[0];
        q('#viewerOverlay').hidden = true;
        q('#remoteVideo')
          .play()
          .catch(() => {});
      };
      pc.onicecandidate = (e) => {
        if (viewer === session && e.candidate)
          sendSignal(streamId, session.token, { target: 'host', kind: 'ice', data: e.candidate }).catch(
            () => {},
          );
      };
      pc.onconnectionstatechange = () => {
        if (viewer !== session) return;
        if (pc.connectionState === 'connected') q('#viewerOverlay').hidden = true;
        if (['failed', 'disconnected'].includes(pc.connectionState)) {
          q('#viewerOverlay').hidden = false;
          q('#viewerOverlay').textContent = 'Koneksi terputus. Mencoba menyambung kembali...';
        }
      };
      setHeartbeat(streamId, viewer.token);
      waitingForOffer = setTimeout(async () => {
        if (viewer !== session || pc.remoteDescription) return;
        // A legacy web host sends only one offer. Rejoin at most once.
        await closeViewerConnection();
        if (generation !== watchGeneration) return;
        if (attempt < 1) {
          watch(streamId, attempt + 1);
        } else {
          q('#viewerOverlay').textContent = 'Siaran belum tersambung. Kembali dan coba lagi.';
        }
      }, 9000);
      async function onViewerEvent(type, msg) {
        if (viewer !== session) return;
        if (type === 'signal') {
          if (msg.kind === 'offer') {
            clearTimeout(waitingForOffer);
            if (pc.remoteDescription && pc.localDescription && pc.signalingState === 'stable') {
              await sendSignal(streamId, session.token, {
                target: 'host',
                kind: 'answer',
                data: pc.localDescription,
              });
              return;
            }
            await pc.setRemoteDescription(msg.data);
            for (const item of pending.splice(0))
              try {
                await pc.addIceCandidate(item);
              } catch {}
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            await sendSignal(streamId, session.token, {
              target: 'host',
              kind: 'answer',
              data: pc.localDescription,
            });
          } else if (msg.kind === 'ice') {
            if (pc.remoteDescription)
              try {
                await pc.addIceCandidate(msg.data);
              } catch {}
            else if (pending.length < 128) pending.push(msg.data);
          }
        } else if (type === 'stats') q('#viewerCount').textContent = msg.viewerCount + ' penonton';
        else if (type === 'ended') {
          q('#viewerOverlay').hidden = false;
          q('#viewerOverlay').textContent = 'Siaran telah berakhir.';
          clearTimeout(waitingForOffer);
          clearInterval(heartbeat);
          eventAbort.abort();
          pc.close();
        }
      }
    } catch (e) {
      if (generation !== watchGeneration) return;
      await closeViewerConnection();
      q('#viewerOverlay').hidden = false;
      q('#viewerOverlay').textContent =
        e.status === 404 ? 'Siaran sudah berakhir atau tidak ditemukan.' : e.message;
    }
  }
  function releaseViewer(v) {
    return fetch(
      API + '/streams/' + encodeURIComponent(v.id) + '/viewers/' + encodeURIComponent(v.viewerId),
      {
        method: 'DELETE',
        headers: auth(v.token),
        credentials: 'same-origin',
        keepalive: true,
      },
    ).catch(() => {});
  }
  async function closeViewerConnection() {
    clearTimeout(waitingForOffer);
    clearInterval(heartbeat);
    heartbeat = null;
    if (eventAbort) eventAbort.abort();
    const v = viewer;
    viewer = null;
    if (v) {
      if (v.pc) v.pc.close();
      q('#remoteVideo').srcObject = null;
      await releaseViewer(v);
    }
  }
  async function leaveViewer() {
    ++watchGeneration;
    closeViewerConnection();
    history.replaceState(null, '', '/live.html');
    show('#liveList');
    loadStreams();
  }
  async function share() {
    const url = host ? location.origin + '/live.html?watch=' + encodeURIComponent(host.id) : location.href;
    try {
      if (navigator.share) await navigator.share({ title: 'Live Marney', url });
      else {
        await navigator.clipboard.writeText(url);
        toast('Tautan Live disalin');
      }
    } catch {}
  }
  q('#startButton').addEventListener('click', () => show('#setupStage'));
  q('#cancelSetup').addEventListener('click', () => show('#liveList'));
  q('#liveForm').addEventListener('submit', startHost);
  q('#endButton').addEventListener('click', () => stopHost(true));
  q('#switchButton').addEventListener('click', switchCamera);
  q('#shareHostButton').addEventListener('click', share);
  q('#shareViewerButton').addEventListener('click', share);
  q('#leaveButton').addEventListener('click', leaveViewer);
  q('#muteButton').addEventListener('click', () => {
    const t = localStream && localStream.getAudioTracks()[0];
    if (!t) return;
    t.enabled = !t.enabled;
    q('#muteButton').textContent = t.enabled ? 'Matikan mikrofon' : 'Aktifkan mikrofon';
  });
  q('#cameraButton').addEventListener('click', () => {
    const t = localStream && localStream.getVideoTracks()[0];
    if (!t) return;
    t.enabled = !t.enabled;
    q('#cameraButton').textContent = t.enabled ? 'Matikan kamera' : 'Aktifkan kamera';
  });
  window.addEventListener('beforeunload', () => {
    if (host) {
      fetch(API + '/streams/' + encodeURIComponent(host.id), {
        method: 'DELETE',
        headers: auth(host.token),
        credentials: 'same-origin',
        keepalive: true,
      }).catch(() => {});
    } else if (viewer) {
      fetch(
        API + '/streams/' + encodeURIComponent(viewer.id) + '/viewers/' + encodeURIComponent(viewer.viewerId),
        { method: 'DELETE', headers: auth(viewer.token), credentials: 'same-origin', keepalive: true },
      ).catch(() => {});
    }
  });
  (async () => {
    try {
      await loadConfig();
    } catch {}
    const watchId = new URL(location.href).searchParams.get('watch');
    if (watchId) watch(watchId);
    else loadStreams();
    setInterval(() => {
      if (!host && !viewer) loadStreams();
    }, 15000);
  })();
})();
