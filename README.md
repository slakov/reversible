# Reversible Two-Dimensional Markov Process Dashboard

This interactive web dashboard implements the reversible two-dimensional Markov process described in Maddalena's paper "Notes on the Stationary Distribution for a Reversible Two-Dimensional Process" (June 25, 2025).

## What is This Model About?

Imagine you're studying two competing populations - say, red and blue bacteria in a petri dish, or two species of animals in an ecosystem. Each population can grow (new individuals arrive) or shrink (individuals leave/die). What makes this model special is that it captures how these populations interact with each other and their environment.

### Key Concepts Explained Simply

**Population Dynamics**: At any moment, we track how many red individuals (x) and blue individuals (y) exist. These numbers change randomly over time based on arrival and departure events.

**Competition**: As the total population grows, it becomes harder for new individuals to arrive (resources become scarce, space runs out, etc.). This is captured by rates that decrease as x+y increases.

**Self-Enhancement**: Larger populations can be more successful at attracting new members (safety in numbers, network effects, etc.). This is why arrival rates increase with population size.

**Environmental Pressure**: As populations grow, environmental stress increases departure rates. Larger populations face more pressure to shrink.

**Reversibility**: This is a special mathematical property meaning the process "looks the same" whether running forward or backward in time. This ensures the system reaches a stable, well-defined long-term behavior.

## Overview

The dashboard allows users to:
- Adjust model parameters interactively to see how they affect population dynamics
- Run Monte Carlo simulations to observe the random evolution of populations
- Compare simulated results with theoretical predictions
- Visualize how populations move through different states over time
- Understand the long-term steady-state behavior of the system

## The Mathematical Model Explained

### The Big Picture
The system models a **continuous-time Markov chain** - this is a mathematical way of describing systems that:
- Change randomly over time
- Have "memoryless" behavior (the future only depends on the current state, not the past)
- Evolve continuously (changes can happen at any moment)

Our **state space** is (x, y) where:
- x = number of red individuals (0, 1, 2, 3, ...)
- y = number of blue individuals (0, 1, 2, 3, ...)

### The Four Types of Events
At any moment, one of four things can happen:

1. **Red Arrival**: A new red individual joins (x,y) → (x+1,y)
2. **Blue Arrival**: A new blue individual joins (x,y) → (x,y+1)  
3. **Red Departure**: A red individual leaves (x,y) → (x-1,y)
4. **Blue Departure**: A blue individual leaves (x,y) → (x,y-1)

### Transition Rates: How Fast Things Happen

The **rate** of each event tells us how likely it is to occur in the next small time interval. Higher rates mean events happen more frequently.

#### Arrival Rates (How Fast Populations Grow)

**Red Arrival Rate**: λ₁(x,y) = α₁(β₁+x)/(γ+x+y)
- **α₁**: Base intensity - how attractive the environment is to red individuals
- **β₁+x**: Self-enhancement - larger red populations attract more reds
- **γ+x+y**: Competition factor - more total population makes arrival harder

**Blue Arrival Rate**: λ₂(x,y) = α₂(β₂+y)/(γ+x+y)
- Similar structure but for blue population
- **α₂**: Base intensity for blues
- **β₂+y**: Blue self-enhancement
- Same competition denominator

#### Departure Rates (How Fast Populations Shrink)

**Red Departure Rate**: μ₁(x,y) = x·δ₁(γ̂+x+y)/(β̂₁+x)
- **x**: Number available to leave (can't leave if you're not there!)
- **δ₁**: Base departure tendency per individual
- **γ̂+x+y**: Environmental pressure - crowding increases departure
- **β̂₁+x**: Stability factor - larger groups are more stable

**Blue Departure Rate**: μ₂(x,y) = y·δ₂(γ̂+x+y)/(β̂₂+y)
- Similar structure for blue population
- **δ₂**: Base blue departure rate
- **β̂₂**: Blue stability factor

### Understanding the Parameters

**Arrival Parameters:**
- **α₁, α₂**: Think of these as "how attractive" the environment is to each population
- **β₁, β₂**: "Network effects" - do larger populations attract more newcomers?
- **γ**: "Competition strength" - how much does crowding reduce arrivals?

**Departure Parameters:**
- **δ₁, δ₂**: "Wanderlust" - how likely is each individual to leave?
- **β̂₁, β̂₂**: "Group loyalty" - do larger groups hold their members better?
- **γ̂**: "Environmental stress" - how much does crowding increase departures?

### The Long-Term Behavior: Stationary Distribution

If you run this system for a very long time, it settles into a **stationary distribution** π(x,y). This tells you:
- How likely you are to find exactly x red and y blue individuals
- What the "typical" population sizes look like
- The balance point between growth and decline

The mathematical formula is:
```
π(x,y) = π₀,₀ × (α₁/δ₁)^x × (α₂/δ₂)^y × (1/x!y!) × [correction terms]
```

**What this means:**
- **(α₁/δ₁)^x**: Ratio of red arrival to departure strength, raised to power x
- **(α₂/δ₂)^y**: Same for blue population  
- **1/x!y!**: Combinatorial factor (like in Poisson distributions)
- **[correction terms]**: Account for population interactions and competition

### Why "Reversible" Matters

**Reversibility** is a special mathematical property meaning:
- The process looks the same running forward or backward in time
- There's a unique, well-defined long-term distribution  
- The theoretical formulas are mathematically tractable
- The system has nice equilibrium properties

**Kolmogorov's Criterion**: For any 2×2 loop of states, the product of rates going clockwise equals the product going counterclockwise. This ensures detailed balance and reversibility.

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

### Getting Started
1. **Open Dashboard**: Open `index.html` in a modern web browser
2. **Understand the Interface**: The dashboard has three main panels:
   - **Left Panel**: Parameter controls and simulation settings
   - **Center Panel**: Visualizations with three tabs
   - **Right Panel**: Statistics and convergence metrics

### Running Your First Simulation
1. **Start with Defaults**: The dashboard opens with optimized parameters for good convergence
2. **Click "Run Simulation"**: This starts a Monte Carlo simulation
3. **Watch the Progress**: A loading indicator shows the simulation is running
4. **Explore Results**: Switch between visualization tabs to see different views

### Understanding the Visualizations

#### Distribution Heatmaps Tab
- **Left Plot**: Theoretical stationary distribution (what math predicts)
- **Right Plot**: Empirical distribution (what simulation observed)
- **Colors**: Darker colors = higher probability, lighter = lower probability
- **Axes**: x-axis = red population, y-axis = blue population
- **Good Match**: Both heatmaps should look similar when convergence is good

#### Theory vs Simulation Tab  
- **Scatter Plot**: Each dot represents one (x,y) state
- **x-axis**: Theoretical probability for that state
- **y-axis**: Empirical probability from simulation
- **Red Diagonal Line**: Perfect agreement (theory = simulation)
- **Good Convergence**: Points cluster tightly around the diagonal line

#### Sample Trajectory Tab
- **Path Visualization**: Shows how populations evolved over time
- **Color Gradient**: Earlier times in purple/blue, later times in yellow/red
- **Movement Pattern**: See if populations tend to cluster in certain regions
- **Ergodicity**: Good mixing means the path explores different areas

### Interpreting the Statistics

**Total Variation Distance**: 
- Measures overall difference between theory and simulation
- **< 0.1**: Excellent convergence
- **0.1-0.2**: Good convergence  
- **0.2-0.3**: Fair convergence
- **> 0.3**: Poor convergence (try longer simulation time)

**Convergence Quality**: 
- Color-coded assessment based on TV distance
- Green = Excellent, Blue = Good, Orange = Fair, Red = Poor

**Mean Populations**: 
- Average red and blue population sizes from simulation
- Compare with theoretical expectations

### Adjusting Parameters
1. **Start Small**: Make small changes (±0.1 to ±0.2) to see effects
2. **One at a Time**: Change one parameter, run simulation, observe results
3. **Follow Tips**: Use the "Tips for Good Convergence" section as guidance
4. **Reset if Needed**: Click "Reset Parameters" to return to optimized defaults

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

## Troubleshooting Common Issues

### Poor Convergence (High TV Distance)

**Symptoms**: TV distance > 0.3, heatmaps look very different, scatter plot points far from diagonal

**Solutions**:
1. **Increase Simulation Time**: Try 500-1000 instead of 200
2. **Increase Burn-in**: Try 100-200 instead of 50
3. **Check Parameter Balance**: Ensure α₁/δ₁ and α₂/δ₂ aren't too different
4. **Reduce State Space**: Try max states = 8-10 for faster convergence

### Populations Grow Too Large

**Symptoms**: Mean populations > 10, lots of probability mass at high states

**Solutions**:
1. **Increase Competition**: Raise γ parameter to increase competition
2. **Increase Departure Rates**: Raise δ₁, δ₂ to encourage more departures
3. **Reduce Arrival Rates**: Lower α₁, α₂ to slow arrivals
4. **Increase Environmental Pressure**: Raise γ̂ parameter

### One Population Dominates

**Symptoms**: One population much larger than the other consistently

**Solutions**:
1. **Balance Arrival/Departure Ratios**: Make α₁/δ₁ ≈ α₂/δ₂
2. **Adjust Base Rates**: If red dominates, try lowering α₁ or raising δ₁
3. **Check Enhancement Factors**: Large differences in β₁, β₂ can cause dominance
4. **Symmetric Parameters**: Start with β₁ = β₂, β̂₁ = β̂₂ for balanced system

### Simulation Runs Too Slowly

**Symptoms**: Long wait times, browser becomes unresponsive

**Solutions**:
1. **Reduce Max States**: Lower from 15 to 8-10
2. **Shorter Simulation Time**: Use 100-200 instead of longer times
3. **Check Parameter Values**: Very small rates can cause slow simulation
4. **Close Other Browser Tabs**: Free up memory and processing power

### Unrealistic Parameter Values

**Symptoms**: Warnings, crashes, or nonsensical results

**Solutions**:
1. **Stay in Recommended Ranges**: See parameter guidance in dashboard
2. **Avoid Zero Values**: All parameters should be > 0.1
3. **Check Rate Balance**: Extremely high arrival vs. departure rates cause problems
4. **Use Reset Button**: Return to known-good default parameters

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

## Real-World Applications & Interpretations

This model framework applies to many real situations where two populations interact:

### Biological Systems
- **Species Competition**: Two animal species competing for territory or resources
- **Bacterial Growth**: Different bacterial strains in a culture medium
- **Epidemiology**: Infected vs. susceptible populations with reinfection
- **Genetics**: Allele frequencies in a population with mutation and selection

### Social & Economic Systems  
- **Technology Adoption**: Users of competing platforms (iOS vs Android, streaming services)
- **Market Share**: Companies competing for customers with network effects
- **Urban Planning**: Residents in different neighborhoods with migration patterns
- **Social Networks**: Members joining/leaving competing online communities

### Engineering & Computer Science
- **Queue Management**: Two types of jobs in a computing system
- **Network Traffic**: Different types of data packets with varying priorities
- **Resource Allocation**: Competing processes sharing CPU time or memory

### Key Insights from the Model

**Balance vs. Dominance**: 
- When α₁/δ₁ ≈ α₂/δ₂, populations stay roughly balanced
- When ratios differ significantly, one population dominates

**Network Effects**: 
- Large β values create "winner-take-all" dynamics
- Small β values lead to more balanced coexistence

**Environmental Capacity**:
- Large γ creates strong competition (limited total capacity)
- Small γ allows both populations to grow larger

**Stability vs. Volatility**:
- Large β̂ values create stable populations (low turnover)
- Small β̂ values lead to high churn and volatility

## Example Use Cases for the Dashboard

### Research & Analysis
1. **Parameter Sensitivity**: Study how changing competition strength affects population balance
2. **Stability Analysis**: Find parameter combinations that lead to stable vs. volatile populations  
3. **Convergence Studies**: Verify that simulations match theoretical predictions
4. **Scenario Modeling**: Test "what-if" scenarios for different parameter values

### Educational Applications
1. **Markov Process Visualization**: See how random processes evolve over time
2. **Statistical Convergence**: Understand how empirical data approaches theoretical distributions
3. **Population Dynamics**: Learn about competition, growth, and equilibrium
4. **Mathematical Modeling**: Connect abstract formulas to observable behavior

### Practical Applications
1. **Business Strategy**: Model market competition with customer acquisition/retention
2. **Resource Planning**: Predict long-term population sizes for capacity planning
3. **Risk Assessment**: Understand variability and extreme scenarios
4. **Policy Design**: Test interventions by adjusting model parameters

## Technical Notes

- Simulation uses exact Gillespie algorithm (not approximation)
- Stationary distribution computed using recursive formula from paper
- Total variation distance provides convergence metric
- Responsive design adapts to different screen sizes

## Conclusion

This dashboard brings together mathematical theory and computational simulation to make reversible Markov processes accessible and understandable. Whether you're a researcher studying population dynamics, a student learning about stochastic processes, or a practitioner applying these concepts to real problems, the interactive visualizations help bridge the gap between abstract mathematical formulas and observable behavior.

### What Makes This Model Special

1. **Theoretical Rigor**: Based on proven mathematical theory with exact analytical solutions
2. **Practical Relevance**: Applies to real-world systems from biology to economics
3. **Interactive Learning**: See immediately how parameter changes affect behavior
4. **Visual Understanding**: Heatmaps and trajectories make abstract concepts concrete
5. **Validation Tools**: Compare theory with simulation to build confidence

### Key Takeaways

- **Balance is Key**: Systems with balanced arrival/departure ratios exhibit stable, predictable behavior
- **Competition Matters**: Environmental constraints (γ parameter) strongly influence total population sizes
- **Network Effects Count**: Self-enhancement (β parameters) can create winner-take-all dynamics or promote coexistence
- **Time Scales Matter**: Reaching equilibrium takes time - both in simulations and real systems
- **Theory Works**: When implemented correctly, simulations match theoretical predictions remarkably well

This dashboard serves as both a research tool and educational resource for understanding reversible Markov processes and their stationary behavior. The combination of mathematical rigor and interactive exploration makes complex stochastic systems approachable and intuitive.

### Further Exploration

- Try extreme parameter values to see system boundaries
- Experiment with asymmetric populations (very different α₁, α₂)
- Study the effect of competition strength on population variance
- Explore how network effects create tipping points
- Use the model framework for your own application domains 