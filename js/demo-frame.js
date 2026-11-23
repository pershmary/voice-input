const canvas = document.getElementById('demo-canvas');
const stage = document.getElementById('demo-stage');

const voiceWindows = stage.querySelectorAll('[data-voice-scenario]');

function showScenario({ scenario }) {
  for (const voiceWindow of voiceWindows) {
    voiceWindow.hidden = voiceWindow.dataset.voiceScenario !== scenario;
  }
}

for (const voiceWindow of voiceWindows) {
  const insertLabel = voiceWindow.querySelector('.voice-window__insert');
  const confirm = voiceWindow.querySelector('.voice-window__confirm');
  const choices = voiceWindow.querySelectorAll('input[type="radio"]');

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
for (const waveform of stage.querySelectorAll('.voice-window__waveform')) {
  const bars = Array.from({ length: 209 }, (_, index) => {
    const bar = document.createElement('span');
    bar.style.height = `${waveformPeaks[index] ?? 2}px`;
    return bar;
  });
  waveform.append(...bars);
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
    {
      group: 'Варианты окна',
      items: [
        { id: 'radio-buttons', title: 'Радиокнопки' },
        { id: 'menu-button', title: 'Кнопка с меню в 3-х точках' },
        { id: 'toggle', title: 'Тумблер' },
        { id: 'two-buttons', title: '2 кнопки' },
        { id: 'split-window', title: 'Окно из двух частей' },
        { id: 'double-button', title: 'Двойная кнопка' }
      ]
    }
  ],
  team,
  value: { scenario: 'radio-buttons' },
  onChange: showScenario
});

showScenario(frame.value);

const headDescription = document.createElement('p');
headDescription.className = 'demo-head-description';
headDescription.textContent = 'Голосовой ввод позволяет набирать текст голосом в БТР и полях ввода. В БТР пользователь может решить, в каком виде сохранить набранный текст: аудио или обычный текст';
frame.head.append(headDescription);

frame.panel.setAttribute('aria-label', 'Системная область');
frame.panel.querySelector('[role="radiogroup"]').setAttribute('aria-label', 'Варианты окна');

frame.panel.querySelectorAll('.df-team__label').forEach((label, index) => {
  const member = team[index];
  const icon = document.createElement('img');
  icon.src = `assets/system-panel/${member.icon}.svg`;
  icon.alt = member.label;
  label.replaceChildren(icon);
});

canvas.prepend(frame.root);

const toolbar = document.getElementById('voice-toolbar');
toolbar.querySelector('.voice-toolbar__close').addEventListener('click', () => {
  toolbar.hidden = true;
});
