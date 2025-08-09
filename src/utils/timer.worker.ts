// A simple real-time timer worker
let timerId: NodeJS.Timeout | null = null;
let seconds = 0;

self.onmessage = (e: MessageEvent) => {
  if (e.data.command === 'start') {
    seconds = e.data.startTime || 0;
    if (timerId) {
      clearInterval(timerId);
    }
    timerId = setInterval(() => {
      seconds++;
      self.postMessage({ type: 'tick', time: seconds });
    }, 1000);
  } else if (e.data.command === 'stop') {
    if (timerId) {
      clearInterval(timerId);
      timerId = null;
    }
  }
};
