import { Injectable } from '@angular/core';

export type Float2 = [x: number, y: number];

@Injectable({
  providedIn: 'root',
})
export class SmoothLerpService {
  // This function that gives us a "smooth lerp" effect.
  // It's essentially transforming the alpha from something linear, 
  // to something that eases in and out.
  
  // This is what it looks like graphed out
  // https://www.desmos.com/calculator/mc2sooscdo
  lerpStyle(x: number): number {
    return (-Math.cos(3.1419265 * x) + 1) / 2
  }

  // Simple linear interpolation function
  // Allows us to find any point between a and b given an alpha between 0 and 1
  lerp(start: number, goal: number, x: number): number {
    return start * (1 - x) + goal * x;
  }

  // Allows us to smoothly interpolate from one coordinate to another
  // Useful for keeping track of positions as they change

  // The callback parameter feeds us the interpolated data 
  // so we can assign marker locations outside of the function
  animateFloat2(start: Float2, goal: Float2, time: number, callback: (keyframe: Float2) => void): () => void {
    // Get the current time
    const startTime = performance.now();

    // Lets us cancel the animation in place
    let cancelled = false;

    let update = () => {
      // Stop the animation loop if we've cancelled it
      if (cancelled)
        return;
      
      // Get the elapsed time
      let elapsedTime = performance.now() - startTime;

      // Map the time to a range between 0-1
      let mappedTime = Math.min(elapsedTime / (time * 1000), 1);

      // If the mapped time is equal to or exceeds 1, execute the callback with the goal frame and return
      if (mappedTime >= 1)
      {
        callback(goal);
        return;
      }

      // Get the alpha from the lerpStyle function
      let alpha = this.lerpStyle(mappedTime);

      // Execute the callback and send the lerped values from the alpha through it
      callback([this.lerp(start[0], goal[0], alpha), this.lerp(start[1], goal[1], alpha)]);

      // Move on to the next frame
      window.requestAnimationFrame(update);
    }

    // Starts the recursive animation loop
    window.requestAnimationFrame(update);

    // Returns a callback that allows us to cancel the animation from outside the function
    return () => { cancelled = true; }
  }
}
