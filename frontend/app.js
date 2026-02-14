async function api(path, opts){
  const r = await fetch(path, { headers: { "Content-Type":"application/json" }, ...opts });
  if(!r.ok) throw new Error(await r.text());
  return r.json();
}

async function listar(){
  const data = await api("/api/clientes");
  document.getElementById("out").textContent = JSON.stringify(data, null, 2);
}

document.getElementById("btnCriar").addEventListener("click", async ()=>{
  const nome = document.getElementById("nome").value.trim();
  if(!nome) return;
  await api("/api/clientes", { method:"POST", body: JSON.stringify({ nome }) });
  await listar();
});

listar();
