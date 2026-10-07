import { X } from 'lucide-react';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent, PointerEvent as ReactPointerEvent } from 'react';
import type { TerminalTabsController } from './use-terminal-tabs';
import type { TerminalStatus } from './types';

function statusLabel(status: TerminalStatus) {
  if (status === 'connected') return '已连接';
  if (status === 'connecting') return '连接中';
  if (status === 'background') return '后台运行';
  if (status === 'exited') return '已退出';
  if (status === 'error') return '错误';
  return '已断开';
}


export default function TerminalTabs({ controller }: { controller: TerminalTabsController }) {
  const { tabsState, tabsStateRef, activeTab, draggedTabRef, pendingTabFocusRef, pendingKeyboardTabFocusRef,
    selectTab, moveTab, closeTab } = controller;
  const { tabs } = tabsState;
  const dropTargetRef = useRef<{ id: string; after: boolean } | null>(null);
  const tabsStripRef = useRef<HTMLElement | null>(null);
  const suppressTabClickRef = useRef(false);
  const dragCleanupRef = useRef<(() => void) | null>(null);
  const [draggedTab, setDraggedTab] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<{ id: string; after: boolean } | null>(null);

  const tabButtonRefs = useRef(new Map<string, HTMLButtonElement>());

  useEffect(() => () => {
    dragCleanupRef.current?.();
    draggedTabRef.current = null;
  }, [draggedTabRef]);

  // On compact screens the tab strip scrolls horizontally. Server-created tabs
  // become active without receiving DOM focus, so the browser does not reveal
  // them automatically. Move the whole pill (including its close button) into
  // view before paint whenever the active tab changes.
  useLayoutEffect(() => {
    if (!activeTab) {
      return;
    }

    const tab = tabButtonRefs.current
      .get(activeTab.id)
      ?.closest<HTMLElement>('.tab');
    const strip = tab?.closest<HTMLElement>('.tabs');
    if (!tab || !strip) {
      return;
    }

    // Do not use Element.scrollIntoView: it walks overflow:auto ancestors. xterm 6
    // still has a full-size `.xterm-viewport` with overflow-y:auto, so revealing
    // the first tab can yank that viewport to y=0 (the terminal jumps to the top).
    const tabRect = tab.getBoundingClientRect();
    const stripRect = strip.getBoundingClientRect();
    if (tabRect.left < stripRect.left) {
      strip.scrollLeft -= stripRect.left - tabRect.left;
    } else if (tabRect.right > stripRect.right) {
      strip.scrollLeft += tabRect.right - stripRect.right;
    }
  }, [activeTab?.id]);

  useLayoutEffect(() => {
    const pendingFocusId = pendingKeyboardTabFocusRef.current;
    if (!activeTab || pendingFocusId !== activeTab.id) {
      return;
    }

    tabButtonRefs.current.get(pendingFocusId)?.focus();
    pendingKeyboardTabFocusRef.current = null;
  }, [activeTab?.id]);


  const endTabDrag = useCallback(() => {
    draggedTabRef.current = null;
    dropTargetRef.current = null;
    setDraggedTab(null);
    setDropTarget(null);
  }, []);

  const updateTabDropTarget = useCallback((clientX: number) => {
    const draggedId = draggedTabRef.current;
    const strip = tabsStripRef.current;
    if (!draggedId || !strip) {
      return;
    }

    const bounds = strip.getBoundingClientRect();
    if (clientX < bounds.left + 32) {
      strip.scrollLeft -= 24;
    } else if (clientX > bounds.right - 32) {
      strip.scrollLeft += 24;
    }

    const pills = [...strip.querySelectorAll<HTMLElement>('.tab[data-tab-id]')];
    const others = pills.filter((pill) => pill.dataset.tabId !== draggedId);
    const hit = others.find((pill) => {
      const rect = pill.getBoundingClientRect();
      return clientX >= rect.left && clientX <= rect.right;
    }) ?? others.reduce<HTMLElement | null>((nearest, pill) => {
      if (!nearest) {
        return pill;
      }
      const rect = pill.getBoundingClientRect();
      const nearestRect = nearest.getBoundingClientRect();
      const dist = Math.abs(clientX - (rect.left + rect.width / 2));
      const nearestDist = Math.abs(clientX - (nearestRect.left + nearestRect.width / 2));
      return dist < nearestDist ? pill : nearest;
    }, null);

    const targetId = hit?.dataset.tabId;
    if (!hit || !targetId) {
      dropTargetRef.current = null;
      setDropTarget(null);
      return;
    }

    const rect = hit.getBoundingClientRect();
    const next = { id: targetId, after: clientX > rect.left + rect.width / 2 };
    const prev = dropTargetRef.current;
    if (prev?.id === next.id && prev.after === next.after) {
      return;
    }
    dropTargetRef.current = next;
    setDropTarget(next);
  }, []);

  const handleTabPointerDown = useCallback((event: ReactPointerEvent<HTMLElement>, tabId: string) => {
    if (event.button !== 0 || tabsStateRef.current.tabs.length < 2) {
      return;
    }
    if ((event.target as HTMLElement | null)?.closest('.tab-close')) {
      return;
    }

    dragCleanupRef.current?.();

    const pointerId = event.pointerId;
    const startX = event.clientX;
    let dragging = false;

    const onMove = (moveEvent: PointerEvent) => {
      if (moveEvent.pointerId !== pointerId) {
        return;
      }
      if (!dragging) {
        if (Math.abs(moveEvent.clientX - startX) < 8) {
          return;
        }
        dragging = true;
        draggedTabRef.current = tabId;
        setDraggedTab(tabId);
      }
      moveEvent.preventDefault();
      updateTabDropTarget(moveEvent.clientX);
    };

    const onUp = (upEvent: PointerEvent) => {
      if (upEvent.pointerId !== pointerId) {
        return;
      }
      dragCleanupRef.current?.();
      if (dragging) {
        suppressTabClickRef.current = true;
        const target = dropTargetRef.current;
        if (target) {
          moveTab(tabId, target.id, target.after);
        }
      }
      endTabDrag();
    };

    dragCleanupRef.current = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
      dragCleanupRef.current = null;
    };
    window.addEventListener('pointermove', onMove, { passive: false });
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
  }, [endTabDrag, moveTab, updateTabDropTarget]);


  const handleTabKeyDown = useCallback((
    event: ReactKeyboardEvent<HTMLButtonElement>,
    tabId: string,
  ) => {
    const currentTabs = tabsStateRef.current.tabs;
    const currentIndex = currentTabs.findIndex((tab) => tab.id === tabId);
    if (currentIndex < 0 || currentTabs.length < 2) {
      return;
    }

    if (event.key === 'Delete') {
      event.preventDefault();
      closeTab(tabId);
      return;
    }

    if (event.altKey && event.shiftKey && (event.key === 'ArrowLeft' || event.key === 'ArrowRight')) {
      event.preventDefault();
      const after = event.key === 'ArrowRight';
      const target = currentTabs[currentIndex + (after ? 1 : -1)];
      if (target) moveTab(tabId, target.id, after);
      return;
    }

    let nextIndex = currentIndex;
    if (event.key === 'ArrowRight') {
      nextIndex = (currentIndex + 1) % currentTabs.length;
    } else if (event.key === 'ArrowLeft') {
      nextIndex = (currentIndex - 1 + currentTabs.length) % currentTabs.length;
    } else if (event.key === 'Home') {
      nextIndex = 0;
    } else if (event.key === 'End') {
      nextIndex = currentTabs.length - 1;
    } else {
      return;
    }

    event.preventDefault();
    const nextTabId = currentTabs[nextIndex].id;
    if (nextTabId === tabId) {
      return;
    }
    pendingKeyboardTabFocusRef.current = nextTabId;
    selectTab(nextTabId);
  }, [closeTab, moveTab, selectTab]);


  useEffect(() => {
    const pendingFocus = pendingTabFocusRef.current;
    if (!pendingFocus || tabs.some((tab) => tab.id === pendingFocus.closedId)) {
      return;
    }

    const focusFrame = window.requestAnimationFrame(() => {
      if (pendingTabFocusRef.current !== pendingFocus) {
        return;
      }

      const focusTarget = tabButtonRefs.current.get(pendingFocus.focusId);
      if (focusTarget) {
        focusTarget.focus();
        pendingTabFocusRef.current = null;
      }
    });
    return () => window.cancelAnimationFrame(focusFrame);
  }, [tabs]);


  return (
        <nav
          ref={tabsStripRef}
          className="tabs"
          role="tablist"
          aria-label="终端标签"
          aria-orientation="horizontal"
        >
          {tabs.map((tab) => {
            const isActive = tab.id === activeTab?.id;
            return (
              <div
                className={`tab ${isActive ? 'active' : ''} ${draggedTab === tab.id ? 'dragging' : ''} ${dropTarget?.id === tab.id ? (dropTarget.after ? 'drop-after' : 'drop-before') : ''}`}
                data-tab-id={tab.id}
                key={tab.id}
                onPointerDown={(event) => handleTabPointerDown(event, tab.id)}
              >
                <button
                  type="button"
                  className="tab-main"
                  aria-keyshortcuts="Alt+Shift+ArrowLeft Alt+Shift+ArrowRight"
                  id={`terminal-tab-${tab.id}`}
                  ref={(button) => {
                    if (button) {
                      tabButtonRefs.current.set(tab.id, button);
                    } else {
                      tabButtonRefs.current.delete(tab.id);
                    }
                  }}
                  role="tab"
                  onClick={() => {
                    if (suppressTabClickRef.current) {
                      suppressTabClickRef.current = false;
                      return;
                    }
                    selectTab(tab.id);
                  }}
                  onKeyDown={(event) => handleTabKeyDown(event, tab.id)}
                  aria-selected={isActive}
                  aria-label={`${tab.title}，${statusLabel(tab.status)}`}
                  aria-controls="active-terminal-panel"
                  aria-current={isActive ? 'page' : undefined}
                  tabIndex={isActive ? 0 : -1}
                  title={`${tab.title} - ${statusLabel(tab.status)} · 拖动排序 / Alt+Shift+方向键`}
                >
                  <span className={`status-dot ${tab.status}`} aria-hidden="true" />
                  <span className="tab-title">{tab.title}</span>
                </button>
                {tabs.length > 1 && (
                  <button
                    type="button"
                    className="tab-close"
                    onClick={() => closeTab(tab.id)}
                    title={`关闭 ${tab.title}`}
                    aria-label={`关闭 ${tab.title}`}
                  >
                    <X size={13} aria-hidden="true" />
                  </button>
                )}
              </div>
            );
          })}
        </nav>
  );
}
