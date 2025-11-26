document.addEventListener("DOMContentLoaded", function() {

let projects = {};
let cashFlowChart, categoryChart;

const dropZone = document.getElementById("dropZone");
const fileInput = document.getElementById("fileInput");
const projectSelect = document.getElementById("projectSelect");
const dashboard = document.getElementById("dashboard");
const themeToggle = document.getElementById("themeToggle");

themeToggle.addEventListener("click", ()=>{
  document.body.classList.toggle("dark-mode");
});

dropZone.addEventListener("click", ()=>fileInput.click());
dropZone.addEventListener("dragover", e=>{ e.preventDefault(); dropZone.classList.add("dragover"); });
dropZone.addEventListener("dragleave", ()=>dropZone.classList.remove("dragover"));
dropZone.addEventListener("drop", e=>{ e.preventDefault(); dropZone.classList.remove("dragover"); handleFile(e.dataTransfer.files[0]); });
fileInput.addEventListener("change", e=>handleFile(e.target.files[0]));

function handleFile(file){
  if(!file) return;
  const reader = new FileReader();
  reader.onload = function(e){
    const data = new Uint8Array(e.target.result);
    const workbook = XLSX.read(data,{type:'array'});
    projects = {};
    workbook.SheetNames.forEach(sheetName=>{
      let sheet = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
      sheet.forEach(r=>{
        r.Amount = Number(r.Amount) || 0;
        r.Type = r.Type || "Credit";
        r.Project = r.Project || sheetName;
      });
      projects[sheetName] = sheet;
    });
    populateProjects();
  };
  reader.readAsArrayBuffer(file);
}

function populateProjects(){
  projectSelect.innerHTML = "";
  Object.keys(projects).forEach(p=>{
    let opt = document.createElement("option"); opt.value=p; opt.textContent=p;
    projectSelect.appendChild(opt);
  });
  projectSelect.onchange = updateDashboard;
  updateDashboard();
  dashboard.style.display="block";
}

function updateDashboard(){
  const project = projectSelect.value;
  const rows = projects[project] || [];

  // Cash Flow Chart
  const labels = rows.map(r=>r.Date);
  const data = rows.map(r=> r.Type.toLowerCase()==='credit'?r.Amount:-r.Amount);

  if(cashFlowChart) cashFlowChart.destroy();
  cashFlowChart = new Chart(document.getElementById("cashFlowChart"), {
    type:'line',
    data:{labels, datasets:[{label:"Cash Flow", data, borderColor:"#0d6efd", tension:0.3}]}
  });

  // Category Chart
  const totals = {};
  rows.forEach(r=> totals[r.Category] = (totals[r.Category]||0) + r.Amount);
  if(categoryChart) categoryChart.destroy();
  categoryChart = new Chart(document.getElementById("categoryChart"),{
    type:'pie',
    data:{labels:Object.keys(totals), datasets:[{data:Object.values(totals), backgroundColor:["#ff6384","#36a2eb","#ffce56","#4caf50","#9c27b0"]}]}
  });
}

});
