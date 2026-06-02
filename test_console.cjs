const WebSocket = require('ws');
const http = require('http');

http.get('http://localhost:9222/json', (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    const list = JSON.parse(data);
    const tab = list.find(t => t.url.includes('http://localhost:3000/') && t.type === 'page');
    if (!tab) {
      console.error('Tab not found!');
      return;
    }
    const ws = new WebSocket(tab.webSocketDebuggerUrl);
    ws.on('open', () => {
      const expr = `
        (() => {
          try {
            const savedResult = localStorage.getItem('tb40_result');
            if (!savedResult) return 'No saved result in localStorage';
            const result = JSON.parse(savedResult);
            const { tb40Result } = result.parts.tb40;
            const svgContent = result.parts.tb40.tb40Presentation.pemetaan_tafsir_bakat.file;
            
            const scoreToColor = (score) => {
              score = Math.max(0, Math.min(100, score));
              let startColor = [];
              let endColor = [];
              let interpolationFactor = 0;
              
              if (score <= 50) {
                startColor = [191, 64, 64];
                endColor = [64, 191, 64];
                interpolationFactor = score / 50;
              } else {
                startColor = [64, 191, 64];
                endColor = [64, 64, 191];
                interpolationFactor = (score - 50) / 50;
              }
              
              const interpolatedColor = startColor.map((channel, i) => 
                Math.round(channel + (endColor[i] - channel) * interpolationFactor)
              );
              
              return '#' + interpolatedColor.map(c => c.toString(16).padStart(2, '0')).join('');
            };

            const parser = new DOMParser();
            const doc = parser.parseFromString(svgContent, 'image/svg+xml');
            
            const elements = doc.querySelectorAll('rect, path');
            let matched = 0;
            elements.forEach((el) => {
              const id = el.getAttribute('id');
              if (id && id.includes('.')) {
                const [group, no] = id.split('.');
                const groupResult = tb40Result[group];
                if (groupResult) {
                  const pillar = groupResult.find((p) => String(p.pillar.no) === String(no));
                  if (pillar) {
                    matched++;
                    el.setAttribute('fill', scoreToColor(Number(pillar.score)));
                  }
                }
              }
            });
            
            return 'Matched elements inside expression: ' + matched;
          } catch (e) {
            return 'Error: ' + e.message + '\\n' + e.stack;
          }
        })()
      `;
      const msg = JSON.stringify({
        id: 1,
        method: 'Runtime.evaluate',
        params: { expression: expr }
      });
      ws.on('message', (d) => {
        const resp = JSON.parse(d.toString());
        if (resp.id === 1) {
          console.log(resp.result.result.value);
          ws.close();
        }
      });
      ws.send(msg);
    });
  });
});
