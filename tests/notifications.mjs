import {store} from "../assets/js/core/store.js";
import {buildAlerts} from "../assets/js/modules/v3.js";

const check=(condition,message)=>{if(!condition){console.error(`FALHA: ${message}`);process.exit(1)}};
const local=new Date();local.setMinutes(local.getMinutes()-local.getTimezoneOffset());
const today=local.toISOString().slice(0,10);
const yesterday=new Date(`${today}T12:00:00`);yesterday.setDate(yesterday.getDate()-1);
const late=yesterday.toISOString().slice(0,10);

Object.assign(store,{
  profile:{id:"admin",role:"admin",ativo:true},profiles:[{id:"admin",nome:"Administrador",email:"admin@distak.test",role:"admin",ativo:true},{id:"team-unassigned",nome:"Equipa sem obra",email:"equipa@distak.test",role:"funcionario",ativo:true}],obraUtilizadores:[],clientePortalAcessos:[],
  custos:[],orcamentos:[],pagamentos:[],previsoesFinanceiras:[],documentosObra:[],
  ocorrenciasObra:[],pedidosCompra:[],autosMedicao:[],campoRegistos:[],
  obras:[{id:"work-1",nome:"Obra Norte",estado:"Em atraso",progresso:45}],
  agendaTarefas:[
    {id:"task-1",titulo:"Resolver acesso",obra_id:"work-1",estado:"bloqueada",prazo:late,prioridade:"alta",responsavel_id:"user-1"},
    {id:"task-2",titulo:"Distribuir equipa",obra_id:"work-1",estado:"pendente",prazo:today,prioridade:"urgente",responsavel_id:null,funcionario_id:null}
  ]
});

const rows=buildAlerts();
const blocked=rows.filter(row=>row.id==="task-1");
check(blocked.length===1,"uma tarefa bloqueada e atrasada não pode gerar notificações duplicadas");
check(blocked[0].kind==="task"&&blocked[0].action==="Abrir tarefa","a notificação deve abrir diretamente a tarefa");
check(rows.some(row=>row.kind==="work"&&row.id==="work-1"&&row.action==="Abrir obra"),"o alerta da obra deve apontar para a ficha correta");
check(rows.some(row=>row.filter==="unassigned"&&row.action==="Distribuir tarefas"),"tarefas prioritárias sem responsável devem abrir a distribuição de carga");
check(rows.findIndex(row=>row.level==="danger")<=rows.findIndex(row=>row.level==="warning"),"alertas críticos devem aparecer antes dos avisos");
const accessAlerts=rows.filter(row=>row.kind==="access"&&row.id==="team-unassigned");
check(accessAlerts.length===1,"uma inconsistência de acesso deve gerar apenas uma notificação");
check(accessAlerts[0].view==="funcionarios"&&accessAlerts[0].action==="Rever conta","o alerta de acesso deve abrir a conta no Centro de Acessos");

store.profile={id:"team-unassigned",role:"funcionario",ativo:true};
check(buildAlerts().every(row=>row.kind!=="access"),"alertas administrativos de acesso não podem aparecer para a equipa");

console.log(`Notificações aprovadas: ${rows.length} alertas ordenados, sem duplicação e com destinos acionáveis.`);
