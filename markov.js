/**
 * Reversible Two-Dimensional Markov Process Simulation Engine
 * 
 * This module implements a continuous-time Markov chain simulation for modeling
 * two competing populations (red and blue) with reversible dynamics.
 * 
 * Mathematical Foundation:
 * - State space: (x,y) where x,y ≥ 0 are population counts
 * - Four transition types: red/blue arrivals and departures
 * - Reversibility ensured by detailed balance (Kolmogorov criterion)
 * - Stationary distribution has closed-form expression
 * 
 * Based on: "Notes on the Stationary Distribution for a Reversible Two-Dimensional Process"
 * Author: Maddalena (June 25, 2025)
 */

class ReversibleMarkovProcess {
    /**
     * Initialize the Markov process with given parameters
     * 
     * @param {Object} params - Model parameters
     * @param {number} params.alpha1 - Red arrival base intensity (> 0)
     * @param {number} params.alpha2 - Blue arrival base intensity (> 0)
     * @param {number} params.beta1 - Red self-enhancement factor (> 0)
     * @param {number} params.beta2 - Blue self-enhancement factor (> 0)
     * @param {number} params.gamma - Competition normalization factor (> 0)
     * @param {number} params.delta1 - Red departure base rate (> 0)
     * @param {number} params.delta2 - Blue departure base rate (> 0)
     * @param {number} params.beta1_hat - Red departure enhancement factor (> 0)
     * @param {number} params.beta2_hat - Blue departure enhancement factor (> 0)
     * @param {number} params.gamma_hat - Environmental pressure factor (> 0)
     */
    constructor(params) {
        // Validate input parameters
        this._validateParameters(params);
        
        this.params = {
            alpha1: params.alpha1 || 1.5,
            alpha2: params.alpha2 || 1.2,
            beta1: params.beta1 || 0.8,
            beta2: params.beta2 || 0.8,
            gamma: params.gamma || 1.5,
            delta1: params.delta1 || 0.9,
            delta2: params.delta2 || 0.7,
            beta1_hat: params.beta1_hat || 1.2,
            beta2_hat: params.beta2_hat || 1.2,
            gamma_hat: params.gamma_hat || 0.8
        };

        // Initialize caches for performance optimization
        this._factorialCache = new Map();
        this._rateCache = new Map();
        
        // Validate that parameters maintain mathematical constraints
        this._validateMathematicalConstraints();
    }

    /**
     * Validate that all parameters are positive numbers
     * @private
     */
    _validateParameters(params) {
        const requiredParams = [
            'alpha1', 'alpha2', 'beta1', 'beta2', 'gamma',
            'delta1', 'delta2', 'beta1_hat', 'beta2_hat', 'gamma_hat'
        ];
        
        for (const param of requiredParams) {
            if (params[param] !== undefined) {
                if (typeof params[param] !== 'number' || params[param] <= 0 || !isFinite(params[param])) {
                    throw new Error(`Parameter ${param} must be a positive finite number, got: ${params[param]}`);
                }
            }
        }
    }

    /**
     * Validate mathematical constraints for model stability
     * @private
     */
    _validateMathematicalConstraints() {
        const { alpha1, alpha2, delta1, delta2 } = this.params;
        
        // Check for extreme parameter ratios that might cause numerical issues
        const redRatio = alpha1 / delta1;
        const blueRatio = alpha2 / delta2;
        
        if (redRatio > 100 || blueRatio > 100) {
            console.warn('Warning: Very high arrival/departure ratio detected. This may lead to large population sizes.');
        }
        
        if (Math.abs(redRatio - blueRatio) / Math.max(redRatio, blueRatio) > 0.9) {
            console.warn('Warning: Highly asymmetric populations detected. One population may dominate.');
        }
    }

    /**
     * Calculate red arrival rate: λ₁(x,y) = α₁(β₁+x)/(γ+x+y)
     * 
     * Models the rate at which new red individuals arrive, with:
     * - Self-enhancement: larger red population attracts more arrivals
     * - Competition: total population size reduces arrival rate
     * 
     * @param {number} x - Current red population (≥ 0)
     * @param {number} y - Current blue population (≥ 0)
     * @returns {number} Red arrival rate (≥ 0)
     */
    lambda1(x, y) {
        this._validateState(x, y);
        const { alpha1, beta1, gamma } = this.params;
        
        // Handle edge case: if total population approaches infinity
        const denominator = gamma + x + y;
        if (denominator <= 1e-10) {
            throw new Error('Invalid state: population sizes lead to zero denominator');
        }
        
        return alpha1 * (beta1 + x) / denominator;
    }

    /**
     * Calculate blue arrival rate: λ₂(x,y) = α₂(β₂+y)/(γ+x+y)
     * 
     * @param {number} x - Current red population (≥ 0)
     * @param {number} y - Current blue population (≥ 0)
     * @returns {number} Blue arrival rate (≥ 0)
     */
    lambda2(x, y) {
        this._validateState(x, y);
        const { alpha2, beta2, gamma } = this.params;
        
        const denominator = gamma + x + y;
        if (denominator <= 1e-10) {
            throw new Error('Invalid state: population sizes lead to zero denominator');
        }
        
        return alpha2 * (beta2 + y) / denominator;
    }

    /**
     * Calculate red departure rate: μ₁(x,y) = x·δ₁(γ̂+x+y)/(β̂₁+x)
     * 
     * Models the rate at which red individuals leave, with:
     * - Proportional to population: more individuals available to leave
     * - Environmental pressure: crowding increases departure pressure
     * - Group stability: larger groups are more stable (higher β̂₁)
     * 
     * @param {number} x - Current red population (≥ 0)
     * @param {number} y - Current blue population (≥ 0)
     * @returns {number} Red departure rate (≥ 0)
     */
    mu1(x, y) {
        this._validateState(x, y);
        
        // No departures possible if no red individuals present
        if (x === 0) return 0;
        
        const { delta1, beta1_hat, gamma_hat } = this.params;
        
        const denominator = beta1_hat + x;
        if (denominator <= 1e-10) {
            throw new Error('Invalid parameters: beta1_hat + x approaches zero');
        }
        
        return x * delta1 * (gamma_hat + x + y) / denominator;
    }

    /**
     * Calculate blue departure rate: μ₂(x,y) = y·δ₂(γ̂+x+y)/(β̂₂+y)
     * 
     * @param {number} x - Current red population (≥ 0)
     * @param {number} y - Current blue population (≥ 0)
     * @returns {number} Blue departure rate (≥ 0)
     */
    mu2(x, y) {
        this._validateState(x, y);
        
        // No departures possible if no blue individuals present
        if (y === 0) return 0;
        
        const { delta2, beta2_hat, gamma_hat } = this.params;
        
        const denominator = beta2_hat + y;
        if (denominator <= 1e-10) {
            throw new Error('Invalid parameters: beta2_hat + y approaches zero');
        }
        
        return y * delta2 * (gamma_hat + x + y) / denominator;
    }

    /**
     * Calculate total transition rate from state (x,y)
     * Used in Gillespie algorithm for sampling next event time
     * 
     * @param {number} x - Current red population
     * @param {number} y - Current blue population
     * @returns {number} Total rate (≥ 0)
     */
    totalRate(x, y) {
        return this.lambda1(x, y) + this.lambda2(x, y) + this.mu1(x, y) + this.mu2(x, y);
    }

    /**
     * Calculate theoretical stationary probability π(x,y)
     * 
     * Uses the closed-form expression from Theorem 1:
     * π(x,y) = π₀,₀ × (α₁/δ₁)^x × (α₂/δ₂)^y × [product terms] / [normalization terms]
     * 
     * The product terms capture the interaction effects between populations
     * 
     * @param {number} x - Red population count
     * @param {number} y - Blue population count  
     * @param {number} pi00 - Probability mass at state (0,0) [will be normalized]
     * @returns {number} Unnormalized stationary probability
     */
    stationaryProbability(x, y, pi00 = 1.0) {
        this._validateState(x, y);
        
        const { alpha1, alpha2, delta1, delta2, beta1, beta2, gamma, beta1_hat, beta2_hat, gamma_hat } = this.params;
        
        try {
            // Base exponential terms: capture basic arrival/departure balance
            let prob = pi00 * Math.pow(alpha1 / delta1, x) * Math.pow(alpha2 / delta2, y);
            
            // Factorial normalization: accounts for combinatorial aspects
            prob /= (this.factorial(x) * this.factorial(y));
            
            // Calculate interaction terms for red population
            let xNumerator = 1.0;
            let xDenominator = 1.0;
            
            for (let i = 1; i <= x; i++) {
                // Enhancement terms: capture self-reinforcement and stability
                xNumerator *= (beta1 + i - 1) * (beta1_hat + i);
                // Competition terms: capture resource competition and environmental pressure
                xDenominator *= (gamma + i - 1) * (gamma_hat + i);
            }
            
            // Calculate interaction terms for blue population
            let yNumerator = 1.0;
            let yDenominator = 1.0;
            
            for (let j = 1; j <= y; j++) {
                yNumerator *= (beta2 + j - 1) * (beta2_hat + j);
                // Critical coupling: blue terms depend on red population size x
                yDenominator *= (gamma + x + j - 1) * (gamma_hat + x + j);
            }
            
            // Combine all terms
            prob *= (xNumerator * yNumerator) / (xDenominator * yDenominator);
            
            // Validate result
            if (!isFinite(prob) || prob < 0) {
                throw new Error(`Invalid probability computed for state (${x},${y}): ${prob}`);
            }
            
            return prob;
            
        } catch (error) {
            throw new Error(`Error computing stationary probability for state (${x},${y}): ${error.message}`);
        }
    }

    /**
     * Calculate factorial with memoization for efficiency
     * 
     * @param {number} n - Non-negative integer
     * @returns {number} n! factorial
     */
    factorial(n) {
        if (!Number.isInteger(n) || n < 0) {
            throw new Error(`Factorial requires non-negative integer, got: ${n}`);
        }
        
        if (n <= 1) return 1;
        
        // Check cache first
        if (this._factorialCache.has(n)) {
            return this._factorialCache.get(n);
        }
        
        // Compute and cache result
        const result = n * this.factorial(n - 1);
        this._factorialCache.set(n, result);
        
        return result;
    }

    /**
     * Calculate normalized theoretical distribution up to maxStates
     * 
     * @param {number} maxStates - Maximum state value to consider
     * @returns {Object} Normalized probability distribution
     */
    getTheoreticalDistribution(maxStates) {
        if (!Number.isInteger(maxStates) || maxStates < 0) {
            throw new Error(`maxStates must be non-negative integer, got: ${maxStates}`);
        }
        
        const distribution = {};
        let totalProb = 0;
        
        try {
            // Calculate unnormalized probabilities
            for (let x = 0; x <= maxStates; x++) {
                for (let y = 0; y <= maxStates; y++) {
                    const prob = this.stationaryProbability(x, y, 1.0);
                    distribution[`${x},${y}`] = prob;
                    totalProb += prob;
                }
            }
            
            // Check for numerical issues
            if (totalProb <= 1e-100) {
                throw new Error('Total probability mass is too small - numerical underflow detected');
            }
            
            // Normalize probabilities
            for (let key in distribution) {
                distribution[key] /= totalProb;
            }
            
            return distribution;
            
        } catch (error) {
            throw new Error(`Error computing theoretical distribution: ${error.message}`);
        }
    }

    /**
     * Simulate the Markov process using Gillespie's exact algorithm
     * 
     * The Gillespie algorithm is the gold standard for simulating continuous-time
     * Markov chains exactly (not approximately). It works by:
     * 1. Computing all possible transition rates from current state
     * 2. Sampling exponentially distributed waiting time
     * 3. Sampling which transition occurs proportional to rates
     * 4. Updating state and repeating
     * 
     * @param {number} totalTime - Total simulation time
     * @param {number} burnInTime - Initial time to discard (reach stationarity)
     * @param {number} maxStates - Maximum allowed population size (for numerical stability)
     * @returns {Object} Simulation results containing trajectory and samples
     */
    simulate(totalTime, burnInTime = 0, maxStates = 20) {
        // Validate inputs
        if (totalTime <= 0 || burnInTime < 0 || maxStates <= 0) {
            throw new Error('Invalid simulation parameters: times must be positive, burnIn non-negative');
        }
        
        // Initialize simulation state
        let x = Math.floor(Math.random() * 3) + 1; // Random starting state 1-3
        let y = Math.floor(Math.random() * 3) + 1;
        let currentTime = 0;
        
        // Data collection arrays
        const trajectory = [];
        const samples = [];
        let lastSampleTime = 0;
        const sampleInterval = 0.1; // Sample every 0.1 time units for good statistics
        
        // Performance tracking
        let eventCount = 0;
        const maxEvents = 1e6; // Prevent infinite loops
        
        try {
            while (currentTime < totalTime + burnInTime && eventCount < maxEvents) {
                // Calculate all transition rates from current state
                const rate1 = this.lambda1(x, y); // Red arrival
                const rate2 = this.lambda2(x, y); // Blue arrival
                const rate3 = this.mu1(x, y);     // Red departure
                const rate4 = this.mu2(x, y);     // Blue departure
                const totalRate = rate1 + rate2 + rate3 + rate4;
                
                // Handle edge case: no transitions possible
                if (totalRate <= 1e-10) {
                    console.warn(`Very low transition rates at state (${x},${y}), advancing time manually`);
                    currentTime += 1.0;
                    continue;
                }
                
                // Sample exponentially distributed waiting time
                // Inter-event time ~ Exponential(totalRate)
                const waitTime = -Math.log(Math.random()) / totalRate;
                currentTime += waitTime;
                
                // Record trajectory point (subsample for memory efficiency)
                if (trajectory.length < 10000 && currentTime >= burnInTime) {
                    trajectory.push({ time: currentTime - burnInTime, x: x, y: y });
                }
                
                // Sample which transition occurs using inverse transform method
                const rand = Math.random() * totalRate;
                
                if (rand < rate1) {
                    // Red arrival: (x,y) → (x+1,y)
                    x++;
                } else if (rand < rate1 + rate2) {
                    // Blue arrival: (x,y) → (x,y+1)
                    y++;
                } else if (rand < rate1 + rate2 + rate3) {
                    // Red departure: (x,y) → (x-1,y)
                    x = Math.max(0, x - 1);
                } else {
                    // Blue departure: (x,y) → (x,y-1)
                    y = Math.max(0, y - 1);
                }
                
                // Enforce bounds to prevent numerical overflow
                // Use reflection boundary to maintain ergodicity
                if (x > maxStates) {
                    x = maxStates;
                    // Occasionally force a departure to prevent getting stuck
                    if (Math.random() < 0.5) x = Math.max(0, x - 1);
                }
                if (y > maxStates) {
                    y = maxStates;
                    if (Math.random() < 0.5) y = Math.max(0, y - 1);
                }
                
                // Collect samples after burn-in period with regular intervals
                if (currentTime >= burnInTime && currentTime >= lastSampleTime + sampleInterval) {
                    samples.push({ x: x, y: y, time: currentTime - burnInTime });
                    lastSampleTime = currentTime;
                }
                
                eventCount++;
            }
            
            // Check if simulation completed successfully
            if (eventCount >= maxEvents) {
                console.warn('Simulation terminated due to maximum event limit');
            }
            
            return {
                trajectory: trajectory,
                samples: samples,
                finalState: { x: x, y: y },
                eventCount: eventCount,
                effectiveTime: Math.max(0, currentTime - burnInTime)
            };
            
        } catch (error) {
            throw new Error(`Simulation failed at time ${currentTime}, state (${x},${y}): ${error.message}`);
        }
    }

    /**
     * Convert samples to empirical probability distribution
     * 
     * @param {Array} samples - Array of {x, y} state samples
     * @param {number} maxStates - Maximum state value to consider
     * @returns {Object} Empirical probability distribution
     */
    getEmpiricalDistribution(samples, maxStates) {
        if (!Array.isArray(samples) || samples.length === 0) {
            throw new Error('Samples must be non-empty array');
        }
        
        const counts = {};
        let totalSamples = 0;
        
        // Initialize count matrix
        for (let x = 0; x <= maxStates; x++) {
            for (let y = 0; y <= maxStates; y++) {
                counts[`${x},${y}`] = 0;
            }
        }
        
        // Count occurrences of each state
        samples.forEach((sample, index) => {
            if (!sample || typeof sample.x !== 'number' || typeof sample.y !== 'number') {
                throw new Error(`Invalid sample at index ${index}: ${JSON.stringify(sample)}`);
            }
            
            const key = `${sample.x},${sample.y}`;
            if (counts.hasOwnProperty(key)) {
                counts[key]++;
                totalSamples++;
            }
            // Ignore samples outside maxStates range
        });
        
        // Convert counts to probabilities
        const distribution = {};
        for (let key in counts) {
            distribution[key] = totalSamples > 0 ? counts[key] / totalSamples : 0;
        }
        
        return distribution;
    }

    /**
     * Calculate total variation distance between two probability distributions
     * 
     * TV(P,Q) = (1/2) * Σ |P(x) - Q(x)|
     * 
     * This is a standard metric for comparing probability distributions.
     * Values close to 0 indicate good agreement, close to 1 indicates poor agreement.
     * 
     * @param {Object} dist1 - First probability distribution
     * @param {Object} dist2 - Second probability distribution
     * @returns {number} Total variation distance [0, 1]
     */
    totalVariationDistance(dist1, dist2) {
        if (!dist1 || !dist2 || typeof dist1 !== 'object' || typeof dist2 !== 'object') {
            throw new Error('Both distributions must be objects');
        }
        
        let distance = 0;
        const allKeys = new Set([...Object.keys(dist1), ...Object.keys(dist2)]);
        
        for (let key of allKeys) {
            const p1 = dist1[key] || 0;
            const p2 = dist2[key] || 0;
            distance += Math.abs(p1 - p2);
        }
        
        return distance / 2;
    }

    /**
     * Calculate comprehensive summary statistics from simulation samples
     * 
     * @param {Array} samples - Array of state samples
     * @returns {Object} Statistical summary including means, variances, correlation
     */
    calculateStatistics(samples) {
        if (!Array.isArray(samples) || samples.length === 0) {
            return { meanX: 0, meanY: 0, varX: 0, varY: 0, correlation: 0, count: 0 };
        }
        
        const n = samples.length;
        
        // Calculate means
        const meanX = samples.reduce((sum, s) => sum + s.x, 0) / n;
        const meanY = samples.reduce((sum, s) => sum + s.y, 0) / n;
        
        // Calculate variances (using n-1 denominator for sample variance)
        const varX = n > 1 ? samples.reduce((sum, s) => sum + Math.pow(s.x - meanX, 2), 0) / (n - 1) : 0;
        const varY = n > 1 ? samples.reduce((sum, s) => sum + Math.pow(s.y - meanY, 2), 0) / (n - 1) : 0;
        
        // Calculate correlation coefficient
        let correlation = 0;
        if (n > 1 && varX > 0 && varY > 0) {
            const covariance = samples.reduce((sum, s) => sum + (s.x - meanX) * (s.y - meanY), 0) / (n - 1);
            correlation = covariance / Math.sqrt(varX * varY);
        }
        
        return {
            meanX: meanX,
            meanY: meanY,
            varX: varX,
            varY: varY,
            correlation: isNaN(correlation) ? 0 : correlation,
            count: n
        };
    }

    /**
     * Verify Kolmogorov's reversibility criterion for a 2×2 state cycle
     * 
     * For reversibility, the product of transition rates around any cycle
     * must be equal in both directions. For the elementary 2×2 cycle:
     * 
     * (x,y) → (x+1,y) → (x+1,y+1) → (x,y+1) → (x,y)
     * 
     * Must equal:
     * 
     * (x,y) → (x,y+1) → (x+1,y+1) → (x+1,y) → (x,y)
     * 
     * @param {number} x - Red population for lower-left corner of cycle
     * @param {number} y - Blue population for lower-left corner of cycle
     * @returns {boolean} True if reversibility condition is satisfied
     */
    verifyReversibility(x, y) {
        this._validateState(x, y);
        
        try {
            // Clockwise product: λ₁(x,y) × λ₂(x+1,y) × μ₂(x+1,y+1) × μ₁(x,y+1)
            const clockwise = this.lambda1(x, y) * this.lambda2(x + 1, y) * 
                             this.mu2(x + 1, y + 1) * this.mu1(x, y + 1);
            
            // Counterclockwise product: λ₂(x,y) × λ₁(x,y+1) × μ₁(x+1,y+1) × μ₂(x+1,y)
            const counterclockwise = this.lambda2(x, y) * this.lambda1(x, y + 1) * 
                                     this.mu1(x + 1, y + 1) * this.mu2(x + 1, y);
            
            // Check equality within numerical tolerance
            const tolerance = 1e-10 * Math.max(clockwise, counterclockwise, 1e-10);
            return Math.abs(clockwise - counterclockwise) < tolerance;
            
        } catch (error) {
            console.warn(`Error verifying reversibility at (${x},${y}): ${error.message}`);
            return false;
        }
    }

    /**
     * Validate that state coordinates are non-negative integers
     * @private
     */
    _validateState(x, y) {
        if (!Number.isInteger(x) || !Number.isInteger(y) || x < 0 || y < 0) {
            throw new Error(`Invalid state: (${x},${y}). States must be non-negative integers.`);
        }
    }

    /**
     * Get a summary of current model parameters for diagnostics
     * @returns {Object} Parameter summary with derived quantities
     */
    getParameterSummary() {
        const { alpha1, alpha2, delta1, delta2 } = this.params;
        
        return {
            ...this.params,
            redRatio: alpha1 / delta1,
            blueRatio: alpha2 / delta2,
            ratioBalance: Math.abs(alpha1/delta1 - alpha2/delta2) / Math.max(alpha1/delta1, alpha2/delta2),
            isBalanced: Math.abs(alpha1/delta1 - alpha2/delta2) / Math.max(alpha1/delta1, alpha2/delta2) < 0.2
        };
    }
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ReversibleMarkovProcess;
} 