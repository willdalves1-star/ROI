import { initializeApp } from "https://www.gstatic.com/firebasejs/11.7.1/firebase-app.js";
import { getDatabase, ref, push, onValue, update, remove } from "https://www.gstatic.com/firebasejs/11.7.1/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyBnKmIAnR80BzMv9oVeKWgF_ZQVZbdAfew",
  authDomain: "crm23-7beb7.firebaseapp.com",
  databaseURL: "https://crm23-7beb7-default-rtdb.firebaseio.com",
  projectId: "crm23-7beb7",
  storageBucket: "crm23-7beb7.appspot.com",
  messagingSenderId: "219795920284",
  appId: "1:219795920284:web:9817ab18b0f098e8f4e459",
  measurementId: "G-ZLELD4MVLF"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const clientesRef = ref(db, 'clientes');

const addClienteBtn = document.getElementById('addClienteBtn');
const modal = document.getElementById('modalCliente');
const cancelarBtn = document.getElementById('cancelarBtn');
const salvarBtn = document.getElementById('salvarClienteBtn');
const listaClientes = document.getElementById('listaClientes');
const totalValorEl = document.getElementById('totalValor');
const filtroStatus = document.getElementById('filtroStatus');
const filtroServico = document.getElementById('filtroServico');
const filtroPrioridade = document.getElementById('filtroPrioridade');
const buscarCliente = document.getElementById('buscarCliente');
const exportarBtn = document.getElementById('exportarBtn');
const importarInput = document.getElementById('importarInput');
const totalRealizandoEl = document.getElementById('totalRealizando');
const totalEntregueEl = document.getElementById('totalEntregue');
const totalClientesEl = document.getElementById('totalClientes');

let clientes = [];
let editando = false;
let clienteIdAtual = null;

carregarClientes();
setupEventListeners();

function carregarClientes() {
  onValue(clientesRef, (snapshot) => {
    const data = snapshot.val();
    clientes = data ? Object.entries(data).map(([id, cliente]) => ({ id, ...cliente })) : [];
    atualizarLista();
  });
}

function setupEventListeners() {
  addClienteBtn.onclick = abrirModalNovoCliente;
  cancelarBtn.onclick = fecharModal;
  salvarBtn.onclick = salvarCliente;
  filtroStatus.onchange = atualizarLista;
  filtroServico.onchange = atualizarLista;
  filtroPrioridade.onchange = atualizarLista;
  buscarCliente.oninput = atualizarLista;
  exportarBtn.onclick = exportarClientes;
  importarInput.onchange = importarClientes;
}

function atualizarLista() {
  listaClientes.innerHTML = '';
  let totalValor = 0;
  let totalRealizando = 0;
  let totalEntregue = 0;
  let totalExibido = 0;

  const fs = filtroStatus.value;
  const ft = filtroServico.value;
  const fp = filtroPrioridade.value;
  const busca = buscarCliente.value.toLowerCase().trim();

  let filtrados = clientes.filter(cliente => {
    if (
      (fs && cliente.status !== fs) ||
      (ft && cliente.tipo !== ft) ||
      (busca &&
        !cliente.nome.toLowerCase().includes(busca) &&
        !cliente.empresa.toLowerCase().includes(busca))
    ) return false;
    return true;
  });

  if (fp) {
    const prioridadeOrdem = { 'alta': 1, 'média': 2, 'baixa': 3 };
    filtrados.sort((a, b) => (prioridadeOrdem[a.prioridade] || 4) - (prioridadeOrdem[b.prioridade] || 4));
  }

  filtrados.forEach(cliente => {
    totalValor += cliente.valor || 0;
    totalExibido++;
    if (cliente.status === 'realizando') totalRealizando++;
    if (cliente.status === 'entregue') totalEntregue++;

    const iniciais = (cliente.nome || '?')
      .split(' ')
      .map(p => p[0])
      .join('')
      .toUpperCase();

    const fundoStatus = cliente.status === 'entregue' ? 'bg-[#beffd1]' :
                        cliente.status === 'realizando' ? 'bg-[#fee2e2]' : 'bg-white';

    let prioridadeClasse = 'border-l-blue-600';
    if (cliente.prioridade === 'alta') prioridadeClasse = 'border-l-red-600';
    else if (cliente.prioridade === 'média') prioridadeClasse = 'border-l-yellow-500';

    const card = document.createElement('div');
    card.className = `${fundoStatus} border-l-8 ${prioridadeClasse} rounded-lg shadow-sm flex items-center justify-between p-4 hover:shadow-md transition`;

    card.innerHTML = `
      <div class="flex items-center gap-4">
        <div class="w-12 h-12 flex items-center justify-center rounded-full bg-blue-100 text-blue-700 font-bold text-lg">
          ${iniciais}
        </div>
        <div>
          <p class="font-semibold text-blue-800">${cliente.nome || 'Sem nome'}</p>
          <p class="text-sm text-gray-500">${cliente.contato || '-'}</p>
          <div class="flex gap-2 mt-2">
            <button class="btn-edit text-xs px-2 py-1 bg-indigo-500 text-white rounded" data-id="${cliente.id}">✏️</button>
            <a class="btn-whatsapp text-xs px-2 py-1 bg-green-500 text-white rounded" href="https://wa.me/${(cliente.contato || '').replace(/\D/g, '')}" target="_blank">📱</a>
            <button class="btn-delete text-xs px-2 py-1 bg-red-500 text-white rounded" data-id="${cliente.id}">🗑️</button>
          </div>
        </div>
      </div>
      <div class="text-right">
        <p class="text-sm text-gray-600">${cliente.tipo || '-'}</p>
        <p class="text-lg font-bold text-green-600">R$ ${(cliente.valor || 0).toFixed(2)}</p>
      </div>
    `;

    listaClientes.appendChild(card);
  });

  document.querySelectorAll('.btn-edit').forEach(btn => {
    btn.addEventListener('click', () => editarCliente(btn.dataset.id));
  });

  document.querySelectorAll('.btn-delete').forEach(btn => {
    btn.addEventListener('click', () => excluirCliente(btn.dataset.id));
  });

  totalValorEl.textContent = `R$ ${totalValor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
  totalRealizandoEl.textContent = totalRealizando;
  totalEntregueEl.textContent = totalEntregue;
  totalClientesEl.textContent = totalExibido;
}

function abrirModalNovoCliente() {
  limparFormulario();
  editando = false;
  clienteIdAtual = null;
  modal.classList.remove('hidden');
  modal.classList.add('flex');
}

function fecharModal() {
  modal.classList.add('hidden');
}

function salvarCliente() {
  const cliente = obterDadosFormulario();
  if (!cliente.nome || !cliente.contato) {
    alert("Nome e contato são obrigatórios!");
    return;
  }

  if (editando) {
    update(ref(db, `clientes/${clienteIdAtual}`), cliente).then(fecharModal);
  } else {
    push(clientesRef, cliente).then(fecharModal);
  }
}

function editarCliente(id) {
  const cliente = clientes.find(c => c.id === id);
  if (cliente) {
    preencherFormulario(cliente);
    editando = true;
    clienteIdAtual = id;
    modal.classList.remove('hidden');
    modal.classList.add('flex');
  }
}

function excluirCliente(id) {
  if (confirm("Deseja excluir este cliente?")) {
    remove(ref(db, `clientes/${id}`));
  }
}

function obterDadosFormulario() {
  return {
    nome: document.getElementById('nomeCliente').value,
    empresa: document.getElementById('empresaCliente').value,
    contato: document.getElementById('contatoCliente').value,
    valor: parseFloat(document.getElementById('valorCliente').value) || 0,
    tipo: document.getElementById('tipoServico').value,
    prioridade: document.getElementById('prioridadeCliente').value,
    status: document.getElementById('statusCliente').value,
    data: document.getElementById('dataCriacao').value,
    obs: document.getElementById('obsCliente').value
  };
}

function preencherFormulario(cliente) {
  document.getElementById('nomeCliente').value = cliente.nome || '';
  document.getElementById('empresaCliente').value = cliente.empresa || '';
  document.getElementById('contatoCliente').value = cliente.contato || '';
  document.getElementById('valorCliente').value = cliente.valor || '';
  document.getElementById('tipoServico').value = cliente.tipo || '';
  document.getElementById('prioridadeCliente').value = cliente.prioridade || 'baixa';
  document.getElementById('statusCliente').value = cliente.status || 'realizando';
  document.getElementById('dataCriacao').value = cliente.data || '';
  document.getElementById('obsCliente').value = cliente.obs || '';
}

function limparFormulario() {
  document.querySelectorAll('#modalCliente input, #modalCliente select, #modalCliente textarea')
    .forEach(el => el.value = '');
}

function exportarClientes() {
  const blob = new Blob([JSON.stringify(clientes, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `clientes-wa-${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function importarClientes(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (event) => {
    try {
      const dados = JSON.parse(event.target.result);
      if (!Array.isArray(dados)) throw new Error('Formato inválido');

      if (confirm(`Importar ${dados.length} clientes?`)) {
        dados.forEach(c => {
          const { id, ...semId } = c;
          push(clientesRef, semId);
        });
      }
    } catch (err) {
      alert(`Erro: ${err.message}`);
    }
    e.target.value = '';
  };
  reader.readAsText(file);
}
