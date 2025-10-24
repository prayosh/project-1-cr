

// Global state object
const state = {
    activeTab: 'home',
    freelancingHistory: [],
    sellingHistory: [],
    freelancingInput: '',
    sellingInput: '',
    freelancingDateInput: new Date().toISOString().substring(0, 10), // YYYY-MM-DD
    sellingDateInput: new Date().toISOString().substring(0, 10), // YYYY-MM-DD
    freelancingSourceInput: '',
    freelancingTypeInput: '',
    freelancingNoteInput: '',
    sellingSourceInput: '',
    sellingTypeInput: '',
    sellingNoteInput: '',
    currentDate: '',
    countdown: { days: '00', hours: '00', minutes: '00', seconds: '00', passed: false },
    showFreelancingHistory: false, // Now a full screen
    showSellingHistory: false,     // Now a full screen
    showHomeMenu: false,
    showOverallHistory: false,     // Now a full screen
    showFreelancingMenu: false,    // New tab-specific menu
    showSellingMenu: false,        // New tab-specific menu
    freelancingSourceOptions: ['Fiverr', 'Upwork', 'Social Media', 'Email', 'DM', 'Referral', 'Others'],
    freelancingTypeOptions: ['2D Marketing Ad', 'Colouring Book', 'Web App', 'Website', 'Others'],
    sellingSourceOptions: ['Pinterest', 'Others'],
    sellingTypeOptions: ['Colouring Book'],
    showOptionManagementModal: false, // For editing dropdown options
    editingOptionsFor: null,          // e.g., 'freelancingSource', 'sellingType'
    optionBeingEdited: null,          // { originalValue: 'old', newValue: 'new' }
    // For History Screen
    editingId: null, // For in-line editing of amount
    editingAmount: '',
    activeRowForActions: null,
    longPressTimer: null,
    showDeleteConfirmation: false,
    entryToDelete: null,
    longPressHandled: false,
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
        state.freelancingHistory = JSON.parse(storedFreelancing).map((entry) => ({ 
            ...entry, 
            id: entry.id || Date.now().toString() + Math.random().toString(36).substring(2),
            type: entry.type || 'freelancing', // Ensure type is present
            source: entry.source || 'Others',
            incomeType: entry.incomeType || 'Others', // Renamed 'type' to 'incomeType' to avoid conflict with freelancing/selling type
            note: entry.note || '',
        }));
    }
    const storedSelling = localStorage.getItem('sellingHistory');
    if (storedSelling) {
        state.sellingHistory = JSON.parse(storedSelling).map((entry) => ({ 
            ...entry, 
            id: entry.id || Date.now().toString() + Math.random().toString(36).substring(2),
            type: entry.type || 'selling', // Ensure type is present
            source: entry.source || 'Others',
            incomeType: entry.incomeType || 'Others', // Renamed 'type' to 'incomeType' to avoid conflict
            note: entry.note || '',
        }));
    }

    // Load dropdown options
    const loadOptions = (key, defaultOptions) => {
        const stored = localStorage.getItem(key);
        return stored ? JSON.parse(stored) : defaultOptions;
    };

    state.freelancingSourceOptions = loadOptions('freelancingSourceOptions', state.freelancingSourceOptions);
    state.freelancingTypeOptions = loadOptions('freelancingTypeOptions', state.freelancingTypeOptions);
    state.sellingSourceOptions = loadOptions('sellingSourceOptions', state.sellingSourceOptions);
    state.sellingTypeOptions = loadOptions('sellingTypeOptions', state.sellingTypeOptions);
};

const saveState = () => {
    localStorage.setItem('freelancingHistory', JSON.stringify(state.freelancingHistory));
    localStorage.setItem('sellingHistory', JSON.stringify(state.sellingHistory));
    localStorage.setItem('freelancingSourceOptions', JSON.stringify(state.freelancingSourceOptions));
    localStorage.setItem('freelancingTypeOptions', JSON.stringify(state.freelancingTypeOptions));
    localStorage.setItem('sellingSourceOptions', JSON.stringify(state.sellingSourceOptions));
    localStorage.setItem('sellingTypeOptions', JSON.stringify(state.sellingTypeOptions));
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
        <div class="modal-content small-modal">
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

const renderOptionManagementModal = (title, options, optionsKey, onClose, onAdd, onEdit, onDelete) => {
    const modalDiv = document.createElement('div');
    modalDiv.className = 'modal-overlay';
    modalDiv.setAttribute('role', 'dialog');
    modalDiv.setAttribute('aria-modal', 'true');
    modalDiv.setAttribute('aria-labelledby', 'option-management-modal-title');

    const renderOptionList = (currentOptions) => `
        <ul class="option-list" aria-live="polite">
            ${currentOptions.map((option, index) => `
                <li key="${optionsKey}-${index}" class="option-item">
                    ${state.optionBeingEdited?.originalValue === option && state.optionBeingEdited?.optionsKey === optionsKey ? `
                        <input
                            type="text"
                            value="${state.optionBeingEdited.newValue}"
                            class="option-edit-input"
                            aria-label="Edit option: ${option}"
                        />
                        <div class="option-item-actions">
                            <button class="save-option-btn" data-original-value="${option}" aria-label="Save changes to ${option}">Save</button>
                            <button class="cancel-option-btn" aria-label="Cancel editing ${option}">Cancel</button>
                        </div>
                    ` : `
                        <span class="option-text">${option}</span>
                        <div class="option-item-actions">
                            <button class="edit-option-btn" data-value="${option}" aria-label="Edit option: ${option}">Edit</button>
                            <button class="delete-option-btn" data-value="${option}" aria-label="Delete option: ${option}">Delete</button>
                        </div>
                    `}
                </li>
            `).join('')}
        </ul>
    `;

    modalDiv.innerHTML = `
        <div class="modal-content option-management-modal">
            <h2 id="option-management-modal-title">${title}</h2>
            <div class="option-add-section">
                <label for="new-option-input" class="sr-only">Add new option</label>
                <input type="text" id="new-option-input" placeholder="New option name" aria-label="Enter new option name">
                <button id="add-new-option-btn" aria-label="Add new option">Add</button>
            </div>
            ${renderOptionList(options)}
            <button class="modal-close-button" aria-label="Close options management">&times;</button>
        </div>
    `;

    document.body.appendChild(modalDiv);

    const closeButton = modalDiv.querySelector('.modal-close-button');
    if (closeButton) {
        closeButton.addEventListener('click', () => {
            state.showOptionManagementModal = false;
            state.editingOptionsFor = null;
            state.optionBeingEdited = null;
            onClose(); // Call actual close handler which will call renderApp
        });
    }

    const newOptionInput = modalDiv.querySelector('#new-option-input');
    const addNewOptionBtn = modalDiv.querySelector('#add-new-option-btn');
    if (addNewOptionBtn && newOptionInput) {
        addNewOptionBtn.addEventListener('click', () => {
            const newValue = newOptionInput.value.trim();
            if (newValue && !options.includes(newValue)) {
                onAdd(newValue, optionsKey);
                newOptionInput.value = ''; // Clear input after adding
                renderApp(); // Re-render to update the list
            } else if (!newValue) {
                alert('Option cannot be empty.');
            } else {
                alert('Option already exists.');
            }
        });
    }

    // Event delegation for edit/delete buttons
    modalDiv.addEventListener('click', (e) => {
        const target = e.target;
        if (target.classList.contains('edit-option-btn')) {
            const valueToEdit = target.dataset.value;
            if (valueToEdit) {
                state.optionBeingEdited = { originalValue: valueToEdit, newValue: valueToEdit, optionsKey: optionsKey };
                renderApp(); // Re-render to show input field
            }
        } else if (target.classList.contains('delete-option-btn')) {
            const valueToDelete = target.dataset.value;
            if (options.length <= 1) { // Prevent deleting last option
                alert('Cannot delete the last option.');
                return;
            }
            if (valueToDelete && confirm(`Are you sure you want to delete "${valueToDelete}"?`)) {
                onDelete(valueToDelete, optionsKey);
                renderApp(); // Re-render to update the list
            }
        } else if (target.classList.contains('save-option-btn')) {
            const originalValue = target.dataset.originalValue;
            const inputElement = target.closest('.option-item')?.querySelector('.option-edit-input');
            const newValue = inputElement ? inputElement.value.trim() : '';

            if (newValue && originalValue && !options.filter(opt => opt !== originalValue).includes(newValue)) {
                onEdit(originalValue, newValue, optionsKey);
                state.optionBeingEdited = null; // Exit edit mode
                renderApp(); // Re-render
            } else if (!newValue) {
                alert('Option cannot be empty.');
            } else {
                alert('Option already exists or is unchanged.');
            }
        } else if (target.classList.contains('cancel-option-btn')) {
            state.optionBeingEdited = null; // Exit edit mode
            renderApp(); // Re-render
        }
    });
};


const renderHistoryScreen = (title, history, onClose, onEditEntry, onDeleteEntry, showTypeColumn, tabType) => {
    const historyScreenDiv = document.createElement('div');
    historyScreenDiv.className = 'history-screen-container'; // Full screen container
    historyScreenDiv.setAttribute('role', 'main');
    historyScreenDiv.setAttribute('aria-labelledby', 'history-screen-title');

    let historyTableHtml = '';
    if (history.length === 0) {
        historyTableHtml = '<p style="text-align:center; padding: 20px;">No entries yet.</p>';
    } else {
        historyTableHtml = `
            <div class="table-container">
                <table class="history-table">
                    <thead>
                        <tr>
                            <th>Date</th>
                            ${showTypeColumn ? '<th>Category</th>' : ''}
                            <th>Source</th>
                            <th>Type</th>
                            <th>Note</th>
                            <th class="amount-header">Amount</th>
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
                                aria-label="Entry of ${formatCurrency(entry.amount)} on ${formatEntryDate(entry.date)} from ${entry.source} as ${entry.incomeType}"
                            >
                                <td>${formatEntryDate(entry.date)}</td>
                                ${showTypeColumn ? `<td>${entry.type}</td>` : ''}
                                <td>${entry.source}</td>
                                <td>${entry.incomeType}</td>
                                <td title="${entry.note}">${entry.note ? (entry.note.length > 30 ? entry.note.substring(0, 27) + '...' : entry.note) : '-'}</td>
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

    document.getElementById('root').appendChild(historyScreenDiv); // Append to root directly

    historyScreenDiv.innerHTML = `
        <header class="history-screen-header">
            <h2 id="history-screen-title">${title} History</h2>
        </header>
        <main class="history-screen-content">
            ${historyTableHtml}
        </main>
        <button class="fab-button history-home-fab" aria-label="Go to Home Screen">
            <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
                <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/>
            </svg>
        </button>
    `;

    historyScreenDiv.querySelector('.history-home-fab').addEventListener('click', () => {
        state.showFreelancingHistory = false;
        state.showSellingHistory = false;
        state.showOverallHistory = false;
        state.editingId = null;
        state.activeRowForActions = null;
        state.showDeleteConfirmation = false;
        state.entryToDelete = null;
        onClose(); // Call the specific onClose handler which will implicitly trigger renderApp
    });

    // Event delegation for table rows and buttons
    historyScreenDiv.querySelectorAll('tbody tr').forEach(rowElement => {
        const row = rowElement;
        const entryId = row.dataset.id;
        const entryType = row.dataset.type;
        const entry = history.find(e => e.id === entryId);

        let activeTouchIdentifier = null;

        const handleLongPressStart = (event) => {
            state.longPressHandled = false;
            if (event.type === 'touchstart') {
                event.preventDefault();
                const touchEvent = event;
                if (touchEvent.touches.length > 0) {
                    activeTouchIdentifier = touchEvent.touches[0].identifier;
                } else {
                    return;
                }
            } else if (event.type === 'mousedown') {
                const mouseEvent = event;
                if (mouseEvent.button !== 0) return;
            }
            
            if (state.longPressTimer) {
                clearTimeout(state.longPressTimer);
            }

            state.longPressTimer = setTimeout(() => {
                state.longPressHandled = true;
                state.activeRowForActions = entryId;
                renderApp();
            }, LONG_PRESS_DELAY);
        };

        const handleLongPressEnd = (event) => {
            if (state.longPressTimer) {
                clearTimeout(state.longPressTimer);
                state.longPressTimer = null;
            }

            if (event.type.startsWith('touch')) {
                const touchEvent = event;
                let touchEnded = false;
                if (activeTouchIdentifier !== null) {
                    for (let i = 0; i < touchEvent.changedTouches.length; i++) {
                        if (touchEvent.changedTouches[i].identifier === activeTouchIdentifier) {
                            touchEnded = true;
                            break;
                        }
                    }
                }
                if (!touchEnded && activeTouchIdentifier !== null && event.type === 'touchend' && touchEvent.touches.length > 0) {
                    return;
                }
                activeTouchIdentifier = null;
            }

            if (!state.longPressHandled && state.activeRowForActions === entryId && state.editingId !== entryId) {
                state.activeRowForActions = null;
                renderApp();
            }
            state.longPressHandled = false;
        };
        
        const addEndListeners = (element) => {
            element.addEventListener('mouseup', handleLongPressEnd);
            element.addEventListener('mouseleave', handleLongPressEnd);
            element.addEventListener('touchend', handleLongPressEnd);
            element.addEventListener('touchcancel', handleLongPressEnd);
        };

        row.addEventListener('mousedown', handleLongPressStart);
        row.addEventListener('touchstart', handleLongPressStart, { passive: false });
        addEndListeners(row);

        row.addEventListener('focusout', (event) => {
            setTimeout(() => {
                if (!row.contains(document.activeElement)) {
                    state.activeRowForActions = null;
                    renderApp();
                }
            }, 50);
        });

        if (state.editingId === entry.id) {
            const input = row.querySelector('.history-edit-input');
            if (input) {
                input.addEventListener('input', (e) => { state.editingAmount = e.target.value; });
                input.focus();
            }
            
            const saveBtn = row.querySelector('.save-btn');
            if (saveBtn) saveBtn.addEventListener('click', () => {
                const newAmount = parseFloat(state.editingAmount);
                if (isNaN(newAmount) || newAmount <= 0) {
                    alert('Please enter a valid positive number.');
                    return;
                }
                const effectiveType = tabType || entryType;
                if (entryId && effectiveType) { // Ensure entryId and effectiveType are not null/undefined
                    onEditEntry(entryId, newAmount, effectiveType);
                }
                state.editingId = null;
                state.editingAmount = '';
                state.activeRowForActions = null;
                renderApp();
            });
            const cancelEditBtn = row.querySelector('.cancel-edit-btn');
            if (cancelEditBtn) cancelEditBtn.addEventListener('click', () => {
                state.editingId = null;
                state.editingAmount = '';
                state.activeRowForActions = null;
                renderApp();
            });
        } else {
            const editBtn = row.querySelector('.edit-btn');
            if (editBtn) editBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                state.editingId = entryId;
                state.editingAmount = entry.amount.toString();
                state.activeRowForActions = null;
                renderApp();
            });
            const deleteBtn = row.querySelector('.delete-btn');
            if (deleteBtn) deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                state.entryToDelete = entry;
                state.showDeleteConfirmation = true;
                state.activeRowForActions = null;
                renderApp();
            });
        }
    });

    if (state.showDeleteConfirmation && state.entryToDelete) {
        renderConfirmationModal(
            "Confirm Deletion",
            `Are you sure you want to delete this entry of ${formatCurrency(state.entryToDelete.amount)} on ${formatEntryDate(state.entryToDelete.date)}?`,
            () => { // onConfirm
                const effectiveType = tabType || state.entryToDelete.type;
                if (state.entryToDelete?.id && effectiveType) {
                    onDeleteEntry(state.entryToDelete.id, effectiveType);
                }
                state.showDeleteConfirmation = false;
                state.entryToDelete = null;
                renderApp();
            },
            () => { // onCancel
                state.showDeleteConfirmation = false;
                state.entryToDelete = null;
                renderApp();
            }
        );
    }
};

const renderTabMenuOverlay = (type, menuTitle, menuItems) => {
    const menuDiv = document.createElement('div');
    menuDiv.className = `home-menu-overlay ${type === 'freelancing' ? (state.showFreelancingMenu ? 'open' : '') : (state.showSellingMenu ? 'open' : '')}`;
    menuDiv.setAttribute('role', 'menu');
    menuDiv.setAttribute('aria-labelledby', `${type}-menu-fab`);
    menuDiv.innerHTML = `
        <div class="menu-header">${menuTitle}</div>
        ${menuItems.map(item => `
            <button role="menuitem" class="${item.className}" aria-label="${item.ariaLabel}">${item.text}</button>
        `).join('')}
    `;
    document.body.appendChild(menuDiv);

    const backdropDiv = document.createElement('div');
    backdropDiv.className = `sidebar-backdrop ${type === 'freelancing' ? (state.showFreelancingMenu ? 'open' : '') : (state.showSellingMenu ? 'open' : '')}`;
    backdropDiv.setAttribute('aria-hidden', String(!((type === 'freelancing' && state.showFreelancingMenu) || (type === 'selling' && state.showSellingMenu))));
    backdropDiv.addEventListener('click', () => {
        if (type === 'freelancing') state.showFreelancingMenu = false;
        else state.showSellingMenu = false;
        renderApp();
    });
    document.body.appendChild(backdropDiv);

    // Attach event listeners for menu items
    menuItems.forEach(item => {
        const button = menuDiv.querySelector(`.${item.className}`);
        if (button) {
            button.addEventListener('click', item.onClick);
        }
    });

    const menuFab = document.getElementById(`${type}-menu-fab`);

    const handleClickOutside = (event) => {
        if (!menuDiv.contains(event.target) && (!menuFab || !menuFab.contains(event.target))) {
            if (type === 'freelancing') state.showFreelancingMenu = false;
            else state.showSellingMenu = false;
            renderApp();
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('touchstart', handleClickOutside);
            document.removeEventListener('keydown', handleEscape);
        }
    };

    const handleEscape = (event) => {
        if (event.key === 'Escape') {
            if (type === 'freelancing') state.showFreelancingMenu = false;
            else state.showSellingMenu = false;
            renderApp();
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('touchstart', handleClickOutside);
            document.removeEventListener('keydown', handleEscape);
        }
    };

    if ((type === 'freelancing' && state.showFreelancingMenu) || (type === 'selling' && state.showSellingMenu)) {
        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('touchstart', handleClickOutside);
        document.addEventListener('keydown', handleEscape);
    }
};

const renderApp = () => {
    const root = document.getElementById('root');
    if (!root) return;

    // Clear previous content and modals/overlays
    root.innerHTML = '';
    document.body.querySelectorAll('.modal-overlay').forEach(modal => modal.remove());
    document.body.querySelectorAll('.home-menu-overlay').forEach(menu => menu.remove());
    document.body.querySelectorAll('.sidebar-backdrop').forEach(backdrop => backdrop.remove());
    document.body.querySelectorAll('.fab-button').forEach(fab => fab.remove());
    document.body.querySelectorAll('.history-screen-container').forEach(screen => screen.remove()); // Clear history screens

    // Conditional rendering for full-screen history or option management modal
    if (state.showOverallHistory) {
        const combinedHistory = [
            ...state.freelancingHistory.map((entry) => ({ ...entry, type: 'Freelancing' })),
            ...state.sellingHistory.map((entry) => ({ ...entry, type: 'Selling' }))
        ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        renderHistoryScreen(
            "Overall Combined",
            combinedHistory,
            () => { state.showOverallHistory = false; state.activeTab = 'home'; renderApp(); },
            handleEditHistoryEntry,
            handleDeleteHistoryEntry,
            true,
            null
        );
        return; // Don't render main app container if history screen is open
    }
    if (state.showFreelancingHistory) {
        renderHistoryScreen(
            "Freelancing",
            state.freelancingHistory.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
            () => { state.showFreelancingHistory = false; state.activeTab = 'freelancing'; renderApp(); },
            handleEditHistoryEntry,
            handleDeleteHistoryEntry,
            false,
            'freelancing'
        );
        return;
    }
    if (state.showSellingHistory) {
        renderHistoryScreen(
            "Selling",
            state.sellingHistory.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
            () => { state.showSellingHistory = false; state.activeTab = 'selling'; renderApp(); },
            handleEditHistoryEntry,
            handleDeleteHistoryEntry,
            false,
            'selling'
        );
        return;
    }

    if (state.showOptionManagementModal && state.editingOptionsFor) {
        let title = '';
        let options = [];
        let optionsKey = '';
        const onAdd = handleAddOption;
        const onEdit = handleEditOption;
        const onDelete = handleDeleteOption;

        if (state.editingOptionsFor === 'freelancingSource') {
            title = 'Modify Freelancing Sources';
            options = state.freelancingSourceOptions;
            optionsKey = 'freelancingSourceOptions';
        } else if (state.editingOptionsFor === 'freelancingType') {
            title = 'Modify Freelancing Types';
            options = state.freelancingTypeOptions;
            optionsKey = 'freelancingTypeOptions';
        } else if (state.editingOptionsFor === 'sellingSource') {
            title = 'Modify Selling Sources';
            options = state.sellingSourceOptions;
            optionsKey = 'sellingSourceOptions';
        } else if (state.editingOptionsFor === 'sellingType') {
            title = 'Modify Selling Types';
            options = state.sellingTypeOptions;
            optionsKey = 'sellingTypeOptions';
        }

        renderOptionManagementModal(
            title,
            options,
            optionsKey,
            () => { state.showOptionManagementModal = false; state.editingOptionsFor = null; state.optionBeingEdited = null; renderApp(); },
            onAdd,
            onEdit,
            onDelete
        );
        return; // Don't render main app container if option management modal is open
    }


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
            renderTabMenuOverlay(
                'home',
                'Menu',
                [{
                    className: 'overall-history-btn',
                    ariaLabel: 'Show Overall Income History',
                    text: 'Overall Income History',
                    onClick: () => {
                        state.showOverallHistory = true;
                        state.showHomeMenu = false;
                        renderApp();
                    }
                }]
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

                    <div class="input-row">
                        <div class="input-field-group">
                            <label for="freelancing-source-select" class="sr-only">Source of freelancing income</label>
                            <select id="freelancing-source-select" class="dropdown-select" aria-label="Select income source" required>
                                <option value="" disabled ${state.freelancingSourceInput === '' ? 'selected' : ''}>Select Source</option>
                                ${state.freelancingSourceOptions.map(opt => `<option value="${opt}" ${state.freelancingSourceInput === opt ? 'selected' : ''}>${opt}</option>`).join('')}
                            </select>
                        </div>
                        <div class="input-field-group">
                            <label for="freelancing-type-select" class="sr-only">Type of freelancing work</label>
                            <select id="freelancing-type-select" class="dropdown-select" aria-label="Select work type" required>
                                <option value="" disabled ${state.freelancingTypeInput === '' ? 'selected' : ''}>Select Type</option>
                                ${state.freelancingTypeOptions.map(opt => `<option value="${opt}" ${state.freelancingTypeInput === opt ? 'selected' : ''}>${opt}</option>`).join('')}
                            </select>
                        </div>
                    </div>

                    <div class="input-field-group">
                        <label for="freelancing-note-input" class="sr-only">Add notes for freelancing income</label>
                        <textarea id="freelancing-note-input" class="note-textarea" placeholder="Add any relevant notes..." aria-label="Notes for freelancing income">${state.freelancingNoteInput}</textarea>
                    </div>

                    <button id="save-freelancing-entry-btn">Save Entry</button>
                </div>
            </div>
        `;

        // Add event listeners for freelancing inputs and button
        setTimeout(() => { 
            const incomeInput = document.getElementById('freelancing-income-input');
            const dateInput = document.getElementById('freelancing-date-input');
            const sourceSelect = document.getElementById('freelancing-source-select');
            const typeSelect = document.getElementById('freelancing-type-select');
            const noteInput = document.getElementById('freelancing-note-input');
            const saveButton = document.getElementById('save-freelancing-entry-btn');

            if (incomeInput) incomeInput.addEventListener('input', (e) => { state.freelancingInput = e.target.value; });
            if (dateInput) dateInput.addEventListener('change', (e) => { state.freelancingDateInput = e.target.value; });
            if (sourceSelect) sourceSelect.addEventListener('change', (e) => { state.freelancingSourceInput = e.target.value; });
            if (typeSelect) typeSelect.addEventListener('change', (e) => { state.freelancingTypeInput = e.target.value; });
            if (noteInput) noteInput.addEventListener('input', (e) => { state.freelancingNoteInput = e.target.value; });
            if (saveButton) saveButton.addEventListener('click', () => {
                handleAddIncome('freelancing');
                renderApp();
            });
        }, 0);

        // Add FAB button for menu
        const menuFab = document.createElement('button');
        menuFab.className = 'fab-button menu-fab';
        menuFab.id = 'freelancing-menu-fab';
        menuFab.setAttribute('aria-label', 'Open Freelancing Menu');
        menuFab.innerHTML = `
            <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
                <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"/>
            </svg>
        `;
        menuFab.addEventListener('click', () => {
            state.showFreelancingMenu = !state.showFreelancingMenu;
            renderApp();
        });
        document.body.appendChild(menuFab);

        if (state.showFreelancingMenu) {
            renderTabMenuOverlay(
                'freelancing',
                'Freelancing Options',
                [
                    {
                        className: 'show-history-btn',
                        ariaLabel: 'Show Freelancing Income History',
                        text: 'Show Freelancing History',
                        onClick: () => {
                            state.showFreelancingHistory = true;
                            state.showFreelancingMenu = false;
                            renderApp();
                        }
                    },
                    {
                        className: 'modify-source-btn',
                        ariaLabel: 'Modify Freelancing Source Options',
                        text: 'Modify Source Options',
                        onClick: () => {
                            state.showOptionManagementModal = true;
                            state.editingOptionsFor = 'freelancingSource';
                            state.showFreelancingMenu = false;
                            renderApp();
                        }
                    },
                    {
                        className: 'modify-type-btn',
                        ariaLabel: 'Modify Freelancing Type Options',
                        text: 'Modify Type Options',
                        onClick: () => {
                            state.showOptionManagementModal = true;
                            state.editingOptionsFor = 'freelancingType';
                            state.showFreelancingMenu = false;
                            renderApp();
                        }
                    }
                ]
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

                    <div class="input-row">
                        <div class="input-field-group">
                            <label for="selling-source-select" class="sr-only">Source of selling income</label>
                            <select id="selling-source-select" class="dropdown-select" aria-label="Select income source" required>
                                <option value="" disabled ${state.sellingSourceInput === '' ? 'selected' : ''}>Select Source</option>
                                ${state.sellingSourceOptions.map(opt => `<option value="${opt}" ${state.sellingSourceInput === opt ? 'selected' : ''}>${opt}</option>`).join('')}
                            </select>
                        </div>
                        <div class="input-field-group">
                            <label for="selling-type-select" class="sr-only">Type of selling product</label>
                            <select id="selling-type-select" class="dropdown-select" aria-label="Select product type" required>
                                <option value="" disabled ${state.sellingTypeInput === '' ? 'selected' : ''}>Select Type</option>
                                ${state.sellingTypeOptions.map(opt => `<option value="${opt}" ${state.sellingTypeInput === opt ? 'selected' : ''}>${opt}</option>`).join('')}
                            </select>
                        </div>
                    </div>

                    <div class="input-field-group">
                        <label for="selling-note-input" class="sr-only">Add notes for selling income</label>
                        <textarea id="selling-note-input" class="note-textarea" placeholder="Add any relevant notes..." aria-label="Notes for selling income">${state.sellingNoteInput}</textarea>
                    </div>

                    <button id="save-selling-entry-btn">Save Entry</button>
                </div>
            </div>
        `;
        // Add event listeners for selling inputs and button
        setTimeout(() => { // Ensure elements are in DOM
            const incomeInput = document.getElementById('selling-income-input');
            const dateInput = document.getElementById('selling-date-input');
            const sourceSelect = document.getElementById('selling-source-select');
            const typeSelect = document.getElementById('selling-type-select');
            const noteInput = document.getElementById('selling-note-input');
            const saveButton = document.getElementById('save-selling-entry-btn');

            if (incomeInput) incomeInput.addEventListener('input', (e) => { state.sellingInput = e.target.value; });
            if (dateInput) dateInput.addEventListener('change', (e) => { state.sellingDateInput = e.target.value; });
            if (sourceSelect) sourceSelect.addEventListener('change', (e) => { state.sellingSourceInput = e.target.value; });
            if (typeSelect) typeSelect.addEventListener('change', (e) => { state.sellingTypeInput = e.target.value; });
            if (noteInput) noteInput.addEventListener('input', (e) => { state.sellingNoteInput = e.target.value; });
            if (saveButton) saveButton.addEventListener('click', () => {
                handleAddIncome('selling');
                renderApp();
            });
        }, 0);

        // Add FAB button for menu
        const menuFab = document.createElement('button');
        menuFab.className = 'fab-button menu-fab';
        menuFab.id = 'selling-menu-fab';
        menuFab.setAttribute('aria-label', 'Open Selling Menu');
        menuFab.innerHTML = `
            <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
                <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"/>
            </svg>
        `;
        menuFab.addEventListener('click', () => {
            state.showSellingMenu = !state.showSellingMenu;
            renderApp();
        });
        document.body.appendChild(menuFab);

        if (state.showSellingMenu) {
            renderTabMenuOverlay(
                'selling',
                'Selling Options',
                [
                    {
                        className: 'show-history-btn',
                        ariaLabel: 'Show Selling Income History',
                        text: 'Show Selling History',
                        onClick: () => {
                            state.showSellingHistory = true;
                            state.showSellingMenu = false;
                            renderApp();
                        }
                    },
                    {
                        className: 'modify-source-btn',
                        ariaLabel: 'Modify Selling Source Options',
                        text: 'Modify Source Options',
                        onClick: () => {
                            state.showOptionManagementModal = true;
                            state.editingOptionsFor = 'sellingSource';
                            state.showSellingMenu = false;
                            renderApp();
                        }
                    },
                    {
                        className: 'modify-type-btn',
                        ariaLabel: 'Modify Selling Type Options',
                        text: 'Modify Type Options',
                        onClick: () => {
                            state.showOptionManagementModal = true;
                            state.editingOptionsFor = 'sellingType';
                            state.showSellingMenu = false;
                            renderApp();
                        }
                    }
                ]
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
            // Reset all modal/screen states and editing state when changing tabs
            state.showFreelancingHistory = false;
            state.showSellingHistory = false;
            state.showHomeMenu = false;
            state.showOverallHistory = false;
            state.showFreelancingMenu = false;
            state.showSellingMenu = false;
            state.showOptionManagementModal = false;
            state.editingOptionsFor = null;
            state.editingId = null;
            state.activeRowForActions = null;
            state.showDeleteConfirmation = false;
            state.entryToDelete = null;
            state.optionBeingEdited = null;
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
    const selectedSource = type === 'freelancing' ? state.freelancingSourceInput : state.sellingSourceInput;
    const selectedIncomeType = type === 'freelancing' ? state.freelancingTypeInput : state.sellingTypeInput;
    const inputNote = type === 'freelancing' ? state.freelancingNoteInput : state.sellingNoteInput;

    const amount = parseFloat(inputAmount);

    if (isNaN(amount) || amount <= 0) {
        alert('Please enter a valid positive number for income.');
        return;
    }
    if (!selectedDate) {
        alert('Please select a date.');
        return;
    }
    if (!selectedSource) {
        alert('Please select a source.');
        return;
    }
    if (!selectedIncomeType) {
        alert('Please select a type.');
        return;
    }

    const newEntry = { 
        id: Date.now().toString() + Math.random().toString(36).substring(2), 
        amount, 
        date: new Date(selectedDate).toISOString(), 
        type, // 'freelancing' or 'selling'
        source: selectedSource,
        incomeType: selectedIncomeType,
        note: inputNote
    };

    if (type === 'freelancing') {
        state.freelancingHistory.push(newEntry);
        state.freelancingInput = '';
        state.freelancingDateInput = new Date().toISOString().substring(0, 10);
        state.freelancingSourceInput = '';
        state.freelancingTypeInput = '';
        state.freelancingNoteInput = '';
    } else { // type === 'selling'
        state.sellingHistory.push(newEntry);
        state.sellingInput = '';
        state.sellingDateInput = new Date().toISOString().substring(0, 10);
        state.sellingSourceInput = '';
        state.sellingTypeInput = '';
        state.sellingNoteInput = '';
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
    // renderApp() is explicitly called after confirmation in renderHistoryScreen
};

const handleDeleteHistoryEntry = (id, type) => {
    if (type === 'freelancing' || type === 'Freelancing') {
        state.freelancingHistory = state.freelancingHistory.filter((entry) => entry.id !== id);
    } else if (type === 'selling' || type === 'Selling') {
        state.sellingHistory = state.sellingHistory.filter((entry) => entry.id !== id);
    }
    saveState();
    // renderApp() is explicitly called after confirmation in renderHistoryScreen
};

const handleAddOption = (newValue, optionsKey) => {
    let optionsArray = state[optionsKey];
    if (!optionsArray.includes(newValue)) {
        optionsArray.push(newValue);
        state[optionsKey] = [...optionsArray].sort(); // Keep sorted
        saveState();
    }
};

const handleEditOption = (originalValue, newValue, optionsKey) => {
    let optionsArray = state[optionsKey];
    if (originalValue !== newValue && !optionsArray.filter((opt) => opt !== originalValue).includes(newValue)) {
        const index = optionsArray.indexOf(originalValue);
        if (index > -1) {
            optionsArray[index] = newValue;
            state[optionsKey] = [...optionsArray].sort(); // Keep sorted
            saveState();
            // Update any input fields that might be pre-selected with the old value
            if (optionsKey === 'freelancingSourceOptions' && state.freelancingSourceInput === originalValue) state.freelancingSourceInput = newValue;
            if (optionsKey === 'freelancingTypeOptions' && state.freelancingTypeInput === originalValue) state.freelancingTypeInput = newValue;
            if (optionsKey === 'sellingSourceOptions' && state.sellingSourceInput === originalValue) state.sellingSourceInput = newValue;
            if (optionsKey === 'sellingTypeOptions' && state.sellingTypeInput === originalValue) state.sellingTypeInput = newValue;
        }
    } else if (originalValue === newValue) {
        // No change, don't show alert.
    } else {
        alert('Option already exists.');
    }
};

const handleDeleteOption = (valueToDelete, optionsKey) => {
    let optionsArray = state[optionsKey];
    if (optionsArray.length > 1) { // Prevent deleting last option
        state[optionsKey] = optionsArray.filter((opt) => opt !== valueToDelete);
        saveState();
        // Adjust default input if deleted option was selected
        if (optionsKey === 'freelancingSourceOptions' && state.freelancingSourceInput === valueToDelete) state.freelancingSourceInput = '';
        if (optionsKey === 'freelancingTypeOptions' && state.freelancingTypeInput === valueToDelete) state.freelancingTypeInput = '';
        if (optionsKey === 'sellingSourceOptions' && state.sellingSourceInput === valueToDelete) state.sellingSourceInput = '';
        if (optionsKey === 'sellingTypeOptions' && state.sellingTypeInput === valueToDelete) state.sellingTypeInput = '';
    } else {
        alert('Cannot delete the last option. At least one option must remain.');
    }
};


// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    loadState();

    const today = new Date();
    state.currentDate = today.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    // Clear any existing interval before setting a new
    if (countdownInterval) {
        clearInterval(countdownInterval);
    }
    countdownInterval = setInterval(() => {
        state.countdown = calculateTimeRemaining(targetDate);
        // Only re-render if the active tab is 'home' to avoid unnecessary full app re-renders
        // or if a countdown value actually changed (e.g., every second for 'seconds')
        if (state.activeTab === 'home') {
            const secondsElement = document.getElementById('countdown-seconds');
            if (secondsElement && secondsElement.textContent !== state.countdown.seconds) {
                // Add a small animation class for visual feedback
                secondsElement.classList.remove('digit-pop-animation');
                void secondsElement.offsetWidth; // Trigger reflow
                secondsElement.classList.add('digit-pop-animation');
            }
            renderApp(); // This will update the entire countdown block
        }
        // If countdown passed, clear the interval
        if (state.countdown.passed) {
            clearInterval(countdownInterval);
            countdownInterval = null; // Clear the reference
            if (state.activeTab === 'home') {
                renderApp(); // Final render to show "Goal date passed!"
            }
        }
    }, 1000);

    renderApp();
});