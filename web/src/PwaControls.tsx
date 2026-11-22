import { useEffect, useRef, useState } from 'react';

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};

function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

function manualInstallHelp() {
  const agent = navigator.userAgent;
  if (/iPad|iPhone|iPod/i.test(agent)) {
    return 'Safari에서 공유 버튼을 누른 뒤 ‘홈 화면에 추가’를 선택하세요.';
  }
  if (/Android/i.test(agent)) {
    return 'Chrome 또는 Samsung Internet의 메뉴(⋮)에서 ‘앱 설치’ 또는 ‘홈 화면에 추가’를 선택하세요.';
  }
  return '브라우저 주소창의 설치 아이콘이나 브라우저 메뉴의 ‘앱 설치’를 이용하세요.';
}

export default function PwaControls() {
  const [installed, setInstalled] = useState(isStandalone);
  const [helpOpen, setHelpOpen] = useState(false);
  const [updateReady, setUpdateReady] = useState(false);
  const promptRef = useRef<InstallPromptEvent | null>(null);
  const registrationRef = useRef<ServiceWorkerRegistration | null>(null);
  const updateRequested = useRef(false);

  useEffect(() => {
    const media = window.matchMedia('(display-mode: standalone)');
    const syncInstalled = () => setInstalled(isStandalone());
    const saveInstallPrompt = (event: Event) => {
      event.preventDefault();
      promptRef.current = event as InstallPromptEvent;
    };
    const onInstalled = () => {
      promptRef.current = null;
      setInstalled(true);
      setHelpOpen(false);
    };
    window.addEventListener('beforeinstallprompt', saveInstallPrompt);
    window.addEventListener('appinstalled', onInstalled);
    media.addEventListener('change', syncInstalled);
    window.addEventListener('pageshow', syncInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', saveInstallPrompt);
      window.removeEventListener('appinstalled', onInstalled);
      media.removeEventListener('change', syncInstalled);
      window.removeEventListener('pageshow', syncInstalled);
    };
  }, []);

  useEffect(() => {
    // Local Vite dev runs without a generated service worker. Production
    // replaces SW placeholders with the actual hashed asset list at publish.
    if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;
    let mounted = true;
    const onControllerChange = () => {
      if (updateRequested.current) window.location.reload();
    };
    const checkWaiting = (worker: ServiceWorker | null) => {
      if (!worker) return;
      const onState = () => {
        if (mounted && worker.state === 'installed' && navigator.serviceWorker.controller) {
          setUpdateReady(true);
        }
      };
      worker.addEventListener('statechange', onState);
      onState();
    };

    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange);
    navigator.serviceWorker.register(import.meta.env.BASE_URL + 'sw.js', {
      scope: import.meta.env.BASE_URL,
      updateViaCache: 'none',
    }).then((registration) => {
      if (!mounted) return;
      registrationRef.current = registration;
      if (registration.waiting && navigator.serviceWorker.controller) {
        setUpdateReady(true);
      }
      checkWaiting(registration.installing);
      registration.addEventListener('updatefound', () => checkWaiting(registration.installing));
    }).catch(() => {
      // The install control still provides browser-specific manual instructions.
    });

    return () => {
      mounted = false;
      navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange);
    };
  }, []);

  async function installApp() {
    const prompt = promptRef.current;
    if (!prompt) {
      setHelpOpen(true);
      return;
    }
    promptRef.current = null;
    try {
      await prompt.prompt();
      const answer = await prompt.userChoice;
      if (answer.outcome === 'accepted') setHelpOpen(false);
    } catch {
      setHelpOpen(true);
    }
  }

  function applyUpdate() {
    const waiting = registrationRef.current?.waiting;
    if (!waiting) {
      window.location.reload();
      return;
    }
    updateRequested.current = true;
    waiting.postMessage({ type: 'SKIP_WAITING' });
  }

  if (installed && !updateReady) return null;
  return <div className="pwa-controls">
    {!installed && <button type="button" className="install-button"
      onClick={installApp} aria-expanded={helpOpen}>앱 설치</button>}
    {updateReady && <button type="button" className="pwa-update-button"
      onClick={applyUpdate}>업데이트</button>}
    {helpOpen && !installed && <div className="pwa-install-help" role="status">
      <p>{manualInstallHelp()}</p>
      <button type="button" onClick={() => setHelpOpen(false)} aria-label="설치 안내 닫기">닫기</button>
    </div>}
  </div>;
}
