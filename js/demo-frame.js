const canvas = document.getElementById('demo-canvas');
const stage = document.getElementById('demo-stage');

const frame = DemoFrame.mount({
  stage,
  viewport: canvas,
  panelWidth: 280,
  head: {
    title: 'Голосовой ввод',
    version: 'Каркас',
    status: 'В разработке'
  },
  scenarios: [
    { group: 'Сценарии', items: [{ id: 'demo', title: 'Общее демо' }] }
  ],
  value: { scenario: 'demo' }
});

frame.panel.setAttribute('aria-label', 'Системная область');

const info = document.createElement('div');
info.className = 'df-card';
const description = document.createElement('p');
description.className = 'demo-info';
description.textContent = 'Диктовка с вставкой текста или аудио в редактор.';
info.append(description);
frame.panel.append(info);

canvas.prepend(frame.root);
