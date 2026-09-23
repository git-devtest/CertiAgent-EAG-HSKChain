/* global ethers */
'use strict';
const $=id=>document.getElementById(id);
const msg=(id,text)=>{$(id).textContent=text;};
/* i18n visual: idioma tomado de ?lang=en|es (por defecto es). t(español, inglés) */
const EN=new URLSearchParams(location.search).get('lang')==='en';
const t=(es,en)=>EN?en:es;

const I18N_EN={
  h1:'From file to blockchain.<br><span class="accent">Without uploading your document.</span>',
  intro:'The agent detects new files, computes their SHA-256 locally, records only the hash, and lets you verify the original file on the selected network.',
  h2_network:'01 · Network status',badge_loading:'Loading…',setup_loading:'Loading contract status…',
  dt_contract:'Contract',dt_agent:'Agent',dt_owner:'Owner',dt_auth:'Authorization',
  btn_deploy:'Deploy contract',btn_connect:'Connect MetaMask',btn_authorize:'Authorize agent',
  wallet_info:'Authorization is signed from MetaMask. Never paste your private key on this page.',
  h2_verify:'02 · Verify document',pill_local:'LOCAL SHA-256',drop_title:'Select file',
  drop_hint:'The file stays in your browser. Only its hash is queried.',
  hash_label:'Or enter SHA-256 (64 characters)',btn_verify:'Verify on blockchain',result_idle:'Not queried yet',
  h2_history:'03 · Agent automatic registry',btn_refresh:'Refresh',
  history_hint:'Copy a file to <code>inbox/</code>. Wait for two stable reads; the agent will certify it once it is configured and authorized.',
  th_file:'File',th_class:'Classification',th_status:'Status',th_tx:'Transaction',records_empty:'No documents processed yet.',
  footer:'Integrity record and inclusion date ≠ certification of the document\'s content, issuer identity, or legal validity. File bytes are never sent to the blockchain.'
};
(function applyStaticI18n(){
  document.documentElement.lang=EN?'en':'es';
  if(EN)document.querySelectorAll('[data-i18n]').forEach(n=>{const k=n.getAttribute('data-i18n');if(I18N_EN[k]!==undefined)n.innerHTML=I18N_EN[k];});
  document.querySelectorAll('.lang a').forEach(l=>{if(l.dataset.lang===(EN?'en':'es'))l.setAttribute('aria-current','true');});
})();
let status=null;
let browserSigner=null;
const ABI=['function owner() view returns (address)','function agents(address) view returns (bool)','function setAgent(address,bool)'];
const short=(value)=>value&&value.length>24?`${value.slice(0,12)}…${value.slice(-8)}`:value||'—';
const el=(tag,text)=>{const n=document.createElement(tag);n.textContent=text;return n;};
const api=async route=>{const res=await fetch(route);const data=await res.json();if(!res.ok)throw Error(data.error||`HTTP ${res.status}`);return data;};
async function loadStatus(){
  status=await api('/api/status');
  msg('network-badge',`${status.network.toUpperCase()} · ${status.chainId}`);
  msg('contract',status.contract||t('Sin configurar','Not configured'));msg('agent',status.agentAddress||t('Sin configurar','Not configured'));
  msg('owner',status.owner||'—');msg('authorization',status.authorized?t('Autorizado para escribir','Authorized to write'):t('No autorizado','Not authorized'));
  msg('setup',!status.contract?t('DEPLOY PENDIENTE · Despliega el contrato desde Remix con MetaMask; después establece la dirección en .env y reinicia el servidor.','DEPLOY PENDING · Deploy the contract from Remix with MetaMask; then set its address in .env and restart the server.'):status.error?`ERROR · ${status.error}`:status.ready?t('CONTRATO ACTIVO · El agente puede trabajar al autorizar su dirección desde la wallet propietaria.','CONTRACT ACTIVE · The agent can start working once its address is authorized from the owner wallet.'):t('Revisa la conexión RPC y el contrato.','Check the RPC connection and the contract.'));
  $('authorize').disabled=!status.contract||!status.agentAddress;
}
async function switchNetwork(){
  const id=`0x${status.chainId.toString(16)}`;
  try{await window.ethereum.request({method:'wallet_switchEthereumChain',params:[{chainId:id}]});}
  catch(err){if(err.code!==4902)throw err;await window.ethereum.request({method:'wallet_addEthereumChain',params:[{chainId:id,chainName:status.network, nativeCurrency:{name:status.currency,symbol:status.currency,decimals:18},rpcUrls:[status.rpc],blockExplorerUrls:[status.explorer]}]});}
}
$('deploy').addEventListener('click',async()=>{
  try {
    if(!browserSigner) throw Error(t('Conecta MetaMask primero.','Connect MetaMask first.'));
    if(status.contract) throw Error(t('Ya hay un contrato configurado; no despliegues duplicados por error.','A contract is already configured; do not deploy duplicates by mistake.'));
    await switchNetwork(); browserSigner=await new ethers.BrowserProvider(window.ethereum).getSigner();
    const artifact=await api('/artifact.json');
    const factory=new ethers.ContractFactory(artifact.abi,artifact.bytecode,browserSigner);
    const deployed=await factory.deploy();
    msg('wallet-info',t("Transacción enviada. Esperando confirmación... ","Transaction sent. Waiting for confirmation... ")+deployed.deploymentTransaction().hash);
    await deployed.waitForDeployment();
    const addr=await deployed.getAddress();
    msg('wallet-info',t("Contrato desplegado: ","Contract deployed: ")+addr+t(" | Configura la variable *_CONTRACT correspondiente en .env y REINICIA el servidor. "," | Set the matching *_CONTRACT variable in .env and RESTART the server. "));
  }catch(error){msg('wallet-info',error.shortMessage||error.message);}
});
$('connect').addEventListener('click',async()=>{
  try{
    if(!window.ethereum||typeof ethers==='undefined')throw Error(t('Instala MetaMask; ejecuta npm install para cargar ethers.','Install MetaMask; run npm install to load ethers.'));
    await window.ethereum.request({method:'eth_requestAccounts'});
    await switchNetwork();
    browserSigner=await new ethers.BrowserProvider(window.ethereum).getSigner();
    msg('wallet-info',`${t('Wallet conectada','Wallet connected')}: ${await browserSigner.getAddress()} · ${t('Red','Network')} ${status.chainId}`);
  }catch(error){msg('wallet-info',error.shortMessage||error.message);}
});
$('authorize').addEventListener('click',async()=>{
  try{
    if(!browserSigner)throw Error(t('Conecta MetaMask primero.','Connect MetaMask first.'));
    if(!status.contract||!status.agentAddress)throw Error(t('Falta contrato o wallet de agente.','Contract or agent wallet is missing.'));
    await switchNetwork();
    browserSigner=await new ethers.BrowserProvider(window.ethereum).getSigner();
    if((await browserSigner.getAddress()).toLowerCase()!==status.owner?.toLowerCase())throw Error(t('Solo la wallet propietaria del contrato puede autorizar agentes.','Only the contract owner wallet can authorize agents.'));
    const contract=new ethers.Contract(status.contract,ABI,browserSigner);
    if(await contract.agents(status.agentAddress)){msg('wallet-info',t('El agente ya estaba autorizado.','The agent was already authorized.'));return;}
    const tx=await contract.setAgent(status.agentAddress,true);
    msg('wallet-info',`${t('Autorizando agente…','Authorizing agent…')} ${tx.hash}`);
    const receipt=await tx.wait(1);
    if(receipt.status!==1)throw Error(t('La transacción falló.','The transaction failed.'));
    await loadStatus(); msg('wallet-info',`${t('Agente autorizado on-chain','Agent authorized on-chain')} · ${tx.hash}`);
  }catch(error){msg('wallet-info',error.shortMessage||error.message);}
});
$('file').addEventListener('change',async ev=>{
  const file=ev.target.files?.[0]; if(!file)return;
  try{
    const bytes=await file.arrayBuffer();
    const hash=await crypto.subtle.digest('SHA-256',bytes);
    $('hash').value=Array.from(new Uint8Array(hash),b=>b.toString(16).padStart(2,'0')).join('');
    msg('verify-result',t(`SHA-256 local de ${file.name}: ${$('hash').value}`,`Local SHA-256 of ${file.name}: ${$('hash').value}`));
  }catch(error){msg('verify-result',error.message);}
});
$('verify').addEventListener('click',async()=>{
  const hash=$('hash').value.toLowerCase().trim(); const target=$('verify-result');
  target.className='result';
  try{
    if(!/^[a-f0-9]{64}$/.test(hash))throw Error(t('Introduce un hash SHA-256 hexadecimal válido.','Enter a valid hexadecimal SHA-256 hash.'));
    msg('verify-result',t('Consultando contrato en blockchain…','Querying contract on the blockchain…'));
    const r=await api(`/api/verify?sha256=${encodeURIComponent(hash)}`);
    if(r.exists){target.className='result good';target.replaceChildren(el('strong',t('HASH REGISTRADO EN BLOCKCHAIN','HASH REGISTERED ON BLOCKCHAIN')),el('br',''),el('span',t(`Red: ${r.network} · Fecha: ${r.timestamp} · Agente: ${r.agent} · Metadata hash: ${r.metadataHash}`,`Network: ${r.network} · Date: ${r.timestamp} · Agent: ${r.agent} · Metadata hash: ${r.metadataHash}`)));}
    else{target.className='result bad';msg('verify-result',t('No existe registro de este hash en este contrato y red.','No record of this hash exists on this contract and network.'));}
  }catch(error){target.className='result bad';msg('verify-result',error.message);}
});
async function loadRecords(){
  const rows=await api('/api/records'); const tbody=$('records');tbody.replaceChildren();
  if(!rows.length){const tr=el('tr','');const td=el('td',t('Aún no hay documentos procesados.','No documents processed yet.'));td.colSpan=5;tr.append(td);tbody.append(tr);return;}
  for(const rec of rows){
    const tr=el('tr','');
    for(const value of [rec.filename,rec.sha256,`${rec.category} (${rec.aiMode})`,rec.status]){const td=el('td',value);if(value===rec.sha256)td.title=rec.sha256;tr.append(td);}
    const td=el('td',''); if(rec.txHash){const a=el('a',short(rec.txHash));a.href=`${status.explorer}/tx/${rec.txHash}`;a.target='_blank';a.rel='noopener noreferrer';td.append(a);}else td.textContent=rec.error||'—';tr.append(td);tbody.append(tr);
  }
}
$('refresh').addEventListener('click',()=>loadRecords().catch(error=>msg('wallet-info',error.message)));
async function start(){try{await loadStatus();await loadRecords();}catch(error){msg('setup',error.message);}}
start(); setInterval(()=>loadRecords().catch(()=>{}),5000);
