let excelData = [], projects = {};
let cashFlowChart, categoryChart, timelineChart, projectProfitChart, creditDebitChart;

// Elements
const dropZone = document.getElementById("dropZone");
const fileInput = document.getElementById("fileInput");
const themeToggle = document.getElementById("themeToggle");

// Theme Toggle
themeToggle.addEventListener("click", () => {
    document.body.classList.toggle("dark-mode");
    document.body.classList.toggle("light-mode");
    themeToggle.textContent = document.body.classList.contains("dark-mode") ? "Light Mode" : "Dark Mode";
    updateAllChartsTheme();
});

// Drag & Drop
dropZone.addEventListener("click", () => fileInput.click());
dropZone.addEventListener("dragover", e => { e.preventDefault(); dropZone.classList.add("dragover"); });
dropZone.addEventListener("dragleave", () => dropZone.classList.remove("dragover"));
dropZone.addEventListener("drop", e => { e.preventDefault(); dropZone.classList.remove("dragover"); processFile(e.dataTransfer.files[0]); });
fileInput.addEventListener("change", e => processFile(e.target.files[0]));

// Process Excel
function processFile(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(event) {
        const data = new Uint8Array(event.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        excelData = [];
        projects = {};

        workbook.SheetNames.forEach(sheetName => {
            const sheet = workbook.Sheets[sheetName];
            let sheetData = XLSX.utils.sheet_to_json(sheet);
            sheetData.forEach(r => r.Project = r.Project || sheetName);
            excelData = excelData.concat(sheetData);
            projects[sheetName] = sheetData;
        });

        populateProjectDropdown();
        populateCategoryFilter();
        renderComparisonCharts();
        document.getElementById("dashboard").style.display = "block";
        dropZone.style.display = "none";
    };
    reader.readAsArrayBuffer(file);
}

// Populate Dropdowns
function populateProjectDropdown() {
    const select = document.getElementById("projectSelect");
    select.innerHTML = "";
    Object.keys(projects).forEach(p => { let opt = document.createElement("option"); opt.value = p; opt.textContent = p; select.appendChild(opt); });
    select.onchange = updateDashboard;
    updateDashboard();
}

function populateCategoryFilter() {
    const categorySelect = document.getElementById("categoryFilter");
    categorySelect.innerHTML = "";
    let categories = [...new Set(excelData.map(r => r.Category))];
    categories.forEach(c => { let opt = document.createElement("option"); opt.value = c; opt.textContent = c; categorySelect.appendChild(opt); });
    categorySelect.onchange = updateDashboard;
}

// Filters
function applyFilters(rows) {
    let start = document.getElementById("startDate").value;
    let end = document.getElementById("endDate").value;
    let categories = Array.from(document.getElementById("categoryFilter").selectedOptions).map(o => o.value);
    let minAmount = parseFloat(document.getElementById("minAmount").value) || Number.NEGATIVE_INFINITY;
    let maxAmount = parseFloat(document.getElementById("maxAmount").value) || Number.POSITIVE_INFINITY;

    return rows.filter(r => {
        let dateOK = (!start || new Date(r.Date) >= new Date(start)) && (!end || new Date(r.Date) <= new Date(end));
        let catOK = categories.length === 0 || categories.includes(r.Category);
        let amtOK = r.Amount >= minAmount && r.Amount <= maxAmount;
        return dateOK && catOK && amtOK;
    });
}

// Update Dashboard
function updateDashboard() {
    const project = document.getElementById("projectSelect").value;
    let rows = projects[project];
    rows = applyFilters(rows);
    renderSummary(rows);
    renderTable(rows);
    renderCashFlowChart(rows);
    renderCategoryChart(rows);
    renderTimelineChart(rows);
}

// Summary
function renderSummary(rows) {
    let credit = 0, debit = 0;
    rows.forEach(r => { if(r.Type.toLowerCase()==='credit') credit+=Number(r.Amount); else debit+=Number(r.Amount); });
    let balance = credit - debit;
    document.getElementById("totalCredit").textContent = credit;
    document.getElementById("totalDebit").textContent = debit;
    document.getElementById("netBalance").textContent = balance;
    const status = document.getElementById("profitLoss");
    status.textContent = balance>=0?"PROFIT":"LOSS";
    status.style.color = balance>=0?"green":"red";

    // Trend (compare with previous period)
    const prev = excelData.filter(r=>r.Project===document.getElementById("projectSelect").value && r.Date<rows[0]?.Date);
    let prevBalance = prev.reduce((acc,r)=>acc+(r.Type.toLowerCase()==='credit'?r.Amount:-r.Amount),0);
    const trend = document.getElementById("profitTrend");
    if(balance > prevBalance) trend.textContent = "▲ Increasing"; 
    else if(balance < prevBalance) trend.textContent = "▼ Decreasing"; 
    else trend.textContent = "→ Stable";
}

// Table
function renderTable(rows) {
    const table = document.getElementById("transactionTable");
    table.innerHTML = "";
    rows.forEach(r=> table.innerHTML += `<tr><td>${r.Date}</td><td>${r.Title}</td><td>${r.Type}</td><td>${r.Amount}</td><td>${r.Category}</td></tr>`);
}

// Charts
function renderCashFlowChart(rows) {
    const labels = rows.map(r=>r.Date);
    const data = rows.map(r=>r.Type.toLowerCase()==='credit'?r.Amount:-r.Amount);
    if(cashFlowChart) cashFlowChart.destroy();
    cashFlowChart = new Chart(document.getElementById("cashFlowChart"), { type:'line', data:{labels,datasets:[{label:"Cash Flow",data,borderColor:"#0d6efd",tension:0.3}] }});
}

function renderCategoryChart(rows) {
    const totals = {};
    rows.forEach(r=>totals[r.Category]=(totals[r.Category]||0)+Number(r.Amount));
    if(categoryChart) categoryChart.destroy();
    categoryChart = new Chart(document.getElementById("categoryChart"), { type:'pie', data:{labels:Object.keys(totals), datasets:[{data:Object.values(totals), backgroundColor:["#ff6384","#36a2eb","#ffce56","#4caf50","#9c27b0"]}] }});
}

function renderTimelineChart(rows) {
    const labels = [...new Set(rows.map(r=>r.Date))].sort();
    const data = labels.map(d=>rows.filter(r=>r.Date===d).reduce((acc,r)=>acc+(r.Type.toLowerCase()==='credit'?r.Amount:-r.Amount),0));
    if(timelineChart) timelineChart.destroy();
    timelineChart = new Chart(document.getElementById("timelineChart"), { type:'bar', data:{labels,datasets:[{label:"Timeline",data,backgroundColor:"#17a2b8"}]}});
}

function renderComparisonCharts() {
    const names = Object.keys(projects);
    const profits=[], credits=[], debits=[];
    names.forEach(p=>{
        const rows = projects[p];
        let c=0,d=0;
        rows.forEach(r=> r.Type.toLowerCase()==='credit'?c+=Number(r.Amount):d+=Number(r.Amount));
        profits.push(c-d);
        credits.push(c);
        debits.push(d);
    });
    if(projectProfitChart) projectProfitChart.destroy();
    projectProfitChart = new Chart(document.getElementById("projectProfitChart"), { type:'bar', data:{labels:names,datasets:[{label:"Profit/Loss",data:profits,backgroundColor:profits.map(v=>v>=0?"#4caf50":"#f44336")}] }});
    if(creditDebitChart) creditDebitChart.destroy();
    creditDebitChart = new Chart(document.getElementById("creditDebitChart"), { type:'bar', data:{labels:names,datasets:[{label:"Credit",data:credits,backgroundColor:"#0d6efd"},{label:"Debit",data:debits,backgroundColor:"#dc3545"}]}});
}

function updateAllChartsTheme() {
    [cashFlowChart, categoryChart, timelineChart, projectProfitChart, creditDebitChart].forEach(c=>{
        if(c) c.options.plugins.legend.labels.color = document.body.classList.contains("dark-mode") ? '#f8f9fa':'#212529';
        if(c) c.update();
    });
}
