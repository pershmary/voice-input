function bindAudioWidgetSelection(widget, remove, isSelectable) {
  const clearSelection = () => widget.removeAttribute('data-audio-selected');

  widget.addEventListener('click', event => {
    const button = event.target.closest('button');
    if (!isSelectable() || (button && button !== widget)) return;
    widget.setAttribute('data-audio-selected', '');
    widget.focus({ preventScroll: true });
  });

  widget.addEventListener('keydown', event => {
    if (!isSelectable() || !['Backspace', 'Delete'].includes(event.key)) return;
    event.preventDefault();
    clearSelection();
    remove();
  });

  document.addEventListener('click', event => {
    if (!widget.contains(event.target)) clearSelection();
  });

  return clearSelection;
}

function mountAudioRecording(root, onPermissionUnavailable) {
  const editor = root.querySelector('.audio-recording__editor');
  const widget = root.querySelector('.audio-recording__widget');
  const statusMessage = root.querySelector('.audio-recording__message');
  const transcript = root.querySelector('.audio-recording__transcript');
  const waveform = root.querySelector('canvas');
  const drawing = waveform.getContext('2d');
  const actions = Object.fromEntries(
    Array.from(root.querySelectorAll('[data-audio-action]'), button => [button.dataset.audioAction, button])
  );
  const widgetTime = widget.querySelector('time');
  const speeds = [1, 1.25, 1.5, 2];
  const clearSelection = bindAudioWidgetSelection(widget, dismissRecording, () => root.dataset.state === 'ready');

  let session;
  let trigger;

  const stage = root.closest('.demo-stage');
  const editorResize = new ResizeObserver(([entry]) => {
    stage.style.setProperty('--audio-editor-height', `${entry.contentRect.height}px`);
  });
  editorResize.observe(editor);

  function setState(state, message = '') {
    const starting = state === 'starting';
    const recording = state === 'recording';
    const showPlayer = ['processing', 'ready', 'unavailable'].includes(state);
    root.dataset.state = state;
    root.hidden = state === 'idle' && !message;
    widget.hidden = !starting && !recording && !showPlayer;
    if (state === 'ready') widget.tabIndex = 0;
    else widget.removeAttribute('tabindex');
    actions.stop.hidden = actions.cancel.hidden = !starting && !recording;
    actions.stop.disabled = !recording;
    actions.play.hidden = actions.speed.hidden = !showPlayer;
    statusMessage.textContent = message;
  }

  function updateTime(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainder = String(seconds % 60).padStart(2, '0');
    widgetTime.textContent = `${minutes}:${remainder}`;
    widgetTime.dateTime = `PT${seconds}S`;
  }

  function drawWaveform(peaks, capturing) {
    const width = waveform.clientWidth;
    waveform.width = width;
    drawing.fillStyle = '#4c3294';
    const bars = Math.floor(width / 3);
    for (let index = 0; index < bars; index++) {
      let peak = 0;
      if (capturing) {
        peak = peaks[peaks.length - 1 - index] ?? 0;
      } else {
        const first = Math.floor(index * peaks.length / bars);
        const end = Math.max(first + 1, Math.floor((index + 1) * peaks.length / bars));
        for (let sample = first; sample < end; sample++) peak = Math.max(peak, peaks[sample] ?? 0);
      }
      const height = Math.max(2, Math.min(20, Math.round(peak * 28)));
      drawing.fillRect(index * 3, (20 - height) / 2, 1, height);
    }
  }

  function stopPlayback(current) {
    const player = current.player;
    if (!player) return;
    current.player = null;
    player.source?.stop();
    player.source?.disconnect();
    player.button.setAttribute('aria-label', player.caption);
    player.icon.textContent = '\uEC80';
  }

  function releaseMicrophone(current) {
    finishSegment(current);
    for (const track of current.stream?.getTracks() ?? []) track.stop();
    current.stream = null;
  }

  function clear() {
    clearSelection();
    const previous = session;
    session = null;
    if (previous) {
      clearTimeout(previous.permissionTimeout);
      clearInterval(previous.timer);
      stopPlayback(previous);
      previous.cancelRecognition?.();
      releaseMicrophone(previous);
      if (previous.context.state !== 'closed') void previous.context.close().catch(() => {});
    }
    transcript.hidden = true;
    transcript.textContent = '';
    transcript.classList.remove('is-collapsed');
    actions.more.hidden = true;
    actions.more.setAttribute('aria-expanded', 'false');
    actions.more.setAttribute('aria-label', 'Развернуть расшифровку');
    actions.play.disabled = actions.speed.disabled = true;
    setState('idle');
  }

  function beginSegment(current) {
    const recorder = new MediaRecorder(current.stream);
    const chunks = [];
    const finished = new Promise(resolve => {
      recorder.ondataavailable = ({ data }) => { if (data.size) chunks.push(data); };
      recorder.onstop = () => resolve(new Blob(chunks, { type: recorder.mimeType }));
      recorder.onerror = () => resolve(null);
    });
    recorder.start();
    current.segment = recorder;
    current.segments.push(finished);
    current.audio = null;
    current.started = performance.now();
    setState('recording');
    const update = () => {
      current.analyser.getFloatTimeDomainData(current.samples);
      let peak = 0;
      for (const sample of current.samples) peak = Math.max(peak, Math.abs(sample));
      current.peaks.push(peak);
      updateTime(current.elapsed + performance.now() - current.started);
      drawWaveform(current.peaks, true);
    };
    update();
    current.timer = setInterval(update, 70);
  }

  function finishSegment(current) {
    if (!current.segment) return;
    current.elapsed += performance.now() - current.started;
    clearInterval(current.timer);
    if (current.segment.state !== 'inactive') current.segment.stop();
    current.segment = null;
  }

  async function start(launchButton) {
    clear();
    trigger = launchButton;
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder || !window.AudioContext) {
      setState('idle', 'Запись аудио недоступна в этом браузере.');
      return;
    }
    const context = new AudioContext();
    const current = { context, elapsed: 0, peaks: [], segments: [], rate: 1 };
    session = current;
    setState('starting');
    updateTime(0);
    drawWaveform([], true);
    const abandonPermissionRequest = () => {
      clear();
      onPermissionUnavailable();
    };
    current.permissionTimeout = setTimeout(abandonPermissionRequest, 30000);
    try {
      const ready = context.resume().then(() => true, () => false);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1 } });
      if (session !== current) {
        stream.getTracks().forEach(track => track.stop());
        return;
      }
      clearTimeout(current.permissionTimeout);
      current.stream = stream;
      if (!await ready) throw new Error('Audio context did not start');
      if (session !== current) return;
      current.analyser = context.createAnalyser();
      current.analyser.fftSize = 512;
      current.samples = new Float32Array(current.analyser.fftSize);
      context.createMediaStreamSource(stream).connect(current.analyser);
      beginSegment(current);
      actions.stop.focus({ preventScroll: true });
    } catch (error) {
      if (session !== current) return;
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError' ||
          error.name === 'AbortError') {
        abandonPermissionRequest();
        return;
      }
      clear();
      setState('idle', 'Не удалось включить микрофон.');
      trigger.focus({ preventScroll: true });
    }
  }

  function prepareAudio(current) {
    return current.audio ??= decodeSegments(current.context, current.segments);
  }

  async function decodeSegments(context, recordings) {
    const blobs = await Promise.all(recordings);
    const decoded = await Promise.all(blobs.filter(blob => blob?.size).map(async blob => {
      return context.decodeAudioData(await blob.arrayBuffer()).catch(() => null);
    }));
    const segments = decoded.filter(Boolean);
    if (!segments.length) return null;
    const frames = segments.reduce((total, segment) => total + segment.length, 0);
    const buffer = context.createBuffer(1, frames, context.sampleRate);
    let offset = 0;
    for (const segment of segments) {
      buffer.copyToChannel(segment.getChannelData(0), 0, offset);
      offset += segment.length;
    }
    return buffer;
  }

  async function togglePlayback(button) {
    const current = session;
    if (!current) return;
    if (current.player) {
      stopPlayback(current);
      return;
    }
    const player = {
      button,
      caption: button.getAttribute('aria-label'),
      icon: button.firstElementChild
    };
    current.player = player;
    try {
      await current.context.resume();
      const buffer = await prepareAudio(current);
      if (session !== current || current.player !== player) return;
      if (!buffer) {
        stopPlayback(current);
        return;
      }
      const source = current.context.createBufferSource();
      source.buffer = buffer;
      source.playbackRate.value = current.rate;
      source.connect(current.context.destination);
      source.onended = () => {
        if (current.player !== player) return;
        player.source = null;
        source.disconnect();
        stopPlayback(current);
      };
      source.start();
      player.source = source;
      button.setAttribute('aria-label', 'Остановить воспроизведение');
      player.icon.textContent = '\uE639';
    } catch {
      if (current.player === player) stopPlayback(current);
    }
  }

  async function recognizeAudio(current, buffer) {
    // Use the track-aware interface so recognition receives the saved recording.
    const Recognition = window.SpeechRecognition;
    if (!Recognition) throw new Error('SpeechRecognition is unavailable');
    const language = 'ru-RU';
    const local = await Recognition.available?.({ langs: [language], processLocally: true }).catch(() => null);
    if (session !== current) return '';

    return new Promise((resolve, reject) => {
      const context = current.context;
      const destination = context.createMediaStreamDestination();
      const track = destination.stream.getAudioTracks()[0];
      const source = context.createBufferSource();
      source.buffer = buffer;
      source.connect(destination);

      const recognition = new Recognition();
      recognition.lang = language;
      if (local === 'available') recognition.processLocally = true;
      recognition.continuous = true;
      const results = [];
      let timer;

      function finish(error) {
        clearTimeout(timer);
        current.cancelRecognition = null;
        recognition.onstart = recognition.onresult = recognition.onerror = recognition.onend = null;
        source.onended = null;
        source.disconnect();
        track.stop();
        if (error) {
          recognition.abort();
          reject(error);
        } else {
          resolve(results.filter(Boolean).join(' ').trim());
        }
      }

      current.cancelRecognition = () => finish(new Error('Recognition was cancelled'));
      recognition.onresult = event => {
        for (let index = event.resultIndex; index < event.results.length; index++) {
          if (event.results[index].isFinal) results[index] = event.results[index][0].transcript.trim();
        }
      };
      recognition.onstart = () => {
        clearTimeout(timer);
        timer = setTimeout(() => finish(new Error('Recognition timed out')), (buffer.duration + 15) * 1000);
        source.start();
      };
      source.onended = () => recognition.stop();
      recognition.onend = () => finish();
      recognition.onerror = event => {
        if (event.error !== 'no-speech') finish(new Error(event.error));
      };
      timer = setTimeout(() => finish(new Error('Recognition did not start')), 12000);
      try {
        recognition.start(track);
      } catch (error) {
        finish(error);
      }
    });
  }

  function dismissRecording() {
    clear();
    trigger.focus({ preventScroll: true });
  }

  actions.cancel.addEventListener('click', dismissRecording);

  actions.play.addEventListener('click', () => togglePlayback(actions.play));
  actions.speed.addEventListener('click', () => {
    const current = session;
    current.rate = speeds[(speeds.indexOf(current.rate) + 1) % speeds.length];
    actions.speed.textContent = `${current.rate}x`;
    actions.speed.setAttribute('aria-label', `Скорость воспроизведения: ${current.rate}×`);
    if (current.player?.source) current.player.source.playbackRate.value = current.rate;
  });

  actions.more.addEventListener('click', () => {
    const expanded = !transcript.classList.toggle('is-collapsed');
    actions.more.setAttribute('aria-expanded', String(expanded));
    actions.more.setAttribute('aria-label', expanded ? 'Свернуть расшифровку' : 'Развернуть расшифровку');
  });

  actions.stop.addEventListener('click', async () => {
    if (root.dataset.state !== 'recording') return;
    const current = session;
    releaseMicrophone(current);
    actions.speed.textContent = '1x';
    actions.speed.setAttribute('aria-label', 'Скорость воспроизведения: 1×');
    setState('processing', 'Идет распознавание');
    trigger.focus({ preventScroll: true });
    updateTime(current.elapsed);
    drawWaveform(current.peaks, false);

    try {
      const buffer = await prepareAudio(current);
      if (session !== current) return;
      if (!buffer) {
        setState('unavailable', 'Запись пустая.');
        return;
      }
      updateTime(buffer.duration * 1000);
      actions.play.disabled = actions.speed.disabled = false;
      const text = await recognizeAudio(current, buffer);
      if (session !== current) return;
      if (!text) {
        setState('unavailable', 'Речь не распознана.');
        return;
      }
      transcript.textContent = text;
      transcript.hidden = false;
      setState('ready');
      if (transcript.scrollHeight > 32) {
        transcript.classList.add('is-collapsed');
        actions.more.hidden = false;
      }
      if (document.activeElement === trigger) widget.focus({ preventScroll: true });
    } catch {
      if (session === current) setState('unavailable', 'Не удалось распознать запись.');
    }
  });

  window.addEventListener('pagehide', clear);
  return { start, clear };
}
