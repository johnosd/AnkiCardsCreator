const assert = require('assert');
const { JSDOM } = require('jsdom');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const contentCode = fs.readFileSync(path.join(__dirname, '..', 'udemy_scraper_QA_extension', 'content.js'), 'utf8');

function getWindow(html) {
  const dom = new JSDOM(html, { url: 'https://example.org' });
  const { window } = dom;
  window.window = window; // ensure window.top === window
  const exposed = contentCode.replace(/}\s*\)\(\);\s*$/, '  window.findCorrectAnswerTexts = findCorrectAnswerTexts;\n  window.findCorrectAnswersInBlock = findCorrectAnswersInBlock;\n})();');
  vm.runInContext(exposed, vm.createContext(window));
  return window;
}

(function testFindCorrectAnswerTextsLocaleEnglish() {
  const html = `
    <div class="result-pane--answer-result-pane--Niazi">
      <div class="answer-result-pane--answer-correct--abc"></div>
      <div id="answer-text">Answer One</div>
    </div>
    <div class="result-pane--answer-result-pane--Niazi">
      <div id="answer-text">Answer Two</div>
    </div>`;
  const window = getWindow(html);
  const result = window.findCorrectAnswerTexts();
  assert.deepStrictEqual(result, ['Answer One']);
})();

(function testFindCorrectAnswerTextsFallbackPortuguese() {
  const html = `
    <div class="result-pane--answer-result-pane--Niazi">
      <span>Resposta incorreta</span>
      <div id="answer-text">Resposta Um</div>
    </div>
    <div class="result-pane--answer-result-pane--Niazi">
      <span>Resposta correta</span>
      <div id="answer-text">Resposta Dois</div>
    </div>`;
  const window = getWindow(html);
  const result = window.findCorrectAnswerTexts();
  assert.deepStrictEqual(result, ['Resposta Dois']);
})();

(function testFindCorrectAnswersInBlockEnglish() {
  const html = `
    <div class="question-result--question-result--LWiOB">
      <div class="result-pane--answer-result-pane--Niazi">
        <div class="answer-result-pane--answer-correct--x"></div>
        <div id="answer-text">Yes</div>
      </div>
      <div class="result-pane--answer-result-pane--Niazi">
        <div id="answer-text">No</div>
      </div>
    </div>`;
  const window = getWindow(html);
  const block = window.document.querySelector('.question-result--question-result--LWiOB');
  const result = window.findCorrectAnswersInBlock(block);
  assert.deepStrictEqual(result, ['Yes']);
})();

(function testFindCorrectAnswersInBlockFallback() {
  const html = `
    <div class="question-result--question-result--LWiOB">
      <div class="result-pane--answer-result-pane--Niazi">
        <span>Resposta correta</span>
        <div id="answer-text">Sim</div>
      </div>
      <div class="result-pane--answer-result-pane--Niazi">
        <span>Resposta incorreta</span>
        <div id="answer-text">Não</div>
      </div>
    </div>`;
  const window = getWindow(html);
  const block = window.document.querySelector('.question-result--question-result--LWiOB');
  const result = window.findCorrectAnswersInBlock(block);
  assert.deepStrictEqual(result, ['Sim']);
})();

console.log('All tests passed.');
