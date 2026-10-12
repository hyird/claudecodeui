// Pages of one browser share the stored token. A page about to renew it tells the
// other pages first, so the page it displaces can say why it was logged out: the
// server's invalidation notice may arrive before the new token is stored.
const CHANNEL_NAME = 'cloud-terminal-auth';

type TakeoverMessage = { type: 'takeover'; token: string };

let announcer: BroadcastChannel | null = null;

export function announceSessionTakeover(token: string) {
  if (typeof BroadcastChannel === 'undefined') {
    return;
  }
  announcer ??= new BroadcastChannel(CHANNEL_NAME);
  announcer.postMessage({ type: 'takeover', token } satisfies TakeoverMessage);
}

export function subscribeSessionTakeover(listener: (token: string) => void) {
  if (typeof BroadcastChannel === 'undefined') {
    return () => {};
  }
  const channel = new BroadcastChannel(CHANNEL_NAME);
  channel.onmessage = (event: MessageEvent<Partial<TakeoverMessage>>) => {
    if (event.data?.type === 'takeover' && typeof event.data.token === 'string') {
      listener(event.data.token);
    }
  };
  return () => channel.close();
}
