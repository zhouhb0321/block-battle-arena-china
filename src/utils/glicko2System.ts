/**
 * Glicko-2 Rating System Implementation
 * More accurate than ELO for matchmaking and skill assessment
 */

export interface Glicko2Rating {
  rating: number; // R - Base rating (default: 1500)
  ratingDeviation: number; // RD - Rating reliability (default: 350, lower is more reliable)
  volatility: number; // σ - Rating consistency (default: 0.06)
}

export class Glicko2Calculator {
  // System constant τ (controls volatility change)
  private static readonly TAU = 0.5;
  
  // Convergence tolerance
  private static readonly EPSILON = 0.000001;

  /**
   * Calculate new rating after a match
   */
  static calculate(
    playerRating: Glicko2Rating,
    opponentRating: Glicko2Rating,
    outcome: number // 1 = win, 0.5 = draw, 0 = loss
  ): Glicko2Rating {
    // Step 1: Convert ratings to Glicko-2 scale (μ, φ, σ)
    const mu = this.ratingToMu(playerRating.rating);
    const phi = this.rdToPhi(playerRating.ratingDeviation);
    const sigma = playerRating.volatility;

    const opponentMu = this.ratingToMu(opponentRating.rating);
    const opponentPhi = this.rdToPhi(opponentRating.ratingDeviation);

    // Step 2: Calculate g(φ) and E
    const g = this.g(opponentPhi);
    const E = this.E(mu, opponentMu, opponentPhi);

    // Step 3: Calculate estimated variance (v)
    const v = 1 / (Math.pow(g, 2) * E * (1 - E));

    // Step 4: Calculate Δ (performance indicator)
    const delta = v * g * (outcome - E);

    // Step 5: Update volatility (σ)
    const newSigma = this.updateVolatility(sigma, phi, v, delta);

    // Step 6: Update rating deviation (φ)
    const phiStar = Math.sqrt(Math.pow(phi, 2) + Math.pow(newSigma, 2));
    const newPhi = 1 / Math.sqrt(1 / Math.pow(phiStar, 2) + 1 / v);

    // Step 7: Update rating (μ)
    const newMu = mu + Math.pow(newPhi, 2) * g * (outcome - E);

    // Step 8: Convert back to original scale
    return {
      rating: this.muToRating(newMu),
      ratingDeviation: this.phiToRd(newPhi),
      volatility: newSigma
    };
  }

  /**
   * Calculate expected score (win probability)
   */
  static expectedScore(
    playerRating: Glicko2Rating,
    opponentRating: Glicko2Rating
  ): number {
    const mu = this.ratingToMu(playerRating.rating);
    const opponentMu = this.ratingToMu(opponentRating.rating);
    const opponentPhi = this.rdToPhi(opponentRating.ratingDeviation);

    return this.E(mu, opponentMu, opponentPhi);
  }

  /**
   * Update rating deviation for inactive period (rating decay)
   */
  static decayRatingDeviation(
    rating: Glicko2Rating,
    periodsInactive: number = 1
  ): Glicko2Rating {
    const phi = this.rdToPhi(rating.ratingDeviation);
    const newPhi = Math.sqrt(
      Math.pow(phi, 2) + periodsInactive * Math.pow(rating.volatility, 2)
    );

    return {
      ...rating,
      ratingDeviation: Math.min(350, this.phiToRd(newPhi)) // Cap at 350
    };
  }

  // ========== Private Helper Methods ==========

  /**
   * Convert rating to Glicko-2 scale (μ)
   */
  private static ratingToMu(rating: number): number {
    return (rating - 1500) / 173.7178;
  }

  /**
   * Convert μ back to rating
   */
  private static muToRating(mu: number): number {
    return mu * 173.7178 + 1500;
  }

  /**
   * Convert RD to Glicko-2 scale (φ)
   */
  private static rdToPhi(rd: number): number {
    return rd / 173.7178;
  }

  /**
   * Convert φ back to RD
   */
  private static phiToRd(phi: number): number {
    return phi * 173.7178;
  }

  /**
   * Calculate g(φ) function
   */
  private static g(phi: number): number {
    return 1 / Math.sqrt(1 + 3 * Math.pow(phi, 2) / Math.pow(Math.PI, 2));
  }

  /**
   * Calculate expected score E
   */
  private static E(mu: number, opponentMu: number, opponentPhi: number): number {
    return 1 / (1 + Math.exp(-this.g(opponentPhi) * (mu - opponentMu)));
  }

  /**
   * Update volatility using Illinois algorithm
   */
  private static updateVolatility(
    sigma: number,
    phi: number,
    v: number,
    delta: number
  ): number {
    const a = Math.log(Math.pow(sigma, 2));
    const deltaSq = Math.pow(delta, 2);
    const phiSq = Math.pow(phi, 2);

    // Define f(x)
    const f = (x: number): number => {
      const ex = Math.exp(x);
      const num1 = ex * (deltaSq - phiSq - v - ex);
      const den1 = 2 * Math.pow(phiSq + v + ex, 2);
      const num2 = x - a;
      const den2 = Math.pow(this.TAU, 2);
      return num1 / den1 - num2 / den2;
    };

    // Initialize bounds
    let A = a;
    let B: number;

    if (deltaSq > phiSq + v) {
      B = Math.log(deltaSq - phiSq - v);
    } else {
      let k = 1;
      while (f(a - k * this.TAU) < 0) {
        k++;
      }
      B = a - k * this.TAU;
    }

    // Iterative search
    let fA = f(A);
    let fB = f(B);

    while (Math.abs(B - A) > this.EPSILON) {
      const C = A + (A - B) * fA / (fB - fA);
      const fC = f(C);

      if (fC * fB < 0) {
        A = B;
        fA = fB;
      } else {
        fA = fA / 2;
      }

      B = C;
      fB = fC;
    }

    return Math.exp(A / 2);
  }

  /**
   * Get initial rating for new player
   */
  static getInitialRating(): Glicko2Rating {
    return {
      rating: 1500,
      ratingDeviation: 350,
      volatility: 0.06
    };
  }

  /**
   * Check if rating is provisional (unreliable)
   */
  static isProvisional(rating: Glicko2Rating): boolean {
    return rating.ratingDeviation > 110;
  }
}
