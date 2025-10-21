// Global variables
let campuses = [];
let currentGeneration = null;

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

async function initializeApp() {
    try {
        await loadCampuses();
        setupEventListeners();
        setDefaultDates();

        // Load initial data based on active tab
        const activeTab = document.querySelector('.nav-link.active');
        if (activeTab) {
            const tabId = activeTab.id;
            if (tabId === 'grains-tab') {
                await loadGrainsStatistics();
            } else if (tabId === 'fruits-tab') {
                await loadFruitsStatistics();
            } else if (tabId === 'meat-tab') {
                await loadMeatStatistics();
            } else if (tabId === 'manage-tab') {
                await initializeRecipeManagement();
            }
        }
    } catch (error) {
        console.error('App initialization failed:', error);
        showErrorToast('应用程序初始化失败');
    }
}

// Load campuses from API
async function loadCampuses() {
    try {
        const response = await fetch('/api/campuses');
        const result = await response.json();

        if (result.success) {
            campuses = result.data;
            renderCampusCheckboxes();
        } else {
            throw new Error(result.error || 'Failed to load campuses');
        }
    } catch (error) {
        console.error('Failed to load campuses:', error);
        showErrorToast('加载校区列表失败');
    }
}

// Render campus checkboxes
function renderCampusCheckboxes() {
    const container = document.getElementById('campusCheckboxes');
    container.innerHTML = '';

    campuses.forEach(campus => {
        const div = document.createElement('div');
        div.className = 'form-check';
        div.innerHTML = `
            <input class="form-check-input campus-checkbox"
                   type="checkbox"
                   value="${campus.id}"
                   id="campus_${campus.id}">
            <label class="form-check-label" for="campus_${campus.id}">
                ${campus.name} (${campus.code})
                <small class="text-muted">容量: ${campus.capacity}人</small>
            </label>
        `;
        container.appendChild(div);
    });
}

// Setup event listeners
function setupEventListeners() {
    // Campus selection
    document.getElementById('selectAllCampuses').addEventListener('change', function() {
        const checkboxes = document.querySelectorAll('.campus-checkbox');
        checkboxes.forEach(checkbox => {
            checkbox.checked = this.checked;
        });
    });

    // Recipe form submission
    document.getElementById('recipeForm').addEventListener('submit', handleRecipeGeneration);

    // Generate all button
    document.getElementById('generateAllBtn').addEventListener('click', generateAllCampuses);

    // Tab change events
    document.querySelectorAll('[data-bs-toggle="tab"]').forEach(tab => {
        tab.addEventListener('shown.bs.tab', async function(e) {
            const target = e.target.getAttribute('data-bs-target');

            if (target === '#grains') {
                await loadGrainsStatistics();
            } else if (target === '#fruits') {
                await loadFruitsStatistics();
            } else if (target === '#meat') {
                await loadMeatStatistics();
            }
        });
    });
}

// Set default dates (next Monday to Friday)
function setDefaultDates() {
    const today = new Date();
    const currentDay = today.getDay();
    const daysUntilMonday = currentDay === 0 ? 1 : (8 - currentDay);

    const nextMonday = new Date(today);
    nextMonday.setDate(today.getDate() + daysUntilMonday);

    const nextFriday = new Date(nextMonday);
    nextFriday.setDate(nextMonday.getDate() + 4);

    document.getElementById('startDate').value = formatDate(nextMonday);
    document.getElementById('endDate').value = formatDate(nextFriday);
}

// Format date for input
function formatDate(date) {
    return date.toISOString().split('T')[0];
}

// Handle recipe generation
async function handleRecipeGeneration(e) {
    e.preventDefault();

    const selectedCampuses = getSelectedCampuses();
    if (selectedCampuses.length === 0) {
        showErrorToast('请至少选择一个校区');
        return;
    }

    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;

    await generateRecipes(selectedCampuses, startDate, endDate);
}

// Generate all campuses
async function generateAllCampuses() {
    const allCampusIds = campuses.map(c => c.id);
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;

    await generateRecipes(allCampusIds, startDate, endDate);
}

// Get selected campus IDs
function getSelectedCampuses() {
    const checkboxes = document.querySelectorAll('.campus-checkbox:checked');
    return Array.from(checkboxes).map(cb => parseInt(cb.value));
}

// Generate recipes
async function generateRecipes(campusIds, startDate, endDate) {
    try {
        showLoading('正在生成食谱...', 0);

        const response = await fetch('/api/generate-recipes', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                campuses: campusIds,
                startDate: startDate,
                endDate: endDate
            })
        });

        const result = await response.json();

        if (result.success) {
            currentGeneration = result.data;
            showLoading('处理完成！', 100);

            setTimeout(() => {
                hideLoading();
                displayRecipeResults(result.data);
                showSuccessToast(`成功生成 ${result.data.totalRecipes} 个食谱！`);

                // Update statistics tabs
                updateStatisticsTabs();
            }, 1000);
        } else {
            throw new Error(result.message || 'Recipe generation failed');
        }
    } catch (error) {
        console.error('Recipe generation failed:', error);
        hideLoading();
        showErrorToast('食谱生成失败：' + error.message);
    }
}

// Display recipe results
function displayRecipeResults(data) {
    const resultsContainer = document.getElementById('recipeResults');

    // Create simple HTML content
    let html = `
        <div class="alert alert-success mb-4">
            <h5 class="alert-heading">
                <i class="bi bi-check-circle-fill me-2"></i>食谱生成完成！
            </h5>
            <p class="mb-0">为 ${data.results.length} 个校区生成 ${data.totalRecipes} 个食谱，时间范围：${data.results[0]?.stats?.dateRange || '未知'}</p>
        </div>
    `;

    // Create campus sections
    data.results.forEach(campusResult => {
        html += createCampusSection(campusResult);
    });

    resultsContainer.innerHTML = html;
    resultsContainer.style.display = 'block';
    resultsContainer.classList.add('fade-in');
}

// Create campus section with recipe table
function createCampusSection(campusResult) {
    const campus = campusResult.campus;
    const recipesByDate = {};

    // Group recipes by date and meal type (allow multiple dishes per meal)
    campusResult.recipes.forEach(recipe => {
        if (!recipesByDate[recipe.date]) {
            recipesByDate[recipe.date] = {};
        }
        if (!recipesByDate[recipe.date][recipe.meal_type]) {
            recipesByDate[recipe.date][recipe.meal_type] = [];
        }
        recipesByDate[recipe.date][recipe.meal_type].push(recipe);
    });

    let html = `
        <div class="card mb-4">
            <div class="card-header bg-primary text-white">
                <h5 class="mb-0">
                    <span class="badge bg-light text-dark me-2">${campus.code}</span>
                    ${campus.name}
                </h5>
            </div>
            <div class="card-body">
                <p><strong>地址:</strong> ${campus.address}</p>
                <p><strong>容量:</strong> ${campus.capacity} 人</p>
                <p><strong>生成数量:</strong> ${campusResult.stats.totalRecipes} 个食谱</p>

                <div class="table-responsive mt-3">
                    <table class="table table-bordered table-hover">
                        <thead class="table-light">
                            <tr>
                                <th>日期</th>
                                <th>星期</th>
                                <th>早餐</th>
                                <th>上午加餐</th>
                                <th>午餐</th>
                                <th>下午加餐</th>
                                <th>午点</th>
                            </tr>
                        </thead>
                        <tbody>
    `;

    // Create table rows
    Object.keys(recipesByDate).sort().forEach(date => {
        const dateObj = new Date(date);
        const dayNames = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
        const dayName = dayNames[dateObj.getDay()];

        const breakfast = recipesByDate[date]['早餐'] || [];
        const morningSnack = recipesByDate[date]['上午加餐'] || [];
        const lunch = recipesByDate[date]['午餐'] || [];
        const afternoonSnack = recipesByDate[date]['下午加餐'] || [];
        const afternoonTea = recipesByDate[date]['午点'] || [];

        html += `
            <tr>
                <td>${date}</td>
                <td><span class="badge bg-secondary">${dayName}</span></td>
                <td>${formatDishesForMeal(breakfast, 'breakfast')}</td>
                <td>${formatDishesForMeal(morningSnack, 'morning-snack')}</td>
                <td>${formatDishesForMeal(lunch, 'lunch')}</td>
                <td>${formatDishesForMeal(afternoonSnack, 'afternoon-snack')}</td>
                <td>${formatDishesForMeal(afternoonTea, 'afternoon-tea')}</td>
            </tr>
        `;
    });

    html += `
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;

    return html;
}

// Format dish name for display
function formatDishName(recipe) {
    if (!recipe) return '-';
    return `
        <div class="d-flex align-items-center">
            <span class="meal-type-badge meal-${recipe.meal_type} me-2">
                ${getMealTypeName(recipe.meal_type)}
            </span>
            <span>${recipe.dish_name}</span>
        </div>
    `;
}

// Get meal type name in Chinese
function getMealTypeName(mealType) {
    const names = {
        '早餐': '早餐',
        '午餐': '午餐',
        '午点': '午点'
    };
    return names[mealType] || mealType;
}

// Load grains statistics
async function loadGrainsStatistics() {
    try {
        const content = document.getElementById('grainsContent');
        content.innerHTML = `
            <div class="text-center py-5">
                <div class="spinner-border text-primary mb-3" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
                <p>正在加载杂粮用量统计...</p>
            </div>
        `;

        const response = await fetch('/api/statistics/grains');
        const result = await response.json();

        if (result.success) {
            displayStatisticsTable('grainsContent', result.data, '杂粮用量统计', 'grains');

            if (result.data.length > 0) {
                document.getElementById('grainsStatus').style.display = 'inline-block';
                document.getElementById('grains-check').style.display = 'inline';
            }
        } else {
            throw new Error(result.error || 'Failed to load grains statistics');
        }
    } catch (error) {
        console.error('Failed to load grains statistics:', error);
        document.getElementById('grainsContent').innerHTML = `
            <div class="alert alert-warning">
                <i class="bi bi-exclamation-triangle me-2"></i>
                暂无杂粮用量统计数据，请先生成食谱。
            </div>
        `;
    }
}

// Load fruits statistics
async function loadFruitsStatistics() {
    try {
        const content = document.getElementById('fruitsContent');
        content.innerHTML = `
            <div class="text-center py-5">
                <div class="spinner-border text-primary mb-3" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
                <p>正在加载水果用量统计...</p>
            </div>
        `;

        const response = await fetch('/api/statistics/fruits');
        const result = await response.json();

        if (result.success) {
            displayStatisticsTable('fruitsContent', result.data, '水果用量统计', 'fruits');

            if (result.data.length > 0) {
                document.getElementById('fruitsStatus').style.display = 'inline-block';
                document.getElementById('fruits-check').style.display = 'inline';
            }
        } else {
            throw new Error(result.error || 'Failed to load fruits statistics');
        }
    } catch (error) {
        console.error('Failed to load fruits statistics:', error);
        document.getElementById('fruitsContent').innerHTML = `
            <div class="alert alert-warning">
                <i class="bi bi-exclamation-triangle me-2"></i>
                暂无水果用量统计数据，请先生成食谱。
            </div>
        `;
    }
}

// Load meat statistics
async function loadMeatStatistics() {
    try {
        const content = document.getElementById('meatContent');
        content.innerHTML = `
            <div class="text-center py-5">
                <div class="spinner-border text-primary mb-3" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
                <p>正在加载肉类海鲜用量统计...</p>
            </div>
        `;

        const response = await fetch('/api/statistics/meat');
        const result = await response.json();

        if (result.success) {
            displayStatisticsTable('meatContent', result.data, '肉类海鲜用量统计', 'meat');

            if (result.data.length > 0) {
                document.getElementById('meatStatus').style.display = 'inline-block';
                document.getElementById('meat-check').style.display = 'inline';
            }
        } else {
            throw new Error(result.error || 'Failed to load meat statistics');
        }
    } catch (error) {
        console.error('Failed to load meat statistics:', error);
        document.getElementById('meatContent').innerHTML = `
            <div class="alert alert-warning">
                <i class="bi bi-exclamation-triangle me-2"></i>
                暂无肉类海鲜用量统计数据，请先生成食谱。
            </div>
        `;
    }
}

// Display statistics table
function displayStatisticsTable(containerId, data, title, type) {
    const container = document.getElementById(containerId);

    if (!data || data.length === 0) {
        container.innerHTML = `
            <div class="alert alert-info">
                <i class="bi bi-info-circle me-2"></i>
                暂无${title}数据，请先生成食谱。
            </div>
        `;
        return;
    }

    // Group data by campus
    const campusData = {};
    let grandTotal = 0;

    data.forEach(item => {
        if (!campusData[item.campus_id]) {
            campusData[item.campus_id] = {
                campusName: item.campus_name,
                items: [],
                total: 0
            };
        }
        campusData[item.campus_id].items.push(item);
        campusData[item.campus_id].total += item.total_quantity;
        grandTotal += item.total_quantity;
    });

    let html = `
        <div class="alert alert-success">
            <h6><i class="bi bi-graph-up me-2"></i>${title}</h6>
            <p class="mb-0">总计: <strong>${grandTotal.toFixed(2)} kg</strong></p>
        </div>
    `;

    // Create table for each campus
    Object.values(campusData).forEach(campus => {
        html += `
            <div class="mb-4">
                <h6><span class="campus-badge">${campus.campusName}</span></h6>
                <div class="table-responsive">
                    <table class="table table-hover table-bordered">
                        <thead class="table-light">
                            <tr>
                                <th>食材名称</th>
                                <th>类别</th>
                                <th>用量 (kg)</th>
                            </tr>
                        </thead>
                        <tbody>
        `;

        campus.items.forEach(item => {
            html += `
                <tr>
                    <td>${item.ingredient_name}</td>
                    <td><span class="badge bg-info">${item.category}</span></td>
                    <td><strong>${item.total_quantity.toFixed(2)} ${item.unit}</strong></td>
                </tr>
            `;
        });

        html += `
                        </tbody>
                        <tfoot class="table-light">
                            <tr>
                                <th colspan="2">校区合计</th>
                                <th><strong>${campus.total.toFixed(2)} kg</strong></th>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>
        `;
    });

    html += `
        <div class="alert alert-info mt-4">
            <h6><i class="bi bi-calculator me-2"></i>总计</h6>
            <p class="mb-0">所有校区${title}总计: <strong>${grandTotal.toFixed(2)} kg</strong></p>
        </div>
    `;

    container.innerHTML = html;
}

// Update statistics tabs status
function updateStatisticsTabs() {
    // Show check marks on all statistics tabs
    ['grains', 'fruits', 'meat'].forEach(type => {
        const statusElement = document.getElementById(`${type}Status`);
        const checkElement = document.getElementById(`${type}check`);
        if (statusElement) statusElement.style.display = 'inline-block';
        if (checkElement) checkElement.style.display = 'inline';
    });
}

// Loading overlay functions
function showLoading(message, progress = 0) {
    const overlay = document.getElementById('loadingOverlay');
    const messageEl = document.getElementById('loadingMessage');
    const progressBar = document.getElementById('progressBar');

    messageEl.textContent = message;
    progressBar.style.width = `${progress}%`;
    overlay.style.display = 'flex';
}

function hideLoading() {
    const overlay = document.getElementById('loadingOverlay');
    overlay.style.display = 'none';
}

// Toast notification functions
function showSuccessToast(message) {
    const toast = document.getElementById('successToast');
    const messageEl = document.getElementById('successMessage');
    messageEl.textContent = message;

    const bsToast = new bootstrap.Toast(toast);
    bsToast.show();
}

function showErrorToast(message) {
    const toast = document.getElementById('errorToast');
    const messageEl = document.getElementById('errorMessage');
    messageEl.textContent = message;

    const bsToast = new bootstrap.Toast(toast);
    bsToast.show();
}

// Utility functions
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Recipe Management Functions
let recipesData = [];
let dishesData = [];
let editingRecipeId = null;

// Initialize recipe management
document.addEventListener('DOMContentLoaded', function() {
    if (document.getElementById('manage-tab')) {
        document.getElementById('manage-tab').addEventListener('shown.bs.tab', initializeRecipeManagement);
    }
});

// Initialize recipe management when tab is shown
async function initializeRecipeManagement() {
    await loadCampusFilters();
    await loadDishes();
    await loadRecipes();
}

// Load campus filters
async function loadCampusFilters() {
    try {
        const response = await fetch('/api/campuses');
        const result = await response.json();

        if (result.success) {
            const select = document.getElementById('filterCampus');
            select.innerHTML = '<option value="">所有园区</option>';

            result.data.forEach(campus => {
                const option = document.createElement('option');
                option.value = campus.id;
                option.textContent = `${campus.name} (${campus.code})`;
                select.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Failed to load campus filters:', error);
    }
}

// Load dishes for editing
async function loadDishes() {
    try {
        const response = await fetch('/api/dishes');
        const result = await response.json();

        if (result.success) {
            dishesData = result.data;
            updateDishSelect();
        }
    } catch (error) {
        console.error('Failed to load dishes:', error);
    }
}

// Update dish select when meal type changes
function updateDishSelect() {
    const mealType = document.getElementById('editMealType').value;
    const select = document.getElementById('editDish');

    select.innerHTML = '<option value="">请选择菜品</option>';

    const filteredDishes = dishesData.filter(dish => dish.meal_type_category === mealType);

    filteredDishes.forEach(dish => {
        const option = document.createElement('option');
        option.value = dish.id;
        option.textContent = `${dish.name} (${dish.category_name})`;
        select.appendChild(option);
    });
}

// Load recipes based on filters
async function loadRecipes() {
    try {
        showLoading('正在加载食谱列表...', 0);

        const campusId = document.getElementById('filterCampus').value;
        const mealType = document.getElementById('filterMealType').value;

        const params = new URLSearchParams();
        if (campusId) params.append('campusId', campusId);
        if (mealType) params.append('mealType', mealType);

        const response = await fetch(`/api/recipes?${params.toString()}`);
        const result = await response.json();

        if (result.success) {
            recipesData = result.data;
            displayRecipesTable();
        } else {
            throw new Error(result.error || 'Failed to load recipes');
        }

        hideLoading();
    } catch (error) {
        console.error('Failed to load recipes:', error);
        hideLoading();
        displayRecipesError(error.message);
    }
}

// Display recipes table
function displayRecipesTable() {
    const container = document.getElementById('recipesTableContainer');

    if (!recipesData || recipesData.length === 0) {
        container.innerHTML = `
            <div class="alert alert-info text-center">
                <i class="bi bi-info-circle me-2"></i>
                <h5>暂无食谱库数据</h5>
                <p class="mb-0">请添加食谱到食谱库，或调整筛选条件。</p>
            </div>
        `;
        return;
    }

    // Group recipes by dish_id and meal_type, then merge campuses
    const recipeGroups = {};

    recipesData.forEach(recipe => {
        const key = `${recipe.dish_id}-${recipe.meal_type}`;
        if (!recipeGroups[key]) {
            recipeGroups[key] = {
                dish_id: recipe.dish_id,
                dish_name: recipe.dish_name,
                meal_type: recipe.meal_type,
                campuses: new Set(),
                servings: recipe.servings,
                ingredient_quantities: recipe.ingredient_quantities,
                recipes: []
            };
        }

        recipeGroups[key].campuses.add(recipe.campus_id);
        recipeGroups[key].recipes.push(recipe);
    });

    // Convert groups to array and determine campus display
    const uniqueRecipes = Object.values(recipeGroups);

    let html = `
        <div class="table-responsive">
            <table class="table table-hover table-striped">
                <thead class="table-dark">
                    <tr>
                        <th>园区</th>
                        <th>餐次</th>
                        <th>菜品</th>
                        <th>人数</th>
                        <th>食材用量</th>
                        <th>操作</th>
                    </tr>
                </thead>
                <tbody>
    `;

    uniqueRecipes.forEach(recipeGroup => {
        const mealTypeNames = {
            '早餐': '早餐',
            '上午加餐': '上午加餐',
            '午餐': '午餐',
            '下午加餐': '下午加餐',
            '午点': '午点'
        };

        // Determine campus display
        let campusDisplay = '';
        if (recipeGroup.campuses.size === campuses.length) {
            campusDisplay = '总园区';
        } else if (recipeGroup.campuses.size === 1) {
            const campusId = Array.from(recipeGroup.campuses)[0];
            const campus = campuses.find(c => c.id === campusId);
            campusDisplay = campus ? campus.name : '未知园区';
        } else {
            campusDisplay = `${recipeGroup.campuses.size}个园区`;
        }

        const ingredientsList = Object.entries(recipeGroup.ingredient_quantities || {})
            .map(([name, data]) => `${name}: ${data.quantity}${data.unit}`)
            .join(', ');

        html += `
            <tr>
                <td><span class="badge bg-primary">${campusDisplay}</span></td>
                <td><span class="badge bg-secondary">${mealTypeNames[recipeGroup.meal_type]}</span></td>
                <td>${recipeGroup.dish_name}</td>
                <td>${recipeGroup.servings}</td>
                <td><small>${ingredientsList || '-'}</small></td>
                <td>
                    <div class="btn-group btn-group-sm" role="group">
                        <button type="button" class="btn btn-outline-primary" onclick="editRecipeGroup(${JSON.stringify(recipeGroup.recipes.map(r => r.id))})" title="编辑">
                            <i class="bi bi-pencil"></i>
                        </button>
                        <button type="button" class="btn btn-outline-danger" onclick="deleteRecipeGroup(${JSON.stringify(recipeGroup.recipes.map(r => r.id))})" title="删除">
                            <i class="bi bi-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    });

    html += `
                </tbody>
            </table>
        </div>
    `;

    container.innerHTML = html;
}

// Display recipes error
function displayRecipesError(message) {
    const container = document.getElementById('recipesTableContainer');
    container.innerHTML = `
        <div class="alert alert-danger">
            <i class="bi bi-exclamation-triangle me-2"></i>
            <strong>加载失败</strong>
            <p class="mb-0">${message}</p>
        </div>
    `;
}

// Clear filters
function clearFilters() {
    document.getElementById('filterCampus').value = '';
    document.getElementById('filterMealType').value = '';
    loadRecipes();
}

// Edit recipe
async function editRecipe(id) {
    try {
        showLoading('正在加载食谱数据...', 0);

        const response = await fetch(`/api/recipes/${id}`);
        const result = await response.json();

        if (result.success) {
            const recipe = result.data;
            editingRecipeId = id;

            // Populate edit form
            document.getElementById('editRecipeId').value = recipe.id || '';
            document.getElementById('editCampus').value = recipe.campus_name || '';
            document.getElementById('editDate').value = recipe.date || '';
            document.getElementById('editMealType').value = recipe.meal_type || '';
            document.getElementById('editServings').value = recipe.servings || 100;

            
            // Set dish name
            setTimeout(() => {
                document.getElementById('editDish').value = recipe.dish_name || '';
                updateIngredientsDisplay(recipe);
            }, 100);

            // Show modal
            const modal = new bootstrap.Modal(document.getElementById('editRecipeModal'));
            modal.show();
        } else {
            throw new Error(result.message || 'Failed to load recipe');
        }

        hideLoading();
    } catch (error) {
        console.error('Failed to edit recipe:', error);
        hideLoading();
        showErrorToast('加载食谱数据失败：' + error.message);
    }
}

// Update ingredients display when dish changes
function updateIngredientsDisplay(recipe) {
    const dishId = document.getElementById('editDish').value;
    const dish = dishesData.find(d => d.id == dishId);

    if (!dish) {
        document.getElementById('editIngredientsContainer').innerHTML = `
            <div class="text-muted text-center">
                <i class="bi bi-info-circle me-1"></i>
                选择菜品后将自动显示食材用量
            </div>
        `;
        return;
    }

    // Use recipe's ingredient quantities if available, otherwise use dish's default ingredients
    const ingredientQuantities = recipe.ingredient_quantities || {};

    if (Object.keys(ingredientQuantities).length > 0) {
        let html = '<div class="row">';

        Object.entries(ingredientQuantities).forEach(([name, data]) => {
            html += `
                <div class="col-md-6 mb-2">
                    <div class="d-flex justify-content-between align-items-center">
                        <span>${name}</span>
                        <span class="badge bg-light text-dark">${data.quantity}${data.unit}</span>
                    </div>
                </div>
            `;
        });

        html += '</div>';
        document.getElementById('editIngredientsContainer').innerHTML = html;
    } else {
        document.getElementById('editIngredientsContainer').innerHTML = `
            <div class="text-muted text-center">
                <i class="bi bi-info-circle me-1"></i>
                该菜品暂无食材用量数据
            </div>
        `;
    }
}

// Save recipe
async function saveRecipe() {
    try {
        showLoading('正在保存食谱...', 50);

        const id = document.getElementById('editRecipeId').value;
        const dishId = document.getElementById('editDish').value;
        const date = document.getElementById('editDate').value;
        const mealType = document.getElementById('editMealType').value;
        const servings = document.getElementById('editServings').value;

        // Validate required fields
        if (!id || !dishId || !date || !mealType) {
            throw new Error('缺少必要的字段值');
        }

        // Get current recipe to preserve ingredient quantities
        const currentRecipe = recipesData.find(r => r.id === parseInt(id));
        const ingredientQuantities = currentRecipe ? currentRecipe.ingredient_quantities : {};

        const recipeData = {
            dish_name: dishId,
            date,
            meal_type: mealType,
            servings: parseInt(servings),
            ingredient_quantities: ingredientQuantities
        };

        const response = await fetch(`/api/recipes/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(recipeData)
        });

        const result = await response.json();

        hideLoading();

        if (result.success) {
            showSuccessToast('食谱更新成功！');

            // Close modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('editRecipeModal'));
            modal.hide();

            // Reload recipes
            await loadRecipes();

            // Refresh statistics if needed
            updateStatisticsTabs();
        } else {
            throw new Error(result.message || 'Failed to save recipe');
        }
    } catch (error) {
        console.error('Failed to save recipe:', error);
        hideLoading();
        showErrorToast('保存食谱失败：' + error.message);
    }
}

// Delete recipe
async function deleteRecipe(id) {
    if (!confirm('确定要删除这个食谱吗？此操作不可恢复。')) {
        return;
    }

    try {
        showLoading('正在删除食谱...', 50);

        const response = await fetch(`/api/recipes/${id}`, {
            method: 'DELETE'
        });

        const result = await response.json();

        hideLoading();

        if (result.success) {
            showSuccessToast('食谱删除成功！');

            // Reload recipes
            await loadRecipes();

            // Update dish dropdown to reflect the deleted recipe
            updateAddDishDropdown();

            // Refresh statistics if needed
            updateStatisticsTabs();
        } else {
            throw new Error(result.message || 'Failed to delete recipe');
        }
    } catch (error) {
        console.error('Failed to delete recipe:', error);
        hideLoading();
        showErrorToast('删除食谱失败：' + error.message);
    }
}

// Add Recipe Management Functions
let dishes = [];

// Load dishes for dropdowns
async function loadDishes() {
    try {
        const response = await fetch('/api/dishes');
        const result = await response.json();

        if (result.success) {
            dishes = result.data;
            updateDishDropdowns();
        } else {
            throw new Error(result.error || 'Failed to load dishes');
        }
    } catch (error) {
        console.error('Failed to load dishes:', error);
        showErrorToast('加载菜品列表失败');
    }
}

// Update dish dropdowns in modals
function updateDishDropdowns() {
    const editDishSelect = document.getElementById('editDish');
    const addDishSelect = document.getElementById('addDish');

    if (editDishSelect) {
        editDishSelect.innerHTML = '<option value="">请选择菜品</option>';
        dishes.forEach(dish => {
            const option = document.createElement('option');
            option.value = dish.id;
            option.textContent = dish.name;
            option.setAttribute('data-meal-type', dish.meal_type_category);
            editDishSelect.appendChild(option);
        });
    }

    if (addDishSelect) {
        updateAddDishDropdown();
    }
}

// Update add dish input field (now it's a text input, no dropdown needed)
function updateAddDishDropdown() {
    // Since we're now using a text input for dish names, no dropdown updates are needed
    // This function is kept for compatibility but doesn't need to do anything
}

// Initialize recipe management
async function initializeRecipeManagement() {
    await loadCampusFilters();
    await loadDishes();
    await loadRecipes();
}

// Load campuses for filter dropdowns
async function loadCampusFilters() {
    try {
        const response = await fetch('/api/campuses');
        const result = await response.json();

        if (result.success) {
            const filterCampus = document.getElementById('filterCampus');
            const addCampus = document.getElementById('addCampus');

            if (filterCampus) {
                filterCampus.innerHTML = '<option value="">所有园区</option>';
                result.data.forEach(campus => {
                    const option = document.createElement('option');
                    option.value = campus.id;
                    option.textContent = campus.name;
                    filterCampus.appendChild(option);
                });
            }

            if (addCampus) {
                addCampus.innerHTML = '<option value="">请选择园区</option>';
                result.data.forEach(campus => {
                    const option = document.createElement('option');
                    option.value = campus.id;
                    option.textContent = campus.name;
                    addCampus.appendChild(option);
                });
            }
        }
    } catch (error) {
        console.error('Failed to load campus filters:', error);
    }
}

// Add new recipe
async function addRecipe() {
    try {
        const campusId = document.getElementById('addCampus').value;
        const dishName = document.getElementById('addDish').value.trim();
        const date = document.getElementById('addDate').value;
        const mealType = document.getElementById('addMealType').value;
        const servings = document.getElementById('addServings').value;

        if (!campusId || !dishName || !date || !mealType) {
            showErrorToast('请填写所有必填字段');
            return;
        }

        showLoading('正在添加食谱...');

        const response = await fetch('/api/recipes', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                campus_id: parseInt(campusId),
                dish_name: dishName,
                date,
                meal_type: mealType,
                servings: parseInt(servings)
            })
        });

        const result = await response.json();
        hideLoading();

        if (result.success) {
            showSuccessToast('食谱添加成功！');

            // Close modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('addRecipeModal'));
            modal.hide();

            // Reset form
            document.getElementById('addRecipeForm').reset();

            // Reload recipes
            await loadRecipes();

            // Update dish dropdown to reflect the new recipe
            updateAddDishDropdown();

            updateStatisticsTabs();
        } else {
            throw new Error(result.message || 'Failed to add recipe');
        }
    } catch (error) {
        console.error('Failed to add recipe:', error);
        hideLoading();
        showErrorToast('添加食谱失败：' + error.message);
    }
}

// Format dishes for meal display
function formatDishesForMeal(dishes, mealType) {
    if (!dishes || dishes.length === 0) {
        return '<span class="text-muted">-</span>';
    }

    let html = '<div class="dish-list">';

    dishes.forEach((dish, index) => {
        const dishName = dish.dish_name || dish.name || '未知菜品';
        const ingredients = dish.ingredient_quantities;

        // Create dish card with proper styling
        html += `
            <div class="dish-card mb-1 p-2 border rounded bg-light" style="min-height: 60px;">
                <div class="fw-bold text-primary mb-1">${dishName}</div>
        `;

        // Add ingredient information if available
        if (ingredients && Object.keys(ingredients).length > 0) {
            html += '<div class="small text-muted">';
            const ingredientList = Object.keys(ingredients).slice(0, 3); // Show max 3 ingredients
            ingredientList.forEach((ingredient, idx) => {
                const data = ingredients[ingredient];
                const quantity = data.quantity ? data.quantity.toFixed(0) : '';
                const unit = data.unit || '';
                html += `<span>${ingredient} ${quantity}${unit}</span>`;
                if (idx < ingredientList.length - 1) html += ', ';
            });
            if (Object.keys(ingredients).length > 3) {
                html += '...';
            }
            html += '</div>';
        }

        html += '</div>';
    });

    html += '</div>';
    return html;
}

// Edit and delete functions for recipe groups
function editRecipeGroup(dishId, mealType) {
    const recipeGroup = Object.values(recipeGroups).find(group =>
        group.dish_id === parseInt(dishId) && group.meal_type === mealType
    );

    if (!recipeGroup || recipeGroup.recipes.length === 0) {
        showMessage('找不到对应的食谱', 'error');
        return;
    }

    currentEditId = recipeGroup.recipes[0].id; // Edit the first recipe

    document.getElementById('dish_name').value = recipeGroup.dish_name;
    document.getElementById('meal_type').value = recipeGroup.meal_type;
    document.getElementById('servings').value = recipeGroup.recipes[0].servings;
    document.getElementById('date').value = recipeGroup.recipes[0].date;
    document.getElementById('campus_id').value = recipeGroup.recipes[0].campus_id;

    recipeModal.show();
}

function deleteRecipeGroup(dishId, mealType) {
    const recipeGroup = Object.values(recipeGroups).find(group =>
        group.dish_id === parseInt(dishId) && group.meal_type === mealType
    );

    if (!recipeGroup || recipeGroup.recipes.length === 0) {
        showMessage('找不到对应的食谱', 'error');
        return;
    }

    const campusCount = recipeGroup.recipes.length;
    const confirmMessage = campusCount === 1
        ? '确定要删除这个食谱吗？'
        : `确定要删除这个食谱吗？这将删除 ${campusCount} 个园区中的相同食谱。`;

    if (confirm(confirmMessage)) {
        const deletePromises = recipeGroup.recipes.map(recipe =>
            fetch(`/api/recipes/${recipe.id}`, { method: 'DELETE' })
        );

        Promise.all(deletePromises)
        .then(responses => Promise.all(responses.map(r => r.json())))
        .then(results => {
            const successCount = results.filter(r => r.success).length;
            if (successCount === recipeGroup.recipes.length) {
                loadRecipes();
                showMessage(`成功删除 ${successCount} 个食谱`, 'success');
            } else {
                showMessage(`只成功删除了 ${successCount} 个，共 ${recipeGroup.recipes.length} 个食谱`, 'error');
            }
        })
        .catch(error => {
            showMessage('删除失败', 'error');
        });
    }
}

