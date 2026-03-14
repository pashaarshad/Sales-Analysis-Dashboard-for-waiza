document.addEventListener('DOMContentLoaded', () => {
    
    // Check if salesData is available from data.js
    if (typeof salesData === 'undefined' || !salesData.length) {
        console.error("Sales data not found. Please ensure data.js is loaded.");
        return;
    }

    // Initialize Dashboard
    calculateKPIs(salesData);
    renderCharts(salesData);
    renderSecondaryCharts(salesData);
    generateInsights(salesData);
    populateTable(salesData);

    // Sidebar toggle (for mobile responsiveness)
    /* Currently sidebar is always visible on desktop, this handles potential toggling */
    const sidebar = document.getElementById('sidebar');
    const sidebarCollapse = document.getElementById('sidebarCollapse');
    if (sidebarCollapse) {
        sidebarCollapse.addEventListener('click', () => {
            sidebar.classList.toggle('active');
        });
    }

    // Filter interaction for importance chart
    const filterSelect = document.getElementById('filterCategory');
    if (filterSelect) {
        filterSelect.addEventListener('change', (e) => {
            const importanceValue = e.target.value;
            let filteredData = salesData;
            
            if (importanceValue !== 'all') {
                filteredData = salesData.filter(item => 
                    String(item.Product_importance).toLowerCase() === importanceValue
                );
            }
            updateImportanceChart(filteredData);
        });
    }
    // Navigation logic
    const navItems = document.querySelectorAll('.nav-item');
    const viewSections = document.querySelectorAll('.view-section');

    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const listItem = e.target.closest('.nav-item');
            if (!listItem) return;
            
            // Remove active from all nav items
            navItems.forEach(nav => nav.classList.remove('active'));
            // Add active to clicked nav item
            listItem.classList.add('active');

            // Hide all views
            viewSections.forEach(view => {
                view.classList.remove('active');
                view.classList.add('d-none');
            });

            // Show target view
            const targetId = listItem.getAttribute('data-target');
            if(targetId) {
                const targetView = document.getElementById(targetId);
                if(targetView) {
                    targetView.classList.remove('d-none');
                    targetView.classList.add('active');
                }
            }
        });
    });

    // Search logic
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const term = e.target.value.toLowerCase();
            const filteredData = salesData.filter(item => {
                return (
                    String(item.Warehouse_block).toLowerCase().includes(term) ||
                    String(item.Mode_of_Shipment).toLowerCase().includes(term) ||
                    String(item.ID).includes(term) ||
                    String(item.Customer_rating).includes(term)
                );
            });
            populateTable(filteredData);
        });
    }

    // Export CSV logic
    const exportBtn = document.getElementById('exportBtn');
    if (exportBtn) {
        exportBtn.addEventListener('click', () => {
             exportToCSV(salesData, 'sales_analytics_export.csv');
        });
    }

});

// Calculate and Render KPIs
function calculateKPIs(data) {
    const totalOrders = data.length;
    let totalCost = 0;
    let totalRating = 0;
    let onTimeCount = 0;

    data.forEach(item => {
        totalCost += parseFloat(item.Cost_of_the_Product) || 0;
        totalRating += parseFloat(item.Customer_rating) || 0;
        if (parseInt(item['Reached.on.Time_Y.N']) === 1) {
            onTimeCount++;
        }
    });

    const avgRating = totalOrders > 0 ? (totalRating / totalOrders).toFixed(1) : 0;
    const onTimeRate = totalOrders > 0 ? Math.round((onTimeCount / totalOrders) * 100) : 0;

    // Animate numbers
    animateValue(document.getElementById('totalOrders'), 0, totalOrders, 1000);
    document.getElementById('totalCost').innerText = '$' + totalCost.toLocaleString();
    document.getElementById('avgRating').innerText = avgRating;
    document.getElementById('onTimeRate').innerText = onTimeRate + '%';
}

// Simple number animation function
function animateValue(obj, start, end, duration) {
    let startTimestamp = null;
    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        obj.innerHTML = Math.floor(progress * (end - start) + start);
        if (progress < 1) {
            window.requestAnimationFrame(step);
        } else {
            obj.innerHTML = end;
        }
    };
    window.requestAnimationFrame(step);
}

// Global chart variables to allow updating
let importanceChartInstance = null;
let modeChartInstance = null;

// Chart Rendering Configuration
Chart.defaults.color = '#8b949e';
Chart.defaults.font.family = 'Inter';
Chart.defaults.scale.grid.color = 'rgba(255,255,255,0.05)';

function renderCharts(data) {
    // 1. Revenue by Warehouse Chart
    const warehouseLabels = ['Block A', 'Block B', 'Block C', 'Block D', 'Block F'];
    const blocksMap = {'A':0, 'B':0, 'C':0, 'D':0, 'F':0};
    
    data.forEach(item => {
        const cost = parseFloat(item.Cost_of_the_Product) || 0;
        const b = String(item.Warehouse_block).trim().toUpperCase();
        if (blocksMap[b] !== undefined) {
            blocksMap[b] += cost;
        }
    });

    const whData = [blocksMap['A'], blocksMap['B'], blocksMap['C'], blocksMap['D'], blocksMap['F']];

    const ctxWarehouse = document.getElementById('warehouseChart').getContext('2d');
    
    // Create gradient
    const gradientWh = ctxWarehouse.createLinearGradient(0, 0, 0, 300);
    gradientWh.addColorStop(0, 'rgba(88, 166, 255, 0.8)');
    gradientWh.addColorStop(1, 'rgba(88, 166, 255, 0.1)');

    new Chart(ctxWarehouse, {
        type: 'bar',
        data: {
            labels: warehouseLabels,
            datasets: [{
                label: 'Total Shipment Value ($)',
                data: whData,
                backgroundColor: gradientWh,
                borderColor: '#58a6ff',
                borderWidth: 1,
                borderRadius: 4,
                hoverBackgroundColor: '#58a6ff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: { 
                    backgroundColor: 'rgba(13, 17, 23, 0.9)',
                    titleColor: '#fff',
                    bodyColor: '#e6edf3',
                    borderColor: 'rgba(255,255,255,0.1)',
                    borderWidth: 1,
                    padding: 10,
                    cornerRadius: 8
                }
            },
            scales: {
                y: { beginAtZero: true }
            }
        }
    });

    // 2. Mode of Shipment (Doughnut)
    const modeMap = {};
    data.forEach(item => {
        const mode = item.Mode_of_Shipment;
        if(mode) {
            modeMap[mode] = (modeMap[mode] || 0) + 1;
        }
    });

    const ctxMode = document.getElementById('modeChart').getContext('2d');
    modeChartInstance = new Chart(ctxMode, {
        type: 'doughnut',
        data: {
            labels: Object.keys(modeMap),
            datasets: [{
                data: Object.values(modeMap),
                backgroundColor: ['#1f6feb', '#238636', '#8957e5', '#d29922'],
                borderWidth: 0,
                hoverOffset: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '70%',
            plugins: {
                legend: { position: 'bottom', labels: { usePointStyle: true, padding: 20 } }
            }
        }
    });

    // 3. Importance Chart Initial Load
    updateImportanceChart(data);
}

function updateImportanceChart(data) {
    // Generate data grouped lightly by Customer Rating (1-5) and Avg Cost
    // This provides a meaningful insight regardless of filter
    const ratingCosts = {1: {sum:0, count:0}, 2: {sum:0, count:0}, 3: {sum:0, count:0}, 4: {sum:0, count:0}, 5: {sum:0, count:0}};
    
    data.forEach(item => {
        let r = parseInt(item.Customer_rating);
        let cost = parseFloat(item.Cost_of_the_Product) || 0;
        if (r >= 1 && r <= 5) {
            ratingCosts[r].sum += cost;
            ratingCosts[r].count += 1;
        }
    });

    const labels = ['1 Star', '2 Star', '3 Star', '4 Star', '5 Star'];
    const avgCosts = [];
    for(let i=1; i<=5; i++){
        avgCosts.push(ratingCosts[i].count > 0 ? (ratingCosts[i].sum / ratingCosts[i].count).toFixed(2) : 0);
    }

    const ctx = document.getElementById('importanceChart').getContext('2d');
    
    if (importanceChartInstance) {
        importanceChartInstance.data.datasets[0].data = avgCosts;
        importanceChartInstance.update();
    } else {
        const gradient = ctx.createLinearGradient(0, 0, 0, 300);
        gradient.addColorStop(0, 'rgba(137, 87, 229, 0.5)');
        gradient.addColorStop(1, 'rgba(137, 87, 229, 0.0)');

        importanceChartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Avg Cost by Rating ($)',
                    data: avgCosts,
                    borderColor: '#8957e5',
                    backgroundColor: gradient,
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: '#1d222b',
                    pointBorderColor: '#8957e5',
                    pointBorderWidth: 2,
                    pointRadius: 4,
                    pointHoverRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    y: { beginAtZero: false } // Auto scale for lines
                }
            }
        });
    }
}

function generateInsights(data) {
    if (data.length === 0) return;
    
    // Find highest cost warehouse
    const blocksMap = {};
    const modeMap = {};
    let onTimeCount = 0;
    
    data.forEach(item => {
        const b = String(item.Warehouse_block).trim();
        const cost = parseFloat(item.Cost_of_the_Product) || 0;
        blocksMap[b] = (blocksMap[b] || 0) + cost;
        
        modeMap[item.Mode_of_Shipment] = (modeMap[item.Mode_of_Shipment] || 0) + 1;
        
        if (parseInt(item['Reached.on.Time_Y.N']) === 1) onTimeCount++;
    });

    let topBlock = Object.keys(blocksMap).reduce((a, b) => blocksMap[a] > blocksMap[b] ? a : b);
    let topMode = Object.keys(modeMap).reduce((a, b) => modeMap[a] > modeMap[b] ? a : b);
    let onTimePerc = Math.round((onTimeCount/data.length)*100);

    const insightsUl = document.getElementById('aiInsights');
    insightsUl.innerHTML = `
        <li><strong class="text-white">Logistics Pattern:</strong> Warehouse Block <strong>${topBlock}</strong> handles the highest value of shipped goods.</li>
        <li><strong class="text-white">Delivery Preference:</strong> <strong>${topMode}</strong> is the most frequently used shipment method across orders.</li>
        <li><strong class="text-white">Performance Alert:</strong> Currently, <strong>${onTimePerc}%</strong> of orders are arriving on time according to the analytics.</li>
    `;
}

function populateTable(data) {
    const tbody = document.getElementById('dataTableBody');
    tbody.innerHTML = '';

    // Take recent 10 records for display
    const sliceData = data.slice(0, 10);

    sliceData.forEach(item => {
        const onTimeStatus = parseInt(item['Reached.on.Time_Y.N']) === 1;
        const statusBadge = onTimeStatus 
            ? '<span class="badge-outline badge-success">On Time</span>' 
            : '<span class="badge-outline badge-danger">Delayed</span>';
            
        // Rating coloring
        let ratingBadgeClass = "badge-success";
        let r = parseInt(item.Customer_rating);
        if(r <= 2) ratingBadgeClass = "badge-danger";
        else if (r === 3) ratingBadgeClass = "badge-warning";
        
        const ratingBadge = `<span class="badge-outline ${ratingBadgeClass}"><i class="fa-solid fa-star me-1"></i>${r}</span>`;

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>#${item.ID}</td>
            <td>Block ${item.Warehouse_block}</td>
            <td>${item.Mode_of_Shipment}</td>
            <td>$${item.Cost_of_the_Product}</td>
            <td>${item.Weight_in_gms} g</td>
            <td>${ratingBadge}</td>
            <td>${statusBadge}</td>
        `;
        tbody.appendChild(tr);
    });
}

// ==========================================
// Predictive AI Logic
// ==========================================

const predWeight = document.getElementById('predWeight');
if(predWeight){
   predWeight.addEventListener('input', (e) => {
       document.getElementById('weightVal').innerText = e.target.value + ' g';
   });
}

const btnPredict = document.getElementById('btnPredict');
if(btnPredict) {
    btnPredict.addEventListener('click', () => {
        const mode = document.getElementById('predMode').value;
        const importance = document.getElementById('predImportance').value;
        const weight = parseInt(document.getElementById('predWeight').value);
        const block = document.getElementById('predBlock').value;
        
        // Custom simple logic algorithm to calculate probability
        let score = 50; 
        
        if (mode === 'Flight') score += 20;
        if (mode === 'Road') score += 5;
        if (mode === 'Ship') score -= 15;
        
        if (importance === 'high') score += 10;
        if (importance === 'low') score -= 10;
        
        if (weight > 4000) score -= 20;
        if (weight < 2000) score += 15;
        
        if (block === 'F') score += 5; 
        
        score = Math.max(5, Math.min(95, score)); // clamp between 5 and 95
        
        const resultBox = document.getElementById('predictionResult');
        
        let colorClass = 'text-success';
        let iconClass = 'fa-circle-check';
        let message = 'High probability of on-time delivery.';
        let strokeColor = '#3fb950';
        
        if (score < 40) {
            colorClass = 'text-danger';
            iconClass = 'fa-circle-xmark';
            message = 'High risk of delay. Consider changing shipment mode.';
            strokeColor = '#f85149';
        } else if (score < 65) {
            colorClass = 'text-warning';
            iconClass = 'fa-triangle-exclamation';
            message = 'Moderate risk of delay. Monitor closely.';
            strokeColor = '#d29922';
        }
        
        resultBox.innerHTML = `
            <div class="circular-progress position-relative mb-3">
                <svg viewBox="0 0 36 36" class="circular-chart" style="width: 150px; height: 150px; display: block; margin: 0 auto;">
                    <path class="circle-bg" stroke="rgba(255,255,255,0.05)" stroke-width="3" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                    <path class="circle" stroke-dasharray="${score}, 100" stroke="${strokeColor}" stroke-width="3" stroke-linecap="round" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" style="transition: stroke-dasharray 1s ease-out;" />
                    <text x="18" y="20.7" class="percentage" fill="#fff" font-size="8" text-anchor="middle" font-weight="bold">${score}%</text>
                </svg>
            </div>
            <h4 class="${colorClass} mb-2"><i class="fa-solid ${iconClass} me-2"></i>${score}% On-Time Probability</h4>
            <p class="text-white">${message}</p>
            <div class="text-start mt-4 w-100 p-3" style="background: rgba(0,0,0,0.3); border-radius: 8px;">
                <p class="mb-1 text-muted small"><strong class="text-white">Analysis Breakdown:</strong></p>
                <ul class="mb-0 text-muted small ps-3">
                    <li>Mode (${mode}): ${mode === 'Flight' ? 'Favorable speed (+20%)' : mode === 'Ship' ? 'Slower transit (-15%)' : 'Average transit (+5%)'}</li>
                    <li>Weight (${weight}g): ${weight > 4000 ? 'Heavy cargo increases constraint (-20%)' : weight < 2000 ? 'Lightweight cargo (+15%)' : 'Average cargo handling limit.'}</li>
                    <li>Importance (${importance}): ${importance === 'high' ? 'Priority dispatch handling (+10%)' : importance === 'low' ? 'Low priority dispatch (-10%)': 'Standard delivery schedule'}</li>
                </ul>
            </div>
        `;
    });
}

const runForecastBtn = document.getElementById('runForecastBtn');
if(runForecastBtn) {
    runForecastBtn.addEventListener('click', () => {
        // Generating own custom dataset explicitly via JS
        const months = ['Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        
        let currentAvg = 200;
        if(salesData && salesData.length > 0) {
            currentAvg = salesData.reduce((acc, curr) => acc + (parseFloat(curr.Cost_of_the_Product) || 0), 0) / salesData.length;
        }
        
        const baseRevenue = currentAvg * 80; 
        
        const forecastData = [];
        const simulatedDataset = [];
        
        for(let i=0; i<6; i++) {
            const seasonality = Math.sin(i * 0.8) * 0.2 + 1; 
            const noise = (Math.random() * 0.1) - 0.05; 
            const revenue = Math.round(baseRevenue * (seasonality + noise) * (1 + (i*0.05))); 
            
            forecastData.push(revenue);
            
            simulatedDataset.push({
                month: months[i],
                projected_revenue: revenue,
                confidence_interval: Math.round(revenue * 0.15)
            });
        }
        
        console.log("Newly Generated Custom Dataset:", simulatedDataset);
        
        const ctx = document.getElementById('forecastChart');
        if(!ctx) return;
        
        if(window.forecastChartInstance) window.forecastChartInstance.destroy();
        
        window.forecastChartInstance = new Chart(ctx.getContext('2d'), {
            type: 'line',
            data: {
                labels: months,
                datasets: [{
                    label: 'Projected Sales Revenue ($)',
                    data: forecastData,
                    borderColor: '#e3b341',
                    backgroundColor: 'rgba(210, 153, 34, 0.2)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.3,
                    pointBackgroundColor: '#e3b341',
                    pointRadius: 5
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'top', labels: { color: '#8b949e' } },
                    tooltip: { 
                        callbacks: {
                            label: function(context) { return '$' + context.parsed.y.toLocaleString(); }
                        }
                    }
                },
                scales: {
                    x: { ticks: { color: '#8b949e' } },
                    y: { ticks: { color: '#8b949e' }, beginAtZero: false }
                }
            }
        });
        
        runForecastBtn.innerHTML = '<i class="fa-solid fa-check me-2"></i> Dataset & Forecast Generated';
        runForecastBtn.classList.replace('btn-outline-warning', 'btn-warning');
        runForecastBtn.classList.add('text-dark');
    });
}

// ==========================================
// Secondary Charts (Customer & Routing)
// ==========================================

function renderSecondaryCharts(data) {
    if(!document.getElementById('ratingChart')) return;
    
    // Rating Chart (Bar)
    const ratingCount = {1:0, 2:0, 3:0, 4:0, 5:0};
    const careDiscount = {"2":0, "3":0, "4":0, "5":0, "6":0, "7":0};
    const careCount = {"2":0, "3":0, "4":0, "5":0, "6":0, "7":0};
    
    const modeWeight = {"Flight":{w:0, c:0}, "Ship":{w:0, c:0}, "Road":{w:0, c:0}};
    
    data.forEach(item => {
        let r = parseInt(item.Customer_rating);
        if(r >= 1 && r <= 5) ratingCount[r]++;
        
        let calls = String(item.Customer_care_calls);
        let discount = parseFloat(item.Discount_offered) || 0;
        if(careDiscount[calls] !== undefined) {
             careDiscount[calls] += discount;
             careCount[calls]++;
        }
        
        let m = item.Mode_of_Shipment;
        if(m && modeWeight[m] !== undefined) {
             modeWeight[m].w += parseInt(item.Weight_in_gms) || 0;
             modeWeight[m].c++;
        }
    });

    const ctxRating = document.getElementById('ratingChart').getContext('2d');
    new Chart(ctxRating, {
        type: 'bar',
        data: {
            labels: ['1 Star', '2 Stars', '3 Stars', '4 Stars', '5 Stars'],
            datasets: [{
                label: 'Cust Rate',
                data: [ratingCount[1], ratingCount[2], ratingCount[3], ratingCount[4], ratingCount[5]],
                backgroundColor: ['#f85149', '#f85149', '#d29922', '#3fb950', '#3fb950'],
                borderRadius: 4
            }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
    });
    
    const avgDiscount = Object.keys(careCount).map(k => careCount[k] > 0 ? (careDiscount[k] / careCount[k]).toFixed(1) : 0);
    const ctxCare = document.getElementById('careChart').getContext('2d');
    new Chart(ctxCare, {
        type: 'line',
        data: {
            labels: Object.keys(careCount).map(k => k + ' Calls'),
            datasets: [{
                label: 'Avg Discount (%)',
                data: avgDiscount,
                borderColor: '#1f6feb',
                tension: 0.4,
                fill: true,
                backgroundColor: 'rgba(31, 111, 235, 0.2)',
                pointBackgroundColor: '#1f6feb'
            }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
    });
    
    const ctxRouting = document.getElementById('routingWeightChart').getContext('2d');
    const routingAvgWeight = Object.keys(modeWeight).map(k => modeWeight[k].c > 0 ? (modeWeight[k].w / modeWeight[k].c).toFixed(0) : 0);
    
    new Chart(ctxRouting, {
        type: 'bar',
        data: {
            labels: Object.keys(modeWeight),
            datasets: [{
                label: 'Avg Weight (g)',
                data: routingAvgWeight,
                backgroundColor: 'rgba(210, 153, 34, 0.4)',
                borderColor: '#d29922',
                borderWidth: 1,
                borderRadius: 4
            }]
        },
        options: { responsive: true, maintainAspectRatio: false, indexAxis: 'y', plugins: { legend: { display: false } } }
    });
}

// ==========================================
// Report Generation Button
// ==========================================
const generateReportBtn = document.getElementById('generateReportBtn');
if(generateReportBtn) {
    generateReportBtn.addEventListener('click', () => {
        const reportType = document.getElementById('reportType').value;
        const box = document.getElementById('reportSummaryBox');
        const title = document.getElementById('reportTitle');
        const text = document.getElementById('reportText');
        
        box.style.display = 'block';
        text.innerHTML = '<i class="fa-solid fa-spinner fa-spin me-2"></i> Analyzing dataset parameters logically...';
        
        setTimeout(() => {
            let totalRev = 0, onTime = 0, totalOrders = salesData.length;
            salesData.forEach(item => {
                totalRev += parseFloat(item.Cost_of_the_Product) || 0;
                if(parseInt(item['Reached.on.Time_Y.N']) === 1) onTime++;
            });
            let delayed = totalOrders - onTime;
            
            if(reportType === 'financial') {
                title.innerHTML = '<i class="fa-solid fa-sack-dollar me-2"></i> Financial Overview Report';
                text.innerHTML = `Based on the latest data parameters, the total shipping cost evaluates to <strong class="text-white">$${totalRev.toLocaleString()}</strong> across <strong class="text-white">${totalOrders}</strong> analyzed orders. Average cost per product shipped is roughly <strong>$${(totalRev/totalOrders).toFixed(2)}</strong>. Future forecasting indicates standard revenue retention with minimal noise variables based on seasonality logic.`;
            } else if(reportType === 'performance') {
                title.innerHTML = '<i class="fa-solid fa-truck-fast me-2"></i> Logistics Performance Report';
                text.innerHTML = `Logistics efficiency reveals that <strong class="text-success">${onTime}</strong> packages arrived on time, while <strong class="text-danger">${delayed}</strong> suffered delays. The current on-time delivery rate is <strong>${Math.round((onTime/totalOrders)*100)}%</strong>. Optimization of warehouse block capacity and weight distribution is recommended for Ship-based routing.`;
            } else if(reportType === 'customer') {
                title.innerHTML = '<i class="fa-solid fa-face-smile me-2"></i> Customer Satisfaction Report';
                text.innerHTML = `Customer sentiment remains stable. The variance between Customer Care Calls and Discounts offered highlights a proactive retention strategy whereby accounts logging over 3+ calls are generally funneled higher discounts. Highest rated orders correlate moderately with on-time Flight-based shipments.`;
            }
        }, 1500);
    });
}


// Export to CSV Function
function exportToCSV(data, filename) {
    if(!data || !data.length) return;
    
    const headers = Object.keys(data[0]);
    const csvRows = [];
    
    // Add header row
    csvRows.push(headers.join(','));
    
    // Add data rows
    data.forEach(row => {
        const values = headers.map(header => {
            const val = row[header] === null || row[header] === undefined ? '' : row[header];
            const escaped = ('' + val).replace(/"/g, '""');
            return `"${escaped}"`;
        });
        csvRows.push(values.join(','));
    });
    
    const csvString = csvRows.join('\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
