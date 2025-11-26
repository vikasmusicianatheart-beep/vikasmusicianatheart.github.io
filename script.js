document.addEventListener("DOMContentLoaded", function() {

let projects = {};
let cashFlowChart, categoryChart, projectProfitChart, creditDebitChart;

const dropZone = document.getElementById("dropZone");
const fileInput = document.getElementById("fileInput");
const projectSelect = document.getElementById("projectSelect");
const projectSection = document.getElementById("projectSection");
const summaryCards = document.getElementById("summaryCards");
const chartsDiv = document.getElementById("charts");
const themeToggle = document.getElementById("themeToggle");

// Theme toggle
themeToggle.addEventListener("click", ()=>{
    document.body.classList.toggle("dark-mode");
    document.body.classList.toggle("light-mode");
    updateAllChartsTheme();
});

// Drag & Drop & File Input
dropZone.addEventListener("click", () => fileInput.click());
dropZone.addEventListener("dragover", e=>{ e.preventDefault(); dropZone.classList.add("dragover"); });
dropZone.addEventListener("dragleave", ()=> dropZone.classList.remove("dragover"));
dropZone.addEventListener("drop", e=> { e.preventDefault(); dropZone.classList.remove("dragover"); handleFiles(e.dataTransfer.files); });
fileInput.addEventListener("change", e=> handleFiles(e.target.files));

// Handle multiple files
function handleFiles(files){
    if(!files.length) return;
    projects = {};
    let loaded = 0;
    Array.from(files).forEach(file => {
        const reader = new FileReader();
        reader.onload = function(e){
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type:'array' });
            workbook.SheetNames.forEach(sheetName => {
                let sheet = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
                sheet.forEach(r => { r.Amount = Number(r.Amount)||0; r.Type=r.Type||"Credit"; r.Project=sheetName; });
                projects[sheetName] = sheet;
            });
            loaded++;
            if(loaded===files.length) populateProjects();
        };
        reader.readAsArrayBuffer(file);
    });
}

// Populate project selector
function populateProjects(){
    projectSelect.innerHTML = "";
    Object.keys(projects).forEach(p=>{
        let opt=document.createElement("option");
        opt.value=p; opt.textContent=p;
        projectSelect.appendChild(opt);
    });
    projectSelect.onchange = updateDashboard;
    projectSection.style.display="block";
    summaryCards.style.display="flex";
    chartsDiv.style.display="block";
    updateDashboard();
}

// Dashboard update
function updateDashboard(){
    const project = projectSelect.value;
    const rows = projects[project] || [];

    // Summary
    let credit=0, debit=0;
    rows.forEach(r=> r.Type.toLowerCase()==='credit'?credit+=r.Amount:debit+=r.Amount);
    const revenue = credit;
    const balance = credit-debit;
    document.getElementById("totalCredit").textContent = credit;
    document.getElementById("totalDebit").textContent = debit;
    document.getElementById("totalRevenue").textContent = revenue;
    const pl = document.getElementById("profitLoss");
    pl.textContent = balance>=0?"PROFIT":"LOSS";
    pl.style.color = balance>=0?"green":"red";

    renderCashFlowChart(rows);
    renderCategoryChart(rows);
    renderComparisonCharts();
}

// Cash Flow Chart
function renderCashFlowChart(rows){
    const labels = rows.map(r=>r.Date);
    const data = rows.map(r=>r.Type.toLowerCase()==='credit'?r.Amount:-r.Amount);
    if(cashFlowChart) cashFlowChart.destroy();
    cashFlowChart = new Chart(document.getElementById("cashFlowChart"),{
        type:'line',
        data:{labels,datasets:[{label:"Cash Flow",data,borderColor:"#0d6efd",tension:0.3}]},
        options:{animation:{duration:1000}}
    });
}

// Category Chart
function renderCategoryChart(rows){
    const totals={};
    rows.forEach(r=>totals[r.Category]=(totals[r.Category]||0)+r.Amount);
    if(categoryChart) categoryChart.destroy();
    categoryChart = new Chart(document.getElementById("categoryChart"),{
        type:'pie',
        data:{labels:Object.keys(totals),datasets:[{data:Object.values(totals),backgroundColor:["#ff6384","#36a2eb","#ffce56","#4caf50","#9c27b0","#ffa500","#00bfff"]}]},
        options:{animation:{duration:1000}}
    });
}

// Comparison Charts
function renderComparisonCharts(){
    const names = Object.keys(projects);
    const profits=[], credits=[], debits=[];
    names.forEach(p=>{
        const rows = projects[p];
        let c=0,d=0;
        rows.forEach(r=> r.Type.toLowerCase()==='credit'?c+=r.Amount:d+=r.Amount);
        profits.push(c-d);
        credits.push(c);
        debits.push(d);
    });

    if(projectProfitChart) projectProfitChart.destroy();
    projectProfitChart = new Chart(document.getElementById("projectProfitChart"),{
        type:'bar',
        data:{labels:names,datasets:[{label:"Profit/Loss",data:profits,backgroundColor:profits.map(v=>v>=0?"#4caf50":"#f44336")}]},
        options:{animation:{duration:1000}}
    });

    if(creditDebitChart) creditDebitChart.destroy();
    creditDebitChart = new Chart(document.getElementById("creditDebitChart"),{
        type:'bar',
        data:{labels:names,datasets:[{label:"Credit",data:credits,backgroundColor:"#0d6efd"},{label:"Debit",data:debits,backgroundColor:"#dc3545"}]},
        options:{animation:{duration:1000}}
    });
}

// Update chart colors for dark/light mode
function updateAllChartsTheme(){
    [cashFlowChart,categoryChart,projectProfitChart,creditDebitChart].forEach(c=>{
        if(c){c.options.plugins.legend.labels.color=document.body.classList.contains("dark-mode")?'#f8f9fa':'#212529';c.update();}
    });
}

});
