const WebSocket = require('ws');
const fs = require('fs');
const http = require('http');

function getPageInfo() {
  return new Promise((resolve, reject) => {
    http.get('http://localhost:9222/json', (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const list = JSON.parse(data);
          // Find the active TanStack Start / local 3000 tab
          const tab = list.find(t => t.url.includes('http://localhost:3000/') && t.type === 'page');
          if (tab) {
            resolve(tab);
          } else {
            reject(new Error('Tab http://localhost:3000/ not found. Make sure Chrome has it open.'));
          }
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

function send(ws, method, params = {}) {
  return new Promise((resolve) => {
    const id = Math.floor(Math.random() * 100000);
    const message = JSON.stringify({ id, method, params });
    const onMessage = (data) => {
      const response = JSON.parse(data.toString());
      if (response.id === id) {
        ws.removeListener('message', onMessage);
        resolve(response.result);
      }
    };
    ws.on('message', onMessage);
    ws.send(message);
  });
}

const delay = ms => new Promise(res => setTimeout(res, ms));

async function run() {
  console.log('Fetching active Chrome remote debugging pages...');
  const tab = await getPageInfo();
  console.log(`Found target page: "${tab.title}"`);
  console.log(`Connecting to WebSocket: ${tab.webSocketDebuggerUrl}`);
  
  const ws = new WebSocket(tab.webSocketDebuggerUrl);
  
  ws.on('open', async () => {
    try {
      console.log('Connected! Enabling Page, Runtime and Input domains...');
      await send(ws, 'Page.enable');
      await send(ws, 'Runtime.enable');

      console.log('Navigating to homepage http://localhost:3000/ to start test clean...');
      await send(ws, 'Page.navigate', { url: 'http://localhost:3000/' });
      await delay(1500);

      console.log('Step 1: Simulating keyboard typing using CDP Input domain...');
      
      // Populate Full Name using React prototype descriptor setter
      await send(ws, 'Runtime.evaluate', { expression: `
        (() => {
          const input = document.getElementById('fullName');
          if (input) {
            const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
              window.HTMLInputElement.prototype,
              "value"
            ).set;
            nativeInputValueSetter.call(input, 'Abu Hafizh');
            input.dispatchEvent(new Event('input', { bubbles: true }));
            input.dispatchEvent(new Event('change', { bubbles: true }));
            return true;
          }
          return false;
        })()
      ` });
      await delay(200);

      // Nickname is automatically pre-selected to "Abu" from the full name tokens!
      await delay(200);

      // Get coordinates of birthDate button and dispatch a real mouse click
      const rect = await send(ws, 'Runtime.evaluate', { expression: `
        (() => {
          const el = document.getElementById('birthDate');
          if (!el) return null;
          const r = el.getBoundingClientRect();
          return { x: Math.round(r.left + r.width/2), y: Math.round(r.top + r.height/2) };
        })()
      ` });
      
      if (rect.result && rect.result.value) {
        const { x, y } = rect.result.value;
        console.log(`Simulating hardware click on birthDate button at coordinates: x=${x}, y=${y}`);
        await send(ws, 'Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 });
        await send(ws, 'Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 });
      } else {
        console.log('Fallback: Click birthDate via JS click()');
        await send(ws, 'Runtime.evaluate', { expression: `document.getElementById('birthDate').click()` });
      }
      await delay(800);

      // Select a day from the Calendar grid (excluding outside days to prevent calendar page navigations)
      const clickRes = await send(ws, 'Runtime.evaluate', { expression: `
        (() => {
          const btn = document.querySelector('td:not(.rdp-outside):not(.day-outside) button:not([disabled])') ||
                      document.querySelector('.rdp-month_grid button:not([disabled])') ||
                      document.querySelector('.rdp-day_button:not([disabled])') ||
                      document.querySelector('.rdp-day_button');
          if (btn) {
            btn.click();
            return 'Clicked button: class=\"' + btn.className + '\" text=\"' + btn.innerText + '\"';
          }
          return 'No button found';
        })()
      ` });
      console.log('CDP Day Selection:', clickRes.result.value);
      await delay(300);

      console.log('Step 2: Submitting registration form...');
      await send(ws, 'Runtime.evaluate', { 
        expression: `document.querySelector('button[type="submit"]').click()` 
      });

      console.log('Waiting for route transition to /test and questions to finish loading...');
      let loaded = false;
      for (let i = 0; i < 20; i++) {
        const check = await send(ws, 'Runtime.evaluate', { 
          expression: `document.querySelectorAll('input[type="range"]').length > 0` 
        });
        if (check.result.value === true) {
          loaded = true;
          break;
        }
        await delay(500);
      }
      
      if (!loaded) {
        throw new Error('Assessment questions did not load within 10 seconds.');
      }
      console.log('Assessment sliders loaded successfully!');

      // We will loop through the 5 pages of the wizard stepper
      for (let page = 0; page < 5; page++) {
        console.log(`Step 3: Stepper Page ${page + 1} - Setting range slider inputs...`);
        const slideScript = `
          (() => {
            function setReactInputValue(input, value) {
              const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
                window.HTMLInputElement.prototype,
                "value"
              ).set;
              nativeInputValueSetter.call(input, value);
              input.dispatchEvent(new Event("input", { bubbles: true }));
              input.dispatchEvent(new Event("change", { bubbles: true }));
            }

            const sliders = document.querySelectorAll('input[type="range"]');
            if (sliders.length === 0) return false;
            
            sliders.forEach((slider, idx) => {
              const randomVal = 70 + Math.floor(Math.sin(idx + ${page}) * 20) + (idx % 5) * 2;
              const val = Math.min(100, Math.max(0, randomVal));
              setReactInputValue(slider, String(val));
            });
            return true;
          })()
        `;
        
        const slideRes = await send(ws, 'Runtime.evaluate', { expression: slideScript });
        console.log(`Sliders set on page ${page + 1}:`, slideRes.result.value);

        if (page < 4) {
          console.log('Clicking "Lanjut" button...');
          await send(ws, 'Runtime.evaluate', { 
            expression: `document.querySelectorAll('button')[1].click()` 
          });
          await delay(1000);
        } else {
          console.log('Step 4: Submitting final assessment for calculations...');
          await send(ws, 'Runtime.evaluate', { 
            expression: `document.querySelector('button.bg-primary').click()` 
          });
        }
      }

      console.log('Waiting for API calculations and transition to /result...');
      // Allow ample time for calculation steps (7 seconds)
      await delay(7000);

      console.log('Step 5: Capturing high-quality screenshot of result page...');
      const screenshotRes = await send(ws, 'Page.captureScreenshot', { format: 'png', quality: 80 });
      const imgBuffer = Buffer.from(screenshotRes.data, 'base64');
      
      const screenshotPath = '/home/abuhafi/.gemini/antigravity-ide/brain/c24e1355-11e6-45eb-8ab0-eec8d6ee71c4/screenshot_result.png';
      fs.writeFileSync(screenshotPath, imgBuffer);
      console.log(`Screenshot saved successfully to ${screenshotPath}!`);

      ws.close();
    } catch (err) {
      console.error('Automation error:', err);
      ws.close();
    }
  });

  ws.on('error', (err) => {
    console.error('Socket error:', err);
  });
}

run().catch(console.error);
