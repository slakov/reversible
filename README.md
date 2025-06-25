# Reversible Two-Dimensional Markov Process Dashboard

This interactive web dashboard implements the reversible two-dimensional Markov process described in Maddalena's paper "Notes on the Stationary Distribution for a Reversible Two-Dimensional Process" (June 25, 2025).

## Overview

The dashboard allows users to:
- Adjust model parameters interactively
- Run Monte Carlo simulations of the Markov process
- Compare empirical distributions with theoretical stationary distributions
- Visualize sample trajectories and statistical comparisons

## Mathematical Model

The system models a continuous-time Markov chain on state space (x, y) representing red and blue population sizes. The process has four types of transitions:

### Transition Rates

**Arrival Rates:**
- λ₁(x,y) = α₁(β₁+x)/(γ+x+y) (red arrivals)
- λ₂(x,y) = α₂(β₂+y)/(γ+x+y) (blue arrivals)

**Departure Rates:**
- μ₁(x,y) = x·δ₁(γ̂+x+y)/(β̂₁+x) (red departures)
- μ₂(x,y) = y·δ₂(γ̂+x+y)/(β̂₂+y) (blue departures)

### Stationary Distribution

The theoretical stationary distribution π(x,y) is given by:

π(x,y) = π₀,₀ (α₁/δ₁)^x (α₂/δ₂)^y × (1/x!y!) × [product terms]

where the product terms involve β₁, β₂, β̂₁, β̂₂, γ, γ̂ parameters.

## Features

### Parameter Controls
- **Arrival Parameters**: α₁, α₂, β₁, β₂, γ
- **Departure Parameters**: δ₁, δ₂, β̂₁, β̂₂, γ̂
- **Simulation Settings**: Total time, burn-in period, maximum state size

### Visualizations

1. **Distribution Heatmaps**: Side-by-side comparison of theoretical vs empirical distributions
2. **Theory vs Simulation**: Scatter plot comparing theoretical and empirical probabilities
3. **Sample Trajectory**: Time-ordered path through state space

### Statistics
- Total Variation Distance between distributions
- Mean population sizes for both red and blue
- Simulation execution time

## Implementation Details

### Files Structure
- `index.html` - Main dashboard interface
- `style.css` - Modern, responsive styling
- `markov.js` - Core Markov process simulation engine
- `app.js` - Dashboard controller and visualization logic

### Simulation Algorithm
Uses Gillespie's algorithm for exact simulation:
1. Calculate all transition rates from current state
2. Sample exponential waiting time
3. Sample which transition occurs
4. Update state and repeat

### Key Features
- **Reversibility Verification**: Implements Kolmogorov's criterion check
- **Efficient Computation**: Factorial memoization and optimized probability calculations
- **Interactive Controls**: Real-time parameter updates with theoretical plot refresh
- **Statistical Analysis**: Comprehensive comparison metrics

## Usage Instructions

1. **Open Dashboard**: Open `index.html` in a modern web browser
2. **Adjust Parameters**: Use the parameter controls to modify model settings
3. **Set Simulation**: Configure simulation time, burn-in period, and state space size
4. **Run Simulation**: Click "Run Simulation" to execute Monte Carlo simulation
5. **Analyze Results**: Explore different visualization tabs and review statistics

### Recommended Parameter Ranges
- α₁, α₂: 0.5 - 5.0 (arrival intensities)
- β₁, β₂: 0.1 - 3.0 (arrival enhancement factors)
- γ: 0.5 - 5.0 (arrival normalization)
- δ₁, δ₂: 0.1 - 2.0 (departure intensities)
- β̂₁, β̂₂: 0.5 - 5.0 (departure enhancement factors)  
- γ̂: 0.1 - 3.0 (departure normalization)

### Performance Notes
- Larger state spaces (>20) may slow visualization
- Longer simulation times provide better convergence
- Use adequate burn-in period to reach stationarity

## Mathematical Verification

The implementation includes verification of:
- **Kolmogorov's Criterion**: Ensures reversibility condition is satisfied
- **Detailed Balance**: Transition rates satisfy π(x,y)q((x,y)→(x',y')) = π(x',y')q((x',y')→(x,y))
- **Probability Normalization**: Theoretical distribution sums to 1.0

## Browser Compatibility

Requires modern browser with support for:
- ES6 JavaScript features
- CSS Grid and Flexbox
- SVG rendering (for Plotly.js)

Tested on: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+

## Dependencies

- **Plotly.js**: Interactive plotting library
- **Math.js**: Mathematical computation utilities (optional enhancement)

All dependencies loaded via CDN - no local installation required.

## Example Use Cases

1. **Parameter Sensitivity**: Study how different parameters affect stationary distribution
2. **Convergence Analysis**: Verify empirical distribution approaches theoretical as simulation time increases
3. **Model Validation**: Confirm implementation matches theoretical predictions
4. **Educational Tool**: Visualize continuous-time Markov process behavior

## Technical Notes

- Simulation uses exact Gillespie algorithm (not approximation)
- Stationary distribution computed using recursive formula from paper
- Total variation distance provides convergence metric
- Responsive design adapts to different screen sizes

This dashboard serves as both a research tool and educational resource for understanding reversible Markov processes and their stationary behavior. 