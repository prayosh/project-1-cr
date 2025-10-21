import React, { useState, useEffect, useRef, ChangeEvent, useMemo, useCallback } from 'react';
import { createRoot } from 'react-dom/client';

interface IncomeEntry {
    amount: number;
    date: string; // ISO string
}

// Helper function to format currency
const formatCurrency = (amount: number): string => {
    return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
};

// Helper function to format date for history display
const formatEntryDate = (isoString: string): string => {
    const date = new Date(isoString);
    return date.toLocaleString('en-IN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
    });
};

// Helper function to calculate time remaining
const calculateTimeRemaining = (targetDate: Date): { days: string; hours: string; minutes: string; seconds: string; passed: boolean } => {
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

interface HistoryModalProps {
    title: string;
    history: IncomeEntry[];
    onClose: () => void;
}

const HistoryModal: React.FC<HistoryModalProps> = ({ title, history, onClose }) => {
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
                                    <th>Amount</th>
                                    <th>Date</th>
                                </tr>
                            </thead>
                            <tbody>
                                {history.map((entry, index) => (
                                    <tr key={index}>
                                        <td>{formatCurrency(entry.amount)}</td>
                                        <td>{formatEntryDate(entry.date)}</td>
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
        </div>
    );
};


const Project10CrApp: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'home' | 'freelancing' | 'selling'>('home');
    
    // History states
    const [freelancingHistory, setFreelancingHistory] = useState<IncomeEntry[]>(() => {
        const stored = localStorage.getItem('freelancingHistory');
        return stored ? JSON.parse(stored) : [];
    });
    const [sellingHistory, setSellingHistory] = useState<IncomeEntry[]>(() => {
        const stored = localStorage.getItem('sellingHistory');
        return stored ? JSON.parse(stored) : [];
    });

    // Derived total incomes
    const freelancingIncome = useMemo(() => 
        freelancingHistory.reduce((sum, entry) => sum + entry.amount, 0), 
    [freelancingHistory]);
    
    const sellingIncome = useMemo(() => 
        sellingHistory.reduce((sum, entry) => sum + entry.amount, 0), 
    [sellingHistory]);

    const [freelancingInput, setFreelancingInput] = useState<string>('');
    const [sellingInput, setSellingInput] = useState<string>('');
    const [currentDate, setCurrentDate] = useState<string>('');
    const [countdown, setCountdown] = useState<{ days: string; hours: string; minutes: string; seconds: string; passed: boolean }>({ days: '00', hours: '00', minutes: '00', seconds: '00', passed: false });

    // State for showing history modals
    const [showFreelancingHistory, setShowFreelancingHistory] = useState<boolean>(false);
    const [showSellingHistory, setShowSellingHistory] = useState<boolean>(false);
    const [showHomeMenu, setShowHomeMenu] = useState<boolean>(false); // New: for Home tab menu
    const [showOverallHistory, setShowOverallHistory] = useState<boolean>(false); // New: for overall history modal

    const targetDate = useRef(new Date('2026-12-31T23:59:59')); // December 31, 2026, 23:59:59

    // Effect for date and countdown
    useEffect(() => {
        const today = new Date();
        setCurrentDate(today.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }));

        const timer = setInterval(() => {
            setCountdown(calculateTimeRemaining(targetDate.current));
        }, 1000);

        return () => clearInterval(timer);
    }, []);

    // Effect for local storage persistence of history
    useEffect(() => {
        localStorage.setItem('freelancingHistory', JSON.stringify(freelancingHistory));
    }, [freelancingHistory]);

    useEffect(() => {
        localStorage.setItem('sellingHistory', JSON.stringify(sellingHistory));
    }, [sellingHistory]);

    const handleAddIncome = useCallback((type: 'freelancing' | 'selling') => {
        const inputAmount = type === 'freelancing' ? freelancingInput : sellingInput;
        const amount = parseFloat(inputAmount);

        if (isNaN(amount) || amount <= 0) {
            alert('Please enter a valid positive number for income.');
            return;
        }

        const confirmationMessage = `Are you sure you want to add ${formatCurrency(amount)} to your ${type} income?`;
        if (!window.confirm(confirmationMessage)) {
            return; // User cancelled the action
        }

        const newEntry: IncomeEntry = { amount, date: new Date().toISOString() };

        if (type === 'freelancing') {
            setFreelancingHistory(prev => [...prev, newEntry]);
            setFreelancingInput('');
        } else {
            setSellingHistory(prev => [...prev, newEntry]);
            setSellingInput('');
        }
    }, [freelancingInput, sellingInput]);

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
                    Current: {formattedCurrent} / Target: {formattedTarget} <span className="percentage-value">({percentage.toFixed(2)}%)</span>
                </p>
            </div>
        );
    };

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
                        {/* New: Menu FAB for Home tab */}
                        <button className="fab-button menu-fab" onClick={() => setShowHomeMenu(prev => !prev)} aria-label="Open Home Menu">
                            <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
                                <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>
                            </svg>
                        </button>
                        {showHomeMenu && (
                            <div className="home-menu-overlay" role="menu" aria-labelledby="home-menu-fab">
                                <button
                                    role="menuitem"
                                    onClick={() => { setShowOverallHistory(true); setShowHomeMenu(false); }}
                                    aria-label="Show Overall Income History"
                                >
                                    Overall Income History
                                </button>
                            </div>
                        )}
                        {showOverallHistory && (
                            <HistoryModal
                                title="Overall Combined"
                                history={[...freelancingHistory, ...sellingHistory].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())}
                                onClose={() => setShowOverallHistory(false)}
                            />
                        )}
                    </div>
                )}

                {activeTab === 'freelancing' && (
                    <div className="tab-content" role="tabpanel" id="freelancing-panel" aria-labelledby="freelancing-tab">
                        {renderProgressBar(freelancingIncome, 50000000, 'Freelancing')}
                        <div className="input-card">
                            <label htmlFor="freelancing-income-input" className="sr-only">Enter income amount for freelancing</label>
                            <div className="input-wrapper">
                                <span className="currency-icon" aria-hidden="true">₹</span>
                                <input
                                    id="freelancing-income-input"
                                    type="number"
                                    value={freelancingInput}
                                    onChange={(e: ChangeEvent<HTMLInputElement>) => setFreelancingInput(e.target.value)}
                                    placeholder="Enter income amount"
                                    min="0"
                                />
                            </div>
                            <button onClick={() => handleAddIncome('freelancing')}>Add Income</button>
                        </div>
                        {/* New: History FAB for Freelancing tab */}
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
                            />
                        )}
                    </div>
                )}

                {activeTab === 'selling' && (
                    <div className="tab-content" role="tabpanel" id="selling-panel" aria-labelledby="selling-tab">
                        {renderProgressBar(sellingIncome, 50000000, 'Selling')}
                        <div className="input-card">
                            <label htmlFor="selling-income-input" className="sr-only">Enter income amount for selling</label>
                            <div className="input-wrapper">
                                <span className="currency-icon" aria-hidden="true">₹</span>
                                <input
                                    id="selling-income-input"
                                    type="number"
                                    value={sellingInput}
                                    onChange={(e: ChangeEvent<HTMLInputElement>) => setSellingInput(e.target.value)}
                                    placeholder="Enter income amount"
                                    min="0"
                                />
                            </div>
                            <button onClick={() => handleAddIncome('selling')}>Add Income</button>
                        </div>
                        {/* New: History FAB for Selling tab */}
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
    const root = createRoot(container);
    root.render(<React.StrictMode><Project10CrApp /></React.StrictMode>);
}