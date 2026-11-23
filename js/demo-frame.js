const canvas = document.getElementById('demo-canvas');
const stage = document.getElementById('demo-stage');

const frame = DemoFrame.mount({
  stage,
  viewport: canvas,
  headHeight: 100,
  panelWidth: 280,
  head: {
    title: 'Голосовой ввод',
    version: '27.xxxx',
    status: 'Не показали'
  },
  scenarios: [
    { group: 'Сценарии', items: [{ id: 'demo', title: 'Общее демо' }] }
  ],
  value: { scenario: 'demo' }
});

const headDescription = document.createElement('p');
headDescription.className = 'demo-head-description';
headDescription.textContent = 'Голосовой ввод позволяет набирать текст голосом в БТР и полях ввода. В БТР пользователь может решить, в каком виде сохранить набранный текст: аудио или обычный текст';
frame.head.append(headDescription);

frame.panel.setAttribute('aria-label', 'Системная область');

const info = document.createElement('div');
info.className = 'df-card';
const description = document.createElement('p');
description.className = 'demo-info';
description.textContent = 'Диктовка с вставкой текста или аудио в редактор.';
info.append(description);
frame.panel.append(info);

canvas.prepend(frame.root);

const toolbar = document.getElementById('voice-toolbar');
toolbar.querySelector('.voice-toolbar__close').addEventListener('click', () => {
  toolbar.hidden = true;
});
