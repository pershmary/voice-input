const canvas = document.getElementById('demo-canvas');
const stage = document.getElementById('demo-stage');

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

function closeUnifiedWindow() {
  clearTimeout(unifiedProcessingTimeout);
  for (const voiceWindow of voiceWindows) {
    voiceWindow.hidden = true;
    voiceWindow.removeAttribute('data-processing');
    voiceWindow.querySelector('.voice-window__transcript input')?.removeAttribute('disabled');
  }
  showFormatMenu(false);
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
  if (compare) {
    for (const voiceWindow of voiceWindows) voiceWindow.hidden = false;
  }
}

function openUnifiedWindow() {
  const voiceWindow = voiceWindows.find(window => window.dataset.voiceScenario === windowScenario);
  if (!voiceWindow || unifiedMicrophone.getAttribute('aria-expanded') === 'true') return;
  finishDictation();
  selectWindowOutput(voiceWindow, 'text');
  selectMenuFormat(formatOptions[0]);
  voiceWindow.hidden = false;
  unifiedMicrophone.setAttribute('aria-expanded', 'true');
  voiceWindow.focus({ preventScroll: true });
}

function dismissUnifiedWindow() {
  if (frame.value.scenario === 'compare-audio') return;
  closeUnifiedWindow();
  unifiedMicrophone.focus({ preventScroll: true });
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
  voiceWindow.querySelector('.voice-window__confirm')?.setAttribute('aria-label', caption);
}

const clearEditorAudioSelection = bindAudioWidgetSelection(
  editorAudio, removeUnifiedAudio, () => !editorAudio.hidden && !editorAudio.disabled
);
stage.querySelector('.editor-audio-toolbar__delete').addEventListener('click', removeUnifiedAudio);
for (const voiceWindow of voiceWindows) {
  voiceWindow.tabIndex = -1;
  voiceWindow.querySelector('.voice-window__toolbar').prepend(processingControls.cloneNode(true));
  voiceWindow.querySelector('.voice-window__dismiss').addEventListener('click', dismissUnifiedWindow);
  const skipProcessing = voiceWindow.querySelector('.voice-window__skip');
  skipProcessing.addEventListener('click', () => finishUnifiedProcessing(voiceWindow, rawText));

  for (const insert of voiceWindow.querySelectorAll('[data-insert-voice]')) {
    insert.addEventListener('click', () => {
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
        showFormatMenu(false);
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
    bar.style.height = `${peaks[index] ?? 2}px`;
    return bar;
  });
  waveform.append(...bars);
}

const menuGroup = stage.querySelector('.voice-window__menu-group');
const menuTrigger = menuGroup.querySelector('.voice-window__menu-trigger');
const formatMenu = menuGroup.querySelector('.voice-window__menu');
const addButton = menuGroup.querySelector('.voice-window__add');
const addIcon = addButton.querySelector('.voice-format-icon');
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

function closeFormatMenu() {
  showFormatMenu(false);
  menuTrigger.focus({ preventScroll: true });
}

function selectMenuFormat(option) {
  const isAudio = option.dataset.format === 'audio';
  for (const item of formatOptions) {
    item.setAttribute('aria-pressed', String(item === option));
  }
  addButton.setAttribute('aria-label', isAudio ? 'Добавить аудио' : 'Добавить текст');
  addIcon.textContent = option.querySelector('.voice-format-icon').textContent;
}

menuTrigger.addEventListener('click', () => showFormatMenu(formatMenu.hidden));
menuClose.addEventListener('click', closeFormatMenu);
for (const option of formatOptions) {
  option.addEventListener('click', () => {
    selectMenuFormat(option);
    closeFormatMenu();
  });
}
document.addEventListener('click', event => {
  if (!formatMenu.hidden && !menuGroup.contains(event.target)) showFormatMenu(false);
});
menuGroup.addEventListener('keydown', event => {
  if (event.key !== 'Escape' || formatMenu.hidden) return;
  event.preventDefault();
  closeFormatMenu();
});

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
    if (approach === 'unified') windowScenario = value.scenario;
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
comparisonGroup.setAttribute('aria-label', 'Сравнение');

const panelOptions = document.getElementById('demo-panel-options-template').content.cloneNode(true);
const [approachGroup, editorStateGroup] = panelOptions.querySelectorAll('[role="radiogroup"]');
const unifiedMicrophone = stage.querySelector('.voice-toolbar__microphone');
const dictationButton = stage.querySelector('[data-voice-command="voice-input"]');
const audioRecordingButton = stage.querySelector('[data-voice-command="audio-recording"]');
scenarioCard.append(panelOptions, windowGroup);

function showApproach() {
  approach = approachGroup.querySelector('input:checked').value;
  const unified = approach === 'unified';
  unifiedMicrophone.hidden = !unified;
  dictationButton.hidden = unified;
  audioRecordingButton.hidden = unified;
  editorStateGroup.hidden = unified;
  windowGroup.hidden = !unified;
  comparisonGroup.hidden = !unified;
  frame.select(unified ? windowScenario : null);
}

approachGroup.addEventListener('change', showApproach);
editorStateGroup.addEventListener('change', () => {
  frame.select(null);
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
const pauseCaption = dictationPause.querySelector('.tb__caption');
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
    dictationDraft.textContent = text;
    if (text) {
      dictationPreview.replaceChildren(before + prefix, dictationDraft, suffix + after);
    } else {
      dictationPreview.textContent = value;
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
  pauseCaption.textContent = paused ? 'Продолжить' : 'Пауза';
  dictationPause.setAttribute('aria-label', pauseCaption.textContent);
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
