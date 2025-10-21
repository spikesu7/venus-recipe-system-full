// Main JavaScript for Venus Recipe System
let currentData = {
    campuses: [],
    recipes: [],
    selectedCampuses: [],
    startDate: '',
    endDate: ''
};

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

function initializeApp() {
    // Set default date range (this week)
    setDefaultDateRange();

    // Load initial data
    loadCampuses();
    loadRecipes();

    // Setup event listeners
    setupEventListeners();
}

function setDefaultDateRange() {
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay() + 1); // Monday

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6); // Sunday

    document.getElementById('startDate').value = formatDateForInput(startOfWeek);
    document.getElementById('endDate').value = formatDateForInput(endOfWeek);

    currentData.startDate = formatDateForInput(startOfWeek);
    currentData.endDate = formatDateForInput(endOfWeek);
}

function formatDateForInput(date) {
    return date.toISOString().split('T')[0];
}

function setupEventListeners() {
    // Tab change listeners
    document.querySelectorAll('[data-bs-toggle="tab"]').forEach(tab => {
        tab.addEventListener('shown.bs.tab', function(e) {
            const target = e.target.getAttribute('data-bs-target');
            loadTabContent(target);
        });
    });
}

// API call functions
async function apiCall(endpoint, options = {}) {
    try {
        showLoading();
        const response = await fetch(`/api${endpoint}`, {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        });

        const data = await response.json();

        if (!data.success) {
            throw new Error(data.message || 'API call failed');
        }

        return data;
    } catch (error) {
        console.error('API Error:', error);
        showToast('数据加载失败: ' + error.message, 'danger');
        throw error;
    } finally {
        hideLoading();
    }
}

// Load functions
async function loadCampuses() {
    try {
        const result = await apiCall('/campuses');
        currentData.campuses = result.data;
        renderCampusCheckboxes();
        updateQuickStats();
    } catch (error) {
        console.error('Failed to load campuses:', error);
    }
}

async function loadRecipes() {
    try {
        const params = new URLSearchParams();
        if (currentData.selectedCampuses.length > 0) {
            params.append('campus_id', currentData.selectedCampuses.join(','));
        }
        if (currentData.startDate) {
            params.append('start_date', currentData.startDate);
        }
        if (currentData.endDate) {
            params.append('end_date', currentData.endDate);
        }

        const endpoint = `/recipes?${params.toString()}`;
        const result = await apiCall(endpoint);
        currentData.recipes = result.data;
        renderRecipes();
        updateQuickStats();
    } catch (error) {
        console.error('Failed to load recipes:', error);
    }
}

// Render functions
function renderCampusCheckboxes() {
    const container = document.getElementById('campusCheckboxes');

    if (currentData.campuses.length === 0) {
        container.innerHTML = '<div class="text-muted">暂无园区数据</div>';
        return;
    }

    container.innerHTML = currentData.campuses.map(campus => `
        <div class="form-check mb-2">
            <input class="form-check-input" type="checkbox" value="${campus.id}"
                   id="campus_${campus.id}" checked onchange="onCampusChange(${campus.id})">
            <label class="form-check-label" for="campus_${campus.id}">
                <small>${campus.name}</small>
            </label>
        </div>
    `).join('');

    // Set initial selected campuses
    currentData.selectedCampuses = currentData.campuses.map(c => c.id);
}

function renderRecipes() {
    const container = document.getElementById('recipeContent');

    if (currentData.recipes.length === 0) {
        container.innerHTML = `
            <div class="text-center py-5 text-muted">
                <i class="bi bi-calendar-x display-1"></i>
                <p class="mt-3">暂无食谱数据</p>
            </div>
        `;
        return;
    }

    // Group recipes by date
    const recipesByDate = {};
    currentData.recipes.forEach(recipe => {
        if (!recipesByDate[recipe.date]) {
            recipesByDate[recipe.date] = [];
        }
        recipesByDate[recipe.date].push(recipe);
    });

    // Sort dates
    const sortedDates = Object.keys(recipesByDate).sort();

    container.innerHTML = sortedDates.map(date => {
        const dateRecipes = recipesByDate[date];
        const dateObj = new Date(date);
        const dateStr = dateObj.toLocaleDateString('zh-CN', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            weekday: 'long'
        });

        return `
            <div class="mb-4">
                <h5 class="mb-3">
                    <i class="bi bi-calendar-date"></i> ${dateStr}
                </h5>
                <div class="row">
                    ${dateRecipes.map(recipe => renderRecipeCard(recipe)).join('')}
                </div>
            </div>
        `;
    }).join('');
}

function renderRecipeCard(recipe) {
    const mealTypeClass = getMealTypeClass(recipe.meal_type);
    const campus = currentData.campuses.find(c => c.id === recipe.campus_id);

    return `
        <div class="col-md-6 col-lg-4 mb-3">
            <div class="card recipe-card h-100">
                <div class="card-body">
                    <div class="d-flex justify-content-between align-items-start mb-2">
                        <h6 class="card-title">${recipe.dish?.name || '未知菜品'}</h6>
                        <span class="badge ${mealTypeClass} meal-type-badge">${recipe.meal_type}</span>
                    </div>
                    <p class="card-text small text-muted mb-2">
                        ${recipe.dish?.description || ''}
                    </p>
                    <div class="d-flex justify-content-between align-items-center">
                        <span class="campus-tag">${campus?.name || '未知园区'}</span>
                        <small class="text-muted">${recipe.servings}人份</small>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function getMealTypeClass(mealType) {
    const classes = {
        '早餐': 'meal-breakfast',
        '上午加餐': 'meal-morning-snack',
        '午餐': 'meal-lunch',
        '下午加餐': 'meal-afternoon-snack',
        '午点': 'meal-evening-snack'
    };
    return classes[mealType] || 'bg-secondary';
}

// Tab content loading
async function loadTabContent(tabId) {
    switch(tabId) {
        case '#grains':
            await loadGrainsStatistics();
            break;
        case '#fruits':
            await loadFruitsStatistics();
            break;
        case '#meat':
            await loadMeatStatistics();
            break;
        case '#dishes':
            await loadDishesManagement();
            break;
        case '#data':
            // Data management doesn't need async loading
            break;
    }
}

async function loadGrainsStatistics() {
    try {
        const result = await apiCall('/statistics/grains');
        renderStatistics('grainsContent', result.data, '杂粮');
    } catch (error) {
        console.error('Failed to load grains statistics:', error);
    }
}

async function loadFruitsStatistics() {
    try {
        const result = await apiCall('/statistics/fruits');
        renderStatistics('fruitsContent', result.data, '水果');
    } catch (error) {
        console.error('Failed to load fruits statistics:', error);
    }
}

async function loadMeatStatistics() {
    try {
        const result = await apiCall('/statistics/meat');
        renderStatistics('meatContent', result.data, '肉类海鲜');
    } catch (error) {
        console.error('Failed to load meat statistics:', error);
    }
}

function renderStatistics(containerId, data, category) {
    const container = document.getElementById(containerId);

    if (!data || data.length === 0) {
        container.innerHTML = `
            <div class="text-center py-5 text-muted">
                <i class="bi bi-bar-chart display-1"></i>
                <p class="mt-3">暂无${category}统计数据</p>
            </div>
        `;
        return;
    }

    container.innerHTML = `
        <div class="row">
            <div class="col-12">
                <div class="stats-card">
                    <h5>${category}用量总览</h5>
                    <div class="row">
                        ${data.map(item => `
                            <div class="col-md-6 mb-3">
                                <div class="ingredient-item">
                                    <div class="d-flex justify-content-between align-items-center">
                                        <h6 class="mb-1">${item.ingredient?.name || '未知食材'}</h6>
                                        <span class="badge bg-light text-dark">${item.total_quantity} ${item.unit}</span>
                                    </div>
                                    <small class="text-muted">
                                        ${item.usage_details?.length || 0} 个园区使用
                                    </small>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        </div>
    `;
}

// Event handlers
function onCampusChange(campusId) {
    const checkbox = document.getElementById(`campus_${campusId}`);

    if (checkbox.checked) {
        if (!currentData.selectedCampuses.includes(campusId)) {
            currentData.selectedCampuses.push(campusId);
        }
    } else {
        currentData.selectedCampuses = currentData.selectedCampuses.filter(id => id !== campusId);
    }

    loadRecipes();
}

function selectAllCampuses() {
    const checkboxes = document.querySelectorAll('#campusCheckboxes input[type="checkbox"]');
    const allChecked = Array.from(checkboxes).every(cb => cb.checked);

    checkboxes.forEach(checkbox => {
        checkbox.checked = !allChecked;
        const campusId = parseInt(checkbox.value);

        if (!allChecked) {
            if (!currentData.selectedCampuses.includes(campusId)) {
                currentData.selectedCampuses.push(campusId);
            }
        } else {
            currentData.selectedCampuses = [];
        }
    });

    loadRecipes();
}

function updateDateRange() {
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;

    if (!startDate || !endDate) {
        showToast('请选择开始和结束日期', 'warning');
        return;
    }

    if (new Date(startDate) > new Date(endDate)) {
        showToast('开始日期不能晚于结束日期', 'warning');
        return;
    }

    currentData.startDate = startDate;
    currentData.endDate = endDate;

    loadRecipes();
    showToast('日期范围已更新', 'success');
}

function updateQuickStats() {
    document.getElementById('totalRecipes').textContent = currentData.recipes.length;
    document.getElementById('activeCampuses').textContent = currentData.selectedCampuses.length;

    if (currentData.startDate && currentData.endDate) {
        const start = new Date(currentData.startDate);
        const end = new Date(currentData.endDate);
        const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
        document.getElementById('dateSpan').textContent = `${days}天`;
    }
}

// Refresh functions
function refreshRecipes() {
    loadRecipes();
    showToast('食谱数据已刷新', 'info');
}

async function refreshGrains() {
    await loadGrainsStatistics();
    showToast('杂粮统计已刷新', 'info');
}

async function refreshFruits() {
    await loadFruitsStatistics();
    showToast('水果统计已刷新', 'info');
}

async function refreshMeat() {
    await loadMeatStatistics();
    showToast('肉类海鲜统计已刷新', 'info');
}

// Dishes Management Functions
async function loadDishesManagement() {
    try {
        const result = await apiCall('/dishes');
        renderDishesManagement(result.data);
    } catch (error) {
        console.error('Failed to load dishes:', error);
        document.getElementById('dishesContent').innerHTML = `
            <div class="text-center py-5 text-danger">
                <i class="bi bi-exclamation-triangle display-1"></i>
                <p class="mt-3">加载菜品数据失败</p>
            </div>
        `;
    }
}

function renderDishesManagement(dishes) {
    const container = document.getElementById('dishesContent');

    if (!dishes || dishes.length === 0) {
        container.innerHTML = `
            <div class="text-center py-5 text-muted">
                <i class="bi bi-inbox display-1"></i>
                <p class="mt-3">暂无菜品数据</p>
            </div>
        `;
        return;
    }

    // Group dishes by category
    const dishesByCategory = {};
    dishes.forEach(dish => {
        if (!dishesByCategory[dish.category]) {
            dishesByCategory[dish.category] = [];
        }
        dishesByCategory[dish.category].push(dish);
    });

    let html = '';
    Object.keys(dishesByCategory).forEach(category => {
        html += `
            <div class="mb-4">
                <h5 class="mb-3">
                    <span class="badge bg-primary">${category}</span>
                    <span class="text-muted ms-2">${dishesByCategory[category].length}道菜</span>
                </h5>
                <div class="row">
                    ${dishesByCategory[category].map(dish => renderDishCard(dish)).join('')}
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
}

function renderDishCard(dish) {
    return `
        <div class="col-md-6 col-lg-4 mb-3">
            <div class="card">
                <div class="card-body">
                    <div class="d-flex justify-content-between align-items-start mb-2">
                        <h6 class="card-title mb-0">${dish.name}</h6>
                        <div>
                            <button class="btn btn-sm btn-outline-primary me-1" onclick="editDish(${dish.id})">
                                <i class="bi bi-pencil"></i>
                            </button>
                            <button class="btn btn-sm btn-outline-danger" onclick="deleteDish(${dish.id})">
                                <i class="bi bi-trash"></i>
                            </button>
                        </div>
                    </div>
                    <p class="card-text small text-muted mb-2">${dish.description || '暂无描述'}</p>
                    <span class="badge bg-secondary">${dish.category}</span>
                </div>
            </div>
        </div>
    `;
}

function refreshDishes() {
    loadDishesManagement();
    showToast('菜品数据已刷新', 'info');
}

function showAddDishModal() {
    // Create a simple add dish modal
    const modalHtml = `
        <div class="modal fade" id="addDishModal" tabindex="-1">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">添加新菜品</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <form id="addDishForm">
                            <div class="mb-3">
                                <label class="form-label">菜品名称</label>
                                <input type="text" class="form-control" name="name" required>
                            </div>
                            <div class="mb-3">
                                <label class="form-label">类别</label>
                                <select class="form-select" name="category" required>
                                    <option value="">选择类别</option>
                                    <option value="早餐">早餐</option>
                                    <option value="上午加餐">上午加餐</option>
                                    <option value="午餐">午餐</option>
                                    <option value="下午加餐">下午加餐</option>
                                    <option value="午点">午点</option>
                                </select>
                            </div>
                            <div class="mb-3">
                                <label class="form-label">描述</label>
                                <textarea class="form-control" name="description" rows="2"></textarea>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">取消</button>
                        <button type="button" class="btn btn-primary" onclick="saveDish()">保存</button>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Remove existing modal if any
    const existingModal = document.getElementById('addDishModal');
    if (existingModal) {
        existingModal.remove();
    }

    // Add modal to page
    document.body.insertAdjacentHTML('beforeend', modalHtml);

    // Show modal
    const modal = new bootstrap.Modal(document.getElementById('addDishModal'));
    modal.show();
}

async function saveDish() {
    try {
        const form = document.getElementById('addDishForm');
        const formData = new FormData(form);
        const dishData = Object.fromEntries(formData.entries());

        const result = await apiCall('/dishes', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(dishData)
        });

        showToast('菜品添加成功', 'success');

        // Close modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('addDishModal'));
        modal.hide();

        // Refresh dishes list
        refreshDishes();

    } catch (error) {
        showToast('添加菜品失败: ' + error.message, 'danger');
    }
}

async function deleteDish(dishId) {
    if (!confirm('确定要删除这个菜品吗？')) {
        return;
    }

    try {
        const result = await apiCall(`/dishes/${dishId}`, {
            method: 'DELETE'
        });

        showToast('菜品删除成功', 'success');
        refreshDishes();

    } catch (error) {
        showToast('删除菜品失败: ' + error.message, 'danger');
    }
}

async function editDish(dishId) {
    showToast('编辑功能开发中...', 'info');
}

// Data Management Functions
async function importExcel() {
    const fileInput = document.getElementById('excelFile');
    const file = fileInput.files[0];

    if (!file) {
        showToast('请先选择Excel文件', 'warning');
        return;
    }

    try {
        showToast('正在处理Excel文件...', 'info');

        // Simulate file upload and processing
        setTimeout(async () => {
            const result = await apiCall('/import/excel', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    filename: file.name,
                    data: 'simulated_excel_data'
                })
            });

            showToast(`导入成功！共导入${result.data.imported_count}条数据`, 'success');
            fileInput.value = '';

        }, 2000);

    } catch (error) {
        showToast('导入失败: ' + error.message, 'danger');
    }
}

async function exportRecipes() {
    try {
        showToast('正在导出数据...', 'info');

        const exportRange = document.getElementById('exportRange').value;
        let params = {};

        if (exportRange === 'current') {
            const today = new Date();
            const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
            const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

            params = {
                start_date: formatDateForInput(startOfMonth),
                end_date: formatDateForInput(endOfMonth)
            };
        }

        const result = await apiCall(`/export/recipes?${new URLSearchParams(params).toString()}`);

        // Create download link
        const dataStr = JSON.stringify(result.data.data, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });

        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = result.data.filename.replace('.xlsx', '.json');
        link.click();

        showToast(`导出成功！共${result.data.total_count}条数据`, 'success');

    } catch (error) {
        showToast('导出失败: ' + error.message, 'danger');
    }
}

// Utility functions
function showLoading() {
    document.getElementById('loadingOverlay').style.display = 'flex';
}

function hideLoading() {
    document.getElementById('loadingOverlay').style.display = 'none';
}

function showToast(message, type = 'info') {
    const toastContainer = document.querySelector('.toast-container');
    const toastId = 'toast_' + Date.now();

    const toastHTML = `
        <div id="${toastId}" class="toast align-items-center text-white bg-${type} border-0" role="alert">
            <div class="d-flex">
                <div class="toast-body">
                    ${message}
                </div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
            </div>
        </div>
    `;

    toastContainer.insertAdjacentHTML('beforeend', toastHTML);

    const toastElement = document.getElementById(toastId);
    const toast = new bootstrap.Toast(toastElement);
    toast.show();

    toastElement.addEventListener('hidden.bs.toast', () => {
        toastElement.remove();
    });
}