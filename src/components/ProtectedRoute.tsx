import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import AuthModal from './AuthModal';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  /** If true, guests (isGuest=true) are also blocked. Default false: guests allowed. */
  requireRegistered?: boolean;
}

/**
 * Route guard: if user is not authenticated, redirect to "/" and pop the AuthModal.
 * If requireRegistered is true, guests are also redirected.
 */
const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, requireRegistered = true }) => {
  const { user, isAuthenticated, loading } = useAuth();
  const location = useLocation();
  const [showModal, setShowModal] = useState(false);
  const [redirect, setRedirect] = useState(false);

  const blocked = !isAuthenticated || (requireRegistered && user?.isGuest);

  useEffect(() => {
    if (loading) return;
    if (blocked) {
      setShowModal(true);
      // delay redirect a tick so modal mounts
      const t = setTimeout(() => setRedirect(true), 50);
      return () => clearTimeout(t);
    }
  }, [blocked, loading]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (blocked) {
    if (redirect) {
      return <Navigate to="/" state={{ from: location.pathname, requireAuth: true }} replace />;
    }
    return (
      <>
        <div className="min-h-screen flex items-center justify-center" />
        <AuthModal isOpen={showModal} onClose={() => setShowModal(false)} />
      </>
    );
  }

  return <>{children}</>;
};

export default ProtectedRoute;
