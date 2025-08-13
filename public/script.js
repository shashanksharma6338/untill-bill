const financialYears = [];
for (let year = 2010; year <= 2099; year++) {
  financialYears.push(`${year}-${year + 1}`);
}

document.addEventListener("DOMContentLoaded", () => {
  const loginForm = document.getElementById("login-form");
  const loginContainer = document.getElementById("login-container");
  const dashboard = document.getElementById("dashboard");
  const alertContainer = document.getElementById("alert-container");
  const supplyRegister = document.getElementById("supply-register");
  const demandRegister = document.getElementById("demand-register");
  const billRegister = document.getElementById("bill-register");
  const supplyFinancialYearSelect = document.getElementById("financial-year");
  const demandFinancialYearSelect = document.getElementById(
    "demand-financial-year"
  );
  const billFinancialYearSelect = document.getElementById(
    "bill-financial-year"
  );
  const supplyTableBody = document.getElementById("supply-table-body");
  const demandTableBody = document.getElementById("demand-table-body");
  const billTableBody = document.getElementById("bill-table-body");
  const supplySearchInput = document.getElementById("search");
  const demandSearchInput = document.getElementById("demand-search");
  const billSearchInput = document.getElementById("bill-search");
  const supplySortSelect = document.getElementById("sort");
  const demandSortSelect = document.getElementById("demand-sort");
  const billSortSelect = document.getElementById("bill-sort");
  const supplyImportExcel = document.getElementById("import-excel-supply");
  const demandImportExcel = document.getElementById("import-excel-demand");
  const billImportExcel = document.getElementById("import-excel-bill");

  financialYears.forEach((year) => {
    const option1 = document.createElement("option");
    option1.value = year;
    option1.textContent = year;
    supplyFinancialYearSelect.appendChild(option1);
    const option2 = document.createElement("option");
    option2.value = year;
    option2.textContent = year;
    demandFinancialYearSelect.appendChild(option2);
    const option3 = document.createElement("option");
    option3.value = year;
    option3.textContent = year;
    billFinancialYearSelect.appendChild(option3);
  });

  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;

    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      if (response.ok) {
        loginContainer.classList.add("hidden");
        dashboard.classList.remove("hidden");
        showRegister("supply");
      } else {
        alert("Invalid credentials");
      }
    } catch (error) {
      console.error("Login error:", error);
    }
  });

  document.getElementById("logout").addEventListener("click", () => {
    loginContainer.classList.remove("hidden");
    dashboard.classList.add("hidden");
    loginForm.reset();
  });

  document
    .getElementById("supply-register-btn")
    .addEventListener("click", () => showRegister("supply"));
  document
    .getElementById("demand-register-btn")
    .addEventListener("click", () => showRegister("demand"));
  document
    .getElementById("bill-register-btn")
    .addEventListener("click", () => showRegister("bill"));

  function showRegister(type) {
    supplyRegister.classList.add("hidden");
    demandRegister.classList.add("hidden");
    billRegister.classList.add("hidden");
    document
      .getElementById("supply-register-btn")
      .classList.remove("bg-blue-600", "text-white");
    document
      .getElementById("supply-register-btn")
      .classList.add("bg-gray-200", "hover:bg-gray-300");
    document
      .getElementById("demand-register-btn")
      .classList.remove("bg-blue-600", "text-white");
    document
      .getElementById("demand-register-btn")
      .classList.add("bg-gray-200", "hover:bg-gray-300");
    document
      .getElementById("bill-register-btn")
      .classList.remove("bg-blue-600", "text-white");
    document
      .getElementById("bill-register-btn")
      .classList.add("bg-gray-200", "hover:bg-gray-300");
    document
      .getElementById(`${type}-register-btn`)
      .classList.remove("bg-gray-200", "hover:bg-gray-300");
    document
      .getElementById(`${type}-register-btn`)
      .classList.add("bg-blue-600", "text-white");
    document.getElementById(`${type}-register`).classList.remove("hidden");
    loadData(type);
  }

  async function loadData(type) {
    const financialYearSelect =
      type === "supply"
        ? supplyFinancialYearSelect
        : type === "demand"
        ? demandFinancialYearSelect
        : billFinancialYearSelect;
    const year = financialYearSelect.value;
    try {
      const response = await fetch(`/api/${type}-orders?year=${year}`);
      const data = await response.json();
      renderTable(type, data);
      if (type === "supply") checkDeliveryAlerts(data);
      populateFilterDropdowns(type, data);
    } catch (error) {
      console.error(`Error loading ${type} data:`, error);
    }
  }

  function formatDate(dateStr) {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    return date.toISOString().split("T")[0];
  }

  function getLatestDate(row) {
    const dates = [
      row.revised_date3,
      row.revised_date2,
      row.revised_date1,
      row.original_date,
    ]
      .filter((date) => date)
      .map((date) => new Date(date));
    return dates.length ? new Date(Math.max(...dates)) : null;
  }

  function checkDeliveryAlerts(data) {
    alertContainer.innerHTML = "";
    const today = new Date();
    data.forEach((row) => {
      if (row.delivery_done === "No") {
        const latestDate = getLatestDate(row);
        if (latestDate && latestDate < today) {
          const alertDiv = document.createElement("div");
          alertDiv.className =
            "bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-4";
          alertDiv.innerHTML = `Delivery overdue for Supply Order No: ${
            row.supply_order_no_date
          } (Latest Date: ${formatDate(latestDate)})`;
          alertContainer.appendChild(alertDiv);
        }
      }
    });
  }

  function renderTable(type, data) {
    const tableBody =
      type === "supply"
        ? supplyTableBody
        : type === "demand"
        ? demandTableBody
        : billTableBody;
    tableBody.innerHTML = "";
    data.forEach((row, index) => {
      const tr = document.createElement("tr");
      tr.dataset.id = row.id;
      tr.className = "border-b";
      if (type === "supply") {
        tr.innerHTML = `
                    <td class="p-3"><span class="serial-no">${
                      row.serial_no
                    }</span></td>
                    <td class="p-3">${row.supply_order_no_date}</td>
                    <td class="p-3">${row.firm_name}</td>
                    <td class="p-3">${row.nomenclature}</td>
                    <td class="p-3">${row.quantity}</td>
                    <td class="p-3">${formatDate(row.original_date)}</td>
                    <td class="p-3">${formatDate(row.revised_date1)}</td>
                    <td class="p-3">${formatDate(row.revised_date2)}</td>
                    <td class="p-3">${formatDate(row.revised_date3)}</td>
                    <td class="p-3">${row.build_up}</td>
                    <td class="p-3">${row.maint}</td>
                    <td class="p-3">${row.misc}</td>
                    <td class="p-3">${row.project_no_pdc}</td>
                    <td class="p-3">${formatDate(row.actual_delivery_date)}</td>
                    <td class="p-3">${row.procurement_mode}</td>
                    <td class="p-3">${row.delivery_done}</td>
                    <td class="p-3">${row.remarks}</td>
                    <td class="p-3">
                        <button onclick="editRow('${type}', ${
          row.id
        }, this)" class="bg-blue-600 text-white px-3 py-1 rounded-lg hover:bg-blue-700 transition">Edit</button>
                        <button onclick="deleteRow('${type}', ${
          row.id
        })" class="bg-red-600 text-white px-3 py-1 rounded-lg hover:bg-red-700 transition ml-2">Delete</button>
                    </td>
                    <td class="p-3 arrange-buttons">
                        <button onclick="moveRow('${type}', ${row.id}, 'up')" ${
          index === 0 ? "disabled" : ""
        } class="bg-gray-600 text-white px-3 py-1 rounded-lg hover:bg-gray-700 transition">↑</button>
                        <button onclick="moveRow('${type}', ${
          row.id
        }, 'down')" ${
          index === data.length - 1 ? "disabled" : ""
        } class="bg-gray-600 text-white px-3 py-1 rounded-lg hover:bg-gray-700 transition ml-2">↓</button>
                    </td>
                `;
      } else if (type === "demand") {
        tr.innerHTML = `
                    <td class="p-3">${row.serial_no}</td>
                    <td class="p-3">${formatDate(row.demand_date)}</td>
                    <td class="p-3">${row.group_demand_no_date}</td>
                    <td class="p-3">${row.mmg_control_no_date}</td>
                    <td class="p-3">${row.nomenclature}</td>
                    <td class="p-3">${row.quantity}</td>
                    <td class="p-3">${row.expenditure_head}</td>
                    <td class="p-3">${row.rev_cap}</td>
                    <td class="p-3">${row.procurement_mode}</td>
                    <td class="p-3">${row.est_cost}</td>
                    <td class="p-3">${row.imms_control_no}</td>
                    <td class="p-3">${row.remarks}</td>
                    <td class="p-3">
                        <button onclick="editRow('${type}', ${
          row.id
        }, this)" class="bg-blue-600 text-white px-3 py-1 rounded-lg hover:bg-blue-700 transition">Edit</button>
                        <button onclick="deleteRow('${type}', ${
          row.id
        })" class="bg-red-600 text-white px-3 py-1 rounded-lg hover:bg-red-700 transition ml-2">Delete</button>
                    </td>
                    <td class="p-3 arrange-buttons">
                        <button onclick="moveRow('${type}', ${row.id}, 'up')" ${
          index === 0 ? "disabled" : ""
        } class="bg-gray-600 text-white px-3 py-1 rounded-lg hover:bg-gray-700 transition">↑</button>
                        <button onclick="moveRow('${type}', ${
          row.id
        }, 'down')" ${
          index === data.length - 1 ? "disabled" : ""
        } class="bg-gray-600 text-white px-3 py-1 rounded-lg hover:bg-gray-700 transition ml-2">↓</button>
                    </td>
                `;
      } else {
        tr.innerHTML = `
                    <td class="p-3">${row.serial_no}</td>
                    <td class="p-3">${formatDate(row.entry_date)}</td>
                    <td class="p-3">${row.firm_name}</td>
                    <td class="p-3">${row.supply_order_no}</td>
                    <td class="p-3">${formatDate(row.so_date)}</td>
                    <td class="p-3">${row.project_no}</td>
                    <td class="p-3">${row.build_up}</td>
                    <td class="p-3">${row.maintenance}</td>
                    <td class="p-3">${row.project_less_2cr}</td>
                    <td class="p-3">${row.project_more_2cr}</td>
                    <td class="p-3">${row.procurement_mode}</td>
                    <td class="p-3">${row.rev_cap}</td>
                    <td class="p-3">${row.date_amount_passed}</td>
                    <td class="p-3">${row.ld_amount}</td>
                    <td class="p-3">${row.remarks}</td>
                    <td class="p-3">
                        <button onclick="editRow('${type}', ${
          row.id
        }, this)" class="bg-blue-600 text-white px-3 py-1 rounded-lg hover:bg-blue-700 transition">Edit</button>
                        <button onclick="deleteRow('${type}', ${
          row.id
        })" class="bg-red-600 text-white px-3 py-1 rounded-lg hover:bg-red-700 transition ml-2">Delete</button>
                    </td>
                    <td class="p-3 arrange-buttons">
                        <button onclick="moveRow('${type}', ${row.id}, 'up')" ${
          index === 0 ? "disabled" : ""
        } class="bg-gray-600 text-white px-3 py-1 rounded-lg hover:bg-gray-700 transition">↑</button>
                        <button onclick="moveRow('${type}', ${
          row.id
        }, 'down')" ${
          index === data.length - 1 ? "disabled" : ""
        } class="bg-gray-600 text-white px-3 py-1 rounded-lg hover:bg-gray-700 transition ml-2">↓</button>
                    </td>
                `;
      }
      tableBody.appendChild(tr);
    });
  }

  window.addRow = async (type) => {
    const financialYearSelect =
      type === "supply"
        ? supplyFinancialYearSelect
        : type === "demand"
        ? demandFinancialYearSelect
        : billFinancialYearSelect;
    const tableBody =
      type === "supply"
        ? supplyTableBody
        : type === "demand"
        ? demandTableBody
        : billTableBody;
    const maxSerialNo = await getMaxSerialNo(type);
    const newRow =
      type === "supply"
        ? {
            serial_no: maxSerialNo + 1,
            supply_order_no_date: `ADRDE/AS-QMS/MMG/PM/8${String(
              maxSerialNo + 1
            ).padStart(3, "0")}`,
            firm_name: "",
            nomenclature: "",
            quantity: "",
            original_date: "",
            revised_date1: "",
            revised_date2: "",
            revised_date3: "",
            build_up: "",
            maint: "",
            misc: "",
            project_no_pdc: "",
            actual_delivery_date: "",
            procurement_mode: "",
            delivery_done: "No",
            remarks: "",
            financial_year: financialYearSelect.value,
          }
        : type === "demand"
        ? {
            serial_no: maxSerialNo + 1,
            demand_date: "",
            group_demand_no_date: "",
            mmg_control_no_date: `ADRDE/AS-QMS/MMG/PM/8/${String(
              maxSerialNo + 1
            ).padStart(3, "0")}`,
            nomenclature: "",
            quantity: "",
            expenditure_head: "",
            rev_cap: "",
            procurement_mode: "",
            est_cost: "",
            imms_control_no: "",
            remarks: "",
            financial_year: financialYearSelect.value,
          }
        : {
            serial_no: maxSerialNo + 1,
            entry_date: "",
            firm_name: "",
            supply_order_no: `ADRDE/AS-QMS/MMG/PM/8/${String(
              maxSerialNo + 1
            ).padStart(3, "0")}`,
            so_date: "",
            project_no: "",
            build_up: "",
            maintenance: "",
            project_less_2cr: "",
            project_more_2cr: "",
            procurement_mode: "",
            rev_cap: "R",
            date_amount_passed: "",
            ld_amount: "",
            remarks: "",
            financial_year: financialYearSelect.value,
          };

    const tr = document.createElement("tr");
    tr.className = "border-b";
    if (type === "supply") {
      tr.innerHTML = `
                <td class="p-3"><input type="number" min="1" value="${
                  newRow.serial_no
                }" class="serial-no-input p-2 border rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500"></td>
                <td class="p-3"><input type="text" value="${
                  newRow.supply_order_no_date
                }" class="p-2 border rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500"></td>
                <td class="p-3"><input type="text" value="${
                  newRow.firm_name
                }" class="p-2 border rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500"></td>
                <td class="p-3"><input type="text" value="${
                  newRow.nomenclature
                }" class="p-2 border rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500"></td>
                <td class="p-3"><input type="text" value="${
                  newRow.quantity
                }" class="p-2 border rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500"></td>
                <td class="p-3"><input type="date" value="${
                  newRow.original_date
                }" class="p-2 border rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500"></td>
                <td class="p-3"><input type="date" value="${
                  newRow.revised_date1
                }" class="p-2 border rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500"></td>
                <td class="p-3"><input type="date" value="${
                  newRow.revised_date2
                }" class="p-2 border rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500"></td>
                <td class="p-3"><input type="date" value="${
                  newRow.revised_date3
                }" class="p-2 border rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500"></td>
                <td class="p-3"><input type="text" value="${
                  newRow.build_up
                }" class="p-2 border rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500"></td>
                <td class="p-3"><input type="text" value="${
                  newRow.maint
                }" class="p-2 border rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500"></td>
                <td class="p-3"><input type="text" value="${
                  newRow.misc
                }" class="p-2 border rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500"></td>
                <td class="p-3"><input type="text" value="${
                  newRow.project_no_pdc
                }" class="p-2 border rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500"></td>
                <td class="p-3"><input type="date" value="${
                  newRow.actual_delivery_date
                }" class="p-2 border rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500"></td>
                <td class="p-3"><input type="text" value="${
                  newRow.procurement_mode
                }" class="p-2 border rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500"></td>
                <td class="p-3">
                    <select class="p-2 border rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500">
                        <option value="No" ${
                          newRow.delivery_done === "No" ? "selected" : ""
                        }>No</option>
                        <option value="Yes" ${
                          newRow.delivery_done === "Yes" ? "selected" : ""
                        }>Yes</option>
                    </select>
                </td>
                <td class="p-3"><input type="text" value="${
                  newRow.remarks
                }" class="p-2 border rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500"></td>
                <td class="p-3">
                    <button onclick="saveRow('${type}', null, this)" class="bg-green-600 text-white px-3 py-1 rounded-lg hover:bg-green-700 transition">Save</button>
                    <button onclick="cancelEdit(this)" class="bg-gray-600 text-white px-3 py-1 rounded-lg hover:bg-gray-700 transition ml-2">Cancel</button>
                </td>
                <td class="p-3 arrange-buttons"></td>
            `;
    } else if (type === "demand") {
      tr.innerHTML = `
                <td class="p-3"><input type="number" min="1" value="${newRow.serial_no}" class="serial-no-input p-2 border rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500"></td>
                <td class="p-3"><input type="date" value="${newRow.demand_date}" class="p-2 border rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500"></td>
                <td class="p-3"><input type="text" value="${newRow.group_demand_no_date}" class="p-2 border rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500"></td>
                <td class="p-3"><input type="text" value="${newRow.mmg_control_no_date}" class="p-2 border rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500"></td>
                <td class="p-3"><input type="text" value="${newRow.nomenclature}" class="p-2 border rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500"></td>
                <td class="p-3"><input type="text" value="${newRow.quantity}" class="p-2 border rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500"></td>
                <td class="p-3"><input type="text" value="${newRow.expenditure_head}" class="p-2 border rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500"></td>
                <td class="p-3"><input type="text" value="${newRow.rev_cap}" class="p-2 border rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500"></td>
                <td class="p-3"><input type="text" value="${newRow.procurement_mode}" class="p-2 border rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500"></td>
                <td class="p-3"><input type="number" step="0.01" value="${newRow.est_cost}" class="p-2 border rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500"></td>
                <td class="p-3"><input type="text" value="${newRow.imms_control_no}" class="p-2 border rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500"></td>
                <td class="p-3"><input type="text" value="${newRow.remarks}" class="p-2 border rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500"></td>
                <td class="p-3">
                    <button onclick="saveRow('${type}', null, this)" class="bg-green-600 text-white px-3 py-1 rounded-lg hover:bg-green-700 transition">Save</button>
                    <button onclick="cancelEdit(this)" class="bg-gray-600 text-white px-3 py-1 rounded-lg hover:bg-gray-700 transition ml-2">Cancel</button>
                </td>
                <td class="p-3 arrange-buttons"></td>
            `;
    } else {
      tr.innerHTML = `
                <td class="p-3"><input type="number" min="1" value="${
                  newRow.serial_no
                }" class="serial-no-input p-2 border rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500"></td>
                <td class="p-3"><input type="date" value="${
                  newRow.entry_date
                }" class="p-2 border rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500"></td>
                <td class="p-3"><input type="text" value="${
                  newRow.firm_name
                }" class="p-2 border rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500"></td>
                <td class="p-3"><input type="text" value="${
                  newRow.supply_order_no
                }" class="p-2 border rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500"></td>
                <td class="p-3"><input type="date" value="${
                  newRow.so_date
                }" class="p-2 border rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500"></td>
                <td class="p-3"><input type="text" value="${
                  newRow.project_no
                }" class="p-2 border rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500"></td>
                <td class="p-3"><input type="text" value="${
                  newRow.build_up
                }" class="p-2 border rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500"></td>
                <td class="p-3"><input type="text" value="${
                  newRow.maintenance
                }" class="p-2 border rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500"></td>
                <td class="p-3"><input type="text" value="${
                  newRow.project_less_2cr
                }" class="p-2 border rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500"></td>
                <td class="p-3"><input type="text" value="${
                  newRow.project_more_2cr
                }" class="p-2 border rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500"></td>
                <td class="p-3"><input type="text" value="${
                  newRow.procurement_mode
                }" class="p-2 border rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500"></td>
                <td class="p-3">
                    <select class="p-2 border rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500">
                        <option value="R" ${
                          newRow.rev_cap === "R" ? "selected" : ""
                        }>R</option>
                        <option value="C" ${
                          newRow.rev_cap === "C" ? "selected" : ""
                        }>C</option>
                    </select>
                </td>
                <td class="p-3"><input type="text" value="${
                  newRow.date_amount_passed
                }" class="p-2 border rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500"></td>
                <td class="p-3"><input type="text" value="${
                  newRow.ld_amount
                }" class="p-2 border rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500"></td>
                <td class="p-3"><input type="text" value="${
                  newRow.remarks
                }" class="p-2 border rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500"></td>
                <td class="p-3">
                    <button onclick="saveRow('${type}', null, this)" class="bg-green-600 text-white px-3 py-1 rounded-lg hover:bg-green-700 transition">Save</button>
                    <button onclick="cancelEdit(this)" class="bg-gray-600 text-white px-3 py-1 rounded-lg hover:bg-gray-700 transition ml-2">Cancel</button>
                </td>
                <td class="p-3 arrange-buttons"></td>
            `;
    }
    tableBody.appendChild(tr);
  };

  window.editRow = async (type, id, button) => {
    const row = button.closest("tr");
    const cells = row.querySelectorAll("td");
    const financialYearSelect =
      type === "supply"
        ? supplyFinancialYearSelect
        : type === "demand"
        ? demandFinancialYearSelect
        : billFinancialYearSelect;

    try {
      const response = await fetch(`/api/${type}-orders/${id}`);
      const data = await response.json();
      if (type === "supply") {
        row.innerHTML = `
                    <td class="p-3"><input type="number" min="1" value="${
                      data.serial_no
                    }" class="serial-no-input p-2 border rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500"></td>
                    <td class="p-3"><input type="text" value="${
                      data.supply_order_no_date
                    }" class="p-2 border rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500"></td>
                    <td class="p-3"><input type="text" value="${
                      data.firm_name
                    }" class="p-2 border rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500"></td>
                    <td class="p-3"><input type="text" value="${
                      data.nomenclature
                    }" class="p-2 border rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500"></td>
                    <td class="p-3"><input type="text" value="${
                      data.quantity
                    }" class="p-2 border rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500"></td>
                    <td class="p-3"><input type="date" value="${formatDate(
                      data.original_date
                    )}" class="p-2 border rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500"></td>
                    <td class="p-3"><input type="date" value="${formatDate(
                      data.revised_date1
                    )}" class="p-2 border rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500"></td>
                    <td class="p-3"><input type="date" value="${formatDate(
                      data.revised_date2
                    )}" class="p-2 border rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500"></td>
                    <td class="p-3"><input type="date" value="${formatDate(
                      data.revised_date3
                    )}" class="p-2 border rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500"></td>
                    <td class="p-3"><input type="text" value="${
                      data.build_up
                    }" class="p-2 border rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500"></td>
                    <td class="p-3"><input type="text" value="${
                      data.maint
                    }" class="p-2 border rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500"></td>
                    <td class="p-3"><input type="text" value="${
                      data.misc
                    }" class="p-2 border rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500"></td>
                    <td class="p-3"><input type="text" value="${
                      data.project_no_pdc
                    }" class="p-2 border rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500"></td>
                    <td class="p-3"><input type="date" value="${formatDate(
                      data.actual_delivery_date
                    )}" class="p-2 border rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500"></td>
                    <td class="p-3"><input type="text" value="${
                      data.procurement_mode
                    }" class="p-2 border rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500"></td>
                    <td class="p-3">
                        <select class="p-2 border rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500">
                            <option value="No" ${
                              data.delivery_done === "No" ? "selected" : ""
                            }>No</option>
                            <option value="Yes" ${
                              data.delivery_done === "Yes" ? "selected" : ""
                            }>Yes</option>
                        </select>
                    </td>
                    <td class="p-3"><input type="text" value="${
                      data.remarks
                    }" class="p-2 border rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500"></td>
                    <td class="p-3">
                        <button onclick="saveRow('${type}', ${id}, this)" class="bg-green-600 text-white px-3 py-1 rounded-lg hover:bg-green-700 transition">Save</button>
                        <button onclick="cancelEdit(this)" class="bg-gray-600 text-white px-3 py-1 rounded-lg hover:bg-gray-700 transition ml-2">Cancel</button>
                    </td>
                    <td class="p-3 arrange-buttons"></td>
                `;
      } else if (type === "demand") {
        row.innerHTML = `
                    <td class="p-3"><input type="number" min="1" value="${
                      data.serial_no
                    }" class="serial-no-input p-2 border rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500"></td>
                    <td class="p-3"><input type="date" value="${formatDate(
                      data.demand_date
                    )}" class="p-2 border rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500"></td>
                    <td class="p-3"><input type="text" value="${
                      data.group_demand_no_date
                    }" class="p-2 border rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500"></td>
                    <td class="p-3"><input type="text" value="${
                      data.mmg_control_no_date
                    }" class="p-2 border rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500"></td>
                    <td class="p-3"><input type="text" value="${
                      data.nomenclature
                    }" class="p-2 border rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500"></td>
                    <td class="p-3"><input type="text" value="${
                      data.quantity
                    }" class="p-2 border rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500"></td>
                    <td class="p-3"><input type="text" value="${
                      data.expenditure_head
                    }" class="p-2 border rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500"></td>
                    <td class="p-3"><input type="text" value="${
                      data.rev_cap
                    }" class="p-2 border rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500"></td>
                    <td class="p-3"><input type="text" value="${
                      data.procurement_mode
                    }" class="p-2 border rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500"></td>
                    <td class="p-3"><input type="number" step="0.01" value="${
                      data.est_cost
                    }" class="p-2 border rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500"></td>
                    <td class="p-3"><input type="text" value="${
                      data.imms_control_no
                    }" class="p-2 border rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500"></td>
                    <td class="p-3"><input type="text" value="${
                      data.remarks
                    }" class="p-2 border rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500"></td>
                    <td class="p-3">
                        <button onclick="saveRow('${type}', ${id}, this)" class="bg-green-600 text-white px-3 py-1 rounded-lg hover:bg-green-700 transition">Save</button>
                        <button onclick="cancelEdit(this)" class="bg-gray-600 text-white px-3 py-1 rounded-lg hover:bg-gray-700 transition ml-2">Cancel</button>
                    </td>
                    <td class="p-3 arrange-buttons"></td>
                `;
      } else {
        row.innerHTML = `
                    <td class="p-3"><input type="number" min="1" value="${
                      data.serial_no
                    }" class="serial-no-input p-2 border rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500"></td>
                    <td class="p-3"><input type="date" value="${formatDate(
                      data.entry_date
                    )}" class="p-2 border rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500"></td>
                    <td class="p-3"><input type="text" value="${
                      data.firm_name
                    }" class="p-2 border rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500"></td>
                    <td class="p-3"><input type="text" value="${
                      data.supply_order_no
                    }" class="p-2 border rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500"></td>
                    <td class="p-3"><input type="date" value="${formatDate(
                      data.so_date
                    )}" class="p-2 border rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500"></td>
                    <td class="p-3"><input type="text" value="${
                      data.project_no
                    }" class="p-2 border rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500"></td>
                    <td class="p-3"><input type="text" value="${
                      data.build_up
                    }" class="p-2 border rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500"></td>
                    <td class="p-3"><input type="text" value="${
                      data.maintenance
                    }" class="p-2 border rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500"></td>
                    <td class="p-3"><input type="text" value="${
                      data.project_less_2cr
                    }" class="p-2 border rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500"></td>
                    <td class="p-3"><input type="text" value="${
                      data.project_more_2cr
                    }" class="p-2 border rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500"></td>
                    <td class="p-3"><input type="text" value="${
                      data.procurement_mode
                    }" class="p-2 border rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500"></td>
                    <td class="p-3">
                        <select class="p-2 border rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500">
                            <option value="R" ${
                              data.rev_cap === "R" ? "selected" : ""
                            }>R</option>
                            <option value="C" ${
                              data.rev_cap === "C" ? "selected" : ""
                            }>C</option>
                        </select>
                    </td>
                    <td class="p-3"><input type="text" value="${
                      data.date_amount_passed
                    }" class="p-2 border rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500"></td>
                    <td class="p-3"><input type="text" value="${
                      data.ld_amount
                    }" class="p-2 border rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500"></td>
                    <td class="p-3"><input type="text" value="${
                      data.remarks
                    }" class="p-2 border rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500"></td>
                    <td class="p-3">
                        <button onclick="saveRow('${type}', ${id}, this)" class="bg-green-600 text-white px-3 py-1 rounded-lg hover:bg-green-700 transition">Save</button>
                        <button onclick="cancelEdit(this)" class="bg-gray-600 text-white px-3 py-1 rounded-lg hover:bg-gray-700 transition ml-2">Cancel</button>
                    </td>
                    <td class="p-3 arrange-buttons"></td>
                `;
      }
    } catch (error) {
      console.error(`Error fetching ${type} row ${id}:`, error);
    }
  };

  window.saveRow = async (type, id, button) => {
    const row = button.closest("tr");
    const inputs = row.querySelectorAll("input, select");
    const financialYearSelect =
      type === "supply"
        ? supplyFinancialYearSelect
        : type === "demand"
        ? demandFinancialYearSelect
        : billFinancialYearSelect;
    const data =
      type === "supply"
        ? {
            serial_no: inputs[0].value,
            supply_order_no_date: inputs[1].value,
            firm_name: inputs[2].value,
            nomenclature: inputs[3].value,
            quantity: inputs[4].value,
            original_date: inputs[5].value || null,
            revised_date1: inputs[6].value || null,
            revised_date2: inputs[7].value || null,
            revised_date3: inputs[8].value || null,
            build_up: inputs[9].value,
            maint: inputs[10].value,
            misc: inputs[11].value,
            project_no_pdc: inputs[12].value,
            actual_delivery_date: inputs[13].value || null,
            procurement_mode: inputs[14].value,
            delivery_done: inputs[15].value,
            remarks: inputs[16].value,
            financial_year: financialYearSelect.value,
          }
        : type === "demand"
        ? {
            serial_no: inputs[0].value,
            demand_date: inputs[1].value || null,
            group_demand_no_date: inputs[2].value,
            mmg_control_no_date: inputs[3].value,
            nomenclature: inputs[4].value,
            quantity: inputs[5].value,
            expenditure_head: inputs[6].value,
            rev_cap: inputs[7].value,
            procurement_mode: inputs[8].value,
            est_cost: inputs[9].value,
            imms_control_no: inputs[10].value,
            remarks: inputs[11].value,
            financial_year: financialYearSelect.value,
          }
        : {
            serial_no: inputs[0].value,
            entry_date: inputs[1].value || null,
            firm_name: inputs[2].value,
            supply_order_no: inputs[3].value,
            so_date: inputs[4].value || null,
            project_no: inputs[5].value,
            build_up: inputs[6].value,
            maintenance: inputs[7].value,
            project_less_2cr: inputs[8].value,
            project_more_2cr: inputs[9].value,
            procurement_mode: inputs[10].value,
            rev_cap: inputs[11].value,
            date_amount_passed: inputs[12].value,
            ld_amount: inputs[13].value,
            remarks: inputs[14].value,
            financial_year: financialYearSelect.value,
          };

    try {
      const method = id ? "PUT" : "POST";
      const url = id ? `/api/${type}-orders/${id}` : `/api/${type}-orders`;
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (response.ok) {
        loadData(type);
      } else {
        alert(`Failed to ${id ? "update" : "add"} row`);
      }
    } catch (error) {
      console.error(`Error saving ${type} row:`, error);
    }
  };

  window.cancelEdit = (button) => {
    const row = button.closest("tr");
    loadData(
      row.closest("#supply-table")
        ? "supply"
        : row.closest("#demand-table")
        ? "demand"
        : "bill"
    );
  };

  window.deleteRow = async (type, id) => {
    if (confirm("Are you sure you want to delete this row?")) {
      try {
        const response = await fetch(`/api/${type}-orders/${id}`, {
          method: "DELETE",
        });
        if (response.ok) {
          loadData(type);
        } else {
          alert("Failed to delete row");
        }
      } catch (error) {
        console.error(`Error deleting ${type} row ${id}:`, error);
      }
    }
  };

  window.moveRow = async (type, id, direction) => {
    const financialYearSelect =
      type === "supply"
        ? supplyFinancialYearSelect
        : type === "demand"
        ? demandFinancialYearSelect
        : billFinancialYearSelect;
    try {
      const response = await fetch(`/api/${type}-orders/move/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          direction,
          financial_year: financialYearSelect.value,
        }),
      });
      if (response.ok) {
        loadData(type);
      } else {
        alert("Failed to move row");
      }
    } catch (error) {
      console.error(`Error moving ${type} row:`, error);
    }
  };

  async function getMaxSerialNo(type) {
    const financialYearSelect =
      type === "supply"
        ? supplyFinancialYearSelect
        : type === "demand"
        ? demandFinancialYearSelect
        : billFinancialYearSelect;
    const year = financialYearSelect.value;
    try {
      const response = await fetch(
        `/api/${type}-orders/max-serial?year=${year}`
      );
      const data = await response.json();
      return data.maxSerialNo || 0;
    } catch (error) {
      console.error(`Error fetching max serial no for ${type}:`, error);
      return 0;
    }
  }

  function populateFilterDropdowns(type, data) {
    const filterContainer = document.getElementById(`${type}-advanced-filter`);
    const selects = filterContainer.querySelectorAll(".filter-select");
    const fields =
      type === "supply"
        ? [
            "serial_no",
            "supply_order_no_date",
            "firm_name",
            "nomenclature",
            "quantity",
            "original_date",
            "revised_date1",
            "revised_date2",
            "revised_date3",
            "build_up",
            "maint",
            "misc",
            "project_no_pdc",
            "actual_delivery_date",
            "procurement_mode",
            "delivery_done",
            "remarks",
          ]
        : type === "demand"
        ? [
            "serial_no",
            "demand_date",
            "group_demand_no_date",
            "mmg_control_no_date",
            "nomenclature",
            "quantity",
            "expenditure_head",
            "rev_cap",
            "procurement_mode",
            "est_cost",
            "imms_control_no",
            "remarks",
          ]
        : [
            "serial_no",
            "entry_date",
            "firm_name",
            "supply_order_no",
            "so_date",
            "project_no",
            "build_up",
            "maintenance",
            "project_less_2cr",
            "project_more_2cr",
            "procurement_mode",
            "rev_cap",
            "date_amount_passed",
            "ld_amount",
            "remarks",
          ];

    selects.forEach((select, index) => {
      const field = fields[index];
      select.innerHTML = `<option value="">Select ${field.replace(
        /_/g,
        " "
      )}</option>`;
      const uniqueValues = [
        ...new Set(data.map((row) => row[field]).filter((val) => val)),
      ].sort();
      uniqueValues.forEach((value) => {
        const option = document.createElement("option");
        option.value = value;
        option.textContent = value;
        select.appendChild(option);
      });
    });
  }

  window.toggleAdvancedFilter = (type) => {
    const filterDiv = document.getElementById(`${type}-advanced-filter`);
    filterDiv.classList.toggle("hidden");
  };

  window.applyFilter = (type) => {
    const financialYearSelect =
      type === "supply"
        ? supplyFinancialYearSelect
        : type === "demand"
        ? demandFinancialYearSelect
        : billFinancialYearSelect;
    const filterContainer = document.getElementById(`${type}-advanced-filter`);
    const selects = filterContainer.querySelectorAll(".filter-select");
    const filters = {};
    selects.forEach((select) => {
      if (select.value) {
        filters[select.name] = select.value;
      }
    });

    fetch(`/api/${type}-orders?year=${financialYearSelect.value}`)
      .then((response) => response.json())
      .then((data) => {
        const filteredData = data.filter((row) => {
          return Object.keys(filters).every((key) => {
            return row[key] == filters[key];
          });
        });
        renderTable(type, filteredData);
      })
      .catch((error) => console.error(`Error applying ${type} filter:`, error));
  };

  window.resetFilter = (type) => {
    const filterContainer = document.getElementById(`${type}-advanced-filter`);
    filterContainer
      .querySelectorAll(".filter-select")
      .forEach((select) => (select.value = ""));
    loadData(type);
  };

  window.showBackups = async (type) => {
    const backupList = document.getElementById(`${type}-backup-list`);
    const backupFiles = document.getElementById(`${type}-backup-files`);
    backupList.classList.toggle("hidden");
    try {
      const response = await fetch(`/api/${type}-backups`);
      const files = await response.json();
      backupFiles.innerHTML = "";
      files.forEach((file) => {
        const li = document.createElement("li");
        li.innerHTML = `<a href="/backups/${type}/${file}" target="_blank" class="text-blue-600 hover:underline">${file}</a>`;
        backupFiles.appendChild(li);
      });
    } catch (error) {
      console.error(`Error fetching ${type} backups:`, error);
    }
  };

  window.exportToExcel = (type) => {
    const financialYearSelect =
      type === "supply"
        ? supplyFinancialYearSelect
        : type === "demand"
        ? demandFinancialYearSelect
        : billFinancialYearSelect;
    fetch(`/api/${type}-orders?year=${financialYearSelect.value}`)
      .then((response) => response.json())
      .then((data) => {
        const formattedData = data.map((row) => ({
          ...row,
          original_date: formatDate(row.original_date),
          revised_date1: formatDate(row.revised_date1),
          revised_date2: formatDate(row.revised_date2),
          revised_date3: formatDate(row.revised_date3),
          actual_delivery_date: formatDate(row.actual_delivery_date),
          demand_date: formatDate(row.demand_date),
          entry_date: formatDate(row.entry_date),
          so_date: formatDate(row.so_date),
        }));
        const worksheet = XLSX.utils.json_to_sheet(formattedData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(
          workbook,
          worksheet,
          `${type.charAt(0).toUpperCase() + type.slice(1)} Orders`
        );
        XLSX.writeFile(
          workbook,
          `${type}_orders_${financialYearSelect.value}.xlsx`
        );
      })
      .catch((error) =>
        console.error(`Error exporting ${type} to Excel:`, error)
      );
  };

  supplyImportExcel.addEventListener("change", (event) =>
    handleImportExcel(event, "supply")
  );
  demandImportExcel.addEventListener("change", (event) =>
    handleImportExcel(event, "demand")
  );
  billImportExcel.addEventListener("change", (event) =>
    handleImportExcel(event, "bill")
  );

  function handleImportExcel(event, type) {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: "array" });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        const financialYearSelect =
          type === "supply"
            ? supplyFinancialYearSelect
            : type === "demand"
            ? demandFinancialYearSelect
            : billFinancialYearSelect;
        fetch(`/api/${type}-orders/import`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            data: jsonData,
            financial_year: financialYearSelect.value,
          }),
        })
          .then((response) => {
            if (response.ok) {
              loadData(type);
              event.target.value = "";
            } else {
              alert("Failed to import Excel file");
            }
          })
          .catch((error) =>
            console.error(`Error importing ${type} Excel:`, error)
          );
      };
      reader.readAsArrayBuffer(file);
    }
  }

  supplyFinancialYearSelect.addEventListener("change", () =>
    loadData("supply")
  );
  demandFinancialYearSelect.addEventListener("change", () =>
    loadData("demand")
  );
  billFinancialYearSelect.addEventListener("change", () => loadData("bill"));
  supplySearchInput.addEventListener("input", () => filterTable("supply"));
  demandSearchInput.addEventListener("input", () => filterTable("demand"));
  billSearchInput.addEventListener("input", () => filterTable("bill"));
  supplySortSelect.addEventListener("change", () => loadData("supply"));
  demandSortSelect.addEventListener("change", () => loadData("demand"));
  billSortSelect.addEventListener("change", () => loadData("bill"));

  function filterTable(type) {
    const searchInput =
      type === "supply"
        ? supplySearchInput
        : type === "demand"
        ? demandSearchInput
        : billSearchInput;
    const tableBody =
      type === "supply"
        ? supplyTableBody
        : type === "demand"
        ? demandTableBody
        : billTableBody;
    const searchTerm = searchInput.value.toLowerCase();
    const rows = tableBody.querySelectorAll("tr");

    rows.forEach((row) => {
      const text = Array.from(row.querySelectorAll("td"))
        .map((cell) => cell.textContent.toLowerCase())
        .join(" ");
      row.style.display = text.includes(searchTerm) ? "" : "none";
    });
  }
});
