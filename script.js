frame.forEach((row, y) => {
  row.forEach((pixelColor, x) => {
    if (pixelColor) {
      drawing.fillStyle = pixelColor;

      ```
      drawing.fillRect(...);
      ```
    }
  }