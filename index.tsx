// Add explicit imports for React and ReactDOM
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { createRoot } from 'react-dom/client'; // Import createRoot from react-dom/client for React 18+

// Define an interface for history entries for better type safety
interface HistoryEntry {
    id: string;
    amount: number;
    date: string;
    type: 'freelancing' | 'selling' | 'Freelancing' | 'Selling';
}

// Define props interfaces for components
interface ConfirmationModalProps {
    title: string;
    message: string;
    onConfirm: () => void;
    onCancel: () => void;
}

interface HistoryModalProps {
    title: string;
    history: HistoryEntry[];
    onClose: () => void;
    onEditEntry: (id: string, newAmount: number, type: HistoryEntry['type']) => void;
    onDeleteEntry: (id: string, type: HistoryEntry['type']) => void;
    showTypeColumn: boolean;
    tabType: HistoryEntry['type'] | null;
}

interface HomeMenuOverlayProps {
    isOpen: boolean;
    onClose: () => void;
    onShowOverallHistory: () => void;
}

// Helper function to format currency
const formatCurrency = (amount: number): string => {
    return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
};

// Helper function to format date for history display (DD/MM/YYYY)
const formatEntryDate = (isoString: string): string => {
    const date = new Date(isoString);
    // Use 'en-GB' locale for DD/MM/YYYY, or manually format
    return date.toLocaleDateString('en-GB'); 
};

// Helper function to calculate time remaining
const calculateTimeRemaining = (targetDate: Date) => {
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

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({ title, message, onConfirm, onCancel }) => {
    return (
        <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="confirmation-modal-title">
            <div className="modal-content">
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

const HistoryModal: React.FC<HistoryModalProps> = ({ title, history, onClose, onEditEntry, onDeleteEntry, showTypeColumn, tabType }) => {
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editingAmount, setEditingAmount] = useState<string>('');
    const [activeRowForActions, setActiveRowForActions] = useState<string | null>(null); // To show edit/delete
    const longPressTimer = useRef<NodeJS.Timeout | null>(null);
    
    const [showDeleteConfirmation, setShowDeleteConfirmation] = useState<boolean>(false);
    const [entryToDelete, setEntryToDelete] = useState<HistoryEntry | null>(null);

    const LONG_PRESS_DELAY = 500; // milliseconds

    const handleTouchStart = useCallback((entry: HistoryEntry) => {
        longPressTimer.current = setTimeout(() => {
            setActiveRowForActions(entry.id);
        }, LONG_PRESS_DELAY);
    }, []);

    const handleTouchEnd = useCallback(() => {
        if (longPressTimer.current) {
            clearTimeout(longPressTimer.current);
            longPressTimer.current = null;
        }
    }, []);

    const handleMouseDown = useCallback((entry: HistoryEntry) => {
        longPressTimer.current = setTimeout(() => {
            setActiveRowForActions(entry.id);
        }, LONG_PRESS_DELAY);
    }, []);

    const handleMouseUp = useCallback(() => {
        if (longPressTimer.current) {
            clearTimeout(longPressTimer.current);
            longPressTimer.current = null;
        }
    }, []);

    const handleMouseLeave = useCallback(() => {
        if (longPressTimer.current) {
            clearTimeout(longPressTimer.current);
            longPressTimer.current = null;
        }
    }, []);

    const handleEditClick = (entry: HistoryEntry) => {
        setEditingId(entry.id);
        setEditingAmount(entry.amount.toString());
        setActiveRowForActions(null); // Hide actions after clicking edit
    };

    const handleSaveEdit = (entry: HistoryEntry) => {
        const newAmount = parseFloat(editingAmount);
        if (isNaN(newAmount) || newAmount <= 0) {
            alert('Please enter a valid positive number.');
            return;
        }
        // The type for `onEditEntry` expects a specific type for 'type' argument.
        // `tabType` can be null, so `tabType || entry.type` correctly resolves to a valid type string.
        onEditEntry(entry.id, newAmount, (tabType || entry.type));
        setEditingId(null);
        setEditingAmount('');
    };

    const handleCancelEdit = () => {
        setEditingId(null);
        setEditingAmount('');
    };

    const handleDeleteClick = (entry: HistoryEntry) => {
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
                                    <th style={{width: '120px'}}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {history.map((entry) => (
                                    <tr 
                                        key={entry.id} 
                                        onMouseDown={() => handleMouseDown(entry)}
                                        onMouseUp={handleMouseUp}
                                        onMouseLeave={handleMouseLeave}
                                        onTouchStart={() => handleTouchStart(entry)}
                                        onTouchEnd={handleTouchEnd}
                                        onTouchCancel={handleTouchEnd} // Handle cases where touch is interrupted
                                        tabIndex={0} // Make rows focusable for keyboard users
                                        role="row"
                                    >
                                        <td>{formatEntryDate(entry.date)}</td>
                                        {showTypeColumn && <td>{entry.type}</td>}
                                        {editingId === entry.id ? (
                                            <>
                                                <td>
                                                    <input
                                                        type="number"
                                                        className="history-edit-input"
                                                        value={editingAmount}
                                                        onChange={(e) => setEditingAmount(e.target.value)}
                                                        min="0"
                                                        aria-label={`Edit amount for entry on ${formatEntryDate(entry.date)}`}
                                                    />
                                                </td>
                                                <td className="history-action-buttons visible"> {/* Always visible during edit */}
                                                    <button className="save-btn" onClick={() => handleSaveEdit(entry)} aria-label="Save edited amount">Save</button>
                                                    <button className="cancel-btn" onClick={handleCancelEdit} aria-label="Cancel editing">Cancel</button>
                                                </td>
                                            </>
                                        ) : (
                                            <>
                                                <td>{formatCurrency(entry.amount)}</td>
                                                <td className={`history-action-buttons ${activeRowForActions === entry.id ? 'visible' : ''}`}>
                                                    <button className="edit-btn" onClick={() => handleEditClick(entry)} aria-label={`Edit amount for entry on ${formatEntryDate(entry.date)}`}>Edit</button>
                                                    <button className="delete-btn" onClick={() => handleDeleteClick(entry)} aria-label={`Delete entry on ${formatEntryDate(entry.date)}`}>Delete</button>
                                                </td>
                                            </>
                                        )}
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

const HomeMenuOverlay: React.FC<HomeMenuOverlayProps> = ({ isOpen, onClose, onShowOverallHistory }) => {
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent | TouchEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                onClose();
            }
        };

        const handleEscape = (event: KeyboardEvent) => {
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

const Project10CrApp: React.FC = () => {
    const [activeTab, setActiveTab] = useState('home');
    
    const [freelancingHistory, setFreelancingHistory] = useState<HistoryEntry[]>(() => {
        const stored = localStorage.getItem('freelancingHistory');
        return stored ? JSON.parse(stored).map((entry: HistoryEntry) => ({ ...entry, id: entry.id || Date.now().toString() + Math.random().toString(36).substring(2) })) : [];
    });
    const [sellingHistory, setSellingHistory] = useState<HistoryEntry[]>(() => {
        const stored = localStorage.getItem('sellingHistory');
        return stored ? JSON.parse(stored).map((entry: HistoryEntry) => ({ ...entry, id: entry.id || Date.now().toString() + Math.random().toString(36).substring(2) })) : [];
    });

    const freelancingIncome = useMemo(() => 
        freelancingHistory.reduce((sum, entry) => sum + entry.amount, 0), 
    [freelancingHistory]);
    
    const sellingIncome = useMemo(() => 
        sellingHistory.reduce((sum, entry) => sum + entry.amount, 0), 
    [sellingHistory]);

    const [freelancingInput, setFreelancingInput] = useState<string>('');
    const [sellingInput, setSellingInput] = useState<string>('');
    const [freelancingDateInput, setFreelancingDateInput] = useState<string>(new Date().toISOString().substring(0, 10)); // YYYY-MM-DD
    const [sellingDateInput, setSellingDateInput] = useState<string>(new Date().toISOString().substring(0, 10)); // YYYY-MM-DD

    const [currentDate, setCurrentDate] = useState<string>('');
    const [countdown, setCountdown] = useState<{ days: string; hours: string; minutes: string; seconds: string; passed: boolean; }>({ days: '00', hours: '00', minutes: '00', seconds: '00', passed: false });

    const [showFreelancingHistory, setShowFreelancingHistory] = useState<boolean>(false);
    const [showSellingHistory, setShowSellingHistory] = useState<boolean>(false);
    const [showHomeMenu, setShowHomeMenu] = useState<boolean>(false);
    const [showOverallHistory, setShowOverallHistory] = useState<boolean>(false);

    const targetDate = useRef<Date>(new Date('2026-12-31T23:59:59'));

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

    const handleAddIncome = useCallback((type: 'freelancing' | 'selling') => {
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

        const newEntry: HistoryEntry = { id: Date.now().toString() + Math.random().toString(36).substring(2), amount, date: new Date(selectedDate).toISOString(), type }; // Added ID and type

        if (type === 'freelancing') {
            setFreelancingHistory(prev => [...prev, newEntry]);
            setFreelancingInput('');
            setFreelancingDateInput(new Date().toISOString().substring(0, 10)); // Reset date to current
        } else { // type === 'selling'
            setSellingHistory(prev => [...prev, newEntry]);
            setSellingInput('');
            setSellingDateInput(new Date().toISOString().substring(0, 10)); // Reset date to current
        }
    }, [freelancingInput, sellingInput, freelancingDateInput, sellingDateInput]);

    const handleEditHistoryEntry = useCallback((id: string, newAmount: number, type: HistoryEntry['type']) => {
        // Ensure that the date is preserved when editing, only amount changes
        const updateHistory = (prevHistory: HistoryEntry[]) => 
            prevHistory.map(entry =>
                entry.id === id ? { ...entry, amount: newAmount } : entry
            );

        if (type === 'freelancing' || type === 'Freelancing') { 
            setFreelancingHistory(updateHistory);
        } else if (type === 'selling' || type === 'Selling') { 
            setSellingHistory(updateHistory);
        }
    }, []);

    const handleDeleteHistoryEntry = useCallback((id: string, type: HistoryEntry['type']) => {
        if (type === 'freelancing' || type === 'Freelancing') {
            setFreelancingHistory(prev => prev.filter(entry => entry.id !== id));
        } else if (type === 'selling' || type === 'Selling') {
            setSellingHistory(prev => prev.filter(entry => entry.id !== id));
        }
    }, []);


    const renderProgressBar = (current: number, target: number, label: string) => {
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
            ...freelancingHistory.map(entry => ({ ...entry, type: 'Freelancing' as const })),
            ...sellingHistory.map(entry => ({ ...entry, type: 'Selling' as const }))
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
                                history={freelancingHistory}
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
                                history={sellingHistory}
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