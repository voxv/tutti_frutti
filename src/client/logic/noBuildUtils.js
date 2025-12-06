// Point-in-polygon test using ray-casting algorithm
// points: array of [x, y], test: [x, y]
export function pointInPolygon(points, test) {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const xi = points[i][0], yi = points[i][1];
    const xj = points[j][0], yj = points[j][1];
    const intersect = ((yi > test[1]) !== (yj > test[1])) &&
      (test[0] < (xj - xi) * (test[1] - yi) / (yj - yi + 0.0000001) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}
