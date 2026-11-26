const canvas = document.getElementById('demo-canvas');
const stage = document.getElementById('demo-stage');

const radioMenuScenario = 'radio-menu-button';
const radioWindow = stage.querySelector('[data-voice-scenario="radio-buttons"]');
const radioMenuWindow = radioWindow.cloneNode(true);
radioMenuWindow.dataset.voiceScenario = radioMenuScenario;
for (const radio of radioMenuWindow.querySelectorAll('input[type="radio"]')) {
  radio.name = 'radio-menu-voice-output';
}

const radioMenuGroup = stage.querySelector('.voice-window__menu-group').cloneNode(true);
radioMenuGroup.classList.add('voice-window__menu-group--radio');
const radioMenuInsert = radioMenuGroup.querySelector('.voice-window__add');
radioMenuInsert.querySelector('.voice-format-icon').remove();
radioMenuInsert.querySelector('.btn__caption').textContent = 'Вставить текст';
radioMenuInsert.removeAttribute('aria-label');
const radioMenu = radioMenuGroup.querySelector('.voice-window__menu');
const radioMenuTitle = radioMenu.querySelector('.voice-window__menu-title');
radioMenuTitle.firstElementChild.textContent = 'Вставить';
radioMenuTitle.id = 'radio-voice-format-title';
radioMenu.id = 'radio-voice-format-menu';
radioMenu.setAttribute('aria-labelledby', radioMenuTitle.id);
radioMenuGroup.querySelector('.voice-window__menu-trigger').setAttribute('aria-controls', radioMenu.id);
radioMenuWindow.querySelector('.voice-window__insert').replaceWith(radioMenuGroup);
radioWindow.after(radioMenuWindow);

const voiceWindows = [...stage.querySelectorAll('[data-voice-scenario]')];
const insertButtons = stage.querySelectorAll('[data-insert-voice]');
const editorAudio = document.getElementById('editor-audio');
const processingControls = document.getElementById('voice-processing-controls').content;
const rawText = voiceWindows[0].querySelector('.voice-window__text').textContent.trim();
const processedText = 'Нужно отрисовать объединенный механизм голосового ввода и отправки аудиосообщения. Также нужно добавить возможность голосового ввода в любое поле на сайте по шорткату';
const sampleOpening = 'Сейчас голосовой ввод работает только в БТР.';
const sampleText = `${sampleOpening} По проекту добавим возможность ввода во все поля на сайте`;
editorAudio.querySelector('.editor-audio__transcript').textContent = processedText;

let unifiedProcessingTimeout;
let unifiedRecordingInterval;
let toggleUnifiedRecordingPause;

function setUnifiedRecordingPaused(voiceWindow, paused) {
  voiceWindow.toggleAttribute('data-recording-paused', paused);
  const button = voiceWindow.querySelector('[data-unified-pause]');
  button.setAttribute('aria-label', paused ? 'Продолжить' : 'Пауза');
  button.firstElementChild.textContent = paused ? '\uE9B1' : '\uE639';
}

function startUnifiedRecording(voiceWindow) {
  clearInterval(unifiedRecordingInterval);
  setUnifiedRecordingPaused(voiceWindow, false);
  const transcript = voiceWindow.querySelector('.voice-window__text');
  const timer = voiceWindow.querySelector('.voice-window__timer');
  const bars = [...voiceWindow.querySelector('.voice-window__waveform').children];
  const words = rawText.split(/\s+/);
  const duration = 12000;
  const sampleInterval = 80;
  let startedAt = performance.now();
  let recordedTime = 0;
  let displayedSeconds = -1;
  let displayedWords = -1;

  voiceWindow.setAttribute('data-recording-preview', '');
  for (const bar of bars) bar.style.removeProperty('--recording-height');

  function render(elapsed) {
    const seconds = Math.floor(elapsed / 1000);
    if (seconds !== displayedSeconds) {
      timer.textContent = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
      timer.dateTime = `PT${seconds}S`;
      displayedSeconds = seconds;
    }

    const wordCount = Math.floor(elapsed / duration * words.length);
    if (wordCount !== displayedWords) {
      transcript.textContent = wordCount ? words.slice(0, wordCount).join(' ') : 'Здесь появится текст';
      transcript.classList.toggle('voice-window__text--placeholder', wordCount === 0);
      displayedWords = wordCount;
    }

    const sample = Math.floor(elapsed / sampleInterval);
    for (let index = 0; index < Math.min(sample, bars.length); index++) {
      const recordedSample = sample - index;
      const envelope = Math.max(0, Math.sin(recordedSample * 0.31));
      const variation = 0.4 + 0.6 * Math.abs(Math.sin(recordedSample * 1.7));
      const height = 2 + Math.round(18 * envelope * variation);
      bars[index].style.setProperty('--recording-height', `${height}px`);
    }
  }

  function update() {
    const elapsed = Math.min(recordedTime + performance.now() - startedAt, duration);
    render(elapsed);
    if (elapsed === duration) clearInterval(unifiedRecordingInterval);
    return elapsed;
  }

  toggleUnifiedRecordingPause = () => {
    const paused = !voiceWindow.hasAttribute('data-recording-paused');
    if (paused) {
      recordedTime = update();
      clearInterval(unifiedRecordingInterval);
    } else if (recordedTime < duration) {
      startedAt = performance.now();
      unifiedRecordingInterval = setInterval(update, sampleInterval);
    }
    setUnifiedRecordingPaused(voiceWindow, paused);
  };

  render(0);
  unifiedRecordingInterval = setInterval(update, sampleInterval);
}

function closeUnifiedWindow() {
  clearTimeout(unifiedProcessingTimeout);
  clearInterval(unifiedRecordingInterval);
  toggleUnifiedRecordingPause = undefined;
  for (const voiceWindow of voiceWindows) {
    voiceWindow.hidden = true;
    voiceWindow.removeAttribute('data-processing');
    voiceWindow.style.removeProperty('top');
    if (voiceWindow.hasAttribute('data-recording-preview')) {
      setUnifiedRecordingPaused(voiceWindow, false);
      voiceWindow.removeAttribute('data-recording-preview');
      const transcript = voiceWindow.querySelector('.voice-window__text');
      transcript.textContent = rawText;
      transcript.classList.remove('voice-window__text--placeholder');
      const timer = voiceWindow.querySelector('.voice-window__timer');
      timer.textContent = '0:12';
      timer.dateTime = 'PT12S';
    }
    voiceWindow.querySelector('.voice-window__transcript input')?.removeAttribute('disabled');
  }
  closeFormatMenus();
  unifiedMicrophone.setAttribute('aria-expanded', 'false');
}

function showScenario({ scenario }) {
  audioRecording.clear();
  joinDescription();
  clearEditorAudioSelection();
  closeUnifiedWindow();
  const compare = scenario === 'compare-audio';
  stage.classList.toggle('demo-stage--compare-audio', compare);
  finishDictation();
  dictationTranscript.hidden = compare;
  resizeDescription();
  editorAudio.hidden = !compare;
  editorAudio.disabled = compare;
  for (const button of insertButtons) button.disabled = compare;
  for (const button of stage.querySelectorAll('[data-unified-pause], [data-unified-restart]')) button.disabled = compare;
  if (compare) {
    for (const voiceWindow of voiceWindows) voiceWindow.hidden = false;
  } else {
    dictationTranscript.focus({ preventScroll: true });
  }
}

function openUnifiedWindow() {
  const voiceWindow = voiceWindows.find(window => window.dataset.voiceScenario === windowScenario);
  if (!voiceWindow || unifiedMicrophone.getAttribute('aria-expanded') === 'true') return;
  finishDictation();
  selectWindowOutput(voiceWindow, 'text');
  startUnifiedRecording(voiceWindow);
  voiceWindow.style.top = `${getDescriptionLineBottom()}px`;
  voiceWindow.hidden = false;
  unifiedMicrophone.setAttribute('aria-expanded', 'true');
  voiceWindow.focus({ preventScroll: true });
}

function dismissUnifiedWindow() {
  if (frame.value.scenario === 'compare-audio') return;
  closeUnifiedWindow();
  dictationTranscript.focus({ preventScroll: true });
}

function removeUnifiedAudio() {
  clearEditorAudioSelection();
  editorAudio.hidden = true;
  dictationTranscript.hidden = false;
  joinDescription();
  resizeDescription();
  unifiedMicrophone.focus({ preventScroll: true });
}

function finishUnifiedProcessing(voiceWindow, text) {
  const restoreFocus = voiceWindow.contains(document.activeElement);
  closeUnifiedWindow();
  const { value, selectionStart, selectionEnd } = dictationTranscript;
  writeInsertion({ value, selectionStart, selectionEnd }, text);
  if (restoreFocus) dictationTranscript.focus({ preventScroll: true });
}

function selectWindowOutput(voiceWindow, value) {
  for (const choice of voiceWindow.querySelectorAll('input[type="radio"]')) {
    choice.checked = choice.value === value;
  }
  const caption = value === 'audio' ? 'Вставить аудио' : 'Вставить текст';
  const insertLabel = voiceWindow.querySelector('.voice-window__insert');
  if (insertLabel) insertLabel.textContent = caption;
  formatMenus.get(voiceWindow)?.select(value);
  voiceWindow.querySelector('.voice-window__confirm')?.setAttribute('aria-label', caption);
}

const clearEditorAudioSelection = bindAudioWidgetSelection(
  editorAudio, removeUnifiedAudio, () => !editorAudio.hidden && !editorAudio.disabled
);
for (const voiceWindow of voiceWindows) {
  voiceWindow.tabIndex = -1;
  voiceWindow.querySelector('.voice-window__toolbar').prepend(processingControls.cloneNode(true));
  voiceWindow.querySelector('.voice-window__dismiss').addEventListener('click', dismissUnifiedWindow);
  const pauseButton = voiceWindow.querySelector('[data-unified-pause]');
  pauseButton.addEventListener('click', () => toggleUnifiedRecordingPause?.());
  voiceWindow.querySelector('[data-unified-restart]').addEventListener('click', () => startUnifiedRecording(voiceWindow));
  const playButton = document.getElementById('voice-paused-play').content.firstElementChild.cloneNode(true);
  if (voiceWindow.classList.contains('voice-window--radio-buttons')) {
    playButton.className = `${pauseButton.className} voice-window__paused-play`;
    playButton.firstElementChild.className = 'btn__icon';
  }
  pauseButton.before(playButton);
  const skipProcessing = voiceWindow.querySelector('.voice-window__skip');
  skipProcessing.addEventListener('click', () => finishUnifiedProcessing(voiceWindow, rawText));

  for (const insert of voiceWindow.querySelectorAll('[data-insert-voice]')) {
    insert.addEventListener('click', () => {
      clearInterval(unifiedRecordingInterval);
      const selectedAudio = voiceWindow.querySelector('input[value="audio"]:checked, [data-format="audio"][aria-pressed="true"]');
      const output = insert.dataset.insertVoice || (selectedAudio ? 'audio' : 'text');
      if (output === 'audio') {
        closeUnifiedWindow();
        if (dictationTranscript.value) splitDescription(editorAudioPanel);
        else dictationTranscript.hidden = true;
        editorAudio.hidden = false;
        resizeDescription();
        editorAudio.focus({ preventScroll: true });
      } else {
        closeFormatMenus();
        voiceWindow.setAttribute('data-processing', '');
        voiceWindow.querySelector('.voice-window__transcript input')?.setAttribute('disabled', '');
        skipProcessing.focus({ preventScroll: true });
        unifiedProcessingTimeout = setTimeout(() => finishUnifiedProcessing(voiceWindow, processedText), processingDuration);
      }
    });
  }

  for (const choice of voiceWindow.querySelectorAll('input[type="radio"]')) {
    choice.addEventListener('change', () => selectWindowOutput(voiceWindow, choice.value));
  }
}

const waveformPeaks = {
  7: 4, 8: 20, 9: 20, 10: 14, 11: 10, 12: 4,
  22: 10, 23: 10, 35: 14, 36: 10, 37: 20, 38: 14,
  51: 14, 52: 14, 53: 20, 54: 20, 55: 10, 56: 4,
  80: 10, 81: 10, 82: 10, 113: 4, 114: 4, 115: 20,
  116: 20, 117: 14, 164: 4, 165: 20, 166: 14, 167: 10, 168: 4
};
const menuWaveformPeaks = {
  4: 14, 5: 14, 6: 20, 7: 20, 8: 10, 9: 4,
  33: 10, 34: 10, 35: 10, 66: 4, 67: 4, 68: 20, 69: 20, 70: 14,
  117: 4, 118: 20, 119: 14, 120: 10, 121: 4
};
for (const waveform of stage.querySelectorAll('.voice-window__waveform')) {
  const isMenuWaveform = waveform.dataset.waveform === 'menu';
  const peaks = isMenuWaveform ? menuWaveformPeaks : waveformPeaks;
  const bars = Array.from({ length: isMenuWaveform ? 190 : 209 }, (_, index) => {
    const bar = document.createElement('span');
    bar.style.setProperty('--waveform-height', `${peaks[index] ?? 2}px`);
    return bar;
  });
  waveform.append(...bars);
}

const formatMenus = new Map();
for (const voiceWindow of voiceWindows) {
  const menuGroup = voiceWindow.querySelector('.voice-window__menu-group');
  if (menuGroup) formatMenus.set(voiceWindow, bindFormatMenu(voiceWindow, menuGroup));
}

function closeFormatMenus() {
  for (const menu of formatMenus.values()) menu.close();
}

function bindFormatMenu(voiceWindow, menuGroup) {
  const menuTrigger = menuGroup.querySelector('.voice-window__menu-trigger');
  const formatMenu = menuGroup.querySelector('.voice-window__menu');
  const addButton = menuGroup.querySelector('.voice-window__add');
  const addIcon = addButton.querySelector('.voice-format-icon');
  const caption = addButton.querySelector('.btn__caption');
  const formatOptions = formatMenu.querySelectorAll('[data-format]');
  const triggerIcon = menuTrigger.querySelector('.btn__icon');
  const menuTitle = formatMenu.querySelector('.voice-window__menu-title > span');
  const menuClose = formatMenu.querySelector('.voice-window__menu-close');

  function positionFormatMenu() {
    formatMenu.style.removeProperty('left');
    formatMenu.style.removeProperty('top');

    const scene = stage.getBoundingClientRect();
    const menu = formatMenu.getBoundingClientRect();
    const icon = triggerIcon.getBoundingClientRect();
    const title = menuTitle.getBoundingClientRect();
    const close = menuClose.getBoundingClientRect();
    const scaleX = scene.width / stage.offsetWidth;
    const scaleY = scene.height / stage.offsetHeight;

    const desiredShift = icon.left + icon.width / 2 - title.left;
    const minShift = scene.left - menu.left;
    const maxShift = scene.right - Math.max(menu.right, close.right);
    const shiftX = Math.max(minShift, Math.min(desiredShift, maxShift));
    const desiredShiftY = icon.top + icon.height / 2 + 4 * scaleY - (title.top + title.height / 2);
    const shiftY = Math.max(scene.top - menu.top, Math.min(desiredShiftY, scene.bottom - menu.bottom));

    formatMenu.style.left = `${shiftX / scaleX}px`;
    formatMenu.style.top = `calc(100% + 4px + ${shiftY / scaleY}px)`;
  }

  function showFormatMenu(show) {
    formatMenu.hidden = !show;
    menuTrigger.setAttribute('aria-expanded', String(show));
    if (show) positionFormatMenu();
  }

  function select(value) {
    for (const option of formatOptions) {
      const selected = option.dataset.format === value;
      option.setAttribute('aria-pressed', String(selected));
      if (selected && addIcon) addIcon.textContent = option.querySelector('.voice-format-icon').textContent;
    }
    if (addIcon) {
      addButton.setAttribute('aria-label', value === 'audio' ? 'Добавить аудио' : 'Добавить текст');
    } else {
      caption.textContent = value === 'audio' ? 'Вставить аудио' : 'Вставить текст';
    }
  }

  function closeAndFocusTrigger() {
    showFormatMenu(false);
    menuTrigger.focus({ preventScroll: true });
  }

  menuTrigger.addEventListener('click', () => showFormatMenu(formatMenu.hidden));
  menuClose.addEventListener('click', closeAndFocusTrigger);
  for (const option of formatOptions) {
    option.addEventListener('click', () => {
      selectWindowOutput(voiceWindow, option.dataset.format);
      closeAndFocusTrigger();
    });
  }
  document.addEventListener('click', event => {
    if (!formatMenu.hidden && !menuGroup.contains(event.target)) showFormatMenu(false);
  });
  menuGroup.addEventListener('keydown', event => {
    if (event.key !== 'Escape' || formatMenu.hidden) return;
    event.preventDefault();
    closeAndFocusTrigger();
  });

  return { select, close: () => showFormatMenu(false) };
}

const team = [
  {
    label: 'Дизайн',
    name: 'Першина Мария',
    icon: 'design',
    links: [
      {
        title: 'Поручение',
        href: 'https://online.sbis.ru/opendoc.html?guid=01a061f0-b497-7d83-9087-1b2947bce022&client=3'
      }
    ]
  },
  { label: 'Разработка', name: 'Киямов Тимур', icon: 'development' }
];

const windowScenarios = [
  { id: 'radio-buttons', title: 'Радиокнопки' },
  { id: radioMenuScenario, title: 'Радиокнопки + двойная кнопка' },
  { id: 'toggle', title: 'Тумблер' },
  { id: 'two-buttons', title: '2 кнопки' },
  { id: 'split-window', title: 'Окно из двух частей' },
  { id: 'menu-button', title: 'Двойная кнопка' }
];
let windowScenario = windowScenarios[0].id;
let approach;

const frame = DemoFrame.mount({
  stage,
  viewport: canvas,
  headHeight: 100,
  head: {
    title: 'Голосовой ввод',
    version: '27.xxxx',
    status: 'Не показали'
  },
  devices: [
    { id: 'monitor', icon: 'monitor', label: 'Монитор', size: '1600х900', name: 'монитор' }
  ],
  scenarios: [
    { group: 'Варианты окна', items: windowScenarios }
  ],
  bottomScenarios: [
    { id: 'compare-audio', title: 'Окно ввода и виджет "Аудио"' }
  ],
  team,
  onChange(value) {
    if (approach === 'unified' && windowScenarios.some(({ id }) => id === value.scenario)) {
      windowScenario = value.scenario;
    }
    showScenario(value);
  }
});

const headDescription = document.createElement('p');
headDescription.className = 'demo-head-description';
headDescription.textContent = 'Голосовой ввод позволяет набирать текст голосом в БТР и полях ввода. В БТР пользователь может решить, в каком виде сохранить набранный текст: аудио или обычный текст';
frame.head.append(headDescription);

frame.panel.setAttribute('aria-label', 'Системная область');
const scenarioCard = frame.panel.querySelector('.df-panel__top .df-card--scen');
scenarioCard.removeAttribute('role');
scenarioCard.removeAttribute('aria-label');

const windowGroup = document.createElement('div');
windowGroup.className = 'demo-scenario-group';
windowGroup.setAttribute('role', 'radiogroup');
windowGroup.setAttribute('aria-label', scenarioCard.querySelector('.df-group').textContent);
windowGroup.append(...scenarioCard.children);

const comparisonGroup = frame.panel.querySelector('.df-card--bottom');
comparisonGroup.className = 'demo-scenario-group';
comparisonGroup.setAttribute('aria-label', 'Сравнение');

const panelOptions = document.getElementById('demo-panel-options-template').content.cloneNode(true);
const [approachGroup, editorStateGroup] = panelOptions.querySelectorAll('[role="radiogroup"]');
const unifiedMicrophone = stage.querySelector('.voice-toolbar__microphone');
const dictationButton = stage.querySelector('[data-voice-command="voice-input"]');
const audioRecordingButton = stage.querySelector('[data-voice-command="audio-recording"]');
scenarioCard.append(panelOptions, windowGroup, comparisonGroup);

function showApproach() {
  approach = approachGroup.querySelector('input:checked').value;
  const unified = approach === 'unified';
  unifiedMicrophone.hidden = !unified;
  dictationButton.hidden = unified;
  audioRecordingButton.hidden = unified;
  windowGroup.hidden = !unified;
  comparisonGroup.hidden = !unified;
  frame.select(unified ? windowScenario : null);
}

approachGroup.addEventListener('change', showApproach);
editorStateGroup.addEventListener('change', () => {
  frame.select(approach === 'unified' ? windowScenario : null);
  const withText = editorStateGroup.querySelector('input:checked').value === 'text';
  dictationTranscript.value = withText ? sampleText : '';
  const caret = withText ? sampleOpening.length : 0;
  dictationTranscript.setSelectionRange(caret, caret);
  resizeDescription();
  dictationTranscript.focus({ preventScroll: true });
});
unifiedMicrophone.addEventListener('click', openUnifiedWindow);

frame.panel.querySelectorAll('.df-team__label').forEach((label, index) => {
  const member = team[index];
  const icon = document.createElement('img');
  icon.src = `assets/system-panel/${member.icon}.svg`;
  icon.alt = member.label;
  label.replaceChildren(icon);
});

canvas.prepend(frame.root);

const dictationToolbar = document.getElementById('dictation-toolbar');
const voiceToolbar = document.getElementById('voice-toolbar');
const dictationTranscript = document.getElementById('dictation-transcript');
const descriptionAfterAudio = document.getElementById('description-after-audio');
const audioRecordingRoot = document.getElementById('audio-recording');
const editorAudioPanel = editorAudio.closest('.editor-audio-panel');
const dictationPreview = document.getElementById('dictation-preview');
const dictationDraft = document.createElement('span');
dictationDraft.className = 'dictation-preview__draft';
const dictationPause = dictationToolbar.querySelector('.dictation-toolbar__pause');
const pauseIcon = dictationPause.querySelector('.tb__icon');
const dictationTimer = dictationPause.querySelector('time');
let inlineAudio;

function splitDescription(widget) {
  const splitAt = dictationTranscript.selectionStart;
  const value = dictationTranscript.value;
  inlineAudio = widget;
  stage.classList.add('demo-stage--inline-audio');
  dictationTranscript.value = value.slice(0, splitAt);
  descriptionAfterAudio.value = value.slice(splitAt);
  descriptionAfterAudio.hidden = !descriptionAfterAudio.value;
  resizeDescription();
}

function joinDescription() {
  if (!inlineAudio) return;
  const splitAt = dictationTranscript.value.length;
  dictationTranscript.value += descriptionAfterAudio.value;
  dictationTranscript.setSelectionRange(splitAt, splitAt);
  descriptionAfterAudio.value = '';
  descriptionAfterAudio.hidden = true;
  stage.classList.remove('demo-stage--inline-audio');
  inlineAudio = undefined;
  resizeDescription();
}

function resizeTextArea(field) {
  field.style.height = '0';
  const borderHeight = field.offsetHeight - field.clientHeight;
  field.style.height = `${field.scrollHeight + borderHeight}px`;
  return field.offsetHeight;
}

function getDescriptionLineBottom() {
  const { value, selectionStart, selectionEnd, selectionDirection, offsetTop, scrollTop } = dictationTranscript;
  const caret = selectionDirection === 'backward' ? selectionStart : selectionEnd;
  const { lineHeight, paddingTop } = getComputedStyle(dictationTranscript);
  const lineHeightPx = parseFloat(lineHeight);
  const paddingTopPx = parseFloat(paddingTop);

  // Measure the full text so that wrapped words retain their original line breaks.
  const mirror = document.createElement('div');
  mirror.className = 'dictation-preview';
  mirror.style.cssText = 'display: block; visibility: hidden;';
  mirror.setAttribute('aria-hidden', 'true');
  const text = document.createTextNode(`${value}\u200b`);
  mirror.append(text);
  stage.append(mirror);

  const range = document.createRange();
  range.setStart(text, caret);
  range.setEnd(text, caret + (value[caret] === '\n' ? 0 : 1));
  const rect = range.getBoundingClientRect();
  const mirrorRect = mirror.getBoundingClientRect();
  const scale = mirrorRect.height / mirror.offsetHeight;
  const lineCenter = (rect.top + rect.height / 2 - mirrorRect.top) / scale - paddingTopPx;
  const line = Math.max(0, Math.floor(lineCenter / lineHeightPx));
  mirror.remove();

  return offsetTop + paddingTopPx + (line + 1) * lineHeightPx - scrollTop;
}

function resizeDescription() {
  if (dictationTranscript.hidden) return;
  let height = resizeTextArea(dictationTranscript);
  if (inlineAudio) {
    height = dictationTranscript.value ? height : 0;
    stage.style.setProperty('--inline-audio-offset', `${height}px`);
    height += inlineAudio.offsetHeight;
    stage.style.setProperty('--after-audio-offset', `${height}px`);
    if (!descriptionAfterAudio.hidden) height += resizeTextArea(descriptionAfterAudio);
  }
  stage.style.setProperty('--dictation-editor-height', `${height}px`);
}

dictationTranscript.addEventListener('input', resizeDescription);
descriptionAfterAudio.addEventListener('input', resizeDescription);
document.fonts.ready.then(resizeDescription);
const audioLayoutResize = new ResizeObserver(() => {
  if (inlineAudio) resizeDescription();
});
audioLayoutResize.observe(audioRecordingRoot);
audioLayoutResize.observe(editorAudioPanel);
new MutationObserver(() => {
  if (inlineAudio === audioRecordingRoot && audioRecordingRoot.hidden) joinDescription();
}).observe(audioRecordingRoot, { attributeFilter: ['hidden'] });

const rawWords = rawText.split(' ');
const processedWords = processedText.split(' ');

const wordInterval = 500;
const processingDuration = 2000;
stage.style.setProperty('--dictation-processing-duration', `${processingDuration}ms`);
let tickTimeout;
let processingTimeout;
let pauseWidthAnimation;
let elapsed = 0;
let runningSince = null;
let dictationSource;
let recordedWordCount = 0;

function writeInsertion({ value, selectionStart, selectionEnd }, text) {
  const before = value.slice(0, selectionStart);
  const after = value.slice(selectionEnd);
  const prefix = text && /\S$/.test(before) ? ' ' : '';
  const suffix = text && /^\S/.test(after) ? ' ' : '';
  dictationTranscript.value = text ? before + prefix + text + suffix + after : value;
  if (dictationTranscript.readOnly) {
    // Keep a measurable insertion point before the first dictated word arrives.
    dictationDraft.textContent = text || '\u200b';
    dictationPreview.replaceChildren(
      before + prefix,
      dictationDraft,
      text ? suffix + after : value.slice(selectionStart)
    );

    const firstLine = dictationDraft.getClientRects()[0];
    const previewRect = dictationPreview.getBoundingClientRect();
    if (firstLine && previewRect.width) {
      const scale = previewRect.width / dictationPreview.offsetWidth;
      const left = dictationPreview.offsetLeft + (firstLine.left - previewRect.left) / scale;
      const { lineHeight, paddingTop } = getComputedStyle(dictationPreview);
      const lineHeightPx = parseFloat(lineHeight);
      const lineCenter = (firstLine.top + firstLine.height / 2 - previewRect.top) / scale;
      const line = Math.max(0, Math.floor((lineCenter - parseFloat(paddingTop)) / lineHeightPx));
      dictationToolbar.style.left = `${left}px`;
      dictationToolbar.style.setProperty('--dictation-line-offset', `${line * lineHeightPx}px`);
    }
  }
  const caret = selectionStart + prefix.length + text.length;
  dictationTranscript.setSelectionRange(caret, text ? caret : selectionEnd);
  resizeDescription();
}

function updateDictation() {
  const activeTime = elapsed + (runningSince === null ? 0 : performance.now() - runningSince);
  const seconds = Math.floor(activeTime / 1000);
  recordedWordCount = Math.min(rawWords.length, Math.floor(activeTime / wordInterval));
  const minutesLabel = String(Math.floor(seconds / 60)).padStart(2, '0');
  const secondsLabel = String(seconds % 60).padStart(2, '0');
  dictationTimer.textContent = `${minutesLabel}:${secondsLabel}`;
  dictationTimer.dateTime = `PT${seconds}S`;
  writeInsertion(dictationSource, rawWords.slice(0, recordedWordCount).join(' '));
  if (runningSince !== null) {
    tickTimeout = setTimeout(updateDictation, wordInterval - activeTime % wordInterval);
  }
}

function setDictationPaused(paused) {
  const animateWidth = dictationPause.classList.contains('is-paused') !== paused
    && !matchMedia('(prefers-reduced-motion: reduce)').matches;
  const previousWidth = animateWidth ? getComputedStyle(dictationPause).width : null;
  pauseWidthAnimation?.cancel();
  clearTimeout(tickTimeout);
  if (paused) elapsed += performance.now() - runningSince;
  runningSince = paused ? null : performance.now();
  dictationPause.setAttribute('aria-label', paused ? 'Продолжить' : 'Пауза');
  dictationPause.classList.toggle('is-paused', paused);
  pauseIcon.textContent = paused ? '\uE9B1' : '\uE639';
  updateDictation();
  if (animateWidth) {
    const width = getComputedStyle(dictationPause).width;
    pauseWidthAnimation = dictationPause.animate([{ width: previousWidth }, { width }], {
      duration: 180,
      easing: 'ease-in-out'
    });
  }
}

function startDictation() {
  elapsed = 0;
  const { value, selectionStart, selectionEnd } = dictationTranscript;
  dictationSource ??= { value, selectionStart, selectionEnd };
  dictationTranscript.readOnly = true;
  dictationToolbar.inert = false;
  voiceToolbar.inert = true;
  setDictationPaused(false);
}

function stopDictation() {
  clearTimeout(tickTimeout);
  pauseWidthAnimation?.cancel();
  runningSince = null;
  dictationToolbar.inert = true;
  voiceToolbar.inert = false;
}

function finishDictation(text = '') {
  stopDictation();
  clearTimeout(processingTimeout);
  dictationTranscript.removeAttribute('aria-busy');
  dictationTranscript.readOnly = false;
  if (dictationSource) writeInsertion(dictationSource, text);
  dictationSource = undefined;
}

const audioRecording = mountAudioRecording(audioRecordingRoot, () => {
  dictationTranscript.focus({ preventScroll: true });
});

dictationButton.addEventListener('click', () => {
  frame.select('voice-input');
  startDictation();
  dictationPause.focus({ preventScroll: true });
});

audioRecordingButton.addEventListener('click', () => {
  frame.select('audio-recording');
  audioRecording.start(audioRecordingButton);
  if (dictationTranscript.value && !audioRecordingRoot.hidden) splitDescription(audioRecordingRoot);
});

dictationPause.addEventListener('click', () => setDictationPaused(runningSince !== null));
dictationToolbar.querySelector('.dictation-toolbar__restart').addEventListener('click', startDictation);
dictationToolbar.querySelector('.dictation-toolbar__confirm').addEventListener('click', () => {
  const wordCount = recordedWordCount;
  if (wordCount === 0) {
    finishDictation();
  } else {
    stopDictation();
    dictationTranscript.setAttribute('aria-busy', 'true');
    const text = processedWords.slice(0, wordCount).join(' ');
    processingTimeout = setTimeout(() => finishDictation(text), processingDuration);
  }
  dictationButton.focus({ preventScroll: true });
});
function clearDictation() {
  finishDictation();
  const microphone = approach === 'unified' ? unifiedMicrophone : dictationButton;
  microphone.focus({ preventScroll: true });
}

dictationToolbar.querySelector('.dictation-toolbar__cancel').addEventListener('click', clearDictation);

showApproach();
