// ===================================
// RAID Calculator - Core Logic
// ===================================

// Storage conversion constants
const TB_TO_BYTES_DECIMAL = 1000000000000; // 1 TB = 1,000,000,000,000 bytes (decimal)
const TB_TO_BYTES_BINARY = 1099511627776;  // 1 TiB = 1,099,511,627,776 bytes (binary)

// RAID Configuration Metadata
const RAID_CONFIGS = {
    raid0: {
        name: 'RAID 0',
        description: 'Striping - Maximum performance, no redundancy',
        minDrives: 2,
        faultTolerance: 0,
        readPerformance: 'Excellent',
        writePerformance: 'Excellent',
        efficiency: 1.0
    },
    raid1: {
        name: 'RAID 1',
        description: 'Mirroring - 100% redundancy',
        minDrives: 2,
        faultTolerance: 1,
        readPerformance: 'Good',
        writePerformance: 'Moderate',
        efficiency: 0.5
    },
    raid5: {
        name: 'RAID 5',
        description: 'Single parity - Good balance of performance and redundancy',
        minDrives: 3,
        faultTolerance: 1,
        readPerformance: 'Good',
        writePerformance: 'Moderate',
        efficiency: null // Calculated: (n-1)/n
    },
    raid6: {
        name: 'RAID 6',
        description: 'Double parity - Enhanced fault tolerance',
        minDrives: 4,
        faultTolerance: 2,
        readPerformance: 'Good',
        writePerformance: 'Moderate',
        efficiency: null // Calculated: (n-2)/n
    },
    raid10: {
        name: 'RAID 10',
        description: 'Mirrored stripes - Best performance with redundancy',
        minDrives: 4,
        faultTolerance: 1,
        readPerformance: 'Excellent',
        writePerformance: 'Good',
        efficiency: 0.5
    },
    shr: {
        name: 'Synology Hybrid RAID',
        description: 'Flexible RAID with single disk fault tolerance',
        minDrives: 2,
        faultTolerance: 1,
        readPerformance: 'Good',
        writePerformance: 'Moderate',
        efficiency: null // Calculated based on drive configuration
    },
    shr2: {
        name: 'Synology Hybrid RAID 2',
        description: 'Flexible RAID with dual disk fault tolerance',
        minDrives: 4,
        faultTolerance: 2,
        readPerformance: 'Good',
        writePerformance: 'Moderate',
        efficiency: null // Calculated based on drive configuration
    },
    'zfs-stripe': {
        name: 'ZFS Stripe',
        description: 'No redundancy - Maximum capacity',
        minDrives: 1,
        faultTolerance: 0,
        readPerformance: 'Excellent',
        writePerformance: 'Excellent',
        efficiency: 1.0
    },
    'zfs-mirror': {
        name: 'ZFS Mirror',
        description: 'Mirrored vdevs - High redundancy',
        minDrives: 2,
        faultTolerance: 1,
        readPerformance: 'Excellent',
        writePerformance: 'Good',
        efficiency: 0.5
    },
    raidz1: {
        name: 'RAIDZ1',
        description: 'Single parity - ZFS equivalent to RAID 5',
        minDrives: 3,
        faultTolerance: 1,
        readPerformance: 'Good',
        writePerformance: 'Moderate',
        efficiency: null // Calculated: (n-1)/n
    },
    raidz2: {
        name: 'RAIDZ2',
        description: 'Double parity - ZFS equivalent to RAID 6',
        minDrives: 4,
        faultTolerance: 2,
        readPerformance: 'Good',
        writePerformance: 'Moderate',
        efficiency: null // Calculated: (n-2)/n
    },
    raidz3: {
        name: 'RAIDZ3',
        description: 'Triple parity - Maximum fault tolerance',
        minDrives: 5,
        faultTolerance: 3,
        readPerformance: 'Good',
        writePerformance: 'Moderate',
        efficiency: null // Calculated: (n-3)/n
    },
    'unraid-1': {
        name: 'Unraid (1 Parity)',
        description: 'Flexible array with single parity drive - Individual drive access',
        minDrives: 2,
        faultTolerance: 1,
        readPerformance: 'Good',
        writePerformance: 'Moderate',
        efficiency: null // Calculated: (n-1)/n
    },
    'unraid-2': {
        name: 'Unraid (2 Parity)',
        description: 'Flexible array with dual parity drives - Individual drive access',
        minDrives: 3,
        faultTolerance: 2,
        readPerformance: 'Good',
        writePerformance: 'Moderate',
        efficiency: null // Calculated: (n-2)/n
    }
};

// ===================================
// Storage Calculation Functions
// ===================================

/**
 * Convert TB (decimal) to actual usable TiB (binary)
 * Example: 12 TB = 10.91 TiB usable
 */
function convertTBtoTiB(tb) {
    const bytes = tb * TB_TO_BYTES_DECIMAL;
    const tib = bytes / TB_TO_BYTES_BINARY;
    return tib;
}

/**
 * Calculate usable storage for RAID configuration
 */
function calculateRAIDStorage(raidType, drives) {
    const numDrives = drives.length;
    const config = RAID_CONFIGS[raidType];

    // Validate minimum drives
    if (numDrives < config.minDrives) {
        throw new Error(`${config.name} requires at least ${config.minDrives} drives`);
    }

    // Convert all drives to TiB (binary)
    const drivesInTiB = drives.map(tb => convertTBtoTiB(tb));

    let usableCapacity = 0;
    let rawCapacity = drivesInTiB.reduce((sum, size) => sum + size, 0);

    switch (raidType) {
        case 'raid0':
        case 'zfs-stripe':
            // Sum of all drives
            usableCapacity = rawCapacity;
            break;

        case 'raid1':
        case 'zfs-mirror':
            // Smallest drive capacity (all drives mirror the smallest)
            usableCapacity = Math.min(...drivesInTiB);
            break;

        case 'raid5':
        case 'raidz1':
            // (n-1) * smallest drive
            usableCapacity = (numDrives - 1) * Math.min(...drivesInTiB);
            break;

        case 'raid6':
        case 'raidz2':
            // (n-2) * smallest drive
            usableCapacity = (numDrives - 2) * Math.min(...drivesInTiB);
            break;

        case 'raidz3':
            // (n-3) * smallest drive
            usableCapacity = (numDrives - 3) * Math.min(...drivesInTiB);
            break;

        case 'raid10':
            // n/2 * smallest drive (assumes even number of drives)
            if (numDrives % 2 !== 0) {
                throw new Error('RAID 10 requires an even number of drives');
            }
            usableCapacity = (numDrives / 2) * Math.min(...drivesInTiB);
            break;

        case 'shr':
            // Synology Hybrid RAID calculation
            usableCapacity = calculateSHR(drivesInTiB, 1);
            break;

        case 'shr2':
            // Synology Hybrid RAID 2 calculation
            usableCapacity = calculateSHR(drivesInTiB, 2);
            break;

        case 'unraid-1':
            // Unraid with 1 parity drive - sum of all drives minus largest (parity)
            usableCapacity = calculateUnraid(drivesInTiB, 1);
            break;

        case 'unraid-2':
            // Unraid with 2 parity drives - sum of all drives minus 2 largest (parity)
            usableCapacity = calculateUnraid(drivesInTiB, 2);
            break;
    }

    return {
        usableCapacity,
        rawCapacity,
        efficiency: usableCapacity / rawCapacity,
        wastedSpace: rawCapacity - usableCapacity
    };
}

/**
 * Calculate Synology Hybrid RAID capacity
 * SHR optimizes storage by using different RAID levels based on drive sizes
 */
function calculateSHR(drivesInTiB, parityDisks) {
    const sorted = [...drivesInTiB].sort((a, b) => a - b);
    const numDrives = sorted.length;

    if (numDrives < parityDisks + 1) {
        throw new Error(`SHR-${parityDisks} requires at least ${parityDisks + 1} drives`);
    }

    let usableCapacity = 0;

    // SHR algorithm: Build up capacity by size tiers
    for (let i = 0; i < numDrives; i++) {
        const currentSize = sorted[i];
        const availableDrives = numDrives - i;

        if (availableDrives > parityDisks) {
            // Calculate contribution of this drive
            if (i === 0) {
                // First (smallest) drives contribute their full capacity minus parity
                usableCapacity += currentSize * (availableDrives - parityDisks) / availableDrives;
            } else {
                // Larger drives contribute the difference from the previous tier
                const difference = currentSize - sorted[i - 1];
                usableCapacity += difference * (availableDrives - parityDisks) / availableDrives;
            }
        }
    }

    return usableCapacity;
}

/**
 * Calculate Unraid capacity
 * Unraid uses individual drives with parity - largest drive(s) become parity
 * Usable capacity = sum of all drives minus the largest N drives (where N = parity count)
 */
function calculateUnraid(drivesInTiB, parityCount) {
    const sorted = [...drivesInTiB].sort((a, b) => b - a); // Sort descending
    const numDrives = sorted.length;

    if (numDrives < parityCount + 1) {
        throw new Error(`Unraid with ${parityCount} parity requires at least ${parityCount + 1} drives`);
    }

    // Remove the largest N drives (parity drives)
    const dataDrives = sorted.slice(parityCount);

    // Sum remaining drives for usable capacity
    return dataDrives.reduce((sum, size) => sum + size, 0);
}

/**
 * Calculate ZFS storage with multiple vdevs
 * Each vdev uses the specified RAID type, and total capacity is the sum of all vdevs
 */
function calculateZFSVdevStorage(raidType, allDrives, numVdevs, drivesPerVdev) {
    const totalDrives = allDrives.length;

    if (totalDrives !== numVdevs * drivesPerVdev) {
        throw new Error(`Total drives (${totalDrives}) must equal vdevs (${numVdevs}) × drives per vdev (${drivesPerVdev})`);
    }

    // Convert all drives to TiB
    const drivesInTiB = allDrives.map(tb => convertTBtoTiB(tb));

    let totalUsableCapacity = 0;
    const rawCapacity = drivesInTiB.reduce((sum, size) => sum + size, 0);

    // Calculate capacity for each vdev
    for (let vdevIndex = 0; vdevIndex < numVdevs; vdevIndex++) {
        const startIdx = vdevIndex * drivesPerVdev;
        const endIdx = startIdx + drivesPerVdev;
        const vdevDrives = drivesInTiB.slice(startIdx, endIdx);
        const smallestInVdev = Math.min(...vdevDrives);

        let vdevCapacity = 0;

        switch (raidType) {
            case 'zfs-mirror':
                // Mirror: capacity of smallest drive in vdev
                vdevCapacity = smallestInVdev;
                break;

            case 'raidz1':
                // RAIDZ1: (n-1) * smallest drive
                vdevCapacity = (drivesPerVdev - 1) * smallestInVdev;
                break;

            case 'raidz2':
                // RAIDZ2: (n-2) * smallest drive
                vdevCapacity = (drivesPerVdev - 2) * smallestInVdev;
                break;

            case 'raidz3':
                // RAIDZ3: (n-3) * smallest drive
                vdevCapacity = (drivesPerVdev - 3) * smallestInVdev;
                break;
        }

        totalUsableCapacity += vdevCapacity;
    }

    return {
        usableCapacity: totalUsableCapacity,
        rawCapacity,
        efficiency: totalUsableCapacity / rawCapacity,
        wastedSpace: rawCapacity - totalUsableCapacity
    };
}

/**
 * Format capacity for display
 */
function formatCapacity(tib, showBoth = true) {
    const tb = (tib * TB_TO_BYTES_BINARY) / TB_TO_BYTES_DECIMAL;

    if (showBoth) {
        return `${tib.toFixed(2)} TiB (${tb.toFixed(2)} TB)`;
    }
    return `${tib.toFixed(2)} TiB`;
}

/**
 * Format percentage
 */
function formatPercentage(value) {
    return `${(value * 100).toFixed(1)}%`;
}

// ===================================
// UI Interaction Functions
// ===================================

class RAIDCalculator {
    constructor() {
        this.initializeElements();
        this.attachEventListeners();
        this.updateDriveDisplay();
        this.handleRaidTypeChange();
    }

    initializeElements() {
        this.raidTypeSelect = document.getElementById('raid-type');
        this.numDrivesSlider = document.getElementById('num-drives');
        this.numDrivesDisplay = document.getElementById('num-drives-display');
        this.driveSizeSelect = document.getElementById('drive-size');
        this.mixedDrivesToggle = document.getElementById('mixed-drives');
        this.customDrivesContainer = document.getElementById('custom-drives-container');
        this.driveInputsContainer = document.getElementById('drive-inputs');
        this.calculateBtn = document.getElementById('calculate-btn');
        this.resultsContent = document.getElementById('results-content');

        // ZFS vdev elements
        this.zfsVdevConfig = document.getElementById('zfs-vdev-config');
        this.numVdevsSlider = document.getElementById('num-vdevs');
        this.numVdevsDisplay = document.getElementById('num-vdevs-display');
        this.drivesPerVdevConfig = document.getElementById('drives-per-vdev-config');
        this.drivesPerVdevSlider = document.getElementById('drives-per-vdev');
        this.drivesPerVdevDisplay = document.getElementById('drives-per-vdev-display');
        this.totalDrivesText = document.getElementById('total-drives-text');
    }

    attachEventListeners() {
        this.numDrivesSlider.addEventListener('input', () => this.updateDriveDisplay());
        this.mixedDrivesToggle.addEventListener('change', () => this.toggleMixedDrives());
        this.calculateBtn.addEventListener('click', () => this.calculate());
        this.raidTypeSelect.addEventListener('change', () => this.handleRaidTypeChange());

        // ZFS vdev listeners
        this.numVdevsSlider.addEventListener('input', () => this.updateVdevDisplay());
        this.drivesPerVdevSlider.addEventListener('input', () => this.updateVdevDisplay());
    }

    handleRaidTypeChange() {
        const raidType = this.raidTypeSelect.value;
        const isZFSVdev = ['zfs-mirror', 'raidz1', 'raidz2', 'raidz3'].includes(raidType);

        // Show/hide ZFS vdev configuration
        this.zfsVdevConfig.style.display = isZFSVdev ? 'block' : 'none';
        this.drivesPerVdevConfig.style.display = isZFSVdev ? 'block' : 'none';

        // Show/hide regular drive count slider
        const numDrivesGroup = this.numDrivesSlider.closest('.form-group');
        numDrivesGroup.style.display = isZFSVdev ? 'none' : 'block';

        if (isZFSVdev) {
            this.updateVdevDisplay();
        } else {
            this.validateConfiguration();
        }
    }

    updateVdevDisplay() {
        const numVdevs = parseInt(this.numVdevsSlider.value);
        const drivesPerVdev = parseInt(this.drivesPerVdevSlider.value);
        const totalDrives = numVdevs * drivesPerVdev;

        this.numVdevsDisplay.textContent = numVdevs;
        this.drivesPerVdevDisplay.textContent = drivesPerVdev;
        this.totalDrivesText.textContent = `Total drives: ${totalDrives}`;

        // Update the main drive slider to match (for mixed drives feature)
        this.numDrivesSlider.value = totalDrives;
        this.numDrivesDisplay.textContent = totalDrives;

        if (this.mixedDrivesToggle.checked) {
            this.generateDriveInputs(totalDrives);
        }

        this.validateConfiguration();
    }

    updateDriveDisplay() {
        const numDrives = parseInt(this.numDrivesSlider.value);
        this.numDrivesDisplay.textContent = numDrives;

        if (this.mixedDrivesToggle.checked) {
            this.generateDriveInputs(numDrives);
        }

        this.validateConfiguration();
    }

    toggleMixedDrives() {
        const isEnabled = this.mixedDrivesToggle.checked;
        this.customDrivesContainer.style.display = isEnabled ? 'block' : 'none';
        this.driveSizeSelect.disabled = isEnabled;

        if (isEnabled) {
            const raidType = this.raidTypeSelect.value;
            const isZFSVdev = ['zfs-mirror', 'raidz1', 'raidz2', 'raidz3'].includes(raidType);
            const numDrives = isZFSVdev ?
                parseInt(this.numVdevsSlider.value) * parseInt(this.drivesPerVdevSlider.value) :
                parseInt(this.numDrivesSlider.value);
            this.generateDriveInputs(numDrives);
        }
    }

    generateDriveInputs(numDrives) {
        this.driveInputsContainer.innerHTML = '';

        const driveSizes = [1, 2, 3, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24];

        for (let i = 0; i < numDrives; i++) {
            const row = document.createElement('div');
            row.className = 'drive-input-row';

            const label = document.createElement('span');
            label.className = 'drive-label';
            label.textContent = `Drive ${i + 1}:`;

            const select = document.createElement('select');
            select.className = 'drive-select';
            select.id = `drive-${i}`;

            driveSizes.forEach(size => {
                const option = document.createElement('option');
                option.value = size;
                option.textContent = `${size} TB`;
                if (size === 12) option.selected = true;
                select.appendChild(option);
            });

            row.appendChild(label);
            row.appendChild(select);
            this.driveInputsContainer.appendChild(row);
        }
    }

    validateConfiguration() {
        const raidType = this.raidTypeSelect.value;
        const isZFSVdev = ['zfs-mirror', 'raidz1', 'raidz2', 'raidz3'].includes(raidType);
        const numDrives = isZFSVdev ?
            parseInt(this.numVdevsSlider.value) * parseInt(this.drivesPerVdevSlider.value) :
            parseInt(this.numDrivesSlider.value);
        const config = RAID_CONFIGS[raidType];

        if (numDrives < config.minDrives) {
            this.calculateBtn.disabled = true;
            this.calculateBtn.textContent = `Requires ${config.minDrives}+ drives`;
        } else if (raidType === 'raid10' && numDrives % 2 !== 0) {
            this.calculateBtn.disabled = true;
            this.calculateBtn.textContent = 'RAID 10 requires even number of drives';
        } else {
            this.calculateBtn.disabled = false;
            this.calculateBtn.innerHTML = `
                <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                </svg>
                Calculate Storage
            `;
        }
    }

    getDriveSizes() {
        const raidType = this.raidTypeSelect.value;
        const isZFSVdev = ['zfs-mirror', 'raidz1', 'raidz2', 'raidz3'].includes(raidType);
        const numDrives = isZFSVdev ?
            parseInt(this.numVdevsSlider.value) * parseInt(this.drivesPerVdevSlider.value) :
            parseInt(this.numDrivesSlider.value);

        if (this.mixedDrivesToggle.checked) {
            const drives = [];
            for (let i = 0; i < numDrives; i++) {
                const select = document.getElementById(`drive-${i}`);
                drives.push(parseFloat(select.value));
            }
            return drives;
        } else {
            const driveSize = parseFloat(this.driveSizeSelect.value);
            return Array(numDrives).fill(driveSize);
        }
    }

    calculate() {
        try {
            const raidType = this.raidTypeSelect.value;
            const drives = this.getDriveSizes();
            const config = RAID_CONFIGS[raidType];

            // Check if this is a ZFS vdev configuration
            const isZFSVdev = ['zfs-mirror', 'raidz1', 'raidz2', 'raidz3'].includes(raidType);
            let result;

            if (isZFSVdev) {
                const numVdevs = parseInt(this.numVdevsSlider.value);
                const drivesPerVdev = parseInt(this.drivesPerVdevSlider.value);
                result = calculateZFSVdevStorage(raidType, drives, numVdevs, drivesPerVdev);
                result.numVdevs = numVdevs;
                result.drivesPerVdev = drivesPerVdev;
            } else {
                result = calculateRAIDStorage(raidType, drives);
            }

            this.displayResults(raidType, config, drives, result);
        } catch (error) {
            this.displayError(error.message);
        }
    }

    displayResults(raidType, config, drives, result) {
        const { usableCapacity, rawCapacity, efficiency, wastedSpace } = result;

        const html = `
            <div class="result-stats fade-in">
                <div class="stat-card">
                    <div class="stat-label">Usable Capacity</div>
                    <div class="stat-value primary">${formatCapacity(usableCapacity)}</div>
                    <div class="stat-subtext">Actual storage available for data</div>
                </div>
                
                <div class="stat-card">
                    <div class="stat-label">Raw Capacity</div>
                    <div class="stat-value">${formatCapacity(rawCapacity)}</div>
                    <div class="stat-subtext">Total physical storage</div>
                </div>
                
                <div class="stat-card">
                    <div class="stat-label">Storage Efficiency</div>
                    <div class="stat-value">${formatPercentage(efficiency)}</div>
                    <div class="stat-subtext">${formatCapacity(wastedSpace)} used for redundancy</div>
                </div>
                
                <div class="capacity-visualization">
                    <div class="capacity-bar">
                        <div class="capacity-fill" style="width: ${efficiency * 100}%">
                            ${formatPercentage(efficiency)} Usable
                        </div>
                    </div>
                    <div class="capacity-legend">
                        <span>0 TiB</span>
                        <span>${formatCapacity(rawCapacity, false)}</span>
                    </div>
                </div>
                
                <ul class="feature-list">
                    <li class="feature-item">
                        <svg class="feature-icon info" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                        </svg>
                        <div class="feature-text">
                            <div class="feature-title">${config.name}</div>
                            <div class="feature-description">${config.description}</div>
                        </div>
                    </li>
                    
                    <li class="feature-item">
                        <svg class="feature-icon ${config.faultTolerance > 0 ? 'success' : 'warning'}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
                        </svg>
                        <div class="feature-text">
                            <div class="feature-title">Fault Tolerance</div>
                            <div class="feature-description">
                                ${config.faultTolerance > 0
                ? `Can survive ${config.faultTolerance} drive failure${config.faultTolerance > 1 ? 's' : ''} without data loss`
                : 'No redundancy - any drive failure results in data loss'}
                            </div>
                        </div>
                    </li>
                    
                    <li class="feature-item">
                        <svg class="feature-icon info" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M13 10V3L4 14h7v7l9-11h-7z"/>
                        </svg>
                        <div class="feature-text">
                            <div class="feature-title">Performance</div>
                            <div class="feature-description">
                                Read: ${config.readPerformance} | Write: ${config.writePerformance}
                            </div>
                        </div>
                    </li>
                    
                    <li class="feature-item">
                        <svg class="feature-icon success" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <rect x="2" y="3" width="20" height="4" rx="1"/>
                            <rect x="2" y="10" width="20" height="4" rx="1"/>
                            <rect x="2" y="17" width="20" height="4" rx="1"/>
                        </svg>
                        <div class="feature-text">
                            <div class="feature-title">Drive Configuration</div>
                            <div class="feature-description">
                                ${drives.length} drive${drives.length > 1 ? 's' : ''}: ${this.formatDriveList(drives)}
                                ${result.numVdevs ? `<br><strong>${result.numVdevs} vdevs</strong> × ${result.drivesPerVdev} drives each` : ''}
                            </div>
                        </div>
                    </li>
                    
                    <li class="feature-item">
                        <svg class="feature-icon info" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"/>
                        </svg>
                        <div class="feature-text">
                            <div class="feature-title">Binary vs Decimal</div>
                            <div class="feature-description">
                                Calculations account for the difference between advertised TB (decimal) and actual TiB (binary) capacity
                            </div>
                        </div>
                    </li>
                </ul>
            </div>
        `;

        this.resultsContent.innerHTML = html;
    }

    formatDriveList(drives) {
        const counts = {};
        drives.forEach(size => {
            counts[size] = (counts[size] || 0) + 1;
        });

        return Object.entries(counts)
            .map(([size, count]) => `${count}x ${size}TB`)
            .join(', ');
    }

    displayError(message) {
        this.resultsContent.innerHTML = `
            <div class="empty-state fade-in">
                <svg class="empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="stroke: var(--color-accent-danger);">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="15" y1="9" x2="9" y2="15"/>
                    <line x1="9" y1="9" x2="15" y2="15"/>
                </svg>
                <p style="color: var(--color-accent-danger);">${message}</p>
            </div>
        `;
    }
}

// ===================================
// Initialize Application
// ===================================

document.addEventListener('DOMContentLoaded', () => {
    new RAIDCalculator();
    initVersionDisplay();
});

/* ===================================
   Version Display Logic
   =================================== */
function initVersionDisplay() {
    const versionDisplay = document.getElementById('version-display');
    if (!versionDisplay) return;

    // Add cache buster to ensure fresh version info
    fetch(`version.json?t=${new Date().getTime()}`)
        .then(response => {
            if (!response.ok) throw new Error('Version info not found');
            return response.json();
        })
        .then(data => {
            if (!data.commit || !data.date) return;

            versionDisplay.innerHTML = `
                <a href="https://github.com/DeNNiiInc/Advanced-Raid-Calculator/commit/${data.commit}" 
                   target="_blank" 
                   rel="noopener noreferrer" 
                   class="version-tag"
                   title="View commit on GitHub">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 14px; height: 14px; opacity: 0.7;">
                        <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path>
                    </svg>
                    <span class="version-commit">${data.commit}</span>
                    <span class="version-divider"></span>
                    <span class="version-date">${data.date}</span>
                </a>
            `;
        })
        .catch(error => {
            console.log('Version info unavailable:', error);
            versionDisplay.style.display = 'none';
        });
}
