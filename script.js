document.addEventListener('DOMContentLoaded', () => {
    
    // Check if salesData is available from data.js
    if (typeof salesData === 'undefined' || !salesData.length) {
        console.error("Sales data not found. Please ensure data.js is loaded.");
        return;
    }

    // Initialize Dashboard
    calculateKPIs(salesData);
    renderCharts(salesData);
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
