// Enhanced security utilities for iframe policies and CSP headers
export const initializeSecurityPolicies = () => {
  // Handle iframe security warnings by setting proper attributes
  const iframes = document.querySelectorAll('iframe');
  iframes.forEach(iframe => {
    const sandbox = iframe.getAttribute('sandbox');
    if (sandbox && sandbox.includes('allow-scripts') && sandbox.includes('allow-same-origin')) {
      console.warn('发现不安全的iframe配置，正在修复...');
      iframe.setAttribute('sandbox', 'allow-scripts allow-forms allow-popups allow-presentation');
    }
  });

  // CSP is defined in index.html to avoid conflicts — do not duplicate here

  // Enhanced Permissions Policy
  if (!document.querySelector('meta[http-equiv="Permissions-Policy"]')) {
    const permissionsMeta = document.createElement('meta');
    permissionsMeta.setAttribute('http-equiv', 'Permissions-Policy');
    permissionsMeta.setAttribute('content', [
      'vr=()',
      'ambient-light-sensor=()',
      'battery=()',
      'camera=()',
      'microphone=()',
      'geolocation=()',
      'payment=()'
    ].join(', '));
    document.head.appendChild(permissionsMeta);
  }

  // Add security headers via meta tags
  const securityHeaders = [
    { name: 'X-Content-Type-Options', content: 'nosniff' },
    { name: 'X-Frame-Options', content: 'DENY' },
    { name: 'X-XSS-Protection', content: '1; mode=block' },
    { name: 'Referrer-Policy', content: 'strict-origin-when-cross-origin' }
  ];

  securityHeaders.forEach(({ name, content }) => {
    if (!document.querySelector(`meta[http-equiv="${name}"]`)) {
      const meta = document.createElement('meta');
      meta.setAttribute('http-equiv', name);
      meta.setAttribute('content', content);
      document.head.appendChild(meta);
    }
  });
};

// Enhanced security event logging
export const logSecurityEvent = async (eventType: string, eventData: any, severity: 'info' | 'warn' | 'error' = 'info') => {
  try {
    const { supabase } = await import('@/integrations/supabase/client');
    
    await supabase.from('security_events').insert({
      user_id: null,
      event_type: eventType,
      event_data: {
        ...eventData,
        timestamp: new Date().toISOString(),
        user_agent: navigator.userAgent,
        url: window.location.href
      },
      severity,
      source: 'client',
      ip_address: null
    });
  } catch (error) {
    console.error('Failed to log security event:', error);
  }
};

// Call this after DOM is loaded
if (typeof window !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeSecurityPolicies);
  } else {
    initializeSecurityPolicies();
  }
  
  // Enhanced iframe monitoring
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          const element = node as Element;
          if (element.tagName === 'IFRAME') {
            const sandbox = element.getAttribute('sandbox');
            if (sandbox && sandbox.includes('allow-scripts') && sandbox.includes('allow-same-origin')) {
              element.setAttribute('sandbox', 'allow-scripts allow-forms allow-popups allow-presentation');
              logSecurityEvent('iframe_security_fix', { 
                element: element.outerHTML.substring(0, 200) 
              }, 'warn');
            }
          }
        }
      });
    });
  });
  
  observer.observe(document.body, { childList: true, subtree: true });
}