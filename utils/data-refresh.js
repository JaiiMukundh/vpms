"use client";

export const DATA_REFRESH_EVENT = "vpms-data-refresh";
const DATA_REFRESH_CHANNEL = "vpms-data-refresh";

export function triggerDataRefresh(detail = {}) {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new CustomEvent(DATA_REFRESH_EVENT, { detail }));

  if ("BroadcastChannel" in window) {
    const channel = new BroadcastChannel(DATA_REFRESH_CHANNEL);
    channel.postMessage(detail);
    channel.close();
  }
}

export function subscribeDataRefresh(handler) {
  if (typeof window === "undefined") {
    return () => {};
  }

  const listener = (event) => handler(event.detail || {});
  window.addEventListener(DATA_REFRESH_EVENT, listener);

  let channel = null;
  let channelListener = null;
  if ("BroadcastChannel" in window) {
    channel = new BroadcastChannel(DATA_REFRESH_CHANNEL);
    channelListener = (event) => handler(event.data || {});
    channel.addEventListener("message", channelListener);
  }

  return () => {
    window.removeEventListener(DATA_REFRESH_EVENT, listener);
    if (channel && channelListener) {
      channel.removeEventListener("message", channelListener);
      channel.close();
    }
  };
}
