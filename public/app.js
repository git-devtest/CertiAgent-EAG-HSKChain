/* global ethers */
'use strict';
const $=id=>document.getElementById(id);
const msg=(id,text)=>{$(id).textContent=text;};
let status=null;
let browserSigner=null;
const ABI=['function owner() view returns (address)','function agents(address) view returns (bool)','function setAgent(address,bool)'];
const short=(value)=>value&&value.length>24?`${value.slice(0,12)}…${value.slice(-8)}`:value||'—';
const el=(tag,text)=>{const n=document.createElement(tag);n.textContent=text;return n;};
const api=async route=>{const res=await fetch(route);const data=await res.json();if(!res.ok)throw Error(data.error||`HTTP ${res.status}`);return data;};
async function loadStatus(){
  status=await api('/api/status');
  msg('network-badge',`${status.network.toUpperCase()} · ${status.chainId}`);
  msg('contract',status.contract||'Sin configurar');msg('agent',status.agentAddress||'Sin configurar');
  msg('owner',status.owner||'—');msg('authorization',status.authorized?'Autorizado para escribir':'No autorizado');
  msg('setup',!status.contract?'DEPLOY PENDIENTE · Despliega el contrato desde Remix con MetaMask; después establece la dirección en .env y reinicia el servidor.':status.error?`ERROR · ${status.error}`:status.ready?'CONTRATO ACTIVO · El agente puede trabajar al autorizar su dirección desde la wallet propietaria.':'Revisa la conexión RPC y el contrato.');
  $('authorize').disabled=!status.contract||!status.agentAddress;
}
async function switchNetwork(){
  const id=`0x${status.chainId.toString(16)}`;
  try{await window.ethereum.request({method:'wallet_switchEthereumChain',params:[{chainId:id}]});}
  catch(err){if(err.code!==4902)throw err;await window.ethereum.request({method:'wallet_addEthereumChain',params:[{chainId:id,chainName:status.network, nativeCurrency:{name:status.currency,symbol:status.currency,decimals:18},rpcUrls:[status.rpc],blockExplorerUrls:[status.explorer]}]});}
}
$('deploy').addEventListener('click',async()=>{
  try {
    if(!browserSigner) throw Error('Conecta MetaMask primero.');
    if(status.contract) throw Error('Ya hay un contrato configurado; no despliegues duplicados por error.');
    await switchNetwork(); browserSigner=await new ethers.BrowserProvider(window.ethereum).getSigner();
    const artifact=await api('/artifact.json');
    const factory=new ethers.ContractFactory(artifact.abi,artifact.bytecode,browserSigner);
    const deployed=await factory.deploy();
    msg('wallet-info',"Transacción enviada. Esperando confirmación... "+deployed.deploymentTransaction().hash);
    await deployed.waitForDeployment();
    const addr=await deployed.getAddress();
    msg('wallet-info',"Contrato desplegado: "+addr+" | Configura la variable *_CONTRACT correspondiente en .env y REINICIA el servidor. ");
  }catch(error){msg('wallet-info',error.shortMessage||error.message);}
});
$('connect').addEventListener('click',async()=>{
  try{
    if(!window.ethereum||typeof ethers==='undefined')throw Error('Instala MetaMask; ejecuta npm install para cargar ethers.');
    await window.ethereum.request({method:'eth_requestAccounts'});
    await switchNetwork();
    browserSigner=await new ethers.BrowserProvider(window.ethereum).getSigner();
    msg('wallet-info',`Wallet conectada: ${await browserSigner.getAddress()} · Red ${status.chainId}`);
  }catch(error){msg('wallet-info',error.shortMessage||error.message);}
});
$('authorize').addEventListener('click',async()=>{
  try{
    if(!browserSigner)throw Error('Conecta MetaMask primero.');
    if(!status.contract||!status.agentAddress)throw Error('Falta contrato o wallet de agente.');
    await switchNetwork();
    browserSigner=await new ethers.BrowserProvider(window.ethereum).getSigner();
    if((await browserSigner.getAddress()).toLowerCase()!==status.owner?.toLowerCase())throw Error('Solo la wallet propietaria del contrato puede autorizar agentes.');
    const contract=new ethers.Contract(status.contract,ABI,browserSigner);
    if(await contract.agents(status.agentAddress)){msg('wallet-info','El agente ya estaba autorizado.');return;}
    const tx=await contract.setAgent(status.agentAddress,true);
    msg('wallet-info',`Autorizando agente… ${tx.hash}`);
    const receipt=await tx.wait(1);
    if(receipt.status!==1)throw Error('La transacción falló.');
    await loadStatus(); msg('wallet-info',`Agente autorizado on-chain · ${tx.hash}`);
  }catch(error){msg('wallet-info',error.shortMessage||error.message);}
});
$('file').addEventListener('change',async ev=>{
  const file=ev.target.files?.[0]; if(!file)return;
  try{
    const bytes=await file.arrayBuffer();
    const hash=await crypto.subtle.digest('SHA-256',bytes);
    $('hash').value=Array.from(new Uint8Array(hash),b=>b.toString(16).padStart(2,'0')).join('');
    msg('verify-result',`SHA-256 local de ${file.name}: ${$('hash').value}`);
  }catch(error){msg('verify-result',error.message);}
});
$('verify').addEventListener('click',async()=>{
  const hash=$('hash').value.toLowerCase().trim(); const target=$('verify-result');
  target.className='result';
  try{
    if(!/^[a-f0-9]{64}$/.test(hash))throw Error('Introduce un hash SHA-256 hexadecimal válido.');
    msg('verify-result','Consultando contrato en blockchain…');
    const r=await api(`/api/verify?sha256=${encodeURIComponent(hash)}`);
    if(r.exists){target.className='result good';target.replaceChildren(el('strong','HASH REGISTRADO EN BLOCKCHAIN'),el('br',''),el('span',`Red: ${r.network} · Fecha: ${r.timestamp} · Agente: ${r.agent} · Metadata hash: ${r.metadataHash}`));}
    else{target.className='result bad';msg('verify-result','No existe registro de este hash en este contrato y red.');}
  }catch(error){target.className='result bad';msg('verify-result',error.message);}
});
async function loadRecords(){
  const rows=await api('/api/records'); const tbody=$('records');tbody.replaceChildren();
  if(!rows.length){const tr=el('tr','');const td=el('td','Aún no hay documentos procesados.');td.colSpan=5;tr.append(td);tbody.append(tr);return;}
  for(const rec of rows){
    const tr=el('tr','');
    for(const value of [rec.filename,rec.sha256,`${rec.category} (${rec.aiMode})`,rec.status]){const td=el('td',value);if(value===rec.sha256)td.title=rec.sha256;tr.append(td);}
    const td=el('td',''); if(rec.txHash){const a=el('a',short(rec.txHash));a.href=`${status.explorer}/tx/${rec.txHash}`;a.target='_blank';a.rel='noopener noreferrer';td.append(a);}else td.textContent=rec.error||'—';tr.append(td);tbody.append(tr);
  }
}
$('refresh').addEventListener('click',()=>loadRecords().catch(error=>msg('wallet-info',error.message)));
async function start(){try{await loadStatus();await loadRecords();}catch(error){msg('setup',error.message);}}
start(); setInterval(()=>loadRecords().catch(()=>{}),5000);
