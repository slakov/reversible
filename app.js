/**
 * Main Application Controller for Reversible Markov Process Dashboard
 */

class MarkovDashboard {
    constructor() {
        this.markovProcess = null;
        this.currentResults = null;
        this.initializeEventListeners();
        this.initializeDefaultPlots();
    }

    initializeEventListeners() {
        // Parameter input listeners
        const paramInputs = document.querySelectorAll('.param-item input');
        paramInputs.forEach(input => {
            input.addEventListener('change', this.onParameterChange.bind(this));
        });

        // Button listeners
        document.getElementById('runSimulation').addEventListener('click', this.runSimulation.bind(this));
        document.getElementById('resetParams').addEventListener('click', this.resetParameters.bind(this));

        // Tab switching
        const tabButtons = document.querySelectorAll('.tab-button');
        tabButtons.forEach(button => {
            button.addEventListener('click', this.switchTab.bind(this));
        });

        // Initialize with default parameters
        this.updateMarkovProcess();
    }

    initializeDefaultPlots() {
        // Create empty plots with proper layout
        const layout = {
            margin: { l: 50, r: 50, t: 30, b: 50 },
            font: { size: 12 },
            showlegend: false
        };

        Plotly.newPlot('theoreticalHeatmap', [], { ...layout, title: 'Run simulation to see results' });
        Plotly.newPlot('empiricalHeatmap', [], { ...layout, title: 'Run simulation to see results' });
        Plotly.newPlot('comparisonPlot', [], { 
            ...layout, 
            title: 'Theory vs Simulation Comparison',
            xaxis: { title: 'Theoretical Probability' },
            yaxis: { title: 'Empirical Probability' }
        });
        Plotly.newPlot('trajectoryPlot', [], { 
            ...layout, 
            title: 'Sample Trajectory',
            xaxis: { title: 'Red Population (x)' },
            yaxis: { title: 'Blue Population (y)' }
        });
    }

    onParameterChange() {
        this.updateMarkovProcess();
        this.updateTheoreticalPlot();
    }

    updateMarkovProcess() {
        const params = this.getParametersFromForm();
        this.markovProcess = new ReversibleMarkovProcess(params);
    }

    getParametersFromForm() {
        return {
            alpha1: parseFloat(document.getElementById('alpha1').value),
            alpha2: parseFloat(document.getElementById('alpha2').value),
            beta1: parseFloat(document.getElementById('beta1').value),
            beta2: parseFloat(document.getElementById('beta2').value),
            gamma: parseFloat(document.getElementById('gamma').value),
            delta1: parseFloat(document.getElementById('delta1').value),
            delta2: parseFloat(document.getElementById('delta2').value),
            beta1_hat: parseFloat(document.getElementById('beta1_hat').value),
            beta2_hat: parseFloat(document.getElementById('beta2_hat').value),
            gamma_hat: parseFloat(document.getElementById('gamma_hat').value)
        };
    }

    resetParameters() {
        document.getElementById('alpha1').value = 1.5;
        document.getElementById('alpha2').value = 1.2;
        document.getElementById('beta1').value = 0.8;
        document.getElementById('beta2').value = 0.8;
        document.getElementById('gamma').value = 1.5;
        document.getElementById('delta1').value = 0.9;
        document.getElementById('delta2').value = 0.7;
        document.getElementById('beta1_hat').value = 1.2;
        document.getElementById('beta2_hat').value = 1.2;
        document.getElementById('gamma_hat').value = 0.8;
        
        this.updateMarkovProcess();
        this.updateTheoreticalPlot();
    }

    async runSimulation() {
        const startTime = Date.now();
        this.showLoading(true);

        try {
            // Get simulation parameters
            const simTime = parseFloat(document.getElementById('simTime').value);
            const burnIn = parseFloat(document.getElementById('burnIn').value);
            const maxStates = parseInt(document.getElementById('maxStates').value);

            // Run simulation
            const results = this.markovProcess.simulate(simTime, burnIn, maxStates);
            
            // Calculate distributions
            const empiricalDist = this.markovProcess.getEmpiricalDistribution(results.samples, maxStates);
            const theoreticalDist = this.markovProcess.getTheoreticalDistribution(maxStates);
            
            // Calculate statistics
            const stats = this.markovProcess.calculateStatistics(results.samples);
            const tvDistance = this.markovProcess.totalVariationDistance(theoreticalDist, empiricalDist);
            
            this.currentResults = {
                ...results,
                empiricalDist,
                theoreticalDist,
                stats,
                tvDistance,
                maxStates,
                simulationTime: (Date.now() - startTime) / 1000
            };

            // Update all visualizations
            this.updateAllPlots();
            this.updateStatistics();

        } catch (error) {
            console.error('Simulation error:', error);
            alert('Error running simulation: ' + error.message);
        } finally {
            this.showLoading(false);
        }
    }

    updateTheoreticalPlot() {
        if (!this.markovProcess) return;

        const maxStates = parseInt(document.getElementById('maxStates').value) || 15;
        const theoreticalDist = this.markovProcess.getTheoreticalDistribution(maxStates);
        this.plotHeatmap('theoreticalHeatmap', theoreticalDist, maxStates, 'Theoretical Distribution');
    }

    updateAllPlots() {
        if (!this.currentResults) return;

        const { empiricalDist, theoreticalDist, trajectory, maxStates } = this.currentResults;

        // Update heatmaps
        this.plotHeatmap('theoreticalHeatmap', theoreticalDist, maxStates, 'Theoretical Distribution');
        this.plotHeatmap('empiricalHeatmap', empiricalDist, maxStates, 'Empirical Distribution');

        // Update comparison plot
        this.plotComparison(theoreticalDist, empiricalDist);

        // Update trajectory plot
        this.plotTrajectory(trajectory);
    }

    plotHeatmap(elementId, distribution, maxStates, title) {
        // Convert distribution to matrix format for heatmap
        const z = [];
        const x = [];
        const y = [];

        for (let i = 0; i <= maxStates; i++) {
            y.push(i);
            x.push(i);
        }

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
            hovertemplate: 'x: %{x}<br>y: %{y}<br>Probability: %{z:.6f}<extra></extra>'
        }];

        const layout = {
            title: { text: title, font: { size: 14 } },
            xaxis: { title: 'Red Population (x)', dtick: 1 },
            yaxis: { title: 'Blue Population (y)', dtick: 1 },
            margin: { l: 60, r: 60, t: 40, b: 60 },
            height: 350
        };

        Plotly.newPlot(elementId, data, layout, { responsive: true });
    }

    plotComparison(theoretical, empirical) {
        const theoreticalProbs = [];
        const empiricalProbs = [];
        const labels = [];

        // Collect all states and their probabilities
        const allKeys = new Set([...Object.keys(theoretical), ...Object.keys(empirical)]);
        
        for (let key of allKeys) {
            const theoreticalProb = theoretical[key] || 0;
            const empiricalProb = empirical[key] || 0;
            
            if (theoreticalProb > 1e-6 || empiricalProb > 1e-6) { // Only plot significant probabilities
                theoreticalProbs.push(theoreticalProb);
                empiricalProbs.push(empiricalProb);
                labels.push(`(${key})`);
            }
        }

        const data = [
            {
                x: theoreticalProbs,
                y: empiricalProbs,
                mode: 'markers',
                type: 'scatter',
                text: labels,
                hovertemplate: '%{text}<br>Theoretical: %{x:.6f}<br>Empirical: %{y:.6f}<extra></extra>',
                marker: {
                    size: 8,
                    color: 'rgba(37, 99, 235, 0.7)',
                    line: { color: 'rgba(37, 99, 235, 1)', width: 1 }
                },
                name: 'States'
            },
            {
                x: [0, Math.max(...theoreticalProbs)],
                y: [0, Math.max(...theoreticalProbs)],
                mode: 'lines',
                type: 'scatter',
                line: { color: 'red', dash: 'dash', width: 2 },
                name: 'Perfect Agreement',
                hoverinfo: 'none'
            }
        ];

        const layout = {
            title: 'Theory vs Simulation Comparison',
            xaxis: { title: 'Theoretical Probability' },
            yaxis: { title: 'Empirical Probability' },
            margin: { l: 60, r: 60, t: 60, b: 60 },
            height: 500,
            showlegend: true
        };

        Plotly.newPlot('comparisonPlot', data, layout, { responsive: true });
    }

    plotTrajectory(trajectory) {
        // Sample trajectory points for better visualization
        const sampleRate = Math.max(1, Math.floor(trajectory.length / 1000));
        const sampledTrajectory = trajectory.filter((_, index) => index % sampleRate === 0);

        const data = [
            {
                x: sampledTrajectory.map(point => point.x),
                y: sampledTrajectory.map(point => point.y),
                mode: 'lines+markers',
                type: 'scatter',
                line: { color: 'rgba(16, 185, 129, 0.8)', width: 2 },
                marker: { 
                    size: 4, 
                    color: sampledTrajectory.map((_, i) => i),
                    colorscale: 'Plasma',
                    showscale: true,
                    colorbar: { title: 'Time Order' }
                },
                hovertemplate: 'x: %{x}<br>y: %{y}<br>Time: %{text}<extra></extra>',
                text: sampledTrajectory.map(point => point.time.toFixed(2)),
                name: 'Trajectory'
            }
        ];

        const layout = {
            title: 'Sample Trajectory',
            xaxis: { title: 'Red Population (x)' },
            yaxis: { title: 'Blue Population (y)' },
            margin: { l: 60, r: 60, t: 60, b: 60 },
            height: 500
        };

        Plotly.newPlot('trajectoryPlot', data, layout, { responsive: true });
    }

    updateStatistics() {
        if (!this.currentResults) return;

        const { stats, tvDistance, simulationTime, samples } = this.currentResults;

        // Quality assessment based on TV distance
        let quality = 'Poor';
        if (tvDistance < 0.1) quality = 'Excellent';
        else if (tvDistance < 0.2) quality = 'Good';
        else if (tvDistance < 0.3) quality = 'Fair';

        document.getElementById('tvDistance').textContent = tvDistance.toFixed(6);
        document.getElementById('convergenceQuality').textContent = quality;
        document.getElementById('meanRed').textContent = stats.meanX.toFixed(3);
        document.getElementById('meanBlue').textContent = stats.meanY.toFixed(3);
        document.getElementById('sampleCount').textContent = samples.length.toLocaleString();
        document.getElementById('simDuration').textContent = `${simulationTime.toFixed(2)}s`;

        // Color-code the TV distance based on quality
        const tvElement = document.getElementById('tvDistance');
        tvElement.className = 'stat-value';
        if (tvDistance < 0.1) tvElement.classList.add('excellent');
        else if (tvDistance < 0.2) tvElement.classList.add('good');
        else if (tvDistance < 0.3) tvElement.classList.add('fair');
        else tvElement.classList.add('poor');
    }

    switchTab(event) {
        const targetTab = event.target.dataset.tab;
        
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

        // Resize plots when tab becomes visible
        setTimeout(() => {
            if (targetTab === 'comparison') {
                Plotly.Plots.resize('comparisonPlot');
            } else if (targetTab === 'trajectory') {
                Plotly.Plots.resize('trajectoryPlot');
            }
        }, 100);
    }

    showLoading(show) {
        const loadingOverlay = document.getElementById('loading');
        if (show) {
            loadingOverlay.classList.add('active');
        } else {
            loadingOverlay.classList.remove('active');
        }
    }
}

// Initialize the dashboard when the page loads
document.addEventListener('DOMContentLoaded', () => {
    window.dashboard = new MarkovDashboard();
}); 