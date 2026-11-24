const canvas = document.getElementById('demo-canvas');
const stage = document.getElementById('demo-stage');

const voiceWindows = [...stage.querySelectorAll('[data-voice-scenario]')];
const insertButtons = stage.querySelectorAll('[data-insert-voice]');
const editorAudio = document.getElementById('editor-audio');
const processingControls = document.getElementById('voice-processing-controls').content;
const rawText = voiceWindows[0].querySelector('.voice-window__text').textContent.trim();
const processedText = 'Нужно отрисовать объединенный механизм голосового ввода и отправки аудиосообщения. Также нужно добавить возможность голосового ввода в любое поле на сайте по шорткату';
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
  showVoiceLaunchMenu(false);
  audioRecording.clear();
  closeUnifiedWindow();
  const compare = scenario === 'compare-audio';
  stage.classList.toggle('demo-stage--compare-audio', compare);
  finishDictation();
  dictationTranscript.hidden = compare;
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
  editorAudio.hidden = true;
  dictationTranscript.hidden = false;
  unifiedMicrophone.focus({ preventScroll: true });
}

function finishUnifiedProcessing(voiceWindow, text) {
  const restoreFocus = voiceWindow.contains(document.activeElement);
  closeUnifiedWindow();
  finishDictation(text);
  if (restoreFocus) dictationResult.focus({ preventScroll: true });
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

editorAudio.addEventListener('click', removeUnifiedAudio);
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
        dictationTranscript.hidden = true;
        editorAudio.hidden = false;
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
const approachGroup = panelOptions.querySelector('[role="radiogroup"]');
const unifiedMicrophone = stage.querySelector('.voice-toolbar__microphone');
const voiceLaunch = stage.querySelector('.voice-launch');
const voiceLaunchMain = voiceLaunch.querySelector('.voice-launch__main');
const voiceLaunchToggle = voiceLaunch.querySelector('.voice-launch__toggle');
const voiceLaunchMenu = voiceLaunch.querySelector('.voice-launch__menu');
const voiceLaunchOptions = voiceLaunchMenu.querySelectorAll('[data-command]');
let voiceLaunchCommand = 'voice-input';
scenarioCard.append(panelOptions, windowGroup);

function showApproach() {
  approach = approachGroup.querySelector('input:checked').value;
  const unified = approach === 'unified';
  unifiedMicrophone.hidden = !unified;
  voiceLaunch.hidden = unified;
  windowGroup.hidden = !unified;
  comparisonGroup.hidden = !unified;
  frame.select(unified ? windowScenario : null);
}

approachGroup.addEventListener('change', showApproach);
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
const dictationTranscript = document.getElementById('dictation-transcript');
const dictationPlaceholder = dictationTranscript.querySelector('.dictation-transcript__placeholder');
const dictationDraft = dictationTranscript.querySelector('.dictation-transcript__draft');
const dictationResult = dictationTranscript.querySelector('.dictation-transcript__result');
const dictationPause = dictationToolbar.querySelector('.dictation-toolbar__pause');
const pauseCaption = dictationPause.querySelector('.tb__caption');
const pauseIcon = dictationPause.querySelector('.tb__icon');
const dictationTimer = dictationPause.querySelector('time');
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

function updateDictation() {
  const activeTime = elapsed + (runningSince === null ? 0 : performance.now() - runningSince);
  const seconds = Math.floor(activeTime / 1000);
  const wordCount = Math.floor(activeTime / wordInterval);
  const minutesLabel = String(Math.floor(seconds / 60)).padStart(2, '0');
  const secondsLabel = String(seconds % 60).padStart(2, '0');
  dictationTimer.textContent = `${minutesLabel}:${secondsLabel}`;
  dictationTimer.dateTime = `PT${seconds}S`;
  dictationDraft.textContent = rawWords.slice(0, wordCount).join(' ');
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
  dictationPlaceholder.hidden = true;
  dictationResult.hidden = true;
  dictationResult.textContent = '';
  dictationDraft.hidden = false;
  dictationToolbar.hidden = false;
  setDictationPaused(false);
}

function stopDictation() {
  clearTimeout(tickTimeout);
  pauseWidthAnimation?.cancel();
  runningSince = null;
  dictationToolbar.hidden = true;
}

function finishDictation(text = '') {
  stopDictation();
  clearTimeout(processingTimeout);
  dictationTranscript.removeAttribute('aria-busy');
  dictationDraft.hidden = true;
  dictationDraft.textContent = '';
  dictationResult.textContent = text;
  dictationResult.hidden = !text;
  dictationPlaceholder.hidden = Boolean(text);
}

const audioRecording = mountAudioRecording(document.getElementById('audio-recording'));

function launchVoiceCommand() {
  frame.select(voiceLaunchCommand);
  if (voiceLaunchCommand === 'voice-input') {
    startDictation();
    dictationPause.focus({ preventScroll: true });
  } else {
    audioRecording.start(voiceLaunchMain);
  }
}

function showVoiceLaunchMenu(show) {
  voiceLaunchMenu.hidden = !show;
  voiceLaunchToggle.setAttribute('aria-expanded', String(show));
  if (show) voiceLaunchOptions[0].focus({ preventScroll: true });
}

function dismissVoiceLaunchMenu() {
  showVoiceLaunchMenu(false);
  voiceLaunchToggle.focus({ preventScroll: true });
}

voiceLaunchMain.addEventListener('click', launchVoiceCommand);
voiceLaunchToggle.addEventListener('click', () => showVoiceLaunchMenu(voiceLaunchMenu.hidden));
voiceLaunchMenu.querySelector('.voice-launch__dismiss').addEventListener('click', dismissVoiceLaunchMenu);

for (const option of voiceLaunchOptions) {
  option.addEventListener('click', () => {
    voiceLaunchCommand = option.dataset.command;
    voiceLaunchMain.setAttribute('aria-label', option.querySelector('.tb__caption').textContent);
    voiceLaunchMain.replaceChildren(option.querySelector('.tb__icon').cloneNode(true));
    voiceLaunchMain.focus({ preventScroll: true });
    launchVoiceCommand();
  });
}

document.addEventListener('click', event => {
  if (!voiceLaunchMenu.hidden && !voiceLaunch.contains(event.target)) showVoiceLaunchMenu(false);
});
voiceLaunch.addEventListener('keydown', event => {
  if (event.key !== 'Escape' || voiceLaunchMenu.hidden) return;
  event.preventDefault();
  dismissVoiceLaunchMenu();
});
dictationPause.addEventListener('click', () => setDictationPaused(runningSince !== null));
dictationToolbar.querySelector('.dictation-toolbar__restart').addEventListener('click', startDictation);
dictationToolbar.querySelector('.dictation-toolbar__confirm').addEventListener('click', () => {
  const wordCount = dictationDraft.textContent.match(/\S+/g)?.length ?? 0;
  if (wordCount === 0) {
    finishDictation();
  } else {
    stopDictation();
    dictationTranscript.setAttribute('aria-busy', 'true');
    const text = processedWords.slice(0, wordCount).join(' ');
    processingTimeout = setTimeout(() => finishDictation(text), processingDuration);
  }
  voiceLaunchMain.focus({ preventScroll: true });
});
function clearDictation() {
  finishDictation();
  const microphone = approach === 'unified' ? unifiedMicrophone : voiceLaunchMain;
  microphone.focus({ preventScroll: true });
}

dictationToolbar.querySelector('.dictation-toolbar__cancel').addEventListener('click', clearDictation);
dictationResult.addEventListener('click', clearDictation);

showApproach();
