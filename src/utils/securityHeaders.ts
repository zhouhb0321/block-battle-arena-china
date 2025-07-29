// Utility to set secure iframe policies and handle browser permissions
export const initializeSecurityPolicies = () => {
  // Handle iframe security warnings by setting proper attributes
  const iframes = document.querySelectorAll('iframe');
  iframes.forEach(iframe => {
    // Remove dangerous combinations that trigger warnings
    const sandbox = iframe.getAttribute('sandbox');
    if (sandbox && sandbox.includes('allow-scripts') && sandbox.includes('allow-same-origin')) {
      console.warn('发现不安全的iframe配置，正在修复...');
      // Keep functionality but remove security warning
      iframe.setAttribute('sandbox', 'allow-scripts allow-forms allow-popups allow-presentation');
    }
  });

  // Handle permissions policy warnings by ensuring proper meta tags
  if (!document.querySelector('meta[http-equiv="Permissions-Policy"]')) {
    const meta = document.createElement('meta');
    meta.setAttribute('http-equiv', 'Permissions-Policy');
    meta.setAttribute('content', 'vr=(), ambient-light-sensor=(), battery=()');
    document.head.appendChild(meta);
  }
};

// Call this after DOM is loaded
if (typeof window !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeSecurityPolicies);
  } else {
    initializeSecurityPolicies();
  }
  
  // Also handle dynamically added iframes
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          const element = node as Element;
          if (element.tagName === 'IFRAME') {
            const sandbox = element.getAttribute('sandbox');
            if (sandbox && sandbox.includes('allow-scripts') && sandbox.includes('allow-same-origin')) {
              element.setAttribute('sandbox', 'allow-scripts allow-forms allow-popups allow-presentation');
            }
          }
        }
      });
    });
  });
  
  observer.observe(document.body, { childList: true, subtree: true });
}