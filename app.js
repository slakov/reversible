/**
 * Interactive Dashboard Controller for Reversible Markov Process Visualization
 * 
 * This application provides a comprehensive interface for exploring reversible
 * two-dimensional Markov processes, allowing users to:
 * - Adjust model parameters interactively
 * - Run Monte Carlo simulations
 * - Visualize theoretical vs empirical distributions
 * - Analyze convergence quality and population dynamics
 * 
 * Architecture:
 * - MarkovDashboard: Main controller class
 * - ReversibleMarkovProcess: Mathematical engine (imported from markov.js)
 * - Plotly.js: Visualization library for interactive plots
 * - Responsive UI with parameter validation and error handling
 */

class MarkovDashboard {
    /**
     * Initialize the dashboard with default state and event listeners
     */
    constructor() {
        // Core application state
        this.markovProcess = null;
        this.currentResults = null;
        this.isSimulationRunning = false;
        
        // Performance tracking
        this.lastUpdateTime = 0;
        this.updateThrottleMs = 100; // Throttle parameter updates
        
        // Error state management
        this.lastError = null;
        this.errorDisplayTimeout = null;
        
        // Animation state
        this.animationEngine = null;
        this.isAnimationRunning = false;
        this.animationSpeed = 1.0;
        
        // Initialize application
        this._initializeEventListeners();
        this._initializeEmptyPlots();
        this._validateBrowserCompatibility();
    }

    /**
     * Set up all event listeners for user interactions
     * @private
     */
    _initializeEventListeners() {
        try {
            // Parameter input listeners with validation and throttling
            const paramInputs = document.querySelectorAll('.param-item input');
            paramInputs.forEach(input => {
                // Real-time validation on input
                input.addEventListener('input', this._onParameterInput.bind(this));
                // Update model on change (with throttling)
                input.addEventListener('change', this._onParameterChange.bind(this));
                // Validate on blur
                input.addEventListener('blur', this._validateSingleParameter.bind(this));
            });

            // Button event listeners with error handling
            const runButton = document.getElementById('runSimulation');
            const resetButton = document.getElementById('resetParams');
            
            if (runButton) {
                runButton.addEventListener('click', this._handleRunSimulation.bind(this));
            }
            
            if (resetButton) {
                resetButton.addEventListener('click', this._handleResetParameters.bind(this));
            }

            // Tab switching with proper cleanup
            const tabButtons = document.querySelectorAll('.tab-button');
            tabButtons.forEach(button => {
                button.addEventListener('click', this._handleTabSwitch.bind(this));
            });

            // Keyboard shortcuts
            document.addEventListener('keydown', this._handleKeyboardShortcuts.bind(this));
            
            // Window resize handler for responsive plots
            window.addEventListener('resize', this._handleWindowResize.bind(this));
            
            // Animation controls
            this._initializeAnimationControls();
            
            // Initialize with default parameters
            this._updateMarkovProcess();
            
        } catch (error) {
            this._handleError(error, 'Failed to initialize event listeners');
        }
    }

    /**
     * Create empty plots with proper layout and loading states
     * @private
     */
    _initializeEmptyPlots() {
        const commonLayout = {
            margin: { l: 50, r: 50, t: 30, b: 50 },
            font: { size: 12 },
            showlegend: false,
            paper_bgcolor: 'rgba(0,0,0,0)',
            plot_bgcolor: 'rgba(0,0,0,0)'
        };

        const plotConfig = { 
            responsive: true, 
            displayModeBar: true,
            modeBarButtonsToRemove: ['pan2d', 'lasso2d'],
            displaylogo: false
        };

        try {
            // Initialize heatmap plots
            Plotly.newPlot('theoreticalHeatmap', [], { 
                ...commonLayout, 
                title: 'Theoretical Distribution<br><span style="font-size: 10px;">Run simulation to see results</span>' 
            }, plotConfig);
            
            Plotly.newPlot('empiricalHeatmap', [], { 
                ...commonLayout, 
                title: 'Empirical Distribution<br><span style="font-size: 10px;">Run simulation to see results</span>' 
            }, plotConfig);

            // Initialize comparison plot
            Plotly.newPlot('comparisonPlot', [], { 
                ...commonLayout, 
                title: 'Theory vs Simulation Comparison',
                xaxis: { title: 'Theoretical Probability' },
                yaxis: { title: 'Empirical Probability' }
            }, plotConfig);

            // Initialize trajectory plot
            Plotly.newPlot('trajectoryPlot', [], { 
                ...commonLayout, 
                title: 'Sample Trajectory',
                xaxis: { title: 'Red Population (x)' },
                yaxis: { title: 'Blue Population (y)' }
            }, plotConfig);
            
        } catch (error) {
            this._handleError(error, 'Failed to initialize plots');
        }
    }

    /**
     * Check browser compatibility for required features
     * @private
     */
    _validateBrowserCompatibility() {
        const requiredFeatures = [
            'Map', 'Set', 'Promise', 'fetch'
        ];
        
        const missingFeatures = requiredFeatures.filter(feature => 
            typeof window[feature] === 'undefined'
        );
        
        if (missingFeatures.length > 0) {
            this._showError(`Browser compatibility issue: Missing ${missingFeatures.join(', ')}. Please use a modern browser.`);
        }
    }

    /**
     * Handle parameter input with real-time validation
     * @private
     */
    _onParameterInput(event) {
        const input = event.target;
        const value = parseFloat(input.value);
        
        // Real-time visual feedback
        if (isNaN(value) || value <= 0) {
            input.style.borderColor = '#ef4444';
            input.style.backgroundColor = '#fef2f2';
        } else {
            input.style.borderColor = '#10b981';
            input.style.backgroundColor = '#f0fdf4';
        }
    }

    /**
     * Handle parameter changes with throttling and validation
     * @private
     */
    _onParameterChange(event) {
        // Throttle updates to prevent excessive computation
        const now = Date.now();
        if (now - this.lastUpdateTime < this.updateThrottleMs) {
            return;
        }
        this.lastUpdateTime = now;
        
        try {
            if (this._validateAllParameters()) {
                this._updateMarkovProcess();
                this._updateTheoreticalPlot();
            }
        } catch (error) {
            this._handleError(error, 'Parameter update failed');
        }
    }

    /**
     * Validate a single parameter input
     * @private
     */
    _validateSingleParameter(event) {
        const input = event.target;
        const value = parseFloat(input.value);
        const paramName = input.id;
        
        if (isNaN(value) || value <= 0 || !isFinite(value)) {
            this._showParameterError(input, `${paramName} must be a positive number`);
            return false;
        }
        
        // Parameter-specific validation
        const validationRules = {
            alpha1: [0.1, 10],
            alpha2: [0.1, 10],
            beta1: [0.1, 5],
            beta2: [0.1, 5],
            gamma: [0.1, 10],
            delta1: [0.1, 5],
            delta2: [0.1, 5],
            beta1_hat: [0.1, 10],
            beta2_hat: [0.1, 10],
            gamma_hat: [0.1, 5],
            simTime: [10, 10000],
            burnIn: [0, 1000],
            maxStates: [5, 50]
        };
        
        if (validationRules[paramName]) {
            const [min, max] = validationRules[paramName];
            if (value < min || value > max) {
                this._showParameterError(input, `${paramName} should be between ${min} and ${max}`);
                return false;
            }
        }
        
        this._clearParameterError(input);
        return true;
    }

    /**
     * Validate all parameters before updating model
     * @private
     */
    _validateAllParameters() {
        const inputs = document.querySelectorAll('.param-item input');
        let allValid = true;
        
        inputs.forEach(input => {
            if (!this._validateSingleParameter({ target: input })) {
                allValid = false;
            }
        });
        
        return allValid;
    }

    /**
     * Show parameter-specific error message
     * @private
     */
    _showParameterError(input, message) {
        input.style.borderColor = '#ef4444';
        input.style.backgroundColor = '#fef2f2';
        input.title = message;
        
        // Create or update error tooltip
        let errorSpan = input.parentNode.querySelector('.param-error');
        if (!errorSpan) {
            errorSpan = document.createElement('span');
            errorSpan.className = 'param-error';
            input.parentNode.appendChild(errorSpan);
        }
        errorSpan.textContent = message;
        errorSpan.style.color = '#ef4444';
        errorSpan.style.fontSize = '11px';
        errorSpan.style.display = 'block';
    }

    /**
     * Clear parameter error styling
     * @private
     */
    _clearParameterError(input) {
        input.style.borderColor = '';
        input.style.backgroundColor = '';
        input.title = '';
        
        const errorSpan = input.parentNode.querySelector('.param-error');
        if (errorSpan) {
            errorSpan.remove();
        }
    }

    /**
     * Update the Markov process instance with current parameters
     * @private
     */
    _updateMarkovProcess() {
        try {
            const params = this._getParametersFromForm();
            this.markovProcess = new ReversibleMarkovProcess(params);
            this._clearError();
        } catch (error) {
            this._handleError(error, 'Failed to create Markov process with current parameters');
        }
    }

    /**
     * Extract parameters from form inputs with validation
     * @private
     */
    _getParametersFromForm() {
        const params = {};
        const inputs = document.querySelectorAll('.param-item input');
        
        inputs.forEach(input => {
            const value = parseFloat(input.value);
            if (isNaN(value) || value <= 0) {
                throw new Error(`Invalid parameter ${input.id}: ${input.value}`);
            }
            
            // Map HTML IDs to parameter names
            const paramMap = {
                'alpha1': 'alpha1',
                'alpha2': 'alpha2',
                'beta1': 'beta1',
                'beta2': 'beta2',
                'gamma': 'gamma',
                'delta1': 'delta1',
                'delta2': 'delta2',
                'beta1_hat': 'beta1_hat',
                'beta2_hat': 'beta2_hat',
                'gamma_hat': 'gamma_hat'
            };
            
            if (paramMap[input.id]) {
                params[paramMap[input.id]] = value;
            }
        });
        
        return params;
    }

    /**
     * Reset all parameters to safe default values
     * @private
     */
    _handleResetParameters() {
        try {
            const defaultParams = {
                alpha1: 1.5,
                alpha2: 1.2,
                beta1: 0.8,
                beta2: 0.8,
                gamma: 1.5,
                delta1: 0.9,
                delta2: 0.7,
                beta1_hat: 1.2,
                beta2_hat: 1.2,
                gamma_hat: 0.8
            };
            
            // Update form inputs
            Object.entries(defaultParams).forEach(([key, value]) => {
                const input = document.getElementById(key);
                if (input) {
                    input.value = value;
                    this._clearParameterError(input);
                }
            });
            
            // Reset simulation parameters
            document.getElementById('simTime').value = 200;
            document.getElementById('burnIn').value = 50;
            document.getElementById('maxStates').value = 12;
            
            this._updateMarkovProcess();
            this._updateTheoreticalPlot();
            
            this._showSuccess('Parameters reset to defaults');
            
        } catch (error) {
            this._handleError(error, 'Failed to reset parameters');
        }
    }

    /**
     * Handle simulation execution with comprehensive error handling
     * @private
     */
    async _handleRunSimulation() {
        if (this.isSimulationRunning) {
            this._showWarning('Simulation already running. Please wait...');
            return;
        }
        
        try {
            // Validate inputs first
            if (!this._validateAllParameters()) {
                this._showError('Please correct parameter errors before running simulation');
                return;
            }
            
            if (!this.markovProcess) {
                throw new Error('Markov process not initialized');
            }
            
            const startTime = performance.now();
            this.isSimulationRunning = true;
            this._showLoading(true);
            this._updateSimulationButton(true);

            // Get simulation parameters
            const simTime = parseFloat(document.getElementById('simTime').value);
            const burnIn = parseFloat(document.getElementById('burnIn').value);
            const maxStates = parseInt(document.getElementById('maxStates').value);

            // Parameter sanity checks
            if (simTime <= burnIn) {
                throw new Error('Simulation time must be greater than burn-in time');
            }
            
            if (maxStates < 5 || maxStates > 50) {
                throw new Error('Maximum states should be between 5 and 50 for reasonable performance');
            }

            // Show progress indication
            this._updateProgress('Starting simulation...');

            // Run simulation with progress updates
            const results = await this._runSimulationWithProgress(simTime, burnIn, maxStates);
            
            this._updateProgress('Calculating distributions...');
            
            // Calculate distributions
            const empiricalDist = this.markovProcess.getEmpiricalDistribution(results.samples, maxStates);
            const theoreticalDist = this.markovProcess.getTheoreticalDistribution(maxStates);
            
            this._updateProgress('Computing statistics...');
            
            // Calculate statistics
            const stats = this.markovProcess.calculateStatistics(results.samples);
            const tvDistance = this.markovProcess.totalVariationDistance(theoreticalDist, empiricalDist);
            
            // Validate results
            if (results.samples.length === 0) {
                throw new Error('No samples collected during simulation');
            }
            
            if (tvDistance > 0.8) {
                console.warn('Very poor convergence detected (TV distance > 0.8). Consider adjusting parameters.');
            }

            // Store results
            this.currentResults = {
                ...results,
                empiricalDist,
                theoreticalDist,
                stats,
                tvDistance,
                maxStates,
                simulationTime: (performance.now() - startTime) / 1000,
                parameterSummary: this.markovProcess.getParameterSummary()
            };

            this._updateProgress('Updating visualizations...');

            // Update all visualizations
            await this._updateAllPlots();
            this._updateStatistics();
            
            // Show success message with key metrics
            const message = `Simulation completed! TV distance: ${tvDistance.toFixed(4)}, Samples: ${results.samples.length.toLocaleString()}`;
            this._showSuccess(message);

        } catch (error) {
            this._handleError(error, 'Simulation failed');
        } finally {
            this.isSimulationRunning = false;
            this._showLoading(false);
            this._updateSimulationButton(false);
        }
    }

    /**
     * Run simulation with periodic progress updates
     * @private
     */
    async _runSimulationWithProgress(simTime, burnIn, maxStates) {
        return new Promise((resolve, reject) => {
            // Use setTimeout to allow UI updates
            setTimeout(() => {
                try {
                    const results = this.markovProcess.simulate(simTime, burnIn, maxStates);
                    resolve(results);
                } catch (error) {
                    reject(error);
                }
            }, 10);
        });
    }

    /**
     * Update progress indicator
     * @private
     */
    _updateProgress(message) {
        const progressElement = document.querySelector('.loading-overlay p');
        if (progressElement) {
            progressElement.textContent = message;
        }
    }

    /**
     * Update theoretical distribution plot
     * @private
     */
    _updateTheoreticalPlot() {
        if (!this.markovProcess) return;

        try {
            const maxStates = parseInt(document.getElementById('maxStates').value) || 15;
            const theoreticalDist = this.markovProcess.getTheoreticalDistribution(maxStates);
            this._plotHeatmap('theoreticalHeatmap', theoreticalDist, maxStates, 'Theoretical Distribution');
        } catch (error) {
            console.warn('Failed to update theoretical plot:', error.message);
        }
    }

    /**
     * Update all plot visualizations
     * @private
     */
    async _updateAllPlots() {
        if (!this.currentResults) return;

        const { empiricalDist, theoreticalDist, trajectory, maxStates } = this.currentResults;

        try {
            // Update plots in parallel for better performance
            await Promise.all([
                this._plotHeatmap('theoreticalHeatmap', theoreticalDist, maxStates, 'Theoretical Distribution'),
                this._plotHeatmap('empiricalHeatmap', empiricalDist, maxStates, 'Empirical Distribution'),
                this._plotComparison(theoreticalDist, empiricalDist),
                this._plotTrajectory(trajectory)
            ]);
        } catch (error) {
            this._handleError(error, 'Failed to update plots');
        }
    }

    /**
     * Create heatmap visualization for probability distributions
     * @private
     */
    async _plotHeatmap(elementId, distribution, maxStates, title) {
        try {
            // Convert distribution to matrix format for heatmap
            const z = [];
            const x = [];
            const y = [];

            for (let i = 0; i <= maxStates; i++) {
                y.push(i);
                x.push(i);
            }

            // Build probability matrix (y-axis inverted for proper display)
            for (let j = maxStates; j >= 0; j--) {
                const row = [];
                for (let i = 0; i <= maxStates; i++) {
                    const prob = distribution[`${i},${j}`] || 0;
                    row.push(prob);
                }
                z.push(row);
            }

            const data = [{
                z: z,
                x: x,
                y: y.reverse(),
                type: 'heatmap',
                colorscale: 'Viridis',
                hoverongaps: false,
                hovertemplate: '<b>State (%{x}, %{y})</b><br>Probability: %{z:.6f}<extra></extra>',
                colorbar: {
                    title: 'Probability',
                    titleside: 'right'
                }
            }];

            const layout = {
                title: { 
                    text: title, 
                    font: { size: 14 },
                    y: 0.95
                },
                xaxis: { 
                    title: 'Red Population (x)', 
                    dtick: 1,
                    showgrid: true,
                    gridcolor: 'rgba(255,255,255,0.3)'
                },
                yaxis: { 
                    title: 'Blue Population (y)', 
                    dtick: 1,
                    showgrid: true,
                    gridcolor: 'rgba(255,255,255,0.3)'
                },
                margin: { l: 60, r: 60, t: 40, b: 60 },
                height: 350,
                paper_bgcolor: 'rgba(0,0,0,0)',
                plot_bgcolor: 'rgba(0,0,0,0)'
            };

            const config = { 
                responsive: true,
                displayModeBar: true,
                displaylogo: false
            };

            await Plotly.newPlot(elementId, data, layout, config);
            
        } catch (error) {
            throw new Error(`Failed to plot heatmap ${elementId}: ${error.message}`);
        }
    }

    /**
     * Create scatter plot comparing theoretical vs empirical probabilities
     * @private
     */
    async _plotComparison(theoretical, empirical) {
        try {
            const theoreticalProbs = [];
            const empiricalProbs = [];
            const labels = [];
            const colors = [];

            // Collect all states and their probabilities
            const allKeys = new Set([...Object.keys(theoretical), ...Object.keys(empirical)]);
            
            for (let key of allKeys) {
                const theoreticalProb = theoretical[key] || 0;
                const empiricalProb = empirical[key] || 0;
                
                // Only plot states with significant probability mass
                if (theoreticalProb > 1e-6 || empiricalProb > 1e-6) {
                    theoreticalProbs.push(theoreticalProb);
                    empiricalProbs.push(empiricalProb);
                    labels.push(`(${key})`);
                    
                    // Color by agreement quality
                    const error = Math.abs(theoreticalProb - empiricalProb);
                    const maxProb = Math.max(theoreticalProb, empiricalProb);
                    const relativeError = maxProb > 0 ? error / maxProb : 0;
                    
                    if (relativeError < 0.1) colors.push('rgba(16, 185, 129, 0.8)'); // Good agreement
                    else if (relativeError < 0.3) colors.push('rgba(251, 191, 36, 0.8)'); // Fair agreement
                    else colors.push('rgba(239, 68, 68, 0.8)'); // Poor agreement
                }
            }

            const maxProb = Math.max(...theoreticalProbs);

            const data = [
                {
                    x: theoreticalProbs,
                    y: empiricalProbs,
                    mode: 'markers',
                    type: 'scatter',
                    text: labels,
                    hovertemplate: '<b>State %{text}</b><br>Theoretical: %{x:.6f}<br>Empirical: %{y:.6f}<br>Error: %{customdata:.6f}<extra></extra>',
                    customdata: theoreticalProbs.map((t, i) => Math.abs(t - empiricalProbs[i])),
                    marker: {
                        size: 8,
                        color: colors,
                        line: { color: 'rgba(0, 0, 0, 0.3)', width: 1 }
                    },
                    name: 'State Probabilities'
                },
                {
                    x: [0, maxProb],
                    y: [0, maxProb],
                    mode: 'lines',
                    type: 'scatter',
                    line: { color: 'red', dash: 'dash', width: 2 },
                    name: 'Perfect Agreement',
                    hoverinfo: 'none'
                }
            ];

            const layout = {
                title: 'Theory vs Simulation Comparison',
                xaxis: { 
                    title: 'Theoretical Probability',
                    showgrid: true,
                    gridcolor: 'rgba(128,128,128,0.3)'
                },
                yaxis: { 
                    title: 'Empirical Probability',
                    showgrid: true,
                    gridcolor: 'rgba(128,128,128,0.3)'
                },
                margin: { l: 60, r: 60, t: 60, b: 60 },
                height: 500,
                showlegend: true,
                paper_bgcolor: 'rgba(0,0,0,0)',
                plot_bgcolor: 'rgba(0,0,0,0)',
                legend: {
                    x: 0.02,
                    y: 0.98,
                    bgcolor: 'rgba(255,255,255,0.8)'
                }
            };

            const config = { 
                responsive: true,
                displayModeBar: true,
                displaylogo: false
            };

            await Plotly.newPlot('comparisonPlot', data, layout, config);
            
        } catch (error) {
            throw new Error(`Failed to plot comparison: ${error.message}`);
        }
    }

    /**
     * Create trajectory visualization showing population evolution over time
     * @private
     */
    async _plotTrajectory(trajectory) {
        try {
            if (!trajectory || trajectory.length === 0) {
                throw new Error('No trajectory data available');
            }

            // Sample trajectory points for better visualization performance
            const maxPoints = 2000;
            const sampleRate = Math.max(1, Math.floor(trajectory.length / maxPoints));
            const sampledTrajectory = trajectory.filter((_, index) => index % sampleRate === 0);

            const data = [
                {
                    x: sampledTrajectory.map(point => point.x),
                    y: sampledTrajectory.map(point => point.y),
                    mode: 'lines+markers',
                    type: 'scatter',
                    line: { 
                        color: 'rgba(16, 185, 129, 0.6)', 
                        width: 2
                    },
                    marker: { 
                        size: 3, 
                        color: sampledTrajectory.map((_, i) => i),
                        colorscale: 'Plasma',
                        showscale: true,
                        colorbar: { 
                            title: 'Time Order',
                            titleside: 'right'
                        },
                        line: {
                            color: 'rgba(255,255,255,0.6)',
                            width: 0.5
                        }
                    },
                    hovertemplate: '<b>State (%{x}, %{y})</b><br>Time: %{text}<br>Step: %{pointNumber}<extra></extra>',
                    text: sampledTrajectory.map(point => point.time?.toFixed(2) || 'N/A'),
                    name: 'Population Trajectory'
                }
            ];

            // Add starting point marker
            if (sampledTrajectory.length > 0) {
                data.push({
                    x: [sampledTrajectory[0].x],
                    y: [sampledTrajectory[0].y],
                    mode: 'markers',
                    type: 'scatter',
                    marker: {
                        size: 12,
                        color: 'red',
                        symbol: 'star',
                        line: { color: 'white', width: 2 }
                    },
                    name: 'Start',
                    hovertemplate: '<b>Starting Point</b><br>State: (%{x}, %{y})<extra></extra>'
                });
            }

            const layout = {
                title: 'Sample Trajectory Through State Space',
                xaxis: { 
                    title: 'Red Population (x)',
                    showgrid: true,
                    gridcolor: 'rgba(128,128,128,0.3)'
                },
                yaxis: { 
                    title: 'Blue Population (y)',
                    showgrid: true,
                    gridcolor: 'rgba(128,128,128,0.3)'
                },
                margin: { l: 60, r: 60, t: 60, b: 60 },
                height: 500,
                showlegend: true,
                paper_bgcolor: 'rgba(0,0,0,0)',
                plot_bgcolor: 'rgba(0,0,0,0)',
                legend: {
                    x: 0.02,
                    y: 0.98,
                    bgcolor: 'rgba(255,255,255,0.8)'
                }
            };

            const config = { 
                responsive: true,
                displayModeBar: true,
                displaylogo: false
            };

            await Plotly.newPlot('trajectoryPlot', data, layout, config);
            
        } catch (error) {
            throw new Error(`Failed to plot trajectory: ${error.message}`);
        }
    }

    /**
     * Update statistics display with comprehensive metrics
     * @private
     */
    _updateStatistics() {
        if (!this.currentResults) return;

        try {
            const { stats, tvDistance, simulationTime, samples, parameterSummary } = this.currentResults;

            // Quality assessment based on TV distance
            let quality = 'Poor';
            let qualityClass = 'poor';
            
            if (tvDistance < 0.1) {
                quality = 'Excellent';
                qualityClass = 'excellent';
            } else if (tvDistance < 0.2) {
                quality = 'Good';
                qualityClass = 'good';
            } else if (tvDistance < 0.3) {
                quality = 'Fair';
                qualityClass = 'fair';
            }

            // Update display elements
            this._updateStatElement('tvDistance', tvDistance.toFixed(6), qualityClass);
            this._updateStatElement('convergenceQuality', quality, qualityClass);
            this._updateStatElement('meanRed', stats.meanX.toFixed(3));
            this._updateStatElement('meanBlue', stats.meanY.toFixed(3));
            this._updateStatElement('sampleCount', samples.length.toLocaleString());
            this._updateStatElement('simDuration', `${simulationTime.toFixed(2)}s`);

            // Add additional statistics if available
            if (stats.correlation !== undefined) {
                this._updateOrCreateStatElement('correlation', 'Population Correlation:', stats.correlation.toFixed(3));
            }
            
            if (parameterSummary) {
                this._updateOrCreateStatElement('redBlueRatio', 'Red/Blue Balance:', 
                    `${(parameterSummary.redRatio / parameterSummary.blueRatio).toFixed(2)}`);
            }

        } catch (error) {
            console.warn('Failed to update statistics:', error.message);
        }
    }

    /**
     * Update a statistics element with optional styling
     * @private
     */
    _updateStatElement(id, value, className = '') {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value;
            element.className = `stat-value ${className}`;
        }
    }

    /**
     * Update or create a statistics element
     * @private
     */
    _updateOrCreateStatElement(id, label, value) {
        let element = document.getElementById(id);
        if (!element) {
            const statsContainer = document.getElementById('statistics');
            const statItem = document.createElement('div');
            statItem.className = 'stat-item';
            statItem.innerHTML = `
                <span class="stat-label">${label}</span>
                <span id="${id}" class="stat-value">${value}</span>
            `;
            statsContainer.appendChild(statItem);
        } else {
            element.textContent = value;
        }
    }

    /**
     * Handle tab switching with proper plot resizing
     * @private
     */
    _handleTabSwitch(event) {
        const targetTab = event.target.dataset.tab;
        
        try {
            // Update tab buttons
            document.querySelectorAll('.tab-button').forEach(btn => {
                btn.classList.remove('active');
            });
            event.target.classList.add('active');

            // Update tab content
            document.querySelectorAll('.tab-content').forEach(content => {
                content.classList.remove('active');
            });
            document.getElementById(targetTab).classList.add('active');

            // Resize plots when tab becomes visible (with small delay for CSS transitions)
            setTimeout(() => {
                try {
                    if (targetTab === 'comparison') {
                        Plotly.Plots.resize('comparisonPlot');
                    } else if (targetTab === 'trajectory') {
                        Plotly.Plots.resize('trajectoryPlot');
                    } else if (targetTab === 'heatmap') {
                        Plotly.Plots.resize('theoreticalHeatmap');
                        Plotly.Plots.resize('empiricalHeatmap');
                    }
                } catch (resizeError) {
                    console.warn('Plot resize failed:', resizeError.message);
                }
            }, 150);
            
        } catch (error) {
            this._handleError(error, 'Tab switching failed');
        }
    }

    /**
     * Handle keyboard shortcuts for improved usability
     * @private
     */
    _handleKeyboardShortcuts(event) {
        // Ctrl/Cmd + Enter: Run simulation
        if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
            event.preventDefault();
            this._handleRunSimulation();
        }
        
        // Ctrl/Cmd + R: Reset parameters
        if ((event.ctrlKey || event.metaKey) && event.key === 'r') {
            event.preventDefault();
            this._handleResetParameters();
        }
        
        // Tab numbers for quick switching
        if (event.key >= '1' && event.key <= '3' && !event.target.matches('input')) {
            const tabButtons = document.querySelectorAll('.tab-button');
            const tabIndex = parseInt(event.key) - 1;
            if (tabButtons[tabIndex]) {
                tabButtons[tabIndex].click();
            }
        }
    }

    /**
     * Handle window resize for responsive plots
     * @private
     */
    _handleWindowResize() {
        // Debounce resize events
        clearTimeout(this.resizeTimeout);
        this.resizeTimeout = setTimeout(() => {
            try {
                Plotly.Plots.resize('theoreticalHeatmap');
                Plotly.Plots.resize('empiricalHeatmap');
                Plotly.Plots.resize('comparisonPlot');
                Plotly.Plots.resize('trajectoryPlot');
            } catch (error) {
                console.warn('Window resize handling failed:', error.message);
            }
        }, 300);
    }

    /**
     * Update simulation button state
     * @private
     */
    _updateSimulationButton(isRunning) {
        const button = document.getElementById('runSimulation');
        if (button) {
            button.disabled = isRunning;
            button.textContent = isRunning ? 'Running Simulation...' : 'Run Simulation';
            button.style.opacity = isRunning ? '0.6' : '1';
        }
    }

    /**
     * Show/hide loading overlay
     * @private
     */
    _showLoading(show) {
        const loadingOverlay = document.getElementById('loading');
        if (loadingOverlay) {
            if (show) {
                loadingOverlay.classList.add('active');
            } else {
                loadingOverlay.classList.remove('active');
            }
        }
    }

    /**
     * Centralized error handling with user-friendly messages
     * @private
     */
    _handleError(error, context = '') {
        console.error(`${context}:`, error);
        
        this.lastError = { error, context, timestamp: Date.now() };
        
        let userMessage = error.message || 'An unexpected error occurred';
        if (context) {
            userMessage = `${context}: ${userMessage}`;
        }
        
        this._showError(userMessage);
    }

    /**
     * Display error message to user
     * @private
     */
    _showError(message) {
        this._showMessage(message, 'error');
    }

    /**
     * Display warning message to user
     * @private
     */
    _showWarning(message) {
        this._showMessage(message, 'warning');
    }

    /**
     * Display success message to user
     * @private
     */
    _showSuccess(message) {
        this._showMessage(message, 'success');
    }

    /**
     * Display a temporary message to the user
     * @private
     */
    _showMessage(message, type = 'info') {
        // Clear any existing message timeout
        if (this.errorDisplayTimeout) {
            clearTimeout(this.errorDisplayTimeout);
        }
        
        // Create or update message element
        let messageElement = document.getElementById('system-message');
        if (!messageElement) {
            messageElement = document.createElement('div');
            messageElement.id = 'system-message';
            messageElement.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                padding: 12px 20px;
                border-radius: 6px;
                color: white;
                font-weight: 500;
                z-index: 10000;
                max-width: 400px;
                word-wrap: break-word;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                transition: opacity 0.3s ease;
            `;
            document.body.appendChild(messageElement);
        }
        
        // Set message type styling
        const typeStyles = {
            error: 'background-color: #ef4444;',
            warning: 'background-color: #f59e0b;',
            success: 'background-color: #10b981;',
            info: 'background-color: #3b82f6;'
        };
        
        messageElement.style.cssText += typeStyles[type] || typeStyles.info;
        messageElement.textContent = message;
        messageElement.style.opacity = '1';
        
        // Auto-hide after delay
        this.errorDisplayTimeout = setTimeout(() => {
            if (messageElement) {
                messageElement.style.opacity = '0';
                setTimeout(() => {
                    if (messageElement.parentNode) {
                        messageElement.parentNode.removeChild(messageElement);
                    }
                }, 300);
            }
        }, type === 'error' ? 8000 : 4000);
    }

    /**
     * Clear any displayed error messages
     * @private
     */
    _clearError() {
        const messageElement = document.getElementById('system-message');
        if (messageElement) {
            messageElement.style.opacity = '0';
            setTimeout(() => {
                if (messageElement.parentNode) {
                    messageElement.parentNode.removeChild(messageElement);
                }
            }, 300);
        }
    }

    /**
     * Initialize animation controls and canvas
     * @private
     */
    _initializeAnimationControls() {
        try {
            // Animation control buttons
            const playPauseBtn = document.getElementById('playPause');
            const resetBtn = document.getElementById('resetAnimation');
            const speedSlider = document.getElementById('animationSpeed');
            const speedValue = document.getElementById('speedValue');

            if (playPauseBtn) {
                playPauseBtn.addEventListener('click', this._toggleAnimation.bind(this));
            }

            if (resetBtn) {
                resetBtn.addEventListener('click', this._resetAnimation.bind(this));
            }

            if (speedSlider && speedValue) {
                speedSlider.addEventListener('input', (e) => {
                    this.animationSpeed = parseFloat(e.target.value);
                    speedValue.textContent = `${this.animationSpeed.toFixed(1)}x`;
                    if (this.animationEngine) {
                        this.animationEngine.setSpeed(this.animationSpeed);
                    }
                });
            }

            // Initialize animation engine when tab becomes active
            document.addEventListener('click', (e) => {
                if (e.target.matches('[data-tab="animation"]')) {
                    setTimeout(() => this._initializeAnimationEngine(), 100);
                }
            });

        } catch (error) {
            console.warn('Failed to initialize animation controls:', error.message);
        }
    }

    /**
     * Initialize the animation engine with canvas
     * @private
     */
    _initializeAnimationEngine() {
        try {
            const canvas = document.getElementById('populationCanvas');
            if (!canvas || this.animationEngine) return;

            this.animationEngine = new PopulationAnimationEngine(canvas);
            console.log('Animation engine initialized');
        } catch (error) {
            this._handleError(error, 'Failed to initialize animation engine');
        }
    }

    /**
     * Toggle animation play/pause
     * @private
     */
    _toggleAnimation() {
        try {
            if (!this.animationEngine) {
                this._initializeAnimationEngine();
                if (!this.animationEngine) {
                    throw new Error('Animation engine not available');
                }
            }

            if (!this.markovProcess) {
                throw new Error('Please set parameters first');
            }

            const playPauseBtn = document.getElementById('playPause');

            if (this.isAnimationRunning) {
                this.animationEngine.pause();
                this.isAnimationRunning = false;
                if (playPauseBtn) playPauseBtn.textContent = '▶️ Play';
            } else {
                // Start new simulation for animation
                this.animationEngine.start(this.markovProcess);
                this.isAnimationRunning = true;
                if (playPauseBtn) playPauseBtn.textContent = '⏸️ Pause';
            }
        } catch (error) {
            this._handleError(error, 'Animation control failed');
        }
    }

    /**
     * Reset animation to initial state
     * @private
     */
    _resetAnimation() {
        try {
            if (this.animationEngine) {
                this.animationEngine.reset();
            }
            
            this.isAnimationRunning = false;
            const playPauseBtn = document.getElementById('playPause');
            if (playPauseBtn) playPauseBtn.textContent = '▶️ Play';

            // Reset display elements
            document.getElementById('redCount').textContent = '0';
            document.getElementById('blueCount').textContent = '0';
            document.getElementById('animationTime').textContent = '0.00';
            
            const eventLog = document.getElementById('eventLog');
            if (eventLog) {
                eventLog.innerHTML = '<div class="event-item">Ready to start simulation...</div>';
            }

        } catch (error) {
            this._handleError(error, 'Animation reset failed');
        }
    }
}

/**
 * Population Animation Engine
 * Handles real-time visualization of population dynamics
 */
class PopulationAnimationEngine {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.width = canvas.width;
        this.height = canvas.height;
        
        // Animation state
        this.isRunning = false;
        this.currentTime = 0;
        this.speed = 1.0;
        this.lastFrameTime = 0;
        
        // Population state
        this.redPopulation = [];
        this.bluePopulation = [];
        this.particles = []; // For animation effects
        
        // Visual settings
        this.dotRadius = 6;
        this.spacing = 20;
        this.margin = 40;
        
        // Event tracking
        this.eventLog = [];
        this.maxLogEntries = 10;
        
        this._setupCanvas();
        this._initializeDisplay();
    }

    _setupCanvas() {
        // Set up canvas for high DPI displays
        const dpr = window.devicePixelRatio || 1;
        const rect = this.canvas.getBoundingClientRect();
        
        this.canvas.width = rect.width * dpr;
        this.canvas.height = rect.height * dpr;
        this.canvas.style.width = rect.width + 'px';
        this.canvas.style.height = rect.height + 'px';
        
        this.ctx.scale(dpr, dpr);
        this.width = rect.width;
        this.height = rect.height;
    }

    _initializeDisplay() {
        this.ctx.clearRect(0, 0, this.width, this.height);
        
        // Draw initial background
        this.ctx.fillStyle = '#f8fafc';
        this.ctx.fillRect(0, 0, this.width, this.height);
        
        // Draw grid
        this._drawGrid();
        
        // Draw initial message
        this.ctx.fillStyle = '#64748b';
        this.ctx.font = '16px Inter, sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('Click Play to start population simulation', this.width / 2, this.height / 2);
    }

    _drawGrid() {
        this.ctx.strokeStyle = '#e2e8f0';
        this.ctx.lineWidth = 1;
        
        // Vertical lines
        for (let x = this.margin; x < this.width - this.margin; x += this.spacing * 2) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, this.margin);
            this.ctx.lineTo(x, this.height - this.margin);
            this.ctx.stroke();
        }
        
        // Horizontal lines
        for (let y = this.margin; y < this.height - this.margin; y += this.spacing * 2) {
            this.ctx.beginPath();
            this.ctx.moveTo(this.margin, y);
            this.ctx.lineTo(this.width - this.margin, y);
            this.ctx.stroke();
        }
    }

    start(markovProcess) {
        this.markovProcess = markovProcess;
        this.reset();
        this.isRunning = true;
        this.lastFrameTime = performance.now();
        this._animate();
        this._runSimulation();
    }

    pause() {
        this.isRunning = false;
    }

    reset() {
        this.currentTime = 0;
        this.redPopulation = [];
        this.bluePopulation = [];
        this.particles = [];
        this.eventLog = [];
        this._updateCounters();
        this._updateEventLog();
        this._initializeDisplay();
    }

    setSpeed(speed) {
        this.speed = speed;
    }

    _animate() {
        if (!this.isRunning) return;

        const currentFrameTime = performance.now();
        const deltaTime = (currentFrameTime - this.lastFrameTime) * this.speed;
        this.lastFrameTime = currentFrameTime;

        // Update particles
        this._updateParticles(deltaTime);
        
        // Draw frame
        this._drawFrame();
        
        requestAnimationFrame(() => this._animate());
    }

    _runSimulation() {
        if (!this.isRunning || !this.markovProcess) return;

        try {
            // Calculate current rates
            const x = this.redPopulation.length;
            const y = this.bluePopulation.length;
            
            const lambda1 = this.markovProcess.lambda1(x, y); // Red arrival
            const lambda2 = this.markovProcess.lambda2(x, y); // Blue arrival
            const mu1 = this.markovProcess.mu1(x, y);         // Red departure
            const mu2 = this.markovProcess.mu2(x, y);         // Blue departure
            const totalRate = lambda1 + lambda2 + mu1 + mu2;

            if (totalRate <= 1e-10) {
                // Very low rates, wait a bit
                setTimeout(() => this._runSimulation(), 100 / this.speed);
                return;
            }

            // Sample waiting time
            const waitTime = (-Math.log(Math.random()) / totalRate) * 1000; // Convert to ms
            
            setTimeout(() => {
                if (!this.isRunning) return;

                // Sample which event occurs
                const rand = Math.random() * totalRate;
                
                if (rand < lambda1) {
                    this._addRedIndividual();
                } else if (rand < lambda1 + lambda2) {
                    this._addBlueIndividual();
                } else if (rand < lambda1 + lambda2 + mu1) {
                    this._removeRedIndividual();
                } else {
                    this._removeBlueIndividual();
                }

                this.currentTime += waitTime / 1000;
                this._updateTime();
                this._runSimulation(); // Continue simulation
                
            }, Math.max(10, waitTime / this.speed)); // Minimum 10ms delay for visualization

        } catch (error) {
            console.error('Simulation step failed:', error);
            this.pause();
        }
    }

    _addRedIndividual() {
        const position = this._getRandomPosition('red');
        const individual = {
            id: Date.now() + Math.random(),
            x: position.x,
            y: position.y,
            targetX: position.x,
            targetY: position.y,
            isNew: true
        };
        
        this.redPopulation.push(individual);
        this._addParticleEffect(position.x, position.y, '#ef4444', 'arrival');
        this._logEvent('Red arrival', 'arrival');
        this._updateCounters();
    }

    _addBlueIndividual() {
        const position = this._getRandomPosition('blue');
        const individual = {
            id: Date.now() + Math.random(),
            x: position.x,
            y: position.y,
            targetX: position.x,
            targetY: position.y,
            isNew: true
        };
        
        this.bluePopulation.push(individual);
        this._addParticleEffect(position.x, position.y, '#3b82f6', 'arrival');
        this._logEvent('Blue arrival', 'arrival');
        this._updateCounters();
    }

    _removeRedIndividual() {
        if (this.redPopulation.length === 0) return;
        
        const index = Math.floor(Math.random() * this.redPopulation.length);
        const individual = this.redPopulation[index];
        
        this._addParticleEffect(individual.x, individual.y, '#ef4444', 'departure');
        this.redPopulation.splice(index, 1);
        this._logEvent('Red departure', 'departure');
        this._updateCounters();
    }

    _removeBlueIndividual() {
        if (this.bluePopulation.length === 0) return;
        
        const index = Math.floor(Math.random() * this.bluePopulation.length);
        const individual = this.bluePopulation[index];
        
        this._addParticleEffect(individual.x, individual.y, '#3b82f6', 'departure');
        this.bluePopulation.splice(index, 1);
        this._logEvent('Blue departure', 'departure');
        this._updateCounters();
    }

    _getRandomPosition(type) {
        const totalCount = this.redPopulation.length + this.bluePopulation.length;
        const gridCols = Math.floor((this.width - 2 * this.margin) / this.spacing);
        const gridRows = Math.floor((this.height - 2 * this.margin) / this.spacing);
        
        // Try to find empty position
        let attempts = 0;
        while (attempts < 50) {
            const col = Math.floor(Math.random() * gridCols);
            const row = Math.floor(Math.random() * gridRows);
            const x = this.margin + col * this.spacing + this.spacing / 2;
            const y = this.margin + row * this.spacing + this.spacing / 2;
            
            // Check if position is free
            const occupied = [...this.redPopulation, ...this.bluePopulation].some(ind => 
                Math.abs(ind.x - x) < this.spacing * 0.7 && Math.abs(ind.y - y) < this.spacing * 0.7
            );
            
            if (!occupied) {
                return { x, y };
            }
            attempts++;
        }
        
        // Fallback: random position with slight offset
        return {
            x: this.margin + Math.random() * (this.width - 2 * this.margin),
            y: this.margin + Math.random() * (this.height - 2 * this.margin)
        };
    }

    _addParticleEffect(x, y, color, type) {
        this.particles.push({
            x: x,
            y: y,
            color: color,
            type: type,
            life: 1.0,
            scale: type === 'arrival' ? 0.1 : 1.0
        });
    }

    _updateParticles(deltaTime) {
        this.particles.forEach(particle => {
            particle.life -= deltaTime * 0.003; // Fade over ~300ms
            
            if (particle.type === 'arrival') {
                particle.scale = Math.min(1.0, particle.scale + deltaTime * 0.01);
            } else {
                particle.scale = Math.max(0.1, particle.scale - deltaTime * 0.008);
            }
        });
        
        // Remove dead particles
        this.particles = this.particles.filter(particle => particle.life > 0);
    }

    _drawFrame() {
        this.ctx.clearRect(0, 0, this.width, this.height);
        
        // Draw background
        this.ctx.fillStyle = '#f8fafc';
        this.ctx.fillRect(0, 0, this.width, this.height);
        
        // Draw grid
        this._drawGrid();
        
        // Draw populations
        this._drawPopulation(this.redPopulation, '#ef4444');
        this._drawPopulation(this.bluePopulation, '#3b82f6');
        
        // Draw particle effects
        this._drawParticles();
    }

    _drawPopulation(population, color) {
        population.forEach(individual => {
            this.ctx.fillStyle = color;
            this.ctx.beginPath();
            this.ctx.arc(individual.x, individual.y, this.dotRadius, 0, 2 * Math.PI);
            this.ctx.fill();
            
            // Add glow effect
            this.ctx.shadowColor = color;
            this.ctx.shadowBlur = 8;
            this.ctx.fill();
            this.ctx.shadowBlur = 0;
        });
    }

    _drawParticles() {
        this.particles.forEach(particle => {
            this.ctx.save();
            this.ctx.globalAlpha = particle.life;
            this.ctx.fillStyle = particle.color;
            
            const radius = this.dotRadius * particle.scale * 1.5;
            this.ctx.beginPath();
            this.ctx.arc(particle.x, particle.y, radius, 0, 2 * Math.PI);
            this.ctx.fill();
            
            this.ctx.restore();
        });
    }

    _updateCounters() {
        document.getElementById('redCount').textContent = this.redPopulation.length;
        document.getElementById('blueCount').textContent = this.bluePopulation.length;
    }

    _updateTime() {
        document.getElementById('animationTime').textContent = this.currentTime.toFixed(2);
    }

    _logEvent(event, type) {
        this.eventLog.unshift({
            event: event,
            type: type,
            time: this.currentTime.toFixed(2)
        });
        
        if (this.eventLog.length > this.maxLogEntries) {
            this.eventLog.pop();
        }
        
        this._updateEventLog();
    }

    _updateEventLog() {
        const eventLogEl = document.getElementById('eventLog');
        if (!eventLogEl) return;
        
        eventLogEl.innerHTML = this.eventLog.map(entry => 
            `<div class="event-item ${entry.type}">t=${entry.time}s: ${entry.event}</div>`
        ).join('') || '<div class="event-item">No events yet...</div>';
    }
}

// Initialize the dashboard when the page loads
document.addEventListener('DOMContentLoaded', () => {
    try {
        window.dashboard = new MarkovDashboard();
        console.log('Markov Dashboard initialized successfully');
    } catch (error) {
        console.error('Failed to initialize dashboard:', error);
        alert('Failed to load the application. Please refresh the page and try again.');
    }
}); 