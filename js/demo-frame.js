const canvas = document.getElementById('demo-canvas');
const stage = document.getElementById('demo-stage');

const voiceWindows = stage.querySelectorAll('[data-voice-scenario]');
const insertButtons = stage.querySelectorAll('[data-insert-voice]');
const editorTranscript = document.getElementById('editor-transcript');
const editorAudio = document.getElementById('editor-audio');
editorAudio.querySelector('.editor-audio__transcript').textContent = editorTranscript.textContent;

let insertTrigger;

function showScenario({ scenario }) {
  const compare = scenario === 'compare-audio';
  stage.classList.toggle('demo-stage--compare-audio', compare);
  setDictationScenario(scenario === 'voice-input');
  editorTranscript.hidden = true;
  editorAudio.hidden = !compare;
  editorAudio.disabled = compare;
  for (const button of insertButtons) button.disabled = compare;
  showFormatMenu(false);
  insertTrigger = undefined;
  for (const voiceWindow of voiceWindows) {
    voiceWindow.hidden = !compare && voiceWindow.dataset.voiceScenario !== scenario;
  }
}

function restoreVoiceWindow() {
  const trigger = insertTrigger;
  showScenario(frame.value);
  trigger?.focus({ preventScroll: true });
}

editorTranscript.addEventListener('click', restoreVoiceWindow);
editorAudio.addEventListener('click', restoreVoiceWindow);
stage.querySelector('.editor-audio-toolbar__delete').addEventListener('click', restoreVoiceWindow);

for (const voiceWindow of voiceWindows) {
  const insertLabel = voiceWindow.querySelector('.voice-window__insert');
  const confirm = voiceWindow.querySelector('.voice-window__confirm');
  const choices = voiceWindow.querySelectorAll('input[type="radio"]');

  for (const insert of voiceWindow.querySelectorAll('[data-insert-voice]')) {
    insert.addEventListener('click', () => {
      const selectedAudio = voiceWindow.querySelector('input[value="audio"]:checked, [data-format="audio"][aria-pressed="true"]');
      const output = insert.dataset.insertVoice || (selectedAudio ? 'audio' : 'text');
      const result = output === 'audio' ? editorAudio : editorTranscript;
      insertTrigger = insert;
      voiceWindow.hidden = true;
      result.hidden = false;
      result.focus({ preventScroll: true });
    });
  }

  function selectOutput(value) {
    for (const choice of choices) {
      choice.checked = choice.value === value;
    }
    const caption = value === 'audio' ? 'Вставить аудио' : 'Вставить текст';
    if (insertLabel) insertLabel.textContent = caption;
    if (confirm) confirm.setAttribute('aria-label', caption);
  }

  function restoreOutput() {
    const selectedBlock = voiceWindow.querySelector('.voice-window__radio:checked');
    selectOutput(selectedBlock?.value ?? 'text');
  }

  for (const choice of choices) {
    choice.addEventListener('change', () => selectOutput(choice.value));
  }
  window.addEventListener('pageshow', restoreOutput);
  restoreOutput();
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

menuTrigger.addEventListener('click', () => showFormatMenu(formatMenu.hidden));
menuClose.addEventListener('click', closeFormatMenu);
for (const option of formatOptions) {
  option.addEventListener('click', () => {
    const isAudio = option.dataset.format === 'audio';
    for (const item of formatOptions) {
      item.setAttribute('aria-pressed', String(item === option));
    }
    addButton.setAttribute('aria-label', isAudio ? 'Добавить аудио' : 'Добавить текст');
    addIcon.textContent = option.querySelector('.voice-format-icon').textContent;
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
const commandScenarios = [
  { id: 'voice-input', title: 'Голосовой ввод' },
  { id: 'audio-recording', title: 'Запись аудио' }
];
const scenarioByApproach = {
  unified: windowScenarios[0].id,
  commands: commandScenarios[0].id
};
let approach = 'unified';

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
    { group: 'Варианты окна', items: windowScenarios },
    { group: 'Механика', items: commandScenarios }
  ],
  bottomScenarios: [
    { id: 'compare-audio', title: 'Окно ввода и виджет "Аудио"' }
  ],
  team,
  value: { scenario: scenarioByApproach.unified },
  onChange(value) {
    scenarioByApproach[approach] = value.scenario;
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

const [windowGroup, commandGroup] = Array.from(scenarioCard.querySelectorAll('.df-group'), heading => {
  const group = document.createElement('div');
  group.className = 'demo-scenario-group';
  group.setAttribute('role', 'radiogroup');
  group.setAttribute('aria-label', heading.textContent);
  const options = heading.nextElementSibling;
  heading.before(group);
  group.append(heading, options);
  return group;
});
commandGroup.hidden = true;

const dictationStart = document.createElement('button');
dictationStart.type = 'button';
dictationStart.className = 'btn btn--same btn--style-info btn--size-m demo-dictation-start';
dictationStart.textContent = 'Запустить голосовой ввод';
commandGroup.after(dictationStart);

const comparisonGroup = frame.panel.querySelector('.df-card--bottom');
comparisonGroup.setAttribute('aria-label', 'Сравнение');

const approachGroup = document.getElementById('demo-approach-template').content.firstElementChild.cloneNode(true);
scenarioCard.prepend(approachGroup);
approachGroup.addEventListener('change', event => {
  approach = event.target.value;
  const unified = approach === 'unified';
  stage.classList.toggle('demo-stage--commands', !unified);
  windowGroup.hidden = !unified;
  commandGroup.hidden = unified;
  comparisonGroup.hidden = !unified;
  frame.select(scenarioByApproach[approach]);
});

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
const dictationDraft = dictationTranscript.querySelector('.dictation-transcript__draft');
const dictationResult = dictationTranscript.querySelector('.dictation-transcript__result');
const dictationPause = dictationToolbar.querySelector('.dictation-toolbar__pause');
const pauseCaption = dictationPause.querySelector('.tb__caption');
const pauseIcon = dictationPause.querySelector('.tb__icon');
const dictationTimer = dictationPause.querySelector('time');
const rawWords = 'нужно отрисовать объединенный механизм голосового ввода и отправки аудиосообщения также нужно добавить возможность голосового ввода в любое поле на сайте по шорткату'.split(' ');
const processedWords = editorTranscript.textContent.split(' ');

const wordInterval = 500;
let tickTimeout;
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
  clearTimeout(tickTimeout);
  if (paused) elapsed += performance.now() - runningSince;
  runningSince = paused ? null : performance.now();
  pauseCaption.textContent = paused ? 'Продолжить' : 'Пауза';
  dictationPause.setAttribute('aria-label', pauseCaption.textContent);
  dictationPause.classList.toggle('is-paused', paused);
  pauseIcon.textContent = paused ? '\uE9B1' : '\uE639';
  updateDictation();
}

function startDictation() {
  elapsed = 0;
  dictationResult.hidden = true;
  dictationResult.textContent = '';
  dictationDraft.hidden = false;
  dictationTranscript.hidden = false;
  dictationToolbar.hidden = false;
  setDictationPaused(false);
}

function finishDictation(text = '') {
  clearTimeout(tickTimeout);
  runningSince = null;
  dictationToolbar.hidden = true;
  dictationDraft.hidden = true;
  dictationDraft.textContent = '';
  dictationResult.textContent = text;
  dictationResult.hidden = !text;
  dictationTranscript.hidden = !text;
}

function setDictationScenario(active) {
  finishDictation();
  dictationStart.hidden = !active;
}

dictationStart.addEventListener('click', () => {
  startDictation();
  dictationPause.focus({ preventScroll: true });
});
dictationPause.addEventListener('click', () => setDictationPaused(runningSince !== null));
dictationToolbar.querySelector('.dictation-toolbar__restart').addEventListener('click', startDictation);
dictationToolbar.querySelector('.dictation-toolbar__confirm').addEventListener('click', () => {
  const wordCount = dictationDraft.textContent.match(/\S+/g)?.length ?? 0;
  finishDictation(processedWords.slice(0, wordCount).join(' '));
  dictationStart.focus({ preventScroll: true });
});
function clearDictation() {
  finishDictation();
  dictationStart.focus({ preventScroll: true });
}

dictationToolbar.querySelector('.dictation-toolbar__cancel').addEventListener('click', clearDictation);
dictationResult.addEventListener('click', clearDictation);

showScenario(frame.value);

const toolbar = document.getElementById('voice-toolbar');
toolbar.querySelector('.voice-toolbar__close').addEventListener('click', () => {
  toolbar.hidden = true;
});
