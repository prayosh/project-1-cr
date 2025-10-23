// Global state object
const state = {
    activeTab: 'home',
    freelancingHistory: [],
    sellingHistory: [],
    freelancingInput: '',
    sellingInput: '',
    freelancingDateInput: new Date().toISOString().substring(0, 10), // YYYY-MM-DD
    sellingDateInput: new Date().toISOString().substring(0, 10), // YYYY-MM-DD
    currentDate: '',
    countdown: { days: '00', hours: '00', minutes: '00', seconds: '00', passed: false },
    showFreelancingHistory: false,
    showSellingHistory: false,
    showHomeMenu: false,
    showOverallHistory: false,
    editingId: null, // For HistoryModal
    editingAmount: '', // For HistoryModal
    activeRowForActions: null, // For HistoryModal long-press to show/hide actions
    longPressTimer: null, // For HistoryModal long-press - store timer ID here
    showDeleteConfirmation: false, // For HistoryModal
    entryToDelete: null, // For HistoryModal
    longPressHandled: false, // To prevent click after long press
};

const targetDate = new Date('2026-12-31T23:59:59');
let countdownInterval = null; // Initialize countdownInterval

const LONG_PRESS_DELAY = 500; // milliseconds

// Helper function to format currency
const formatCurrency = (amount) => {
    return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
};

// Helper function to format date for history display (DD/MM/YYYY)
const formatEntryDate = (isoString) => {
    const date = new Date(isoString);
    return date.toLocaleDateString('en-GB'); 
};

// Helper function to calculate time remaining
const calculateTimeRemaining = (targetDate) => {
    const now = new Date();
    const difference = targetDate.getTime() - now.getTime();

    if (difference < 0) {
        return { days: '00', hours: '00', minutes: '00', seconds: '00', passed: true };
    }

    const days = Math.floor(difference / (1000 * 60 * 60 * 24));
    const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((difference % (1000 * 60)) / (1000 * 60));
    const seconds = Math.floor((difference % (1000 * 60)) / 1000);

    return {
        days: String(days).padStart(2, '0'),
        hours: String(hours).padStart(2, '0'),
        minutes: String(minutes).padStart(2, '0'),
        seconds: String(seconds).padStart(2, '0'),
        passed: false
    };
};

// --- Storage Management ---
const loadState = () => {
    const storedFreelancing = localStorage.getItem('freelancingHistory');
    if (storedFreelancing) {
        state.freelancingHistory = JSON.parse(storedFreelancing).map(entry => ({ 
            ...entry, 
            id: entry.id || Date.now().toString() + Math.random().toString(36).substring(2),
            type: entry.type || 'freelancing' // Ensure type is present
        }));
    }
    const storedSelling = localStorage.getItem('sellingHistory');
    if (storedSelling) {
        state.sellingHistory = JSON.parse(storedSelling).map(entry => ({ 
            ...entry, 
            id: entry.id || Date.now().toString() + Math.random().toString(36).substring(2),
            type: entry.type || 'selling' // Ensure type is present
        }));
    }
};

const saveState = () => {
    localStorage.setItem('freelancingHistory', JSON.stringify(state.freelancingHistory));
    localStorage.setItem('sellingHistory', JSON.stringify(state.sellingHistory));
};

// --- UI Rendering Functions ---

const renderProgressBar = (current, target, label) => {
    const percentage = Math.min(100, (current / target) * 100);
    const formattedCurrent = formatCurrency(current);
    const formattedTarget = formatCurrency(target);

    return `
        <div class="progress-section">
            <h3 id="${label}-progress-label">${label} Goal (${formattedTarget})</h3>
            <div class="progress-bar-container" role="progressbar"
                aria-valuenow="${percentage}" aria-valuemin="0" aria-valuemax="100"
                aria-labelledby="${label}-progress-label">
                <div class="progress-bar-fill" style="width: ${percentage}%"></div>
            </div>
            <p class="progress-text">
                <span class="current-amount">Current: ${formattedCurrent}</span>
                <span class="target-amount-line">
                    Target: <span class="target-amount">${formattedTarget}</span>
                    <span class="percentage-value">(${percentage.toFixed(2)}%)</span>
                </span>
            </p>
        </div>
    `;
};

const renderConfirmationModal = (title, message, onConfirm, onCancel) => {
    const modalDiv = document.createElement('div');
    modalDiv.className = 'modal-overlay';
    modalDiv.setAttribute('role', 'dialog');
    modalDiv.setAttribute('aria-modal', 'true');
    modalDiv.setAttribute('aria-labelledby', 'confirmation-modal-title');
    modalDiv.innerHTML = `
        <div class="modal-content">
            <h2 id="confirmation-modal-title">${title}</h2>
            <p style="text-align: center; margin-bottom: 20px;">${message}</p>
            <div style="display: flex; justify-content: center; gap: 15px;">
                <button class="cancel-btn" aria-label="Cancel">Cancel</button>
                <button class="delete-btn" aria-label="Confirm deletion">Delete</button>
            </div>
        </div>
    `;
    modalDiv.querySelector('.cancel-btn').addEventListener('click', onCancel);
    modalDiv.querySelector('.delete-btn').addEventListener('click', onConfirm);
    document.body.appendChild(modalDiv);
};

const renderHistoryModal = (title, history, onClose, onEditEntry, onDeleteEntry, showTypeColumn, tabType) => {
    const modalDiv = document.createElement('div');
    modalDiv.className = 'modal-overlay';
    modalDiv.setAttribute('role', 'dialog');
    modalDiv.setAttribute('aria-modal', 'true');
    modalDiv.setAttribute('aria-labelledby', 'modal-title');

    let historyTableHtml = '';
    if (history.length === 0) {
        historyTableHtml = '<p style="text-align:center;">No entries yet.</p>';
    } else {
        historyTableHtml = `
            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Date</th>
                            ${showTypeColumn ? '<th>Type</th>' : ''}
                            <th>Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${history.map(entry => `
                            <tr 
                                data-id="${entry.id}" 
                                data-type="${entry.type}"
                                class="${showTypeColumn ? `history-entry-${entry.type.toLowerCase()}` : ''}"
                                tabindex="0"
                                role="row"
                                aria-label="Entry of ${formatCurrency(entry.amount)} on ${formatEntryDate(entry.date)} ${showTypeColumn ? `for ${entry.type}` : ''}"
                            >
                                <td>${formatEntryDate(entry.date)}</td>
                                ${showTypeColumn ? `<td>${entry.type}</td>` : ''}
                                <td class="amount-cell" style="position: relative;">
                                    ${state.editingId === entry.id ? `
                                        <input
                                            type="number"
                                            class="history-edit-input"
                                            value="${state.editingAmount}"
                                            min="0"
                                            aria-label="Edit amount for entry on ${formatEntryDate(entry.date)}"
                                            data-id="${entry.id}"
                                        />
                                        <div class="history-action-buttons-edit">
                                            <button class="save-btn" data-id="${entry.id}" aria-label="Save edited amount">Save</button>
                                            <button class="cancel-edit-btn" data-id="${entry.id}" aria-label="Cancel editing">Cancel</button>
                                        </div>
                                    ` : `
                                        <span class="amount-display ${state.activeRowForActions === entry.id ? 'hidden' : ''}">${formatCurrency(entry.amount)}</span>
                                        <div class="history-action-buttons ${state.activeRowForActions === entry.id ? 'visible' : ''}">
                                            <button class="edit-btn" data-id="${entry.id}" aria-label="Edit amount for entry on ${formatEntryDate(entry.date)}">Edit</button>
                                            <button class="delete-btn" data-id="${entry.id}" aria-label="Delete entry on ${formatEntryDate(entry.date)}">Delete</button>
                                        </div>
                                    `}
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }

    modalDiv.innerHTML = `
        <div class="modal-content">
            <h2 id="modal-title">${title} History</h2>
            ${historyTableHtml}
            <button class="modal-close-button" aria-label="Close history">&times;</button>
        </div>
    `;

    document.body.appendChild(modalDiv);

    modalDiv.querySelector('.modal-close-button').addEventListener('click', () => {
        state.activeRowForActions = null; // Clear active row when closing modal
        state.editingId = null; // Clear editing state
        state.showDeleteConfirmation = false; // Clear confirmation state
        state.entryToDelete = null; // Clear entry to delete
        onClose(); // Call the specific onClose handler
        renderApp(); // Re-render to ensure modal is removed from DOM
    });

    // Event delegation for table rows and buttons
    modalDiv.querySelectorAll('tbody tr').forEach(row => {
        const entryId = row.dataset.id;
        const entryType = row.dataset.type;
        const entry = history.find(e => e.id === entryId);

        let activeTouchIdentifier = null; // To track a specific touch for long press

        const handleLongPressStart = (event) => {
            state.longPressHandled = false;
            if (event.type === 'touchstart') {
                event.preventDefault(); // Prevent default browser behavior (e.g., scrolling, zoom)
                // Only consider the first touch for long press
                if (event.touches.length > 0) {
                    activeTouchIdentifier = event.touches[0].identifier;
                } else {
                    return; // No touches to process
                }
            } else if (event.type === 'mousedown') {
                // For mouse, ensure only primary button (left click)
                if (event.button !== 0) return;
            }
            
            // Clear any existing timer to prevent multiple triggers
            if (state.longPressTimer) {
                clearTimeout(state.longPressTimer);
            }

            state.longPressTimer = setTimeout(() => {
                state.longPressHandled = true;
                state.activeRowForActions = entryId;
                renderApp(); // Re-render to show action buttons
            }, LONG_PRESS_DELAY);
        };

        const handleLongPressEnd = (event) => {
            if (state.longPressTimer) {
                clearTimeout(state.longPressTimer);
                state.longPressTimer = null;
            }

            // For touch events, only process if it's the tracked touch ending
            if (event.type.startsWith('touch')) {
                let touchEnded = false;
                if (activeTouchIdentifier !== null) {
                    for (let i = 0; i < event.changedTouches.length; i++) {
                        if (event.changedTouches[i].identifier === activeTouchIdentifier) {
                            touchEnded = true;
                            break;
                        }
                    }
                }
                if (!touchEnded && activeTouchIdentifier !== null && event.type === 'touchend' && event.touches.length > 0) {
                    // If the tracked touch is still active, but another touch ended
                    // or if the tracked touch is gone and this is a subsequent touchend, ignore.
                    return;
                }
                activeTouchIdentifier = null; // Reset tracked touch
            }

            // If it was a short press (longPressHandled is false), and we are not editing,
            // or if we're not currently editing this row, hide actions for *this* row.
            if (!state.longPressHandled && state.activeRowForActions === entryId && state.editingId !== entryId) {
                state.activeRowForActions = null;
                renderApp();
            }
            state.longPressHandled = false; // Reset for next interaction
        };
        
        // Use a single event listener for mouseup, touchend, touchcancel
        // and mouseleave to cover all "end" scenarios.
        const addEndListeners = (element) => {
            element.addEventListener('mouseup', handleLongPressEnd);
            element.addEventListener('mouseleave', handleLongPressEnd);
            element.addEventListener('touchend', handleLongPressEnd);
            element.addEventListener('touchcancel', handleLongPressEnd);
        };

        row.addEventListener('mousedown', handleLongPressStart);
        row.addEventListener('touchstart', handleLongPressStart, { passive: false });
        addEndListeners(row);

        // Hide actions if clicking another row or outside the modal
        // This is a broader dismiss, handled by backdrop click now for the whole modal,
        // but for individual rows, we need to ensure actions hide if focus moves.
        row.addEventListener('focusout', (event) => {
            // Check if focus is moving outside the row, but within the modal content
            if (!row.contains(event.relatedTarget) && state.activeRowForActions === entryId && state.editingId !== entryId) {
                // Delay to allow focus to shift to buttons if clicked
                setTimeout(() => {
                    if (!row.contains(document.activeElement)) { // If focus is truly outside the row
                        state.activeRowForActions = null;
                        renderApp();
                    }
                }, 50);
            }
        });


        if (state.editingId === entry.id) {
            const input = row.querySelector('.history-edit-input');
            if (input) {
                input.addEventListener('input', (e) => { state.editingAmount = e.target.value; });
                input.focus(); // Focus the input when in edit mode
            }
            
            const saveBtn = row.querySelector('.save-btn');
            if (saveBtn) saveBtn.addEventListener('click', () => {
                const newAmount = parseFloat(state.editingAmount);
                if (isNaN(newAmount) || newAmount <= 0) {
                    alert('Please enter a valid positive number.');
                    return;
                }
                const effectiveType = tabType || entryType;
                onEditEntry(entryId, newAmount, effectiveType);
                state.editingId = null;
                state.editingAmount = '';
                state.activeRowForActions = null; // Hide actions after save
                renderApp(); // Re-render to update history and close edit mode
            });
            const cancelEditBtn = row.querySelector('.cancel-edit-btn');
            if (cancelEditBtn) cancelEditBtn.addEventListener('click', () => {
                state.editingId = null;
                state.editingAmount = '';
                state.activeRowForActions = null; // Hide actions after cancel
                renderApp(); // Re-render to close edit mode
            });
        } else {
            const editBtn = row.querySelector('.edit-btn');
            if (editBtn) editBtn.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent row's click/touch from interfering
                state.editingId = entryId;
                state.editingAmount = entry.amount.toString();
                state.activeRowForActions = null; // Hide actions after clicking edit
                renderApp(); // Re-render to open edit mode
            });
            const deleteBtn = row.querySelector('.delete-btn');
            if (deleteBtn) deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent row's click/touch from interfering
                state.entryToDelete = entry;
                state.showDeleteConfirmation = true;
                state.activeRowForActions = null; // Hide actions after clicking delete
                renderApp(); // Re-render to show confirmation modal
            });
        }
    });

    if (state.showDeleteConfirmation && state.entryToDelete) {
        renderConfirmationModal(
            "Confirm Deletion",
            `Are you sure you want to delete this entry of ${formatCurrency(state.entryToDelete.amount)} on ${formatEntryDate(state.entryToDelete.date)}?`,
            () => { // onConfirm
                const effectiveType = tabType || state.entryToDelete.type; // Use tabType if available, else entry type
                onDeleteEntry(state.entryToDelete.id, effectiveType);
                state.showDeleteConfirmation = false;
                state.entryToDelete = null;
                renderApp(); // Re-render to update history and close modal
            },
            () => { // onCancel
                state.showDeleteConfirmation = false;
                state.entryToDelete = null;
                renderApp(); // Re-render to close modal
            }
        );
    }
};

const renderHomeMenuOverlay = () => {
    const menuDiv = document.createElement('div');
    menuDiv.className = `home-menu-overlay ${state.showHomeMenu ? 'open' : ''}`;
    menuDiv.setAttribute('role', 'menu');
    menuDiv.setAttribute('aria-labelledby', 'home-menu-fab');
    menuDiv.innerHTML = `
        <div class="menu-header">Menu</div>
        <button role="menuitem" class="overall-history-btn" aria-label="Show Overall Income History">
            Overall Income History
        </button>
    `;
    const overallHistoryBtn = menuDiv.querySelector('.overall-history-btn');
    overallHistoryBtn.addEventListener('click', () => {
        state.showOverallHistory = true;
        state.showHomeMenu = false;
        renderApp();
    });
    document.body.appendChild(menuDiv);

    const backdropDiv = document.createElement('div');
    backdropDiv.className = `sidebar-backdrop ${state.showHomeMenu ? 'open' : ''}`;
    backdropDiv.setAttribute('aria-hidden', !state.showHomeMenu);
    backdropDiv.addEventListener('click', () => {
        state.showHomeMenu = false;
        renderApp();
    });
    document.body.appendChild(backdropDiv);

    const homeMenuFab = document.getElementById('home-menu-fab');

    const handleClickOutside = (event) => {
        // Check if the click is outside the menu AND not on the FAB button that opens it
        if (!menuDiv.contains(event.target) && (!homeMenuFab || !homeMenuFab.contains(event.target))) {
            state.showHomeMenu = false;
            renderApp();
            // Cleanup listeners after closing
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('touchstart', handleClickOutside);
            document.removeEventListener('keydown', handleEscape);
        }
    };

    const handleEscape = (event) => {
        if (event.key === 'Escape') {
            state.showHomeMenu = false;
            renderApp();
            // Cleanup listeners after closing
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('touchstart', handleClickOutside);
            document.removeEventListener('keydown', handleEscape);
        }
    };

    if (state.showHomeMenu) {
        // Add listeners only when menu is open
        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('touchstart', handleClickOutside);
        document.addEventListener('keydown', handleEscape);
    }
};

const renderApp = () => {
    const root = document.getElementById('root');
    if (!root) return;

    // Clear previous content
    root.innerHTML = '';
    // Clear all dynamically added modals/overlays from body
    document.body.querySelectorAll('.modal-overlay').forEach(modal => modal.remove());
    document.body.querySelectorAll('.home-menu-overlay').forEach(menu => menu.remove());
    document.body.querySelectorAll('.sidebar-backdrop').forEach(backdrop => backdrop.remove());
    document.body.querySelectorAll('.fab-button').forEach(fab => fab.remove());


    const appContainer = document.createElement('div');
    appContainer.className = 'app-container';

    // Header
    appContainer.innerHTML += `
        <header class="app-header">
            <h1 class="app-title">Project 1 Cr</h1>
            <p class="current-date">${state.currentDate}</p>
        </header>
    `;

    // Main Content
    const mainContent = document.createElement('main');
    mainContent.className = 'main-content';

    const freelancingIncome = state.freelancingHistory.reduce((sum, entry) => sum + entry.amount, 0);
    const sellingIncome = state.sellingHistory.reduce((sum, entry) => sum + entry.amount, 0);

    if (state.activeTab === 'home') {
        mainContent.innerHTML += `
            <div class="tab-content" role="tabpanel" id="home-panel" aria-labelledby="home-tab">
                ${renderProgressBar(freelancingIncome + sellingIncome, 10000000, 'Overall')}
                <div class="countdown-card" aria-live="polite">
                    <h2>Goal Deadline</h2>
                    ${state.countdown.passed ? `
                        <p class="countdown-timer">Goal date passed!</p>
                    ` : `
                        <div class="countdown-grid">
                            <div class="countdown-item">
                                <span class="countdown-value days-value-color" id="countdown-days">${state.countdown.days}</span>
                                <span class="countdown-label">Days</span>
                            </div>
                            <div class="countdown-item">
                                <span class="countdown-value" id="countdown-hours">${state.countdown.hours}</span>
                                <span class="countdown-label">Hours</span>
                            </div>
                            <div class="countdown-item">
                                <span class="countdown-value" id="countdown-minutes">${state.countdown.minutes}</span>
                                <span class="countdown-label">Minutes</span>
                            </div>
                            <div class="countdown-item">
                                <span class="countdown-value" id="countdown-seconds">${state.countdown.seconds}</span>
                                <span class="countdown-label">Seconds</span>
                            </div>
                        </div>
                    `}
                </div>
            </div>
        `;
        // Add FAB button for menu
        const menuFab = document.createElement('button');
        menuFab.className = 'fab-button menu-fab';
        menuFab.id = 'home-menu-fab';
        menuFab.setAttribute('aria-label', 'Open Home Menu');
        menuFab.innerHTML = `
            <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
                <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"/>
            </svg>
        `;
        menuFab.addEventListener('click', () => {
            state.showHomeMenu = !state.showHomeMenu;
            renderApp();
        });
        document.body.appendChild(menuFab);

        if (state.showHomeMenu) {
            renderHomeMenuOverlay();
        }
        if (state.showOverallHistory) {
            const combinedHistory = [
                ...state.freelancingHistory.map(entry => ({ ...entry, type: 'Freelancing' })),
                ...state.sellingHistory.map(entry => ({ ...entry, type: 'Selling' }))
            ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

            renderHistoryModal(
                "Overall Combined",
                combinedHistory,
                () => { state.showOverallHistory = false; renderApp(); }, // Ensure renderApp is called here
                handleEditHistoryEntry,
                handleDeleteHistoryEntry,
                true, // showTypeColumn
                null // tabType is null for overall
            );
        }

    } else if (state.activeTab === 'freelancing') {
        mainContent.innerHTML += `
            <div class="tab-content" role="tabpanel" id="freelancing-panel" aria-labelledby="freelancing-tab">
                ${renderProgressBar(freelancingIncome, 5000000, 'Freelancing')}
                <div class="input-card">
                    <div class="input-row">
                        <label for="freelancing-income-input" class="sr-only">Enter income amount for freelancing</label>
                        <div class="input-wrapper">
                            <span class="currency-icon" aria-hidden="true">₹</span>
                            <input
                                id="freelancing-income-input"
                                type="number"
                                value="${state.freelancingInput}"
                                placeholder="Amount"
                                min="0"
                                aria-describedby="freelancing-income-help"
                            />
                        </div>
                        <label for="freelancing-date-input" class="sr-only">Select date for freelancing income</label>
                        <div class="input-wrapper date-input">
                            <input
                                id="freelancing-date-input"
                                type="date"
                                value="${state.freelancingDateInput}"
                                aria-label="Select date"
                                title="Format: YYYY-MM-DD"
                                max="${new Date().toISOString().substring(0, 10)}"
                            />
                        </div>
                    </div>
                    <button id="add-freelancing-income-btn">Add Income</button>
                </div>
            </div>
        `;

        // Add event listeners for freelancing inputs and button
        // Using setTimeout to ensure elements are in DOM after innerHTML assignment
        setTimeout(() => { 
            const incomeInput = document.getElementById('freelancing-income-input');
            const dateInput = document.getElementById('freelancing-date-input');
            const addButton = document.getElementById('add-freelancing-income-btn');

            if (incomeInput) incomeInput.addEventListener('input', (e) => { state.freelancingInput = e.target.value; });
            if (dateInput) dateInput.addEventListener('change', (e) => { state.freelancingDateInput = e.target.value; });
            if (addButton) addButton.addEventListener('click', () => {
                handleAddIncome('freelancing');
                renderApp(); // Re-render after adding income
            });
        }, 0);

        // Add FAB button for history
        const historyFab = document.createElement('button');
        historyFab.className = 'fab-button history-fab';
        historyFab.setAttribute('aria-label', 'Show Freelancing Income History');
        historyFab.innerHTML = `
            <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
                <path d="M19 3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-1 16H6v-2h12v2zm0-4H6v-2h12v2zm0-4H6V7h12v2z"/>
            </svg>
        `;
        historyFab.addEventListener('click', () => {
            state.showFreelancingHistory = true;
            renderApp();
        });
        document.body.appendChild(historyFab);

        if (state.showFreelancingHistory) {
            renderHistoryModal(
                "Freelancing",
                state.freelancingHistory,
                () => { 
                    state.showFreelancingHistory = false; 
                    state.editingId = null; 
                    state.activeRowForActions = null; 
                    renderApp(); 
                },
                handleEditHistoryEntry,
                handleDeleteHistoryEntry,
                false, // showTypeColumn
                'freelancing' // tabType
            );
        }

    } else if (state.activeTab === 'selling') {
        mainContent.innerHTML += `
            <div class="tab-content" role="tabpanel" id="selling-panel" aria-labelledby="selling-tab">
                ${renderProgressBar(sellingIncome, 5000000, 'Selling')}
                <div class="input-card">
                    <div class="input-row">
                        <label for="selling-income-input" class="sr-only">Enter income amount for selling</label>
                        <div class="input-wrapper">
                            <span class="currency-icon" aria-hidden="true">₹</span>
                            <input
                                id="selling-income-input"
                                type="number"
                                value="${state.sellingInput}"
                                placeholder="Amount"
                                min="0"
                                aria-describedby="selling-income-help"
                            />
                        </div>
                        <label for="selling-date-input" class="sr-only">Select date for selling income</label>
                        <div class="input-wrapper date-input">
                            <input
                                id="selling-date-input"
                                type="date"
                                value="${state.sellingDateInput}"
                                aria-label="Select date"
                                title="Format: YYYY-MM-DD"
                                max="${new Date().toISOString().substring(0, 10)}"
                            />
                        </div>
                    </div>
                    <button id="add-selling-income-btn">Add Income</button>
                </div>
            </div>
        `;
        // Add event listeners for selling inputs and button
        setTimeout(() => { // Ensure elements are in DOM
            const incomeInput = document.getElementById('selling-income-input');
            const dateInput = document.getElementById('selling-date-input');
            const addButton = document.getElementById('add-selling-income-btn');

            if (incomeInput) incomeInput.addEventListener('input', (e) => { state.sellingInput = e.target.value; });
            if (dateInput) dateInput.addEventListener('change', (e) => { state.sellingDateInput = e.target.value; });
            if (addButton) addButton.addEventListener('click', () => {
                handleAddIncome('selling');
                renderApp(); // Re-render after adding income
            });
        }, 0);

        // Add FAB button for history
        const historyFab = document.createElement('button');
        historyFab.className = 'fab-button history-fab';
        historyFab.setAttribute('aria-label', 'Show Selling Income History');
        historyFab.innerHTML = `
            <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
                <path d="M19 3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-1 16H6v-2h12v2zm0-4H6v-2h12v2zm0-4H6V7h12v2z"/>
            </svg>
        `;
        historyFab.addEventListener('click', () => {
            state.showSellingHistory = true;
            renderApp();
        });
        document.body.appendChild(historyFab);

        if (state.showSellingHistory) {
            renderHistoryModal(
                "Selling",
                state.sellingHistory,
                () => { 
                    state.showSellingHistory = false; 
                    state.editingId = null; 
                    state.activeRowForActions = null; 
                    renderApp(); 
                },
                handleEditHistoryEntry,
                handleDeleteHistoryEntry,
                false, // showTypeColumn
                'selling' // tabType
            );
        }
    }
    appContainer.appendChild(mainContent);

    // Footer (Tab Bar)
    appContainer.innerHTML += `
        <footer class="tab-bar" role="tablist">
            <button
                class="tab-button ${state.activeTab === 'freelancing' ? 'active' : ''}"
                data-tab="freelancing"
                role="tab"
                aria-controls="freelancing-panel"
                aria-selected="${state.activeTab === 'freelancing'}"
                id="freelancing-tab"
            >
                Freelancing
            </button>
            <button
                class="tab-button ${state.activeTab === 'home' ? 'active' : ''}"
                data-tab="home"
                role="tab"
                aria-controls="home-panel"
                aria-selected="${state.activeTab === 'home'}"
                id="home-tab"
                aria-label="Home"
            >
                <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
                    <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/>
                </svg>
            </button>
            <button
                class="tab-button ${state.activeTab === 'selling' ? 'active' : ''}"
                data-tab="selling"
                role="tab"
                aria-controls="selling-panel"
                aria-selected="${state.activeTab === 'selling'}"
                id="selling-tab"
            >
                Selling
            </button>
        </footer>
    `;
    root.appendChild(appContainer);

    // Attach tab bar event listeners
    appContainer.querySelectorAll('.tab-button').forEach(button => {
        button.addEventListener('click', (e) => {
            if (state.activeTab === e.currentTarget.dataset.tab) return; // Don't re-render if clicking active tab

            state.activeTab = e.currentTarget.dataset.tab;
            // Reset modal states and editing state when changing tabs
            state.showFreelancingHistory = false;
            state.showSellingHistory = false;
            state.showHomeMenu = false;
            state.showOverallHistory = false;
            state.editingId = null;
            state.activeRowForActions = null;
            state.showDeleteConfirmation = false;
            state.entryToDelete = null;
            // Clear any active long press timer
            if (state.longPressTimer) {
                clearTimeout(state.longPressTimer);
                state.longPressTimer = null;
            }
            renderApp();
        });
    });
};

// --- Event Handlers for Global Actions ---
const handleAddIncome = (type) => {
    const inputAmount = type === 'freelancing' ? state.freelancingInput : state.sellingInput;
    const selectedDate = type === 'freelancing' ? state.freelancingDateInput : state.sellingDateInput;
    const amount = parseFloat(inputAmount);

    if (isNaN(amount) || amount <= 0) {
        alert('Please enter a valid positive number for income.');
        return;
    }
    if (!selectedDate) {
        alert('Please select a date.');
        return;
    }

    const newEntry = { id: Date.now().toString() + Math.random().toString(36).substring(2), amount, date: new Date(selectedDate).toISOString(), type };

    if (type === 'freelancing') {
        state.freelancingHistory.push(newEntry);
        state.freelancingInput = '';
        state.freelancingDateInput = new Date().toISOString().substring(0, 10);
    } else { // type === 'selling'
        state.sellingHistory.push(newEntry);
        state.sellingInput = '';
        state.sellingDateInput = new Date().toISOString().substring(0, 10);
    }
    saveState();
    // renderApp() is called by the button click listener after this function
};

const handleEditHistoryEntry = (id, newAmount, type) => {
    const updateHistory = (history) => 
        history.map(entry =>
            entry.id === id ? { ...entry, amount: newAmount } : entry
        );

    if (type === 'freelancing' || type === 'Freelancing') { 
        state.freelancingHistory = updateHistory(state.freelancingHistory);
    } else if (type === 'selling' || type === 'Selling') { 
        state.sellingHistory = updateHistory(state.sellingHistory);
    }
    saveState();
    // renderApp() is explicitly called after confirmation in renderHistoryModal
};

const handleDeleteHistoryEntry = (id, type) => {
    if (type === 'freelancing' || type === 'Freelancing') {
        state.freelancingHistory = state.freelancingHistory.filter(entry => entry.id !== id);
    } else if (type === 'selling' || type === 'Selling') {
        state.sellingHistory = state.sellingHistory.filter(entry => entry.id !== id);
    }
    saveState();
    // renderApp() is explicitly called after confirmation in renderHistoryModal
};


// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    loadState();

    const today = new Date();
    state.currentDate = today.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    // Clear any existing interval before setting a new one
    if (countdownInterval) {
        clearInterval(countdownInterval);
    }

    countdownInterval = setInterval(() => {
        const newCountdown = calculateTimeRemaining(targetDate);
        
        // Only update DOM directly if on home tab and goal not passed
        if (state.activeTab === 'home' && !newCountdown.passed) {
            const daysEl = document.getElementById('countdown-days');
            const hoursEl = document.getElementById('countdown-hours');
            const minutesEl = document.getElementById('countdown-minutes');
            const secondsEl = document.getElementById('countdown-seconds');

            if (daysEl && daysEl.textContent !== newCountdown.days) {
                daysEl.textContent = newCountdown.days;
                daysEl.classList.add('digit-pop-animation'); // Trigger animation
                daysEl.addEventListener('animationend', () => daysEl.classList.remove('digit-pop-animation'), {once: true});
            }
            if (hoursEl && hoursEl.textContent !== newCountdown.hours) {
                hoursEl.textContent = newCountdown.hours;
                hoursEl.classList.add('digit-pop-animation');
                hoursEl.addEventListener('animationend', () => hoursEl.classList.remove('digit-pop-animation'), {once: true});
            }
            if (minutesEl && minutesEl.textContent !== newCountdown.minutes) {
                minutesEl.textContent = newCountdown.minutes;
                minutesEl.classList.add('digit-pop-animation');
                minutesEl.addEventListener('animationend', () => minutesEl.classList.remove('digit-pop-animation'), {once: true});
            }
            if (secondsEl && secondsEl.textContent !== newCountdown.seconds) {
                secondsEl.textContent = newCountdown.seconds;
                secondsEl.classList.add('digit-pop-animation');
                secondsEl.addEventListener('animationend', () => secondsEl.classList.remove('digit-pop-animation'), {once: true});
            }
        }

        // Trigger a full re-render only if the "passed" status changes
        if (newCountdown.passed !== state.countdown.passed) {
            state.countdown = newCountdown;
            clearInterval(countdownInterval);
            countdownInterval = null; // Clear the interval reference
            renderApp(); // Full re-render to show "Goal date passed!" message
        } else {
            state.countdown = newCountdown; // Always update state for consistency
        }
    }, 1000);

    renderApp(); // Initial render
});