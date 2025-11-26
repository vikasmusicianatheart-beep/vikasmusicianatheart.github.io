let excelData = [];
let projects = {};

let cashFlowChart, categoryChart, projectProfitChart, creditDebitChart;

/* ==========================
   DRAG & DROP EXCEL IMPORT
   ========================== */
const dropZone = document.getElementById("dropZone");
const fileInput = document.getElementById("fileInput");

dropZone.addEventListener("click", () => fileInput.click());

dropZone.addEventListener("dragover", e => {
    e.preventDefault();
    dropZone.classList.add("dragover");
});

dropZone.addEventListener("dragleave", () => {
    dropZone.classList.remove("dragover");
});

dropZone.addEventListener("drop", e => {
    e.preventDefault();
    dropZone.classList.remove("dragover");
    processFile(e.dataTransfer.files[0]);
});

fileInput.addEventListener("change", e => {
    processFile(e.target.files[0]);
});

/* ==========================
   PROCESS EXCEL FILE
   ========================== */
function processFile(file) {
    if (!file) return;

    let reader = new FileReader();

    reader.onload = function (event) {
        let data = new Uint8Array(event.target.result);
        let workbook = XLSX.read(data, { type: "array" });

        let sheet = workbook.Sheets[workbook.SheetNames[0]];
        excelData = XLSX.utils.sheet_to_json(sheet);

        prepareProjects();
        populateProjectDropdown();
        renderComparisonCharts();

        document.getElementById("dashboard").style.display = "block";
        dropZone.style.display = "none";
    };

    reader.readAsArrayBuffer(file);
}

/* ==========================
   GROUP DATA BY PROJECT
   ========================== */
function prepareProjects() {
    projects = {};
    excelData.forEach(row => {
        if (!projects[row.Project]) projects[row.Project] = [];
        projects[row.Project].push(row);
    });
}

function populateProjectDropdown() {
    let select = document.getElementById("projectSelect");
    select.innerHTML = "";

    Object.keys(projects).forEach(project => {
        let opt = document.createElement("option");
        opt.value = project;
        opt.textContent = project;
        select.appendChild(opt);
    });

    select.onchange = updateDashboard;
    updateDashboard();
}

/* ==========================
   UPDATE DASHBOARD (Summary + Charts + Table)
   ========================== */
function updateDashboard() {
    let project = document.getElementById("projectSelect").value;
    let rows = projects[project];

    renderSummary(rows);
    renderTable(rows);
    renderCashFlowChart(rows);
    renderCategoryChart(rows);
}

/* SUMMARY CARDS */
function renderSummary(rows) {
    let credit = 0, debit = 0;

    rows.forEach(r => {
        if (r.Type.toLowerCase() === "credit") credit += Number(r.Amount);
        else debit += Number(r.Amount);
    });

    let balance = credit - debit;

    document.getElementById("totalCredit").textContent = credit;
    document.getElementById("totalDebit").textContent = debit;
    document.getElementById("netBalance").textContent = balance;

    let status = document.getElementById("profitLoss");
    status.textContent = balance >= 0 ? "PROFIT" : "LOSS";
    status.style.color = balance >= 0 ? "green" : "red";
}

/* TABLE */
function renderTable(rows) {
    let table = document.getElementById("transactionTable");
    table.innerHTML = "";

    rows.forEach(r => {
        table.innerHTML += `
            <tr>
                <td>${r.Date}</td>
                <td>${r.Title}</td>
                <td>${r.Type}</td>
                <td>${r.Amount}</td>
                <td>${r.Category}</td>
            </tr>`;
    });
}

/* CASH FLOW CHART */
function renderCashFlowChart(rows) {
    let labels = rows.map(r => r.Date);
    let values = rows.map(r => r.Type.toLowerCase() === "credit" ? r.Amount : -r.Amount);

    if (cashFlowChart) cashFlowChart.destroy();

    cashFlowChart = new Chart(document.getElementById("cashFlowChart"), {
        type: "line",
        data: {
            labels,
            datasets: [{
                label: "Cash Flow",
                data: values,
                borderColor: "#0d6efd",
                tension: 0.3
            }]
        }
    });
}

/* CATEGORY CHART */
function renderCategoryChart(rows) {
    let categoryTotals = {};
    rows.forEach(r => {
        if (!categoryTotals[r.Category]) categoryTotals[r.Category] = 0;
        categoryTotals[r.Category] += Number(r.Amount);
    });

    if (categoryChart) categoryChart.destroy();

    categoryChart = new Chart(document.getElementById("categoryChart"), {
        type: "pie",
        data: {
            labels: Object.keys(categoryTotals),
            datasets: [{
                data: Object.values(categoryTotals),
                backgroundColor: ["#ff6384", "#36a2eb", "#ffce56", "#4caf50", "#9c27b0"]
            }]
        }
    });
}

/* ==========================
   PROJECT COMPARISON CHARTS
   ========================== */
function renderComparisonCharts() {
    let names = Object.keys(projects);
    let profits = [], credits = [], debits = [];

    names.forEach(project => {
        let rows = projects[project];
        let c = 0, d = 0;

        rows.forEach(r => r.Type.toLowerCase() === "credit" ? c += Number(r.Amount) : d += Number(r.Amount));

        profits.push(c - d);
        credits.push(c);
        debits.push(d);
    });

    if (projectProfitChart) projectProfitChart.destroy();
    projectProfitChart = new Chart(document.getElementById("projectProfitChart"), {
        type: "bar",
        data: {
            labels: names,
            datasets: [{
                label: "Profit / Loss",
                data: profits,
                backgroundColor: profits.map(v => v >= 0 ? "#4caf50" : "#f44336")
            }]
        }
    });

    if (creditDebitChart) creditDebitChart.destroy();
    creditDebitChart = new Chart(document.getElementById("creditDebitChart"), {
        type: "bar",
        data: {
            labels: names,
            datasets: [
                { label: "Credit", data: credits, backgroundColor: "#0d6efd" },
                { label: "Debit", data: debits, backgroundColor: "#dc3545" }
            ]
        }
    });
}
