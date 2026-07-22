// Captura os parâmetros da URL
const urlParams = new URLSearchParams(window.location.search);
const pdfNome = urlParams.get('pdf') || 'fragmentos.pdf';
const titulo = urlParams.get('titulo') || pdfNome.replace('.pdf', '').replace(/-/g, ' ');

const urlPDF = `../livros/${pdfNome}`;

// Estado do Leitor
let pdfDoc = null;
let pageNum = 1;
let pageRendering = false;
let pageNumPending = null;
let scale = 1.3; // Escala padrão de zoom

// Elementos do DOM
const viewer = document.getElementById('viewer');
const tituloLivro = document.getElementById('tituloLivro');
const paginaAtualInput = document.getElementById('paginaAtualInput');
const paginaInfo = document.getElementById('paginaInfo');
const progressBar = document.getElementById('progressBar');

// Define o título no cabeçalho
if (tituloLivro) {
  tituloLivro.textContent = decodeURIComponent(titulo);
}

/**
 * Renderiza a página solicitada no Canvas
 */
function renderPage(num) {
  pageRendering = true;

  pdfDoc.getPage(num).then((page) => {
    viewer.innerHTML = '';

    const viewport = page.getViewport({ scale: scale });
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    const outputScale = window.devicePixelRatio || 1;
    canvas.width = Math.floor(viewport.width * outputScale);
    canvas.height = Math.floor(viewport.height * outputScale);
    canvas.style.width = Math.floor(viewport.width) + "px";
    canvas.style.height = Math.floor(viewport.height) + "px";

    const transform = outputScale !== 1 
      ? [outputScale, 0, 0, outputScale, 0, 0] 
      : null;

    viewer.appendChild(canvas);

    const renderContext = {
      canvasContext: ctx,
      transform: transform,
      viewport: viewport
    };

    const renderTask = page.render(renderContext);

    renderTask.promise.then(() => {
      pageRendering = false;
      if (pageNumPending !== null) {
        renderPage(pageNumPending);
        pageNumPending = null;
      }
    });
  });

  paginaAtualInput.value = num;
  atualizarProgresso(num);
}

/**
 * Fila de renderização
 */
function queueRenderPage(num) {
  if (pageRendering) {
    pageNumPending = num;
  } else {
    renderPage(num);
  }
}

function paginaAnterior() {
  if (pageNum <= 1) return;
  pageNum--;
  queueRenderPage(pageNum);
}

function proximaPagina() {
  if (pageNum >= pdfDoc.numPages) return;
  pageNum++;
  queueRenderPage(pageNum);
}

function atualizarProgresso(num) {
  if (!pdfDoc) return;
  const porcentagem = (num / pdfDoc.numPages) * 100;
  progressBar.style.width = `${porcentagem}%`;
}

// ================= CARREGAMENTO DO DOCUMENTO =================

pdfjsLib.getDocument(urlPDF).promise.then((pdfDoc_) => {
  pdfDoc = pdfDoc_;
  paginaInfo.textContent = `/ ${pdfDoc.numPages}`;
  paginaAtualInput.max = pdfDoc.numPages;

  renderPage(pageNum);
}).catch((err) => {
  if (tituloLivro) tituloLivro.textContent = "Erro ao carregar o livro";
  console.error("Erro ao carregar PDF:", err);
});

// ================= EVENTOS E CONTROLES =================

document.getElementById('paginaAnterior').addEventListener('click', paginaAnterior);
document.getElementById('proximaPagina').addEventListener('click', proximaPagina);

document.getElementById('primeiraPagina').addEventListener('click', () => {
  pageNum = 1;
  queueRenderPage(pageNum);
});

document.getElementById('ultimaPagina').addEventListener('click', () => {
  if (!pdfDoc) return;
  pageNum = pdfDoc.numPages;
  queueRenderPage(pageNum);
});

paginaAtualInput.addEventListener('change', (e) => {
  const val = parseInt(e.target.value);
  if (val >= 1 && val <= pdfDoc.numPages) {
    pageNum = val;
    queueRenderPage(pageNum);
  } else {
    e.target.value = pageNum;
  }
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowRight' || e.key === 'Space') {
    proximaPagina();
  } else if (e.key === 'ArrowLeft') {
    paginaAnterior();
  }
});

const btnModo = document.getElementById('btnModo');
if (btnModo) {
  btnModo.addEventListener('click', () => {
    document.body.classList.toggle('light-mode');
    btnModo.textContent = document.body.classList.contains('light-mode') ? '☀️' : '🌙';
  });
}

const btnTelaCheia = document.getElementById('btnTelaCheia');
if (btnTelaCheia) {
  btnTelaCheia.addEventListener('click', () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  });
}