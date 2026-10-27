export function setupTheme() {
  const select=document.getElementById('theme'); if(!select)return;
  let saved='auto'; try { saved=localStorage.getItem('api-meter-theme') || 'auto'; } catch {}
  const apply=value=>{ if(value==='auto')delete document.documentElement.dataset.theme;else document.documentElement.dataset.theme=value; };
  select.value=['auto','light','dark'].includes(saved)?saved:'auto';apply(select.value);
  select.addEventListener('change',()=>{apply(select.value);try{localStorage.setItem('api-meter-theme',select.value);}catch{}});
}
