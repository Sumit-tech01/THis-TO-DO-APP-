const r=e=>{if(!e)return"-";const t=new Date(e);return Number.isNaN(t.getTime())?"-":new Intl.DateTimeFormat("en-US",{year:"numeric",month:"short",day:"2-digit"}).format(t)};export{r as f};
