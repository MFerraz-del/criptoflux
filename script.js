const lista = document.getElementById("lista-criptos");
const painel = document.getElementById("painelDetalhes");
const detalhes = document.getElementById("detalhesConteudo");
const fecharBtn = document.getElementById("fecharPainel");
const buscaInput = document.getElementById("busca");

let criptos = [];
let grafico; // variável global para o Chart.js

// Carrega as 50 maiores criptomoedas da API CoinGecko
async function carregarCriptos() {
  try {
    const resposta = await fetch('https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=50&page=1&sparkline=false');
    criptos = await resposta.json();
    exibirCriptos(criptos);
  } catch (erro) {
    console.error("Erro ao buscar dados:", erro);
    lista.innerHTML = "<p style='color:white'>Erro ao carregar criptomoedas.</p>";
  }
}

// Exibe os cards das criptomoedas na tela
function exibirCriptos(listaCriptos) {
  lista.innerHTML = "";

  listaCriptos.forEach(cripto => {
    const card = document.createElement("div");
    card.className = "card-cripto";
    card.innerHTML = `
      <img src="${cripto.image}" alt="${cripto.name}" width="36" style="margin-bottom: 8px;" />
      <h2>${cripto.name} (${cripto.symbol.toUpperCase()})</h2>
      <p>💰 $${cripto.current_price.toLocaleString()}</p>
      <p style="color:${cripto.price_change_percentage_24h >= 0 ? 'lime' : 'red'}">
        ${cripto.price_change_percentage_24h >= 0 ? '🔺' : '🔻'} ${cripto.price_change_percentage_24h.toFixed(2)}%
      </p>
    `;
    card.onclick = () => abrirPainel(cripto);
    lista.appendChild(card);
  });
}

// Abre o painel lateral com detalhes e gráfico da moeda selecionada
function abrirPainel(cripto) {
  detalhes.innerHTML = `
    <h2>${cripto.name} (${cripto.symbol.toUpperCase()})</h2>
    <p><strong>Preço:</strong> $${cripto.current_price.toLocaleString()}</p>
    <p><strong>Variação 24h:</strong> ${cripto.price_change_percentage_24h.toFixed(2)}%</p>
    <p><strong>Rank de mercado:</strong> #${cripto.market_cap_rank}</p>
    <p><strong>Market Cap:</strong> $${cripto.market_cap.toLocaleString()}</p>
    <p><strong>Volume 24h:</strong> $${cripto.total_volume.toLocaleString()}</p>

    <canvas id="graficoCripto" width="350" height="200"></canvas>

    <div class="botoes-periodo">
      <button onclick="carregarGrafico('${cripto.id}', '1h')">1H</button>
      <button onclick="carregarGrafico('${cripto.id}', '24h')">24H</button>
      <button onclick="carregarGrafico('${cripto.id}', '7d')">7D</button>
      <button onclick="carregarGrafico('${cripto.id}', '30d')">30D</button>
      <button onclick="carregarGrafico('${cripto.id}', '1y')">1Y</button>
    </div>
  `;

  painel.classList.add("ativo");
  carregarGrafico(cripto.id, '24h'); // Carrega gráfico padrão 24h ao abrir
}

// Fecha o painel lateral
fecharBtn.onclick = () => painel.classList.remove("ativo");

// Função para carregar o gráfico com dados históricos
async function carregarGrafico(criptoId, periodo) {
  const dias = converterPeriodo(periodo);
  const url = `https://api.coingecko.com/api/v3/coins/${criptoId}/market_chart?vs_currency=usd&days=${dias}`;

  try {
    const resposta = await fetch(url);
    const dados = await resposta.json();

    if (!dados.prices) {
      throw new Error("Dados de preços não disponíveis");
    }

    let precos = dados.prices;
    const agora = Date.now();

    if (periodo === '1h') {
      const umaHoraAtras = agora - (60 * 60 * 1000);
      precos = precos.filter(p => p[0] >= umaHoraAtras);
    } else if (periodo === '24h') {
      const vinteQuatroHorasAtras = agora - (24 * 60 * 60 * 1000);
      precos = precos.filter(p => p[0] >= vinteQuatroHorasAtras);
    } else if (periodo === '7d') {
      const seteDiasAtras = agora - (7 * 24 * 60 * 60 * 1000);
      precos = precos.filter(p => p[0] >= seteDiasAtras);
    } else if (periodo === '30d') {
      const trintaDiasAtras = agora - (30 * 24 * 60 * 60 * 1000);
      precos = precos.filter(p => p[0] >= trintaDiasAtras);
    } else if (periodo === '1y') {
      const noventaDiasAtras = agora - (90 * 24 * 60 * 60 * 1000); // Limite para dados horários na API
      precos = precos.filter(p => p[0] >= noventaDiasAtras);
    }

    const labels = precos.map(p => {
      const data = new Date(p[0]);
      return `${data.getDate()}/${data.getMonth()+1} ${data.getHours()}:${data.getMinutes().toString().padStart(2,'0')}`;
    });
    const valores = precos.map(p => p[1]);

    if (grafico) grafico.destroy();

    const ctx = document.getElementById('graficoCripto').getContext('2d');
    grafico = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: 'Preço em USD',
          data: valores,
          borderColor: '#00ffe1',
          backgroundColor: 'rgba(0, 255, 225, 0.1)',
          fill: true,
          tension: 0.4
        }]
      },
      options: {
        responsive: true,
        scales: {
          y: { beginAtZero: false },
          x: { ticks: { maxRotation: 45, minRotation: 45 } }
        }
      }
    });

  } catch (erro) {
    console.error("Erro ao carregar gráfico:", erro);
  }
}

// Converte o período para número de dias aceito pela API
function converterPeriodo(periodo) {
  switch (periodo) {
    case '1h': return 2;   // mínimo 2 para dados horários
    case '24h': return 2;  // também 2
    case '7d': return 7;
    case '30d': return 30;
    case '1y': return 90;  // máximo para dados horários na API
    default: return 2;
  }
}

// Filtra a lista conforme a busca
buscaInput.addEventListener("input", () => {
  const termo = buscaInput.value.toLowerCase();
  const filtradas = criptos.filter(c =>
    c.name.toLowerCase().includes(termo) ||
    c.symbol.toLowerCase().includes(termo)
  );
  exibirCriptos(filtradas);
});

// Carrega as criptomoedas ao iniciar
carregarCriptos();
