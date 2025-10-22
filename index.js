// Add explicit imports for React and ReactDOM
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { createRoot } from 'react-dom/client'; // Import createRoot from react-dom/client for React 18+

// Helper function to format currency
const formatCurrency = (amount) => {
    return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
};

// Helper function to format date for history display (DD/MM/YYYY)
const formatEntryDate = (isoString) => {
    const date = new Date(isoString);
    // Use 'en-GB' locale for DD/MM/YYYY
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
    const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((difference % (1000 * 60)) / 1000);

    return {
        days: String(days).padStart(2, '0'),
        hours: String(hours).padStart(2, '0'),
        minutes: String(minutes).padStart(2, '0'),
        seconds: String(seconds).padStart(2, '0'),
        passed: false
    };
};

const ConfirmationModal = ({ title, message, onConfirm, onCancel }) => {
    return (
        <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="confirmation-modal-title">
            <div className="modal-content delete-confirmation-modal"> {/* Added specific class for styling */}
                <h2 id="confirmation-modal-title">{title}</h2>
                <p style={{textAlign: 'center', marginBottom: '20px'}}>{message}</p>
                <div style={{display: 'flex', justifyContent: 'center', gap: '15px'}}>
                    <button className="cancel-btn" onClick={onCancel} aria-label="Cancel">Cancel</button>
                    <button className="delete-btn" onClick={onConfirm} aria-label="Confirm deletion">Delete</button>
                </div>
            </div>
        </div>
    );
};

const HistoryModal = ({ title, history, onClose, onEditEntry, onDeleteEntry, showTypeColumn, tabType }) => {
    const [editingId, setEditingId] = useState(null);
    const [editingAmount, setEditingAmount] = useState('');
    const [activeRowForActions, setActiveRowForActions] = useState(null); // To show edit/delete
    const longPressTimer = useRef(null);
    const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
    const [entryToDelete, setEntryToDelete] = useState(null);

    const LONG_PRESS_DELAY = 500; // milliseconds

    const handleActionStart = useCallback((entry) => {
        if (longPressTimer.current) {
            clearTimeout(longPressTimer.current);
        }
        longPressTimer.current = setTimeout(() => {
            setActiveRowForActions(entry.id);
        }, LONG_PRESS_DELAY);
    }, []);

    const handleActionEnd = useCallback(() => {
        if (longPressTimer.current) {
            clearTimeout(longPressTimer.current);
            longPressTimer.current = null;
        }
    }, []);
    
    // For mouse hover to show actions immediately, but long press to be primary
    const handleMouseEnter = useCallback((entry) => {
        if (!editingId) { // Only show actions on hover if not actively editing
            setActiveRowForActions(entry.id);
        }
    }, [editingId]);

    const handleMouseLeave = useCallback(() => {
        if (!editingId) { // Only hide actions on hover out if not actively editing
            setActiveRowForActions(null);
        }
    }, [editingId]);

    const handleEditClick = (entry) => {
        setEditingId(entry.id);
        setEditingAmount(entry.amount.toString());
        setActiveRowForActions(null); // Hide actions after clicking edit
    };

    const handleSaveEdit = (entry) => {
        const newAmount = parseFloat(editingAmount);
        if (isNaN(newAmount) || newAmount <= 0) {
            alert('Please enter a valid positive number.');
            return;
        }
        onEditEntry(entry.id, newAmount, (tabType || entry.type));
        setEditingId(null);
        setEditingAmount('');
        setActiveRowForActions(null); // Hide actions after save
    };

    const handleCancelEdit = () => {
        setEditingId(null);
        setEditingAmount('');
        setActiveRowForActions(null); // Hide actions after cancel
    };

    const handleDeleteClick = (entry) => {
        setEntryToDelete(entry);
        setShowDeleteConfirmation(true);
        setActiveRowForActions(null); // Hide actions after clicking delete
    };

    const confirmDelete = () => {
        if (entryToDelete) {
            onDeleteEntry(entryToDelete.id, (tabType || entryToDelete.type));
            setShowDeleteConfirmation(false);
            setEntryToDelete(null);
        }
    };

    const cancelDelete = () => {
        setShowDeleteConfirmation(false);
        setEntryToDelete(null);
    };

    return (
        <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="modal-title">
            <div className="modal-content">
                <h2 id="modal-title">{title} History</h2>
                {history.length === 0 ? (
                    <p>No entries yet.</p>
                ) : (
                    <div className="table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th>Date</th>
                                    {showTypeColumn && <th>Type</th>}
                                    <th>Amount</th>
                                </tr>
                            </thead>
                            <tbody>
                                {history.map((entry) => (
                                    <tr 
                                        key={entry.id} 
                                        onMouseDown={() => handleActionStart(entry)}
                                        onMouseUp={handleActionEnd}
                                        onTouchStart={() => handleActionStart(entry)}
                                        onTouchEnd={handleActionEnd}
                                        onTouchCancel={handleActionEnd}
                                        onMouseEnter={() => handleMouseEnter(entry)} // Show actions on hover
                                        onMouseLeave={handleMouseLeave} // Hide actions on hover out
                                        tabIndex={0}
                                        role="row"
                                    >
                                        <td>{formatEntryDate(entry.date)}</td>
                                        {showTypeColumn && <td>{entry.type}</td>}
                                        <td className="amount-cell">
                                            {editingId === entry.id ? (
                                                <div className="editing-actions">
                                                    <input
                                                        type="number"
                                                        className="history-edit-input"
                                                        value={editingAmount}
                                                        onChange={(e) => setEditingAmount(e.target.value)}
                                                        min="0"
                                                        aria-label={`Edit amount for entry on ${formatEntryDate(entry.date)}`}
                                                    />
                                                    <div className="history-action-buttons-overlay visible editing-mode">
                                                        <button 
                                                            className="save-btn" 
                                                            onClick={(e) => { e.stopPropagation(); handleSaveEdit(entry); }} 
                                                            aria-label="Save edited amount"
                                                        >
                                                            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                                                                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                                                            </svg>
                                                        </button>
                                                        <button 
                                                            className="cancel-btn" 
                                                            onClick={(e) => { e.stopPropagation(); handleCancelEdit(); }} 
                                                            aria-label="Cancel editing"
                                                        >
                                                            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                                                                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                                                            </svg>
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <>
                                                    {formatCurrency(entry.amount)}
                                                    <div className={`history-action-buttons-overlay ${activeRowForActions === entry.id ? 'visible' : ''}`}>
                                                        <button 
                                                            className="edit-btn" 
                                                            onClick={(e) => { e.stopPropagation(); handleEditClick(entry); }} 
                                                            aria-label={`Edit amount for entry on ${formatEntryDate(entry.date)}`}
                                                        >
                                                            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
                                                        </button>
                                                        <button 
                                                            className="delete-btn" 
                                                            onClick={(e) => { e.stopPropagation(); handleDeleteClick(entry); }} 
                                                            aria-label={`Delete entry on ${formatEntryDate(entry.date)}`}
                                                        >
                                                            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5L13.5 3h-3L9.5 4H5v2h14V4z"/></svg>
                                                        </button>
                                                    </div>
                                                </>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
                <button className="modal-close-button" onClick={onClose} aria-label="Close history">
                    &times;
                </button>
            </div>
            {showDeleteConfirmation && entryToDelete && (
                <ConfirmationModal
                    title="Confirm Deletion"
                    message={`Are you sure you want to delete this entry of ${formatCurrency(entryToDelete.amount)} on ${formatEntryDate(entryToDelete.date)}?`}
                    onConfirm={confirmDelete}
                    onCancel={cancelDelete}
                />
            )}
        </div>
    );
};

const HomeMenuOverlay = ({ isOpen, onClose, onShowOverallHistory }) => {
    const menuRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                onClose();
            }
        };

        const handleEscape = (event) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            document.addEventListener('touchstart', handleClickOutside);
            document.addEventListener('keydown', handleEscape);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('touchstart', handleClickOutside);
            document.removeEventListener('keydown', handleEscape);
        };
    }, [isOpen, onClose]);

    return (
        <>
            <div className={`home-menu-overlay ${isOpen ? 'open' : ''}`} ref={menuRef} role="menu" aria-labelledby="home-menu-fab">
                <div className="menu-header">Menu</div>
                <button
                    role="menuitem"
                    onClick={() => { onShowOverallHistory(); onClose(); }}
                    aria-label="Show Overall Income History"
                >
                    Overall Income History
                </button>
                {/* Add more menu items here if needed */}
            </div>
            <div className={`sidebar-backdrop ${isOpen ? 'open' : ''}`} onClick={onClose} aria-hidden={!isOpen}></div>
        </>
    );
};

const Project10CrApp = () => {
    const [activeTab, setActiveTab] = useState('home');
    
    const [freelancingHistory, setFreelancingHistory] = useState(() => {
        const stored = localStorage.getItem('freelancingHistory');
        // Ensure IDs are unique for older entries and new ones, and dates are ISO strings
        return stored ? JSON.parse(stored).map((entry) => ({ ...entry, id: entry.id || Date.now().toString() + Math.random().toString(36).substring(2), date: new Date(entry.date).toISOString() })) : [];
    });
    const [sellingHistory, setSellingHistory] = useState(() => {
        const stored = localStorage.getItem('sellingHistory');
        return stored ? JSON.parse(stored).map((entry) => ({ ...entry, id: entry.id || Date.now().toString() + Math.random().toString(36).substring(2), date: new Date(entry.date).toISOString() })) : [];
    });

    const freelancingIncome = useMemo(() => 
        freelancingHistory.reduce((sum, entry) => sum + entry.amount, 0), 
    [freelancingHistory]);
    
    const sellingIncome = useMemo(() => 
        sellingHistory.reduce((sum, entry) => sum + entry.amount, 0), 
    [sellingHistory]);

    const [freelancingInput, setFreelancingInput] = useState('');
    const [sellingInput, setSellingInput] = useState('');
    const [freelancingDateInput, setFreelancingDateInput] = useState(new Date().toISOString().substring(0, 10)); // YYYY-MM-DD
    const [sellingDateInput, setSellingDateInput] = useState(new Date().toISOString().substring(0, 10)); // YYYY-MM-DD

    const [currentDate, setCurrentDate] = useState('');
    const [countdown, setCountdown] = useState({ days: '00', hours: '00', minutes: '00', seconds: '00', passed: false });

    const [showFreelancingHistory, setShowFreelancingHistory] = useState(false);
    const [showSellingHistory, setShowSellingHistory] = useState(false);
    const [showHomeMenu, setShowHomeMenu] = useState(false);
    const [showOverallHistory, setShowOverallHistory] = useState(false);

    const targetDate = useRef(new Date('2026-12-31T23:59:59'));

    useEffect(() => {
        const today = new Date();
        setCurrentDate(today.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }));

        const timer = setInterval(() => {
            setCountdown(calculateTimeRemaining(targetDate.current));
        }, 1000);

        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        localStorage.setItem('freelancingHistory', JSON.stringify(freelancingHistory));
    }, [freelancingHistory]);

    useEffect(() => {
        localStorage.setItem('sellingHistory', JSON.stringify(sellingHistory));
    }, [sellingHistory]);

    const handleAddIncome = useCallback((type) => {
        const inputAmount = type === 'freelancing' ? freelancingInput : sellingInput;
        const selectedDate = type === 'freelancing' ? freelancingDateInput : sellingDateInput;
        const amount = parseFloat(inputAmount);

        if (isNaN(amount) || amount <= 0) {
            alert('Please enter a valid positive number for income.');
            return;
        }
        if (!selectedDate) {
            alert('Please select a date.');
            return;
        }

        const newEntry = { id: Date.now().toString() + Math.random().toString(36).substring(2), amount, date: new Date(selectedDate).toISOString(), type }; // Added ID and type

        if (type === 'freelancing') {
            setFreelancingHistory(prev => [...prev, newEntry].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
            setFreelancingInput('');
            setFreelancingDateInput(new Date().toISOString().substring(0, 10)); // Reset date to current
        } else { // type === 'selling'
            setSellingHistory(prev => [...prev, newEntry].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
            setSellingInput('');
            setSellingDateInput(new Date().toISOString().substring(0, 10)); // Reset date to current
        }
    }, [freelancingInput, sellingInput, freelancingDateInput, sellingDateInput]);

    const handleEditHistoryEntry = useCallback((id, newAmount, type) => {
        const updateHistory = (prevHistory) => {
            const updated = prevHistory.map(entry =>
                entry.id === id ? { ...entry, amount: newAmount } : entry
            );
            return updated.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        };

        if (type === 'freelancing' || type === 'Freelancing') { 
            setFreelancingHistory(updateHistory);
        } else if (type === 'selling' || type === 'Selling') { 
            setSellingHistory(updateHistory);
        }
    }, []);

    const handleDeleteHistoryEntry = useCallback((id, type) => {
        const deleteHistory = (prevHistory) => 
            prevHistory.filter(entry => entry.id !== id);

        if (type === 'freelancing' || type === 'Freelancing') {
            setFreelancingHistory(deleteHistory);
        } else if (type === 'selling' || type === 'Selling') {
            setSellingHistory(deleteHistory);
        }
    }, []);


    const renderProgressBar = (current, target, label) => {
        const percentage = Math.min(100, (current / target) * 100);
        const formattedCurrent = formatCurrency(current);
        const formattedTarget = formatCurrency(target);

        return (
            <div className="progress-section">
                <h3 id={`${label}-progress-label`}>{label} Goal ({formattedTarget})</h3>
                <div className="progress-bar-container" role="progressbar"
                    aria-valuenow={percentage} aria-valuemin={0} aria-valuemax={100}
                    aria-labelledby={`${label}-progress-label`}>
                    <div className="progress-bar-fill" style={{ width: `${percentage}%` }}></div>
                </div>
                <p className="progress-text">
                    <span className="current-amount">Current: {formattedCurrent}</span>
                    <span className="target-amount-line">
                        Target: <span className="target-amount">{formattedTarget}</span>
                        <span className="percentage-value">({percentage.toFixed(2)}%)</span>
                    </span>
                </p>
            </div>
        );
    };

    // Combine and sort histories for overall view
    const overallHistory = useMemo(() => {
        const combined = [
            ...freelancingHistory.map(entry => ({ ...entry, type: 'Freelancing' })),
            ...sellingHistory.map(entry => ({ ...entry, type: 'Selling' }))
        ];
        return combined.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()); // Newest first
    }, [freelancingHistory, sellingHistory]);

    return (
        <div className="app-container">
            <header className="app-header">
                <h1 className="app-title">Project 10 Cr</h1>
                <p className="current-date">{currentDate}</p>
            </header>

            <main className="main-content">
                {activeTab === 'home' && (
                    <div className="tab-content" role="tabpanel" id="home-panel" aria-labelledby="home-tab">
                        {renderProgressBar(freelancingIncome + sellingIncome, 100000000, 'Overall')}
                        <div className="countdown-card" aria-live="polite">
                            <h2>Goal Deadline</h2>
                            {countdown.passed ? (
                                <p className="countdown-timer">Goal date passed!</p>
                            ) : (
                                <div className="countdown-grid">
                                    <div className="countdown-item">
                                        <span key={countdown.days} className="countdown-value days-value-color">{countdown.days}</span>
                                        <span className="countdown-label">Days</span>
                                    </div>
                                    <div className="countdown-item">
                                        <span key={countdown.hours} className="countdown-value">{countdown.hours}</span>
                                        <span className="countdown-label">Hours</span>
                                    </div>
                                    <div className="countdown-item">
                                        <span key={countdown.minutes} className="countdown-value">{countdown.minutes}</span>
                                        <span className="countdown-label">Minutes</span>
                                    </div>
                                    <div className="countdown-item">
                                        <span key={countdown.seconds} className="countdown-value">{countdown.seconds}</span>
                                        <span className="countdown-label">Seconds</span>
                                    </div>
                                </div>
                            )}
                        </div>
                        <button className="fab-button menu-fab" id="home-menu-fab" onClick={() => setShowHomeMenu(prev => !prev)} aria-label="Open Home Menu">
                            <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
                                <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"/>
                            </svg>
                        </button>
                        <HomeMenuOverlay 
                            isOpen={showHomeMenu}
                            onClose={() => setShowHomeMenu(false)}
                            onShowOverallHistory={() => setShowOverallHistory(true)}
                        />
                        {showOverallHistory && (
                            <HistoryModal
                                title="Overall Combined"
                                history={overallHistory}
                                onClose={() => setShowOverallHistory(false)}
                                onEditEntry={handleEditHistoryEntry}
                                onDeleteEntry={handleDeleteHistoryEntry}
                                showTypeColumn={true}
                                tabType={null} // Overall history uses entry.type for differentiation
                            />
                        )}
                    </div>
                )}

                {activeTab === 'freelancing' && (
                    <div className="tab-content" role="tabpanel" id="freelancing-panel" aria-labelledby="freelancing-tab">
                        {renderProgressBar(freelancingIncome, 50000000, 'Freelancing')}
                        <div className="input-card">
                            <div className="input-row">
                                <label htmlFor="freelancing-income-input" className="sr-only">Enter income amount for freelancing</label>
                                <div className="input-wrapper">
                                    <span className="currency-icon" aria-hidden="true">₹</span>
                                    <input
                                        id="freelancing-income-input"
                                        type="number"
                                        value={freelancingInput}
                                        onChange={(e) => setFreelancingInput(e.target.value)}
                                        placeholder="Amount"
                                        min="0"
                                        aria-describedby="freelancing-income-help"
                                    />
                                </div>
                                <label htmlFor="freelancing-date-input" className="sr-only">Select date for freelancing income</label>
                                <div className="input-wrapper date-input">
                                    <input
                                        id="freelancing-date-input"
                                        type="date"
                                        value={freelancingDateInput}
                                        onChange={(e) => setFreelancingDateInput(e.target.value)}
                                        aria-label="Select date"
                                        title="Format: DD/MM/YYYY" {/* Added title attribute for hint */}
                                        max={new Date().toISOString().substring(0, 10)} // Prevent future dates
                                    />
                                </div>
                            </div>
                            <button onClick={() => handleAddIncome('freelancing')}>Add Income</button>
                        </div>
                        <button className="fab-button history-fab" onClick={() => setShowFreelancingHistory(true)} aria-label="Show Freelancing Income History">
                            <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
                                <path d="M19 3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-1 16H6v-2h12v2zm0-4H6v-2h12v2zm0-4H6V7h12v2z"/>
                            </svg>
                        </button>
                        {showFreelancingHistory && (
                            <HistoryModal
                                title="Freelancing"
                                history={freelancingHistory.slice(0, 5)} {/* Display only recent 5 */}
                                onClose={() => setShowFreelancingHistory(false)}
                                onEditEntry={handleEditHistoryEntry}
                                onDeleteEntry={handleDeleteHistoryEntry}
                                showTypeColumn={false}
                                tabType="freelancing" // Explicitly pass tab type
                            />
                        )}
                    </div>
                )}

                {activeTab === 'selling' && (
                    <div className="tab-content" role="tabpanel" id="selling-panel" aria-labelledby="selling-tab">
                        {renderProgressBar(sellingIncome, 50000000, 'Selling')}
                        <div className="input-card">
                            <div className="input-row">
                                <label htmlFor="selling-income-input" className="sr-only">Enter income amount for selling</label>
                                <div className="input-wrapper">
                                    <span className="currency-icon" aria-hidden="true">₹</span>
                                    <input
                                        id="selling-income-input"
                                        type="number"
                                        value={sellingInput}
                                        onChange={(e) => setSellingInput(e.target.value)}
                                        placeholder="Amount"
                                        min="0"
                                        aria-describedby="selling-income-help"
                                    />
                                </div>
                                <label htmlFor="selling-date-input" className="sr-only">Select date for selling income</label>
                                <div className="input-wrapper date-input">
                                    <input
                                        id="selling-date-input"
                                        type="date"
                                        value={sellingDateInput}
                                        onChange={(e) => setSellingDateInput(e.target.value)}
                                        aria-label="Select date"
                                        title="Format: DD/MM/YYYY" {/* Added title attribute for hint */}
                                        max={new Date().toISOString().substring(0, 10)} // Prevent future dates
                                    />
                                </div>
                            </div>
                            <button onClick={() => handleAddIncome('selling')}>Add Income</button>
                        </div>
                        <button className="fab-button history-fab" onClick={() => setShowSellingHistory(true)} aria-label="Show Selling Income History">
                            <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
                                <path d="M19 3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-1 16H6v-2h12v2zm0-4H6v-2h12v2zm0-4H6V7h12v2z"/>
                            </svg>
                        </button>
                        {showSellingHistory && (
                            <HistoryModal
                                title="Selling"
                                history={sellingHistory.slice(0, 5)} {/* Display only recent 5 */}
                                onClose={() => setShowSellingHistory(false)}
                                onEditEntry={handleEditHistoryEntry}
                                onDeleteEntry={handleDeleteHistoryEntry}
                                showTypeColumn={false}
                                tabType="selling" // Explicitly pass tab type
                            />
                        )}
                    </div>
                )}
            </main>

            <footer className="tab-bar" role="tablist">
                <button
                    className={`tab-button ${activeTab === 'freelancing' ? 'active' : ''}`}
                    onClick={() => setActiveTab('freelancing')}
                    role="tab"
                    aria-controls="freelancing-panel"
                    aria-selected={activeTab === 'freelancing'}
                    id="freelancing-tab"
                >
                    Freelancing
                </button>
                <button
                    className={`tab-button ${activeTab === 'home' ? 'active' : ''}`}
                    onClick={() => setActiveTab('home')}
                    role="tab"
                    aria-controls="home-panel"
                    aria-selected={activeTab === 'home'}
                    id="home-tab"
                    aria-label="Home"
                >
                    <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
                        <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/>
                    </svg>
                </button>
                <button
                    className={`tab-button ${activeTab === 'selling' ? 'active' : ''}`}
                    onClick={() => setActiveTab('selling')}
                    role="tab"
                    aria-controls="selling-panel"
                    aria-selected={activeTab === 'selling'}
                    id="selling-tab"
                >
                    Selling
                </button>
            </footer>
        </div>
    );
};

const container = document.getElementById('root');
if (container) {
    createRoot(container).render(<Project10CrApp />);
}