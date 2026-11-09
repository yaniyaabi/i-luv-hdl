export type FocusTimer = {
  // A running timer uses an absolute deadline. A paused timer stores its remaining time.
  endsAt: number;
  remainingMs: number;
};

export function remainingFocusMs(timer: FocusTimer, now: number) {
  return timer.endsAt ? Math.max(0, timer.endsAt - now) : timer.remainingMs;
}

export function formatFocusTime(milliseconds: number) {
  const seconds = Math.ceil(milliseconds / 1000);
  return String(Math.floor(seconds / 60)).padStart(2, '0') + ':' + String(seconds % 60).padStart(2, '0');
}
