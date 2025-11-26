let excelData = [];
let projects = {};

let cashFlowChart, categoryChart, projectProfitChart, creditDebitChart;

// Excel Upload
document.getElementById("excelFile").addEventListener("change", function (e) {
    let file = e.target.files[0];
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
    };

    reader.readAsArrayBuffer(file);
});

// Group data by project
function prepareProjects() {
    projects = {};
    excelData.forEach(row => {
        if (!projects[row.Project]) projects[row.Project] = [];
        projects[row.Project].push(row);
    });
}

// Dropdown
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

// Dashboard Update
function updateDashboard() {
    let project = document.getElementById("projectSelect").value;
    let rows = projects[project];

    renderSummary(rows);
    renderTable(rows);
    renderCashFlowChart(rows);
    renderCategoryChart(rows);
}

// Summary Cards
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

// Transaction Table
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
            </tr>
        `;
    });
}

// Cash Flow Chart
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
                fill: false,
                tension: 0.3
            }]
        }
    });
}

// Category Chart
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

// -------------------------------
// PROJECT COMPARISON CHARTS
// -------------------------------

function renderComparisonCharts() {
    let projectNames = Object.keys(projects);
    let profits = [];
    let credits = [];
    let debits = [];

    projectNames.forEach(project => {
        let rows = projects[project];
        let credit = 0, debit = 0;

        rows.forEach(r => {
            if (r.Type.toLowerCase() === "credit") credit += Number(r.Amount);
            else debit += Number(r.Amount);
        });

        profits.push(credit - debit);
        credits.push(credit);
        debits.push(debit);
    });

    // Profit Chart
    if (projectProfitChart) projectProfitChart.destroy();

    projectProfitChart = new Chart(document.getElementById("projectProfitChart"), {
        type: "bar",
        data: {
            labels: projectNames,
            datasets: [{
                label: "Profit/Loss",
                data: profits,
                backgroundColor: profits.map(v => v >= 0 ? "#4caf50" : "#f44336")
            }]
        }
    });

    // Credit vs Debit Chart
    if (creditDebitChart) creditDebitChart.destroy();

    creditDebitChart = new Chart(document.getElementById("creditDebitChart"), {
        type: "bar",
        data: {
            labels: projectNames,
            datasets: [
                {
                    label: "Total Credit",
                    data: credits,
                    backgroundColor: "#0d6efd"
                },
                {
                    label: "Total Debit",
                    data: debits,
                    backgroundColor: "#dc3545"
                }
            ]
        },
        options: {
            responsive: true,
            plugins: { legend: { position: "top" } }
        }
    });
}
