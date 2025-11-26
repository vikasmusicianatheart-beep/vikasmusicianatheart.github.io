let projects = JSON.parse(localStorage.getItem("projects")) || [];
let activeProject = null;
let chart;

// SAVE TO LOCAL STORAGE
function saveProjects() {
    localStorage.setItem("projects", JSON.stringify(projects));
}

// RENDER PROJECT LIST
function renderProjects() {
    $("#projectList").empty();
    projects.forEach((p, i) => {
        $("#projectList").append(`<li onclick="openProject(${i})">${p.name}</li>`);
    });
}

function openProject(i) {
    activeProject = i;
    $("#projectTitle").text(projects[i].name);
    $("#dashboardContent").show();
    renderTransactions();
    calculateSummary();
    renderChart();
}

// RENDER TRANSACTIONS
function renderTransactions() {
    const table = $("#transactionTable");
    table.empty();

    projects[activeProject].transactions.forEach((t, i) => {
        table.append(`
            <tr>
                <td>${t.date}</td>
                <td>${t.title}</td>
                <td>${t.type}</td>
                <td>${t.amount}</td>
                <td>${t.category}</td>
                <td><button onclick="deleteTransaction(${i})">Delete</button></td>
            </tr>
        `);
    });
}

// DELETE TRANSACTION
function deleteTransaction(i) {
    projects[activeProject].transactions.splice(i, 1);
    saveProjects();
    renderTransactions();
    calculateSummary();
    renderChart();
}

// SUMMARY CALCULATION
function calculateSummary() {
    const list = projects[activeProject].transactions;
    let credit = 0, debit = 0;

    list.forEach(t => {
        if (t.type === "credit") credit += Number(t.amount);
        else debit += Number(t.amount);
    });

    let balance = credit - debit;

    $("#totalCredit").text(credit);
    $("#totalDebit").text(debit);
    $("#netBalance").text(balance);
    $("#profitLoss").text(balance >= 0 ? "Profit" : "Loss")
                   .css("color", balance >= 0 ? "green" : "red");
}

// CHART
function renderChart() {
    const list = projects[activeProject].transactions;

    const labels = list.map(t => t.title);
    const data = list.map(t => t.type === "credit" ? t.amount : -t.amount);

    if (chart) chart.destroy();

    chart = new Chart($("#financeChart"), {
        type: "line",
        data: {
            labels,
            datasets: [{
                label: "Cash Flow",
                data,
                borderColor: "#007bff",
                fill: false
            }]
        }
    });
}

// ADD PROJECT
$("#addProjectBtn").click(() => $("#projectModal").fadeIn());
$(".closeModal").click(() => $(".modal").fadeOut());

$("#saveProjectBtn").click(() => {
    let name = $("#projectNameInput").val().trim();
    if (!name) return;

    projects.push({ name, transactions: [] });
    saveProjects();
    renderProjects();
    $("#projectNameInput").val("");
    $("#projectModal").fadeOut();
});

// ADD TRANSACTION
$("#addTransactionBtn").click(() => $("#transactionModal").fadeIn());

$("#saveTransactionBtn").click(() => {
    let t = {
        date: $("#tDate").val(),
        title: $("#tTitle").val(),
        type: $("#tType").val(),
        amount: $("#tAmount").val(),
        category: $("#tCategory").val()
    };

    projects[activeProject].transactions.push(t);
    saveProjects();

    $("#transactionModal input").val("");
    $("#transactionModal").fadeOut();

    renderTransactions();
    calculateSummary();
    renderChart();
});

// INITIAL LOAD
renderProjects();
