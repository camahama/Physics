export type AreaResult = {
  pixelArea: number;
  calibratedArea: number | null;
  calibration: {
    xPixels: number | null;
    yPixels: number | null;
    dotCount: number;
  };
};

type Dot = {
  x: number;
  y: number;
};

export function estimateAreaFromImage(
  image: HTMLImageElement,
  threshold: number,
  xScaleDistance: number | null,
  yScaleDistance: number | null
): AreaResult {
  const canvas = document.createElement("canvas");
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return {
      pixelArea: 0,
      calibratedArea: null,
      calibration: {
        xPixels: null,
        yPixels: null,
        dotCount: 0
      }
    };
  }

  ctx.drawImage(image, 0, 0);
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const { data } = imageData;
  const width = canvas.width;
  const height = canvas.height;
  const total = width * height;

  const darkMask = new Uint8Array(total);
  for (let i = 0, p = 0; i < data.length; i += 4, p += 1) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const intensity = (r + g + b) / 3;
    darkMask[p] = intensity < threshold ? 1 : 0;
  }

  const enclosedMask = findEnclosedRegions(darkMask, width, height);

  let pixelArea = 0;
  for (let i = 0; i < enclosedMask.length; i += 1) {
    if (enclosedMask[i] === 1) {
      pixelArea += 1;
    }
  }

  const dots = detectDots(darkMask, width, height);
  const { xPixels, yPixels } = findScaleFromDots(dots);

  const hasScale =
    xPixels !== null &&
    yPixels !== null &&
    xScaleDistance !== null &&
    yScaleDistance !== null &&
    xScaleDistance > 0 &&
    yScaleDistance > 0;

  const calibratedArea = hasScale
    ? pixelArea * (xScaleDistance / xPixels) * (yScaleDistance / yPixels)
    : null;

  return {
    pixelArea,
    calibratedArea,
    calibration: {
      xPixels,
      yPixels,
      dotCount: dots.length
    }
  };
}

function findEnclosedRegions(mask: Uint8Array, width: number, height: number): Uint8Array {
  const total = width * height;
  const outside = new Uint8Array(total);
  const queue = new Uint32Array(total);
  let head = 0;
  let tail = 0;

  const push = (idx: number) => {
    queue[tail] = idx;
    tail += 1;
  };

  const tryVisit = (idx: number) => {
    if (outside[idx] === 1 || mask[idx] === 1) {
      return;
    }
    outside[idx] = 1;
    push(idx);
  };

  for (let x = 0; x < width; x += 1) {
    tryVisit(x);
    tryVisit((height - 1) * width + x);
  }

  for (let y = 0; y < height; y += 1) {
    tryVisit(y * width);
    tryVisit(y * width + (width - 1));
  }

  while (head < tail) {
    const idx = queue[head];
    head += 1;

    const x = idx % width;
    const y = Math.floor(idx / width);

    if (x > 0) {
      tryVisit(idx - 1);
    }
    if (x < width - 1) {
      tryVisit(idx + 1);
    }
    if (y > 0) {
      tryVisit(idx - width);
    }
    if (y < height - 1) {
      tryVisit(idx + width);
    }
  }

  const enclosed = new Uint8Array(total);
  for (let i = 0; i < total; i += 1) {
    if (mask[i] === 0 && outside[i] === 0) {
      enclosed[i] = 1;
    }
  }
  return enclosed;
}

function detectDots(mask: Uint8Array, width: number, height: number): Dot[] {
  const total = width * height;
  const visited = new Uint8Array(total);
  const dots: Dot[] = [];
  const queue = new Uint32Array(total);

  const minArea = Math.max(12, Math.floor(total * 0.00002));
  const maxArea = Math.max(minArea + 1, Math.floor(total * 0.003));

  for (let start = 0; start < total; start += 1) {
    if (mask[start] === 0 || visited[start] === 1) {
      continue;
    }

    let head = 0;
    let tail = 0;
    queue[tail] = start;
    tail += 1;
    visited[start] = 1;

    let area = 0;
    let sumX = 0;
    let sumY = 0;
    let minX = width;
    let maxX = 0;
    let minY = height;
    let maxY = 0;

    while (head < tail) {
      const idx = queue[head];
      head += 1;

      const x = idx % width;
      const y = Math.floor(idx / width);
      area += 1;
      sumX += x;
      sumY += y;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;

      if (x > 0) {
        const next = idx - 1;
        if (visited[next] === 0 && mask[next] === 1) {
          visited[next] = 1;
          queue[tail] = next;
          tail += 1;
        }
      }
      if (x < width - 1) {
        const next = idx + 1;
        if (visited[next] === 0 && mask[next] === 1) {
          visited[next] = 1;
          queue[tail] = next;
          tail += 1;
        }
      }
      if (y > 0) {
        const next = idx - width;
        if (visited[next] === 0 && mask[next] === 1) {
          visited[next] = 1;
          queue[tail] = next;
          tail += 1;
        }
      }
      if (y < height - 1) {
        const next = idx + width;
        if (visited[next] === 0 && mask[next] === 1) {
          visited[next] = 1;
          queue[tail] = next;
          tail += 1;
        }
      }
    }

    if (area < minArea || area > maxArea) {
      continue;
    }

    const boxW = maxX - minX + 1;
    const boxH = maxY - minY + 1;
    const ratio = boxW > boxH ? boxW / boxH : boxH / boxW;
    if (ratio > 2.0) {
      continue;
    }

    dots.push({
      x: sumX / area,
      y: sumY / area
    });
  }

  return dots;
}
function findScaleFromDots(dots: Dot[]): { xPixels: number | null; yPixels: number | null } {
  if (dots.length < 2) {
    return { xPixels: null, yPixels: null };
  }

  let xPixels: number | null = null;
  let yPixels: number | null = null;
  let xCost = Number.POSITIVE_INFINITY;
  let yCost = Number.POSITIVE_INFINITY;

  for (let i = 0; i < dots.length; i += 1) {
    for (let j = i + 1; j < dots.length; j += 1) {
      const dx = Math.abs(dots[i].x - dots[j].x);
      const dy = Math.abs(dots[i].y - dots[j].y);
      const distance = Math.hypot(dx, dy);

      if (distance < 10) {
        continue;
      }

      if (dx > dy) {
        const cost = dy / dx;
        if (cost < xCost) {
          xCost = cost;
          xPixels = distance;
        }
      }

      if (dy > dx) {
        const cost = dx / dy;
        if (cost < yCost) {
          yCost = cost;
          yPixels = distance;
        }
      }
    }
  }

  return { xPixels, yPixels };
}
