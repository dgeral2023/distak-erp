const titles={dashboard:'Dashboard',clientes:'Clientes',obras:'Obras',orcamentos:'Orçamentos',custos:'Custos e Margem',funcionarios:'Funcionários',documentos:'Relatórios Técnicos',cliente:'Portal Cliente'};
function login(){document.getElementById('login').classList.add('hidden');document.getElementById('app').classList.remove('hidden');show('dashboard')}
function logout(){document.getElementById('app').classList.add('hidden');document.getElementById('login').classList.remove('hidden')}
function show(id){document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));document.getElementById(id).classList.add('active');document.getElementById('pageTitle').textContent=titles[id]||'DISTAK ERP'}
if('serviceWorker' in navigator){navigator.serviceWorker.register('service-worker.js').catch(()=>{})}
