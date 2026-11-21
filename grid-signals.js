(() => {
  const field = document.querySelector('.grid-signals');
  const context = field?.getContext('2d');
  if (!context) return;

  const preference = matchMedia('(prefers-reduced-motion: reduce)');
  const canvasColors = ['88,219,255', '113,170,252', '236,134,218', '245,218,139'];
  const directions = [[1,0], [0,1], [-1,0], [0,-1]];
  const trails = [];
  const cell = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--grid-cell'));
  const frameTime = 1000 / 30;
  let width = 0;
  let height = 0;
  let pixelRatio = 1;
  let previous = 0;
  let pending = 0;

  const random = (min, max) => min + (max - min) * Math.random();
  const integer = (min, max) => Math.floor(random(min, max + 1));
  const color = (rgb, opacity) => 'rgba(' + rgb + ',' + opacity + ')';

  function createSignal(scatter = false) {
    const cols = Math.max(1, Math.floor(width / cell));
    const rows = Math.max(1, Math.floor(height / cell));
    let x = integer(0, cols);
    let y = integer(0, rows);
    let heading = integer(0, 3);
    let distance = 0;
    const line = [];
    for (let i = 0; i < 8; i++) {
      const completed = integer(1, 4);
      const [dx, dy] = directions[heading];
      const nextX = x + dx * completed;
      const nextY = y + dy * completed;
      if (nextX < -2 || nextX > cols + 2 || nextY < -2 || nextY > rows + 2) {
        heading = (heading + (Math.random() > .5 ? 1 : 3)) % 4;
        continue;
      }
      line.push({x:x * cell + .5, y:y * cell + .5, dx, dy, distance, length:completed * cell});
      x = nextX;
      y = nextY;
      distance += completed * cell;
      if (Math.random() < .61) heading = (heading + (Math.random() > .5 ? 1 : 3)) % 4;
    }
    const strong = Math.random() < .30;
    const brightness = strong ? random(.55,.84) : random(.14,.41);
    const palette = Math.random() < .59 ? canvasColors[0] : canvasColors[integer(1,3)];
    const tail = strong ? random(70,140) : random(34,95);
    return {
      line, distance, brightness, palette, tail, strong,
      head:scatter ? random(-tail, Math.max(1,distance - tail)) : random(-140,2),
      velocity:strong ? random(45,102) : random(36,87)
    };
  }

  function stroke(signal) {
    const head = signal.head;
    for (const segment of signal.line) {
      const front = Math.min(segment.length, head - segment.distance);
      const rear = Math.max(0, head - signal.tail - segment.distance);
      if (front <= rear) continue;
      const {x,y,dx,dy} = segment;
      const alphaAt = offset => Math.min(1, 1 - (head - segment.distance - offset) / signal.tail);
      const fromX = x + rear * dx;
      const fromY = y + rear * dy;
      const toX = x + front * dx;
      const toY = y + front * dy;
      const gradient = context.createLinearGradient(fromX, fromY, toX, toY);
      gradient.addColorStop(0, color(signal.palette, signal.brightness * alphaAt(rear) ** 2));
      gradient.addColorStop(1, color(signal.palette, signal.brightness * alphaAt(front) ** 2));
      context.lineWidth = signal.strong ? 1.25 : .95;
      context.shadowBlur = signal.strong ? 8 : 0;
      context.shadowColor = color(signal.palette, .66);
      context.strokeStyle = gradient;
      context.beginPath();
      context.moveTo(fromX,fromY);
      context.lineTo(toX,toY);
      context.stroke();
      if (!signal.strong || Math.abs(head - segment.distance - front) > .01) continue;
      context.fillStyle = color('202,245,255', signal.brightness * .86);
      context.beginPath();
      context.arc(toX,toY,1.55,0,Math.PI*2);
      context.fill();
    }
  }

  function tick(time) {
    pending = 0;
    if (time - previous >= frameTime) {
      const seconds = previous ? Math.min(.12, (time - previous) / 1000) : 0;
      previous = time;
      context.clearRect(0,0,width,height);
      for (let i = 0; i < trails.length; i++) {
        const signal = trails[i];
        signal.head += seconds * signal.velocity;
        if (!signal.line.length || signal.head > signal.distance + signal.tail) trails[i] = createSignal();
        else if (signal.head > 0) stroke(signal);
      }
    }
    sync();
  }

  function sync() {
    const active = !preference.matches && !document.hidden;
    if (active && !pending) pending = requestAnimationFrame(tick);
    if (!active) {
      if (pending) cancelAnimationFrame(pending);
      pending = 0;
      previous = 0;
      context.clearRect(0,0,width,height);
    }
  }

  function fit() {
    width = field.clientWidth;
    height = field.clientHeight;
    if (!width || !height || !cell) return;
    pixelRatio = Math.min(devicePixelRatio || 1, 1.5);
    field.width = Math.round(width * pixelRatio);
    field.height = Math.round(height * pixelRatio);
    context.setTransform(pixelRatio,0,0,pixelRatio,0,0);
    context.lineCap = 'round';
    trails.length = 0;
    const count = Math.min(64, Math.max(22, Math.round(width * height / 19500)));
    for (let i = 0; i < count; i++) trails.push(createSignal(true));
    sync();
  }

  if ('ResizeObserver' in window) new ResizeObserver(fit).observe(field);
  else addEventListener('resize', fit);
  document.addEventListener('visibilitychange', sync);
  preference.addEventListener('change', sync);
  fit();
})();