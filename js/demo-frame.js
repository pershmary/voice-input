const canvas = document.getElementById('demo-canvas');
const stage = document.getElementById('demo-stage');

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
    { id: 'standard', title: 'Типовое' },
    {
      group: 'Варианты окна',
      items: [
        { id: 'radio-buttons', title: 'Радиокнопки' },
        { id: 'toggle', title: 'Тумблер' },
        { id: 'two-buttons', title: '2 кнопки' },
        { id: 'split-window', title: 'Окно из двух частей' },
        { id: 'double-button', title: 'Двойная кнопка' }
      ]
    }
  ],
  team,
  value: { scenario: 'standard' }
});

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
