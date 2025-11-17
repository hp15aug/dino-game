export default class BotBrain {
    constructor(weights = null, bias = null) {
      this.weights = weights || [Math.random() * 4 - 2, Math.random() * 2 - 1];
      this.bias = bias ?? Math.random() * 2 - 1;
      this.fitness = 0;
      this.score = 0;
    }
  
    predict(distance, height, speed) {
      // Normalize inputs
      // Distance: closer = higher value (more urgent to jump)
      const normDistance = Math.max(0, Math.min(1, 1 - (distance / 400)));
      const normHeight = height / 135;
      
      // Calculate decision
      const z = normDistance * this.weights[0] + 
                normHeight * this.weights[1] + 
                this.bias;
      
      // Sigmoid activation
      return 1 / (1 + Math.exp(-z));
    }
  
    clone() {
      const brain = new BotBrain([...this.weights], this.bias);
      brain.fitness = this.fitness;
      brain.score = this.score;
      return brain;
    }
  
    mutate(rate = 0.25) {
      for (let i = 0; i < this.weights.length; i++) {
        if (Math.random() < rate) {
          // Add random variation
          this.weights[i] += (Math.random() * 2 - 1) * 0.8;
          // Clamp to reasonable range
          this.weights[i] = Math.max(-5, Math.min(5, this.weights[i]));
        }
      }
      if (Math.random() < rate) {
        this.bias += (Math.random() * 2 - 1) * 0.8;
        this.bias = Math.max(-5, Math.min(5, this.bias));
      }
    }
  
    static crossover(a, b) {
      const w = a.weights.map((wi, i) =>
        Math.random() < 0.5 ? wi : b.weights[i]
      );
      const bias = Math.random() < 0.5 ? a.bias : b.bias;
      return new BotBrain(w, bias);
    }
  }