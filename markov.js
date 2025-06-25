/**
 * Reversible Two-Dimensional Markov Process Simulation
 * Based on "Notes on the Stationary Distribution for a Reversible Two-Dimensional Process"
 */

class ReversibleMarkovProcess {
    constructor(params) {
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
    }

    /**
     * Calculate arrival rate λ₁(x,y) = α₁(β₁+x)/(γ+x+y)
     */
    lambda1(x, y) {
        const { alpha1, beta1, gamma } = this.params;
        return alpha1 * (beta1 + x) / (gamma + x + y);
    }

    /**
     * Calculate arrival rate λ₂(x,y) = α₂(β₂+y)/(γ+x+y)
     */
    lambda2(x, y) {
        const { alpha2, beta2, gamma } = this.params;
        return alpha2 * (beta2 + y) / (gamma + x + y);
    }

    /**
     * Calculate departure rate μ₁(x,y) = x·δ₁(γ̂+x+y)/(β̂₁+x)
     */
    mu1(x, y) {
        if (x === 0) return 0;
        const { delta1, beta1_hat, gamma_hat } = this.params;
        return x * delta1 * (gamma_hat + x + y) / (beta1_hat + x);
    }

    /**
     * Calculate departure rate μ₂(x,y) = y·δ₂(γ̂+x+y)/(β̂₂+y)
     */
    mu2(x, y) {
        if (y === 0) return 0;
        const { delta2, beta2_hat, gamma_hat } = this.params;
        return y * delta2 * (gamma_hat + x + y) / (beta2_hat + y);
    }

    /**
     * Calculate total transition rate from state (x,y)
     */
    totalRate(x, y) {
        return this.lambda1(x, y) + this.lambda2(x, y) + this.mu1(x, y) + this.mu2(x, y);
    }

    /**
     * Calculate the theoretical stationary probability π(x,y)
     * Using the formula from Theorem 1 in the paper
     */
    stationaryProbability(x, y, pi00 = 1.0) {
        const { alpha1, alpha2, delta1, delta2, beta1, beta2, gamma, beta1_hat, beta2_hat, gamma_hat } = this.params;
        
        // Base terms
        let prob = pi00 * Math.pow(alpha1 / delta1, x) * Math.pow(alpha2 / delta2, y);
        
        // Factorial terms
        prob /= (this.factorial(x) * this.factorial(y));
        
        // Product terms for x dimension
        let xNumerator = 1.0;
        let xDenominator = 1.0;
        
        for (let i = 1; i <= x; i++) {
            xNumerator *= (beta1 + i - 1) * (beta1_hat + i);
            xDenominator *= (gamma + i - 1) * (gamma_hat + i);
        }
        
        // Product terms for y dimension
        let yNumerator = 1.0;
        let yDenominator = 1.0;
        
        for (let j = 1; j <= y; j++) {
            yNumerator *= (beta2 + j - 1) * (beta2_hat + j);
            yDenominator *= (gamma + x + j - 1) * (gamma_hat + x + j);
        }
        
        prob *= (xNumerator * yNumerator) / (xDenominator * yDenominator);
        
        return prob;
    }

    /**
     * Calculate factorial (with simple memoization for efficiency)
     */
    factorial(n) {
        if (n <= 1) return 1;
        if (!this._factorialCache) this._factorialCache = {};
        if (this._factorialCache[n]) return this._factorialCache[n];
        
        this._factorialCache[n] = n * this.factorial(n - 1);
        return this._factorialCache[n];
    }

    /**
     * Calculate normalized theoretical distribution up to maxStates
     */
    getTheoreticalDistribution(maxStates) {
        const distribution = {};
        let totalProb = 0;
        
        // Calculate unnormalized probabilities
        for (let x = 0; x <= maxStates; x++) {
            for (let y = 0; y <= maxStates; y++) {
                const prob = this.stationaryProbability(x, y, 1.0);
                distribution[`${x},${y}`] = prob;
                totalProb += prob;
            }
        }
        
        // Normalize
        for (let key in distribution) {
            distribution[key] /= totalProb;
        }
        
        return distribution;
    }

    /**
     * Simulate the Markov process using Gillespie's algorithm
     */
    simulate(totalTime, burnInTime = 0, maxStates = 20) {
        let x = Math.floor(Math.random() * 3) + 1; // Random starting state 1-3
        let y = Math.floor(Math.random() * 3) + 1;
        let currentTime = 0;
        const trajectory = [];
        const samples = [];
        let lastSampleTime = 0;
        const sampleInterval = 0.1; // Sample every 0.1 time units for better statistics
        
        while (currentTime < totalTime + burnInTime) {
            // Calculate transition rates
            const rate1 = this.lambda1(x, y); // Red arrival
            const rate2 = this.lambda2(x, y); // Blue arrival
            const rate3 = this.mu1(x, y);     // Red departure
            const rate4 = this.mu2(x, y);     // Blue departure
            const totalRate = rate1 + rate2 + rate3 + rate4;
            
            if (totalRate <= 1e-10) {
                // If rates are too small, advance time manually
                currentTime += 1.0;
                continue;
            }
            
            // Sample waiting time
            const waitTime = -Math.log(Math.random()) / totalRate;
            currentTime += waitTime;
            
            // Record trajectory point (subsample for performance)
            if (trajectory.length < 10000) {
                trajectory.push({ time: currentTime, x: x, y: y });
            }
            
            // Sample which transition occurs
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
            
            // Bounds checking with reflection to keep process ergodic
            if (x > maxStates) {
                x = maxStates;
                // Force a departure event
                if (Math.random() < 0.5) x = Math.max(0, x - 1);
            }
            if (y > maxStates) {
                y = maxStates;
                // Force a departure event
                if (Math.random() < 0.5) y = Math.max(0, y - 1);
            }
            
            // Collect samples after burn-in period with regular intervals
            if (currentTime >= burnInTime && currentTime >= lastSampleTime + sampleInterval) {
                samples.push({ x: x, y: y });
                lastSampleTime = currentTime;
            }
        }
        
        return {
            trajectory: trajectory,
            samples: samples,
            finalState: { x: x, y: y }
        };
    }

    /**
     * Convert samples to empirical distribution
     */
    getEmpiricalDistribution(samples, maxStates) {
        const counts = {};
        let totalSamples = 0;
        
        // Initialize counts
        for (let x = 0; x <= maxStates; x++) {
            for (let y = 0; y <= maxStates; y++) {
                counts[`${x},${y}`] = 0;
            }
        }
        
        // Count samples
        samples.forEach(sample => {
            const key = `${sample.x},${sample.y}`;
            if (counts.hasOwnProperty(key)) {
                counts[key]++;
                totalSamples++;
            }
        });
        
        // Convert to probabilities
        const distribution = {};
        for (let key in counts) {
            distribution[key] = totalSamples > 0 ? counts[key] / totalSamples : 0;
        }
        
        return distribution;
    }

    /**
     * Calculate total variation distance between two distributions
     */
    totalVariationDistance(dist1, dist2) {
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
     * Calculate summary statistics from samples
     */
    calculateStatistics(samples) {
        if (samples.length === 0) {
            return { meanX: 0, meanY: 0, varX: 0, varY: 0, correlation: 0 };
        }
        
        const n = samples.length;
        const meanX = samples.reduce((sum, s) => sum + s.x, 0) / n;
        const meanY = samples.reduce((sum, s) => sum + s.y, 0) / n;
        
        const varX = samples.reduce((sum, s) => sum + Math.pow(s.x - meanX, 2), 0) / (n - 1);
        const varY = samples.reduce((sum, s) => sum + Math.pow(s.y - meanY, 2), 0) / (n - 1);
        
        const covariance = samples.reduce((sum, s) => sum + (s.x - meanX) * (s.y - meanY), 0) / (n - 1);
        const correlation = covariance / Math.sqrt(varX * varY);
        
        return {
            meanX: meanX,
            meanY: meanY,
            varX: varX,
            varY: varY,
            correlation: isNaN(correlation) ? 0 : correlation
        };
    }

    /**
     * Verify Kolmogorov's reversibility criterion
     */
    verifyReversibility(x, y) {
        // Calculate the four-cycle rates as in equation (1)
        const lhs = this.lambda1(x, y) * this.lambda2(x + 1, y) * 
                   this.mu2(x, y + 1) * this.mu1(x + 1, y + 1);
        
        const rhs = this.lambda2(x, y) * this.lambda1(x, y + 1) * 
                   this.mu1(x + 1, y) * this.mu2(x + 1, y + 1);
        
        return Math.abs(lhs - rhs) < 1e-10; // Numerical tolerance
    }
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ReversibleMarkovProcess;
} 